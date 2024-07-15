use crate::*;

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub user: SystemAccount<'info>,

    //  User pool stores user's stake info
    #[account(
        init,
        seeds = [USER_POOL_SEED.as_ref(), user.key().as_ref()],
        bump,
        payer = payer,
        space = UserPool::DATA_SIZE
    )]
    pub user_pool: Account<'info, UserPool>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl InitUser<'_> {
    pub fn process_instruction(ctx: &mut Context<Self>) -> Result<()> {
        let user_pool = &mut ctx.accounts.user_pool;

        user_pool.address = ctx.accounts.user.key();
        user_pool.admin = false;
        user_pool.updater = false;

        Ok(())
    }
}
