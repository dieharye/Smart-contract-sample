import * as anchor from '@coral-xyz/anchor';
import {
  PublicKey,
  Connection,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import { METAPLEX, getAssociatedTokenAccount, getMetadata } from './util';
import {
  COLLECTION_POOL_SEED,
  GLOBAL_AUTHORITY_SEED,
  NFT_DEPOSIT_SEED,
  USER_POOL_SEED,
} from './constant';
import {
  CollectionPool,
  DepositStatus,
  GlobalPool,
  NFT_DEPOSIT_SIZE,
  NftDeposit,
  USER_POOL_SIZE,
  UserPool,
} from './types';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';

export const createInitializeIx = async (
  admin: PublicKey,
  treasury: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  console.log('globalPool: ', globalPool.toBase58());

  const ix = await program.methods
    .initialize(treasury)
    .accounts({
      admin,
      globalPool,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  return ix;
};

/**
 * Transfer super admin of the program as old super admin
 */
export const transferSuperAdminIx = async (
  admin: PublicKey,
  newAdminAddr: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  const ix = program.methods
    .transferSuperAdmin(newAdminAddr)
    .accounts({
      admin,
      globalPool,
    })
    .instruction();

  return ix;
};

/**
 * Change treasury address as admin
 */
export const changeTreasuryIx = async (
  admin: PublicKey,
  newTreasury: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  const adminPool = findUserPoolKey(admin, program.programId);

  const ix = await program.methods
    .changeTreasury(newTreasury)
    .accounts({
      admin,
      globalPool,
      adminPool,
    })
    .instruction();

  return ix;
};

/**
 * Initialize UserPool PDA
 */
export const createInitUserIx = async (
  payer: PublicKey,
  user: PublicKey,
  program: anchor.Program
) => {
  const userPool = findUserPoolKey(user, program.programId);
  console.log('userPool: ', userPool.toString());

  const ix = await program.methods
    .initUser()
    .accounts({
      payer,
      user,
      userPool,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  return ix;
};

/**
 * Change admin / updater role of user as admin
 */
export const createChangeRoleIx = async (
  admin: PublicKey,
  user: PublicKey,
  program: anchor.Program,
  isAdmin: boolean | null,
  isUpdater: boolean | null
) => {
  const globalPool = findGlobalPoolKey(program.programId);

  const adminPool = findUserPoolKey(admin, program.programId);
  console.log(`adminPool: ${adminPool.toString()}`);

  const userPool = findUserPoolKey(user, program.programId);
  console.log(`userPool: ${userPool.toString()}`);

  const ix = await program.methods
    .changeRole(isAdmin, isUpdater)
    .accounts({
      admin,
      user,
      globalPool,
      adminPool,
      userPool,
    })
    .instruction();

  return ix;
};

/**
 * Register collection as admin
 */
export const createRegisterCollectionIx = async (
  admin: PublicKey,
  collection: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);

  const adminPool = findUserPoolKey(admin, program.programId);
  console.log(`adminPool: ${adminPool.toString()}`);

  const collectionPool = findCollectionPoolKey(collection, program.programId);
  console.log(`collectionPool: ${collectionPool.toString()}`);

  const ix = await program.methods
    .registerCollection(collection)
    .accounts({
      admin,
      globalPool,
      adminPool,
      collectionPool,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  return ix;
};

/**
 * Revoke collection as admin
 */
export const createRevokeCollectionIx = async (
  admin: PublicKey,
  collection: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);

  const adminPool = findUserPoolKey(admin, program.programId);
  console.log(`adminPool: ${adminPool.toString()}`);

  const collectionPool = findCollectionPoolKey(collection, program.programId);
  console.log(`collectionPool: ${collectionPool.toString()}`);

  const ix = await program.methods
    .revokeCollection(collection)
    .accounts({
      admin,
      globalPool,
      adminPool,
      collectionPool,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  return ix;
};

/**
 * User deposit NFT
 */
export const createDepositNftTx = async (
  wallet: Wallet,
  userId: string,
  nftMint: PublicKey,
  program: anchor.Program,
  connection: Connection
) => {
  const user = wallet.publicKey;

  const globalPool = findGlobalPoolKey(program.programId);
  const userPool = findUserPoolKey(user, program.programId);
  console.log('userPool: ', userPool.toBase58());

  const tokenAccount = await getAssociatedTokenAccount(user, nftMint);
  console.log('tokenAccount: ', tokenAccount.toBase58());

  const destTokenAccount = await getAssociatedTokenAccount(globalPool, nftMint);
  console.log('destTokenAccount: ', destTokenAccount.toBase58());

  const mintMetadata = await getMetadata(nftMint);
  console.log('mintMetadata: ', mintMetadata.toBase58());

  const metadataAccount = await connection.getAccountInfo(mintMetadata);

  const [metadata] = Metadata.fromAccountInfo(metadataAccount);
  const collection =
    metadata.collection?.key || metadata.data.creators[0].address;
  console.log('collection: ', collection.toBase58());

  const collectionPool = findCollectionPoolKey(collection, program.programId);
  console.log('collectionPool: ', collectionPool.toBase58());

  const depositState = findNftDepositKey(nftMint, program.programId);
  console.log('depositState: ', depositState.toBase58());

  const tx = new Transaction();

  const poolAccount = await connection.getAccountInfo(userPool);
  if (poolAccount === null || poolAccount.data === null) {
    console.log('init User Pool');
    const ix_initUserPool = await createInitUserIx(user, user, program);
    tx.add(ix_initUserPool);
  }

  const ix = await program.methods
    .depositNft(collection, userId)
    .accounts({
      user,
      globalPool,
      userPool,
      collectionPool,
      tokenMint: nftMint,
      mintMetadata,
      depositState,
      tokenAccount,
      destTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenMetadataProgram: METAPLEX,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  tx.add(ix);

  tx.feePayer = user;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const txData = await wallet.signTransaction(tx);

  console.log('signed user: ', user.toBase58());

  return txData.serialize({ requireAllSignatures: false });
};

/**
 * Update able to update the nft deposit status & locked
 */
export const createUpdateDepositIx = async (
  updater: PublicKey,
  depositPda: PublicKey,
  status: DepositStatus | null,
  locked: boolean | null,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  console.log('globalPool: ', globalPool.toBase58());

  const updaterPool = findUserPoolKey(updater, program.programId);
  console.log('updaterPool: ', updaterPool.toBase58());

  const depositData = await getNftDepositData(depositPda, program);
  console.log('depositData: ', depositData);

  const ix = await program.methods
    .updateDeposit(status, locked)
    .accounts({
      updater,
      user: depositData.owner,
      globalPool,
      updaterPool,
      tokenMint: depositData.mint,
      depositState: depositPda,
    })
    .instruction();

  return ix;
};

/**
 * Withdraw deposited Nft as owner or admin
 */
export const createWithdrawOwnerIx = async (
  adminOrOwner: PublicKey,
  depositPda: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  console.log('globalPool =', globalPool.toBase58());

  const payerPool = findUserPoolKey(adminOrOwner, program.programId);
  console.log('payer pool: ', payerPool.toBase58());

  const depositData = await getNftDepositData(depositPda, program);
  console.log('depositData: ', depositData);

  const userPool = findUserPoolKey(depositData.owner, program.programId);
  console.log('user pool: ', userPool.toBase58());

  const userTokenAccount = await getAssociatedTokenAccount(
    depositData.owner,
    depositData.mint
  );
  console.log('user token account: ', userTokenAccount);

  const destTokenAccount = await getAssociatedTokenAccount(
    globalPool,
    depositData.mint
  );
  console.log('dest token account: ', destTokenAccount);

  const ix = await program.methods
    .withdrawOwner()
    .accounts({
      payer: adminOrOwner,
      user: depositData.owner,
      globalPool,
      payerPool,
      userPool,
      tokenMint: depositData.mint,
      depositState: depositPda,
      destTokenAccount,
      userTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix;
};

/**
 * Withdraw deposited Nft to treasury as admin
 */
export const createWithdrawTreasuryIx = async (
  admin: PublicKey,
  depositPda: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  console.log('globalPool =', globalPool.toBase58());

  const adminPool = findUserPoolKey(admin, program.programId);
  console.log('admin pool: ', adminPool.toBase58());

  const depositData = await getNftDepositData(depositPda, program);
  console.log('depositData: ', depositData);

  const userPool = findUserPoolKey(depositData.owner, program.programId);
  console.log('user pool: ', userPool.toBase58());

  const destTokenAccount = await getAssociatedTokenAccount(
    globalPool,
    depositData.mint
  );
  console.log('dest token account: ', destTokenAccount);

  const { data } = await getGlobalState(program);
  const treasuryTokenAccount = await getAssociatedTokenAccount(
    data.treasury,
    depositData.mint
  );
  console.log('treasury token account: ', treasuryTokenAccount);

  const ix = await program.methods
    .withdrawTreasury()
    .accounts({
      admin,
      user: depositData.owner,
      globalPool,
      adminPool,
      userPool,
      tokenMint: depositData.mint,
      depositState: depositPda,
      treasury: data.treasury,
      destTokenAccount,
      treasuryTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix;
};

/**
 * Update finalize Nft deposit
 */
export const createFinalizeDepositIx = async (
  updater: PublicKey,
  depositPda: PublicKey,
  program: anchor.Program
) => {
  const globalPool = findGlobalPoolKey(program.programId);
  console.log('globalPool =', globalPool.toBase58());

  const { data } = await getGlobalState(program);

  const updaterPool = findUserPoolKey(updater, program.programId);
  console.log('updater pool: ', updaterPool.toBase58());

  const depositData = await getNftDepositData(depositPda, program);
  console.log('depositData: ', depositData);

  const userPool = findUserPoolKey(depositData.owner, program.programId);
  console.log('user pool: ', userPool.toBase58());

  const destTokenAccount = await getAssociatedTokenAccount(
    globalPool,
    depositData.mint
  );
  console.log('dest token account: ', destTokenAccount);

  const ix = await program.methods
    .finalizeDeposit()
    .accounts({
      updater,
      user: depositData.owner,
      globalPool,
      updaterPool,
      userPool,
      tokenMint: depositData.mint,
      depositState: depositPda,
      treasury: data.treasury,
      destTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      SystemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix;
};

/**
 * Fetch global pool PDA data
 */

export const findGlobalPoolKey = (programId: PublicKey) => {
  const [globalPool] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    programId
  );
  return globalPool;
};
export const getGlobalState = async (program: anchor.Program) => {
  const globalPool = findGlobalPoolKey(program.programId);
  const globalPoolData = await program.account.globalPool.fetch(globalPool);

  return {
    key: globalPool,
    data: globalPoolData as unknown as GlobalPool,
  };
};

/**
 * Fetch user pool PDA data
 */

export const findUserPoolKey = (user: PublicKey, programId: PublicKey) => {
  const [userPool] = PublicKey.findProgramAddressSync(
    [Buffer.from(USER_POOL_SEED), user.toBytes()],
    programId
  );
  return userPool;
};
export const getUserPoolState = async (
  user: PublicKey,
  program: anchor.Program
) => {
  const userPool = findUserPoolKey(user, program.programId);
  const userPoolData = await program.account.userPool.fetch(userPool);

  return {
    key: userPool,
    data: userPoolData as unknown as UserPool,
  };
};

export const findAllUserPools = async (program: anchor.Program) => {
  const poolAccs = await program.provider.connection.getProgramAccounts(
    program.programId,
    {
      filters: [
        {
          dataSize: USER_POOL_SIZE,
        },
      ],
    }
  );

  return poolAccs.map((poolAcc) => {
    let data: any = program.coder.accounts.decode<UserPool>(
      'userPool',
      poolAcc.account.data
    );
    data.address = data.address.toBase58();
    data.depositCount = data.depositCount.toNumber();
    return {
      key: poolAcc.pubkey.toBase58(),
      data,
    };
  });
};

/**
 * Fetch collection pool PDA data
 */

export const findCollectionPoolKey = (
  collection: PublicKey,
  programId: PublicKey
) => {
  const [collectionPool] = PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_POOL_SEED), collection.toBytes()],
    programId
  );
  return collectionPool;
};
export const getCollectionPoolState = async (
  collection: PublicKey,
  program: anchor.Program
) => {
  const collectionPool = findCollectionPoolKey(collection, program.programId);
  const collectionPoolData = await program.account.collectionPool.fetch(
    collectionPool
  );

  return {
    key: collectionPool,
    data: collectionPoolData as unknown as CollectionPool,
  };
};

/**
 * Fetch nft deposit state PDA data
 */

export const findNftDepositKey = (mint: PublicKey, programId: PublicKey) => {
  const [nftDeposit] = PublicKey.findProgramAddressSync(
    [Buffer.from(NFT_DEPOSIT_SEED), mint.toBytes()],
    programId
  );
  return nftDeposit;
};
export const getNftDepositState = async (
  mint: PublicKey,
  program: anchor.Program
) => {
  const nftDeposit = findNftDepositKey(mint, program.programId);
  const nftDepositData = await program.account.nftDeposit.fetch(nftDeposit);

  return {
    key: nftDeposit,
    data: nftDepositData as unknown as NftDeposit,
  };
};

export const getNftDepositData = async (
  pda: PublicKey,
  program: anchor.Program
) => {
  const nftDepositData = await program.account.nftDeposit.fetch(pda);

  return nftDepositData as unknown as NftDeposit;
};

export interface IFindDepositFilter {
  owner?: PublicKey;
  locked?: boolean;
  status?: DepositStatus;
}

export const findAllDeposits = async (
  { owner, locked, status }: IFindDepositFilter,
  program: anchor.Program
) => {
  let filters: anchor.web3.GetProgramAccountsFilter[] = [
    {
      dataSize: NFT_DEPOSIT_SIZE,
    },
  ];

  if (owner) {
    filters.push({
      memcmp: { offset: 8, bytes: owner.toBase58() },
    });
  }

  if (status !== undefined) {
    const filter_str = bs58.encode([status as number]);
    filters.push({
      memcmp: { offset: 80, bytes: filter_str },
    });
  }

  if (locked !== undefined) {
    const filter_str = bs58.encode(Uint8Array.from([locked ? 1 : 0]));
    filters.push({
      memcmp: { offset: 81, bytes: filter_str },
    });
  }

  const poolAccs = await program.provider.connection.getProgramAccounts(
    program.programId,
    { filters, encoding: 'base64' }
  );

  return poolAccs.map((poolAcc) => {
    let data: any = program.coder.accounts.decode<NftDeposit>(
      'nftDeposit',
      poolAcc.account.data
    );
    data.owner = data.owner.toBase58();
    data.mint = data.mint.toBase58();
    data.created = data.created.toNumber();
    return {
      key: poolAcc.pubkey.toBase58(),
      data,
    };
  });
};
