import random

import pytest

from perp_engine import Engine, Market, liquidation_price


def test_liquidation_price_formula():
    # long at $100, 10x, 0.5% maintenance -> 100 * 0.9 / 0.995
    assert liquidation_price(100, 10, 0.005, +1) == pytest.approx(90.452, abs=1e-3)
    assert liquidation_price(100, 10, 0.005, -1) == pytest.approx(109.453, abs=1e-3)


def test_engine_triggers_exactly_at_formula_price():
    e = Engine(market=Market(taker_fee=0.0, max_leverage=50), mark=2000.0)
    e.open("alice", 10.0, collateral=2000.0)  # $20k notional, 10x
    p_liq = liquidation_price(2000, 10, e.market.mmr, +1)
    e.mark = p_liq * 1.0001
    assert not e.is_liquidatable(e.accounts["alice"])
    e.mark = p_liq * 0.9999
    assert e.is_liquidatable(e.accounts["alice"])


def test_leverage_cap_enforced():
    e = Engine(market=Market(max_leverage=20), mark=2000.0)
    with pytest.raises(ValueError):
        e.open("bob", 10.0, collateral=900.0)  # needs $1,000 of initial margin plus fee


def test_funding_is_zero_sum():
    e = Engine(market=Market(), mark=2000.0)
    e.open("long", 5.0, collateral=5000.0)
    e.open("short", -2.0, collateral=5000.0)
    before = e.total_value()
    e.apply_funding(0.0001)
    assert e.total_value() == pytest.approx(before)
    assert e.accounts["long"].collateral < 5000.0  # longs paid


def test_small_position_liquidated_on_book():
    e = Engine(market=Market(), mark=2000.0)
    e.open("alice", 10.0, collateral=1500.0)  # ~13x
    events = e.set_mark(1880.0)
    assert [ev.kind for ev in events] == ["book"]
    assert e.accounts["alice"].size == 0


def test_whale_goes_to_backstop_vault():
    e = Engine(market=Market(max_leverage=25), mark=2000.0)
    e.open("whale", 2000.0, collateral=250_000.0)  # $4M notional > book limit
    events = e.set_mark(1890.0)
    assert [ev.kind for ev in events] == ["backstop"]
    assert e.backstop.size == pytest.approx(2000.0)


def test_gap_down_uses_insurance_then_adl():
    e = Engine(market=Market(taker_fee=0.0), mark=2000.0, insurance_fund=1_000.0)
    e.open("short_winner", -50.0, collateral=50_000.0)
    e.open("long_a", 100.0, collateral=20_000.0)  # 10x
    e.open("long_b", 100.0, collateral=20_000.0)
    # a 20% gap: both longs are deep underwater; the fund covers only the first shortfall partially
    events = e.set_mark(1600.0)
    kinds = [ev.kind for ev in events]
    assert "adl" in kinds
    assert e.insurance_fund >= 0


def test_value_is_conserved_through_a_crash():
    rng = random.Random(7)
    e = Engine(market=Market(), mark=2000.0, insurance_fund=50_000.0)
    for i in range(300):
        lev = rng.uniform(2, 19)
        collateral = rng.uniform(1_000, 50_000)
        side = 1 if rng.random() < 0.7 else -1
        size = side * collateral * lev / e.mark * 0.999
        e.open(f"t{i}", size, collateral=collateral)
    start = e.total_value()
    price = 2000.0
    for step in range(40):
        price *= 1 - rng.uniform(0.0, 0.012) - (0.08 if step == 25 else 0.0)  # grind down, then a gap
        e.set_mark(price)
        if step % 8 == 0:
            e.apply_funding(0.0001)
    assert e.total_value() == pytest.approx(start, rel=1e-9)
    assert sum(a.size for a in e.accounts.values()) == pytest.approx(0.0, abs=1e-6)
