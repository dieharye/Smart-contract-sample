use crate::*;

#[derive(Accounts)]
#[instruction(collection: Pubkey)]
pub struct RegisterCollection<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(seeds = [GLOBAL_AUTHORITY_SEED.as_ref()], bump)]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(seeds = [USER_POOL_SEED.as_ref(), admin.key().as_ref()], bump)]
    pub admin_pool: Account<'info, UserPool>,

    #[account(
        init_if_needed,
        seeds = [COLLECTION_POOL_SEED.as_ref(), collection.as_ref()],
        bump,
        payer = admin,
        space = CollectionPool::DATA_SIZE
    )]
    pub collection_pool: Account<'info, CollectionPool>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl RegisterCollection<'_> {
    pub fn process_instruction(ctx: &mut Context<Self>, collection: Pubkey) -> Result<()> {
        let collection_pool = &mut ctx.accounts.collection_pool;

        validate_admin(
            &ctx.accounts.global_pool,
            &ctx.accounts.admin_pool,
            ctx.accounts.admin.key
        )?;

        collection_pool.address = collection;
        collection_pool.allowed = true;

        Ok(())
    }
}
