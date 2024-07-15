use anchor_spl::token::Mint;

use crate::*;

#[derive(Accounts)]
pub struct UpdateDeposit<'info> {
    #[account(mut)]
    pub updater: Signer<'info>,

    pub user: SystemAccount<'info>,

    #[account(seeds = [GLOBAL_AUTHORITY_SEED.as_ref()], bump)]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(seeds = [USER_POOL_SEED.as_ref(), updater.key().as_ref()], bump)]
    pub updater_pool: Account<'info, UserPool>,

    pub token_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [NFT_DEPOSIT_SEED.as_ref(), token_mint.key().as_ref()],
        bump,
    )]
    pub deposit_state: Account<'info, NftDeposit>,
}

impl UpdateDeposit<'_> {
    pub fn process_instruction(
        ctx: Context<UpdateDeposit>,
        status: Option<u8>,
        locked: Option<bool>
    ) -> Result<()> {
        let global_pool = &mut ctx.accounts.global_pool;
        let updater_pool = &mut ctx.accounts.updater_pool;
        let deposit_state = &mut ctx.accounts.deposit_state;

        validate_updater(&global_pool, &updater_pool, &ctx.accounts.updater.key())?;

        // Check user pool owner matched with signed user
        require!(
            updater_pool.address.eq(&ctx.accounts.updater.key()),
            ShipmentError::InvalidUpdater
        );

        require!(deposit_state.status != 0, ShipmentError::NotDeposited);

        deposit_state.status = status.unwrap_or(deposit_state.status);
        deposit_state.locked = locked.unwrap_or(deposit_state.locked);

        Ok(())
    }
}
