use crate::*;
use anchor_spl::token::{ self, Burn, CloseAccount, Mint, Token, TokenAccount };
use solana_program::pubkey::Pubkey;

#[derive(Accounts)]
pub struct FinalizeDeposit<'info> {
    #[account(mut)]
    pub updater: Signer<'info>,

    pub user: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
        has_one = treasury
    )]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(seeds = [USER_POOL_SEED.as_ref(), updater.key().as_ref()], bump)]
    pub updater_pool: Account<'info, UserPool>,

    #[account(
        mut,
        seeds = [USER_POOL_SEED.as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_pool: Account<'info, UserPool>,

    #[account(mut)]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [NFT_DEPOSIT_SEED.as_ref(), token_mint.key().as_ref()],
        bump,
        close = treasury,
    )]
    pub deposit_state: Account<'info, NftDeposit>,

    #[account(mut)]
    pub treasury: SystemAccount<'info>,

    #[account(
        mut, 
        token::mint = token_mint, 
        token::authority = global_pool,
    )]
    pub dest_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl FinalizeDeposit<'_> {
    pub fn process_instruction(ctx: Context<FinalizeDeposit>) -> Result<()> {
        let global_pool = &mut ctx.accounts.global_pool;
        let user_pool = &mut ctx.accounts.user_pool;
        let updater_pool = &mut ctx.accounts.updater_pool;
        let deposit_state = &mut ctx.accounts.deposit_state;

        validate_updater(&global_pool, &updater_pool, &ctx.accounts.updater.key())?;

        // Check user pool owner matched with signed user
        require!(user_pool.address.eq(&ctx.accounts.user.key()), ShipmentError::InvalidOwner);

        // Check if deposit possible
        require!(deposit_state.status != 0, ShipmentError::NotDeposited);

        // Burn deposit NFT
        let seeds = &[GLOBAL_AUTHORITY_SEED.as_bytes(), &[ctx.bumps.global_pool]];
        let signer = &[&seeds[..]];
        let token_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.dest_token_account.to_account_info(),
            authority: global_pool.to_account_info(),
        };
        token::burn(CpiContext::new_with_signer(token_program.clone(), cpi_accounts, signer), 1)?;

        // Close ATA
        let cpi_accounts = CloseAccount {
            account: ctx.accounts.dest_token_account.to_account_info(),
            destination: ctx.accounts.treasury.to_account_info(),
            authority: global_pool.to_account_info(),
        };
        token::close_account(
            CpiContext::new_with_signer(token_program.clone(), cpi_accounts, signer)
        )?;

        user_pool.deposit_count -= 1;
        global_pool.total_deposit_count -= 1;

        Ok(())
    }
}
