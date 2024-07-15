use crate::*;

pub fn validate_updater(
    global_pool: &GlobalPool,
    user_pool: &UserPool,
    updater: &Pubkey
) -> Result<()> {
    if !global_pool.super_admin.eq(updater) {
        require!(
            user_pool.address.eq(updater) && (user_pool.updater || user_pool.admin),
            ShipmentError::InvalidUpdater
        );
    }

    Ok(())
}
