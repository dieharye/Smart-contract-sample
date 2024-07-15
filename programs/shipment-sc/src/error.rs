use crate::*;

#[error_code]
pub enum ShipmentError {
    #[msg("Admin address dismatch")]
    InvalidAdmin,
    #[msg("Updater address dismatch")]
    InvalidUpdater,
    #[msg("Metadata address is invalid")]
    InvalidMetadata,
    #[msg("Collection is invalid")]
    InvalidCollection,
    #[msg("Can not parse creators in metadata")]
    MetadataCreatorParseError,
    #[msg("Nft is already deposited")]
    AlreadyDeposited,
    #[msg("Nft is not deposited already")]
    NotDeposited,
    #[msg("NFT Owner key mismatch")]
    InvalidOwner,
    #[msg("No Matching NFT to withdraw")]
    InvalidNFTAddress,
    #[msg("Withdrawal is disabled")]
    DisabledWithdrawal,
}
