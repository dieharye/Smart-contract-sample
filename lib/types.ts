import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface GlobalPool {
  superAdmin: PublicKey;
  treasury: PublicKey;
  totalDepositCount: anchor.BN;
}

export interface UserPool {
  address: PublicKey;
  depositCount: anchor.BN;
  admin: boolean;
  updater: boolean;
}
export const USER_POOL_SIZE = 56;
export interface CollectionPool {
  address: PublicKey;
  allowed: boolean;
}

export interface NftDeposit {
  owner: PublicKey;
  mint: PublicKey;
  created: anchor.BN;
  status: DepositStatus;
  locked: boolean;
  user: string;
}

export enum DepositStatus {
  CREATED = 0,
  COPY_PREPARED,
  SHIPPED,
  DELIVERED,
}
export const NFT_DEPOSIT_SIZE = 112;
