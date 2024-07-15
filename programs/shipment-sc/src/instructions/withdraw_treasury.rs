use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ self, Mint, Token, TokenAccount, Transfer },
};

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub user: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
        has_one = treasury
    )]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(seeds = [USER_POOL_SEED.as_ref(), admin.key().as_ref()], bump)]
    pub admin_pool: Account<'info, UserPool>,

    #[account(
        mut,
        seeds = [USER_POOL_SEED.as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_pool: Account<'info, UserPool>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [NFT_DEPOSIT_SEED.as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub deposit_state: Account<'info, NftDeposit>,

    pub treasury: SystemAccount<'info>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = global_pool,
    )]
    pub dest_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        associated_token::mint = token_mint,
        associated_token::authority = treasury,
        payer = admin
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl WithdrawTreasury<'_> {
    pub fn process_instruction(ctx: Context<WithdrawTreasury>) -> Result<()> {
        let global_pool = &mut ctx.accounts.global_pool;
        let admin_pool = &mut ctx.accounts.admin_pool;
        let user_pool = &mut ctx.accounts.user_pool;
        let deposit_state = &mut ctx.accounts.deposit_state;

        validate_admin(&global_pool, &admin_pool, &ctx.accounts.admin.key())?;

        require!(user_pool.address.eq(&ctx.accounts.user.key()), ShipmentError::InvalidOwner);
        require!(deposit_state.owner.eq(&ctx.accounts.user.key()), ShipmentError::InvalidOwner);
        require!(deposit_state.mint.eq(&ctx.accounts.token_mint.key()), ShipmentError::InvalidNFTAddress);

        // Validate if withdraw enabled
        require!(deposit_state.locked == false, ShipmentError::DisabledWithdrawal);

        // Validate if deposit exist
        require!(deposit_state.status != 0, ShipmentError::NotDeposited);

        let seeds = &[GLOBAL_AUTHORITY_SEED.as_bytes(), &[ctx.bumps.global_pool]];
        let signer = &[&seeds[..]];
        let token_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.dest_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: global_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(token_program.clone(), cpi_accounts, signer),
            1
        )?;

        deposit_state.reset();
        user_pool.deposit_count -= 1;
        global_pool.total_deposit_count -= 1;

        Ok(())
    }
}
