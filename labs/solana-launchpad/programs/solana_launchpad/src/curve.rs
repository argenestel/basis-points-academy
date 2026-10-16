//! Bonding-curve math, kept free of Anchor so it can be unit-tested on the host (`cargo test`).
//!
//! The curve is a constant product over *virtual* reserves: x · y = k, where x is SOL and y is tokens.
//! Virtual reserves give the token a non-zero starting price without anyone depositing liquidity.
//! Every division rounds in the curve's favor, so k never decreases.

pub const LAMPORTS_PER_SOL: u64 = 1_000_000_000;
pub const DECIMALS: u8 = 6;
pub const ONE_TOKEN: u64 = 1_000_000; // 10^DECIMALS

/// Commonly cited pump.fun launch parameters (they have changed over time).
pub const VIRTUAL_SOL: u64 = 30 * LAMPORTS_PER_SOL;
pub const VIRTUAL_TOKENS: u64 = 1_073_000_000 * ONE_TOKEN;
/// Tokens sold on the curve. When all are sold the curve "graduates" (≈85 SOL raised).
pub const CURVE_SUPPLY: u64 = 793_100_000 * ONE_TOKEN;
/// 1% fee on the SOL side, paid to the token's creator.
pub const FEE_BPS: u64 = 100;

#[derive(Debug, PartialEq, Eq)]
pub enum MathError {
    Overflow,
    EmptyCurve,
}

/// Tokens received for `sol_in` lamports (after fees): dy = y · dx / (x + dx), rounded down.
pub fn tokens_out(virtual_sol: u64, virtual_tokens: u64, sol_in: u64) -> Result<u64, MathError> {
    let (x, y, dx) = (virtual_sol as u128, virtual_tokens as u128, sol_in as u128);
    let out = y.checked_mul(dx).ok_or(MathError::Overflow)? / x.checked_add(dx).ok_or(MathError::Overflow)?;
    u64::try_from(out).map_err(|_| MathError::Overflow)
}

/// Lamports needed to buy exactly `tokens` tokens: dx = x · dy / (y − dy), rounded up.
pub fn sol_in_for_tokens(virtual_sol: u64, virtual_tokens: u64, tokens: u64) -> Result<u64, MathError> {
    let (x, y, dy) = (virtual_sol as u128, virtual_tokens as u128, tokens as u128);
    if dy >= y {
        return Err(MathError::EmptyCurve);
    }
    let num = x.checked_mul(dy).ok_or(MathError::Overflow)?;
    let den = y - dy;
    u64::try_from(num.div_ceil(den)).map_err(|_| MathError::Overflow)
}

/// Lamports (before fees) received for selling `tokens`: dx = x · dy / (y + dy), rounded down.
pub fn sol_out(virtual_sol: u64, virtual_tokens: u64, tokens: u64) -> Result<u64, MathError> {
    let (x, y, dy) = (virtual_sol as u128, virtual_tokens as u128, tokens as u128);
    let out = x.checked_mul(dy).ok_or(MathError::Overflow)? / y.checked_add(dy).ok_or(MathError::Overflow)?;
    u64::try_from(out).map_err(|_| MathError::Overflow)
}

/// The most a buyer can spend net of fees, from a gross budget: net = gross · 10000 / (10000 + fee).
pub fn net_of_fee(gross: u64) -> u64 {
    ((gross as u128) * 10_000 / (10_000 + FEE_BPS as u128)) as u64
}

pub fn fee_on(amount: u64) -> u64 {
    ((amount as u128) * FEE_BPS as u128 / 10_000) as u64
}

/// Spot price in lamports per whole token: x / y, scaled.
pub fn price_lamports_per_token(virtual_sol: u64, virtual_tokens: u64) -> f64 {
    virtual_sol as f64 / virtual_tokens as f64 * ONE_TOKEN as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selling_the_whole_curve_raises_about_85_sol() {
        let sol = sol_in_for_tokens(VIRTUAL_SOL, VIRTUAL_TOKENS, CURVE_SUPPLY).unwrap();
        let raised = sol as f64 / LAMPORTS_PER_SOL as f64;
        assert!((raised - 85.0).abs() < 0.05, "raised {raised} SOL");
    }

    #[test]
    fn starting_price_matches_virtual_reserves() {
        // 30 SOL / 1.073B tokens ≈ 0.000000028 SOL per token (≈ 28 lamports)
        let p = price_lamports_per_token(VIRTUAL_SOL, VIRTUAL_TOKENS);
        assert!((p - 27.96).abs() < 0.01, "{p}");
    }

    #[test]
    fn buy_then_sell_never_returns_more_sol() {
        for sol in [1u64, 1_000, LAMPORTS_PER_SOL, 50 * LAMPORTS_PER_SOL] {
            let out = tokens_out(VIRTUAL_SOL, VIRTUAL_TOKENS, sol).unwrap();
            let back = sol_out(VIRTUAL_SOL + sol, VIRTUAL_TOKENS - out, out).unwrap();
            assert!(back <= sol, "bought with {sol}, sold for {back}");
        }
    }

    #[test]
    fn k_never_decreases_on_buys() {
        let (mut x, mut y) = (VIRTUAL_SOL, VIRTUAL_TOKENS);
        let k0 = x as u128 * y as u128;
        for i in 1..200u64 {
            let dx = i * 12_345_678;
            let dy = tokens_out(x, y, dx).unwrap();
            x += dx;
            y -= dy;
            assert!(x as u128 * y as u128 >= k0);
        }
    }

    #[test]
    fn exact_tokens_quote_is_enough() {
        let need = sol_in_for_tokens(VIRTUAL_SOL, VIRTUAL_TOKENS, 1_000_000 * ONE_TOKEN).unwrap();
        assert!(tokens_out(VIRTUAL_SOL, VIRTUAL_TOKENS, need).unwrap() >= 1_000_000 * ONE_TOKEN);
        assert!(tokens_out(VIRTUAL_SOL, VIRTUAL_TOKENS, need - 1).unwrap() < 1_000_000 * ONE_TOKEN);
    }

    #[test]
    fn fees() {
        assert_eq!(fee_on(LAMPORTS_PER_SOL), 10_000_000);
        let net = net_of_fee(101 * LAMPORTS_PER_SOL / 100);
        assert_eq!(net + fee_on(net), 1_010_000_000);
    }
}
