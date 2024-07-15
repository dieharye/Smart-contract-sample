use anchor_lang::prelude::*;

#[account]
pub struct GlobalPool {
    pub super_admin: Pubkey,
    pub treasury: Pubkey,
    pub total_deposit_count: u64,
}

impl GlobalPool {
    pub const DATA_SIZE: usize = 8 + std::mem::size_of::<GlobalPool>();
}

#[account]
pub struct CollectionPool {
    pub address: Pubkey,
    pub allowed: bool,
}

impl CollectionPool {
    pub const DATA_SIZE: usize = 8 + std::mem::size_of::<CollectionPool>();
}

#[account]
pub struct UserPool {
    pub address: Pubkey,
    pub deposit_count: u64,
    pub admin: bool,
    pub updater: bool,
}

impl UserPool {
    pub const DATA_SIZE: usize = 8 + std::mem::size_of::<UserPool>();
}

#[account]
pub struct NftDeposit {
    pub owner: Pubkey, // web3 account wallet address
    pub mint: Pubkey, // nft mint of deposited from user
    pub created: i64, // timestamp when deposit created
    pub status: u8, // deposit status
    pub locked: bool, // if locked
    pub user: String, // uuid of the web2 account
}

impl NftDeposit {
    pub const DATA_SIZE: usize = 8 + std::mem::size_of::<NftDeposit>();

    pub fn reset(&mut self) {
        self.status = 0; // created state
        self.locked = false; // release freeze
    }
}
