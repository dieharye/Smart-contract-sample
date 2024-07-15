use crate::*;

#[derive(Accounts)]
pub struct ChangeTreasury<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(seeds = [USER_POOL_SEED.as_ref(), admin.key().as_ref()], bump)]
    pub admin_pool: Account<'info, UserPool>,
}

impl ChangeTreasury<'_> {
    pub fn process_instruction(ctx: &mut Context<Self>, new_treasury: Pubkey) -> Result<()> {
        let global_pool = &mut ctx.accounts.global_pool;

        // Validate super admin
        validate_admin(&global_pool, &ctx.accounts.admin_pool, &ctx.accounts.admin.key)?;

        global_pool.treasury = new_treasury;

        Ok(())
    }
}
