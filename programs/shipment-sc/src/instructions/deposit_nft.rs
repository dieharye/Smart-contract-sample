use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{ self, Mint, Token, TokenAccount, Transfer },
};
use mpl_token_metadata::accounts::Metadata;
use solana_program::pubkey::Pubkey;

#[derive(Accounts)]
#[instruction(collection: Pubkey)]
pub struct DepositNft<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, seeds = [GLOBAL_AUTHORITY_SEED.as_ref()], bump)]
    pub global_pool: Account<'info, GlobalPool>,

    #[account(
        mut,
        seeds = [USER_POOL_SEED.as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_pool: Account<'info, UserPool>,

    #[account(seeds = [COLLECTION_POOL_SEED.as_ref(), collection.as_ref()], bump)]
    pub collection_pool: Account<'info, CollectionPool>,

    pub token_mint: Box<Account<'info, Mint>>,
    /// CHECK: instruction will fail if wrong metadata is supplied
    #[account(mut)]
    pub mint_metadata: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        seeds = [NFT_DEPOSIT_SEED.as_ref(), token_mint.key().as_ref()],
        bump,
        payer = user,
        space = NftDeposit::DATA_SIZE
    )]
    pub deposit_state: Account<'info, NftDeposit>,

    #[account(
        mut, 
        token::mint = token_mint, 
        token::authority = user,
    )]
    pub token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        associated_token::mint = token_mint,
        associated_token::authority = global_pool,
        payer = user
    )]
    pub dest_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: intstruction will fail if wrong program is supplied
    pub token_metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl DepositNft<'_> {
    pub fn process_instruction(
        ctx: Context<DepositNft>,
        collection: Pubkey,
        user: String
    ) -> Result<()> {
        let global_pool = &mut ctx.accounts.global_pool;
        let user_pool = &mut ctx.accounts.user_pool;
        let deposit_state = &mut ctx.accounts.deposit_state;

        // Check user pool owner matched with signed user
        require!(user_pool.address.eq(&ctx.accounts.user.key()), ShipmentError::InvalidOwner);

        // Check if deposit possible
        require!(deposit_state.status == 0, ShipmentError::AlreadyDeposited);

        // Verify metadata is legit
        let nft_metadata = Metadata::safe_deserialize(
            &mut ctx.accounts.mint_metadata.to_account_info().data.borrow_mut()
        ).unwrap();

        // Check if this NFT is the wanted collection and verified
        let mut valid: u8 = 0;
        if let Some(meta_collection) = nft_metadata.collection {
            msg!("collection: {}", meta_collection.key.to_string());
            if meta_collection.key.eq(&collection) {
                valid = 1;
            }
        } else {
            return Err(error!(ShipmentError::MetadataCreatorParseError));
        }
        if let Some(creators) = nft_metadata.creators {
            for creator in creators {
                if creator.address.eq(&collection) {
                    valid = 1;
                    break;
                }
            }
        } else {
            return Err(error!(ShipmentError::MetadataCreatorParseError));
        }

        require!(valid == 1, ShipmentError::InvalidCollection);

        // Transfer NFT to global pool
        let token_program = ctx.accounts.token_program.to_account_info();
        let cpi_accounts = Transfer {
            from: ctx.accounts.token_account.to_account_info(),
            to: ctx.accounts.dest_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(CpiContext::new(token_program.clone(), cpi_accounts), 1)?;

        // Update nft deposit info
        let timestamp = Clock::get()?.unix_timestamp;

        deposit_state.reset();
        deposit_state.owner = ctx.accounts.user.key();
        deposit_state.user = user;
        deposit_state.mint = ctx.accounts.token_mint.key();
        deposit_state.created = timestamp;
        deposit_state.status = 1; // deposited

        user_pool.deposit_count += 1;
        global_pool.total_deposit_count += 1;

        Ok(())
    }
}
