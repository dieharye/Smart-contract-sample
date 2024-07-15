use crate::*;

pub fn validate_admin(
    global_pool: &GlobalPool,
    user_pool: &UserPool,
    admin: &Pubkey
) -> Result<()> {
    if !global_pool.super_admin.eq(admin) {
        require!(user_pool.address.eq(admin) && user_pool.admin, ShipmentError::InvalidAdmin);
    }

    Ok(())
}
