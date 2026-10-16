//! Bonding-curve launchpad, course Unit 20 (launchpads) and Unit 23 (Solana engineering).
//!
//! create: a new SPL mint whose mint authority is the curve PDA (nobody else can ever mint)
//! buy:    pay SOL (+1% creator fee), receive tokens minted along the curve
//! sell:   burn tokens, receive SOL (−1% creator fee) from the curve account
//! When CURVE_SUPPLY tokens are sold the curve is complete ("graduates") and trading stops.
//! Migrating liquidity to an AMM is an exercise (see README).

use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount};

pub mod curve;
use curve::{CURVE_SUPPLY, DECIMALS, VIRTUAL_SOL, VIRTUAL_TOKENS};

declare_id!("GB7GRxCbmaySDHrMTarjxj6jn6fDLVPJGVLQfetu5dRA");

#[program]
pub mod solana_launchpad {
    use super::*;

    pub fn create(ctx: Context<Create>) -> Result<()> {
        let c = &mut ctx.accounts.curve;
        c.creator = ctx.accounts.creator.key();
        c.mint = ctx.accounts.mint.key();
        c.virtual_sol = VIRTUAL_SOL;
        c.virtual_tokens = VIRTUAL_TOKENS;
        c.real_sol = 0;
        c.tokens_sold = 0;
        c.complete = false;
        c.bump = ctx.bumps.curve;
        emit!(Created { mint: c.mint, creator: c.creator });
        Ok(())
    }

    /// Spend at most `max_sol_in` lamports (fee included). The last buyer is capped at the remaining supply
    /// and only pays for what they get.
    pub fn buy(ctx: Context<Buy>, max_sol_in: u64, min_tokens_out: u64) -> Result<()> {
        let c = &ctx.accounts.curve;
        require!(!c.complete, LaunchError::CurveComplete);
        require!(max_sol_in > 0, LaunchError::ZeroAmount);

        let remaining = CURVE_SUPPLY - c.tokens_sold;
        let mut net = curve::net_of_fee(max_sol_in);
        let mut out = curve::tokens_out(c.virtual_sol, c.virtual_tokens, net).map_err(math)?;
        if out >= remaining {
            out = remaining;
            net = curve::sol_in_for_tokens(c.virtual_sol, c.virtual_tokens, remaining).map_err(math)?;
        }
        require!(out > 0, LaunchError::ZeroAmount);
        require!(out >= min_tokens_out, LaunchError::SlippageExceeded);
        let fee = curve::fee_on(net);

        // SOL: buyer -> curve account (reserves) and buyer -> creator (fee)
        let sys = ctx.accounts.system_program.to_account_info();
        system_program::transfer(
            CpiContext::new(sys.clone(), Transfer { from: ctx.accounts.buyer.to_account_info(), to: ctx.accounts.curve.to_account_info() }),
            net,
        )?;
        if fee > 0 {
            system_program::transfer(
                CpiContext::new(sys, Transfer { from: ctx.accounts.buyer.to_account_info(), to: ctx.accounts.creator.to_account_info() }),
                fee,
            )?;
        }

        // Tokens: minted by the curve PDA, which is the mint authority
        let mint_key = ctx.accounts.mint.key();
        let seeds: &[&[u8]] = &[b"curve", mint_key.as_ref(), &[ctx.accounts.curve.bump]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.buyer_ata.to_account_info(),
                    authority: ctx.accounts.curve.to_account_info(),
                },
                &[seeds],
            ),
            out,
        )?;

        let c = &mut ctx.accounts.curve;
        c.virtual_sol += net;
        c.virtual_tokens -= out;
        c.real_sol += net;
        c.tokens_sold += out;
        if c.tokens_sold == CURVE_SUPPLY {
            c.complete = true;
            emit!(Graduated { mint: c.mint, real_sol: c.real_sol });
        }
        emit!(Trade { mint: c.mint, user: ctx.accounts.buyer.key(), is_buy: true, sol: net, tokens: out, fee, virtual_sol: c.virtual_sol, virtual_tokens: c.virtual_tokens });
        Ok(())
    }

    pub fn sell(ctx: Context<Sell>, tokens_in: u64, min_sol_out: u64) -> Result<()> {
        let c = &ctx.accounts.curve;
        require!(!c.complete, LaunchError::CurveComplete);
        require!(tokens_in > 0, LaunchError::ZeroAmount);

        let gross = curve::sol_out(c.virtual_sol, c.virtual_tokens, tokens_in).map_err(math)?;
        require!(gross <= c.real_sol, LaunchError::InsufficientReserves);
        let fee = curve::fee_on(gross);
        let net = gross - fee;
        require!(net >= min_sol_out, LaunchError::SlippageExceeded);

        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.seller_ata.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            tokens_in,
        )?;

        // The curve account is owned by this program, so it can debit its own lamports directly.
        ctx.accounts.curve.sub_lamports(gross)?;
        ctx.accounts.seller.add_lamports(net)?;
        ctx.accounts.creator.add_lamports(fee)?;

        let c = &mut ctx.accounts.curve;
        c.virtual_sol -= gross;
        c.virtual_tokens += tokens_in;
        c.real_sol -= gross;
        c.tokens_sold -= tokens_in;
        emit!(Trade { mint: c.mint, user: ctx.accounts.seller.key(), is_buy: false, sol: net, tokens: tokens_in, fee, virtual_sol: c.virtual_sol, virtual_tokens: c.virtual_tokens });
        Ok(())
    }
}

fn math(_: curve::MathError) -> Error {
    error!(LaunchError::MathOverflow)
}

#[account]
#[derive(InitSpace)]
pub struct Curve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub virtual_sol: u64,
    pub virtual_tokens: u64,
    pub real_sol: u64,
    pub tokens_sold: u64,
    pub complete: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    /// A fresh keypair. Mint authority is the curve PDA; there is no freeze authority.
    #[account(init, payer = creator, mint::decimals = DECIMALS, mint::authority = curve)]
    pub mint: Account<'info, Mint>,
    #[account(init, payer = creator, space = 8 + Curve::INIT_SPACE, seeds = [b"curve", mint.key().as_ref()], bump)]
    pub curve: Account<'info, Curve>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = curve.bump, has_one = mint, has_one = creator)]
    pub curve: Account<'info, Curve>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    /// CHECK: only receives the fee; `has_one = creator` on the curve pins its address.
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    #[account(init_if_needed, payer = buyer, associated_token::mint = mint, associated_token::authority = buyer)]
    pub buyer_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut, seeds = [b"curve", mint.key().as_ref()], bump = curve.bump, has_one = mint, has_one = creator)]
    pub curve: Account<'info, Curve>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    /// CHECK: only receives the fee; `has_one = creator` on the curve pins its address.
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = mint, associated_token::authority = seller)]
    pub seller_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct Created {
    pub mint: Pubkey,
    pub creator: Pubkey,
}

#[event]
pub struct Trade {
    pub mint: Pubkey,
    pub user: Pubkey,
    pub is_buy: bool,
    pub sol: u64,
    pub tokens: u64,
    pub fee: u64,
    pub virtual_sol: u64,
    pub virtual_tokens: u64,
}

#[event]
pub struct Graduated {
    pub mint: Pubkey,
    pub real_sol: u64,
}

#[error_code]
pub enum LaunchError {
    #[msg("The curve has graduated; trading here is closed")]
    CurveComplete,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Price moved past your slippage limit")]
    SlippageExceeded,
    #[msg("Not enough SOL in the curve")]
    InsufficientReserves,
    #[msg("Math overflow")]
    MathOverflow,
}
