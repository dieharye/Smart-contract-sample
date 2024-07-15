use crate::*;

#[derive(Accounts)]
pub struct ChangeRole<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    pub user: SystemAccount<'info>,

    #[account(seeds = [GLOBAL_AUTHORITY_SEED.as_ref()], bump)]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(seeds = [USER_POOL_SEED.as_ref(), admin.key().as_ref()], bump)]
    pub admin_pool: Account<'info, UserPool>,

    #[account(mut, seeds = [USER_POOL_SEED.as_ref(), user.key().as_ref()], bump)]
    pub user_pool: Account<'info, UserPool>,
}

impl ChangeRole<'_> {
    pub fn process_instruction(
        ctx: &mut Context<Self>,
        admin: Option<bool>,
        updater: Option<bool>
    ) -> Result<()> {
        let user_pool = &mut ctx.accounts.user_pool;

        validate_admin(
            &ctx.accounts.global_pool,
            &ctx.accounts.admin_pool,
            &ctx.accounts.admin.key
        )?;

        user_pool.admin = admin.unwrap_or(user_pool.admin);
        user_pool.updater = updater.unwrap_or(user_pool.updater);

        Ok(())
    }
}
