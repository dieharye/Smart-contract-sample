use anchor_lang::{prelude::*, AnchorDeserialize};

pub mod constant;
pub mod error;
pub mod instructions;
pub mod state;
pub mod validations;
use constant::*;
use error::*;
use instructions::*;
use state::*;
use validations::*;

declare_id!("37oMYvqhv2jsMbQw8ZPKKfxmRvFwvRyi6joH5ueP8mAr");

#[program]
pub mod shipment_sc {
    use super::*;

    /**
     * Initialize global pool
     * super admin sets to the caller of this instruction
     */
    pub fn initialize(mut ctx: Context<Initialize>, treasury: Pubkey) -> Result<()> {
        Initialize::process_instruction(&mut ctx, treasury)
    }

    //  Super admin can transfer its authority
    pub fn transfer_super_admin(
        mut ctx: Context<TransferSuperAdmin>,
        new_admin: Pubkey,
    ) -> Result<()> {
        TransferSuperAdmin::process_instruction(&mut ctx, new_admin)
    }

    //  Admin can set treasury
    pub fn change_treasury(mut ctx: Context<ChangeTreasury>, new_treasury: Pubkey) -> Result<()> {
        ChangeTreasury::process_instruction(&mut ctx, new_treasury)
    }

    //  Anyone can initialize user pool
    pub fn init_user(mut ctx: Context<InitUser>) -> Result<()> {
        InitUser::process_instruction(&mut ctx)
    }

    //  Admin can set user role
    pub fn change_role(
        mut ctx: Context<ChangeRole>,
        admin: Option<bool>,
        updater: Option<bool>,
    ) -> Result<()> {
        ChangeRole::process_instruction(&mut ctx, admin, updater)
    }

    //  Admin can register collection
    pub fn register_collection(
        mut ctx: Context<RegisterCollection>,
        collection: Pubkey,
    ) -> Result<()> {
        RegisterCollection::process_instruction(&mut ctx, collection)
    }

    //  Admin can revoke collection
    pub fn revoke_collection(mut ctx: Context<RevokeCollection>, collection: Pubkey) -> Result<()> {
        RevokeCollection::process_instruction(&mut ctx, collection)
    }

    /**
     * User can deposit NFT
     */
    pub fn deposit_nft(ctx: Context<DepositNft>, collection: Pubkey, user: String) -> Result<()> {
        DepositNft::process_instruction(ctx, collection, user)
    }

    /**
     * Admin & updater can update nft deposit status
     */
    pub fn update_deposit(
        ctx: Context<UpdateDeposit>,
        status: Option<u8>,
        locked: Option<bool>,
    ) -> Result<()> {
        UpdateDeposit::process_instruction(ctx, status, locked)
    }

    /**
     * Admin / Owner can withdraw nft to owner
     */
    pub fn withdraw_owner(ctx: Context<WithdrawOwner>) -> Result<()> {
        WithdrawOwner::process_instruction(ctx)
    }

    /**
     * Admin can withdraw nft to treasury
     */
    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>) -> Result<()> {
        WithdrawTreasury::process_instruction(ctx)
    }

    /**
     * Admin & updater can finalize deposit
     */
    pub fn finalize_deposit(ctx: Context<FinalizeDeposit>) -> Result<()> {
        FinalizeDeposit::process_instruction(ctx)
    }
}
