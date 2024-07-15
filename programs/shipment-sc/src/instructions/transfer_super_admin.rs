use crate::*;

#[derive(Accounts)]
pub struct TransferSuperAdmin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_AUTHORITY_SEED.as_ref()],
        bump,
    )]
    pub global_pool: Account<'info, GlobalPool>,
}

impl TransferSuperAdmin<'_> {
    pub fn process_instruction(ctx: &mut Context<Self>, new_admin: Pubkey) -> Result<()> {
        let global_pool = &mut ctx.accounts.global_pool;

        // Validate super admin
        require!(global_pool.super_admin.eq(&ctx.accounts.admin.key), ShipmentError::InvalidAdmin);

        global_pool.super_admin = new_admin;

        Ok(())
    }
}
