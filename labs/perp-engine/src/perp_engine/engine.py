"""A single-market perpetual futures engine.

Every position has a counterparty, so value is conserved: the sum of all account equity plus the
insurance fund only changes when someone deposits. Tests check this after a crash.

Loss waterfall, in order:
  1. book      close against the order book (modelled as a market maker) with size-dependent slippage
  2. backstop  positions too big for the book are taken over by a backstop vault at the mark price
  3. insurance negative equity left after a book close is paid by the insurance fund
  4. adl       if the fund can't cover it, profitable opposing traders are closed at the bankruptcy price
"""

from __future__ import annotations

from dataclasses import dataclass, field


def liquidation_price(entry: float, leverage: float, mmr: float, side: int) -> float:
    """Isolated-margin liquidation price, ignoring fees.

    long:  P_liq = P0 * (1 - 1/L) / (1 - m)
    short: P_liq = P0 * (1 + 1/L) / (1 + m)
    """
    if side > 0:
        return entry * (1 - 1 / leverage) / (1 - mmr)
    return entry * (1 + 1 / leverage) / (1 + mmr)


@dataclass
class Market:
    symbol: str = "ETH"
    max_leverage: float = 20.0
    mmr: float = 0.025  # maintenance margin ratio: half the initial margin at max leverage
    taker_fee: float = 0.00045
    liquidation_fee: float = 0.01  # share of notional taken from remaining margin into the insurance fund
    book_depth_usd: float = 20_000_000.0  # slippage = impact_coeff * notional / book_depth_usd
    impact_coeff: float = 0.02
    max_book_liquidation_usd: float = 2_000_000.0  # bigger positions go to the backstop vault


@dataclass
class Account:
    name: str
    collateral: float
    size: float = 0.0  # base units; + long, - short
    entry: float = 0.0

    def upnl(self, mark: float) -> float:
        return self.size * (mark - self.entry)

    def equity(self, mark: float) -> float:
        return self.collateral + self.upnl(mark)

    def notional(self, mark: float) -> float:
        return abs(self.size) * mark


@dataclass
class Event:
    kind: str  # "book" | "backstop" | "insurance" | "adl" | "funding"
    account: str
    notional: float
    amount: float  # loss absorbed by this stage (or funding paid)
    detail: str = ""


@dataclass
class Engine:
    market: Market
    mark: float
    insurance_fund: float = 0.0
    accounts: dict[str, Account] = field(default_factory=dict)
    events: list[Event] = field(default_factory=list)

    def __post_init__(self) -> None:
        # The market maker is the order book's liquidity; the backstop is an HLP-style vault.
        self.mm = self.add_account("market_maker", 50_000_000.0)
        self.backstop = self.add_account("backstop_vault", 10_000_000.0)

    # ------------------------------------------------------------------ accounts and trading

    def add_account(self, name: str, collateral: float) -> Account:
        acct = Account(name, collateral)
        self.accounts[name] = acct
        return acct

    def _fill(self, acct: Account, delta: float, price: float) -> None:
        """Change acct's position by `delta` at `price`, realizing PnL on any reduced part."""
        if delta == 0:
            return
        if acct.size == 0 or (acct.size > 0) == (delta > 0):
            new_size = acct.size + delta
            acct.entry = (acct.entry * acct.size + price * delta) / new_size
            acct.size = new_size
            return
        closing = min(abs(delta), abs(acct.size))
        side = 1 if acct.size > 0 else -1
        acct.collateral += closing * side * (price - acct.entry)
        acct.size -= side * closing
        remainder = abs(delta) - closing
        if acct.size == 0:
            acct.entry = 0.0
        if remainder > 1e-12:  # position flips
            acct.size = -side * remainder
            acct.entry = price

    def _trade(self, taker: Account, maker: Account, delta: float, price: float) -> None:
        self._fill(taker, delta, price)
        self._fill(maker, -delta, price)

    def open(self, name: str, size: float, collateral: float | None = None) -> Account:
        """Trader opens `size` against the market maker at the mark, paying a taker fee."""
        acct = self.accounts.get(name) or self.add_account(name, collateral or 0.0)
        fee = abs(size) * self.mark * self.market.taker_fee
        initial_margin = abs(acct.size + size) * self.mark / self.market.max_leverage
        if acct.equity(self.mark) - fee < initial_margin:
            raise ValueError(f"{name}: leverage above {self.market.max_leverage}x")
        acct.collateral -= fee
        self.insurance_fund += fee
        self._trade(acct, self.mm, size, self.mark)
        return acct

    # ------------------------------------------------------------------ risk

    def maintenance(self, acct: Account) -> float:
        return acct.notional(self.mark) * self.market.mmr

    def is_liquidatable(self, acct: Account) -> bool:
        return acct.size != 0 and acct.equity(self.mark) < self.maintenance(acct)

    def total_value(self) -> float:
        """Conserved quantity: all equity plus the insurance fund."""
        return sum(a.equity(self.mark) for a in self.accounts.values()) + self.insurance_fund

    # ------------------------------------------------------------------ funding

    def apply_funding(self, rate: float) -> None:
        """rate > 0: longs pay shorts. Payment = size * mark * rate. Sums to zero across accounts."""
        for acct in self.accounts.values():
            payment = acct.size * self.mark * rate
            acct.collateral -= payment
        self.events.append(Event("funding", "*", 0.0, rate))

    # ------------------------------------------------------------------ liquidation waterfall

    def set_mark(self, price: float) -> list[Event]:
        self.mark = price
        return self.run_liquidations()

    def run_liquidations(self) -> list[Event]:
        start = len(self.events)
        for acct in list(self.accounts.values()):
            if acct is self.mm or acct is self.backstop:
                continue
            if self.is_liquidatable(acct):
                self._liquidate(acct)
        return self.events[start:]

    def _liquidate(self, acct: Account) -> None:
        m, P = self.market, self.mark
        side = 1 if acct.size > 0 else -1
        notional = acct.notional(P)

        # 2. too big for the book: the backstop vault inherits position and remaining equity at mark
        if notional > m.max_book_liquidation_usd:
            equity = acct.equity(P)
            self._trade(acct, self.backstop, -acct.size, P)  # acct is flat now; collateral == equity
            self.backstop.collateral += acct.collateral
            acct.collateral = 0.0
            self.events.append(Event("backstop", acct.name, notional, max(0.0, -equity), f"vault took {notional:,.0f} at mark"))
            return

        # 1. close on the book with slippage
        slip = m.impact_coeff * notional / m.book_depth_usd
        px = P * (1 - side * slip)
        equity_after = acct.collateral + acct.size * (px - acct.entry)

        if equity_after >= 0:
            self._trade(acct, self.mm, -acct.size, px)
            fee = min(acct.collateral, notional * m.liquidation_fee)
            acct.collateral -= fee
            self.insurance_fund += fee
            self.events.append(Event("book", acct.name, notional, 0.0, f"slippage {slip:.2%}, fee {fee:,.0f}"))
            return

        shortfall = -equity_after
        # 3. insurance fund covers bad debt
        if self.insurance_fund >= shortfall:
            self._trade(acct, self.mm, -acct.size, px)
            self.insurance_fund -= shortfall
            acct.collateral = 0.0
            self.events.append(Event("insurance", acct.name, notional, shortfall))
            return

        # 4. ADL: close against profitable opposing traders at the bankruptcy price
        self._adl(acct)

    def _adl(self, bankrupt: Account) -> None:
        side = 1 if bankrupt.size > 0 else -1
        p_bankrupt = bankrupt.entry - bankrupt.collateral / bankrupt.size  # equity == 0 here
        candidates = [
            a for a in self.accounts.values()
            if a is not bankrupt and a.size * side < 0 and a.upnl(self.mark) > 0
        ]

        def rank(a: Account) -> float:  # profit % times leverage, like most venues
            eq = max(a.equity(self.mark), 1e-9)
            return (a.upnl(self.mark) / max(a.collateral, 1e-9)) * (a.notional(self.mark) / eq)

        remaining = abs(bankrupt.size)
        notional = bankrupt.notional(self.mark)
        for cp in sorted(candidates, key=rank, reverse=True):
            if remaining <= 1e-12:
                break
            qty = min(remaining, abs(cp.size))
            self._trade(bankrupt, cp, -side * qty, p_bankrupt)
            remaining -= qty
            self.events.append(Event("adl", cp.name, qty * self.mark, qty * abs(self.mark - p_bankrupt), f"reduced vs {bankrupt.name}"))
        if remaining > 1e-12:  # nobody left to deleverage: the insurance fund goes negative (socialized loss)
            self._trade(bankrupt, self.mm, -bankrupt.size, self.mark)
            self.insurance_fund += bankrupt.collateral
            bankrupt.collateral = 0.0
