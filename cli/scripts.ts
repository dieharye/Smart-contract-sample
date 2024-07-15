import { Program, Wallet, web3 } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { PROGRAM_ID } from '../lib/constant';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';

import { IDL } from '../target/types/shipment_sc';
import {
  changeTreasuryIx,
  createChangeRoleIx,
  createDepositNftTx,
  createFinalizeDepositIx,
  createInitializeIx,
  createInitUserIx,
  createRegisterCollectionIx,
  createRevokeCollectionIx,
  createUpdateDepositIx,
  createWithdrawOwnerIx,
  createWithdrawTreasuryIx,
  findAllDeposits,
  findAllUserPools,
  getCollectionPoolState,
  getGlobalState,
  getNftDepositState,
  getUserPoolState,
  IFindDepositFilter,
  transferSuperAdminIx,
} from '../lib/scripts';
import { DepositStatus } from '../lib/types';

interface ISetConnectionParams {
  cluster: web3.Cluster; // env from CLI global params
  wallet: NodeWallet | Wallet; // needs to be both for TS & CLI differences
  rpc?: string;
  fm?: number;
}

let solConnection: Connection = null;
let program: Program = null;
let provider: anchor.Provider = null;
let payer: NodeWallet | Wallet = null;
let feeMultiplier: number = 1;
let programId = new anchor.web3.PublicKey(PROGRAM_ID);

export const loadWalletFromKeypair = (keypair: string) => {
  console.log('Keypair Path:', keypair);
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(keypair, 'utf-8'))),
    { skipValidation: true }
  );
  const wallet = new NodeWallet(walletKeypair);
  return wallet;
};

export const setConnection = async ({
  cluster,
  wallet,
  rpc,
  fm,
}: ISetConnectionParams) => {
  console.log('Solana Cluster:', cluster);
  console.log('RPC URL:', rpc);
  console.log('Fee Multiplier:', fm);

  if (!rpc) {
    solConnection = new web3.Connection(web3.clusterApiUrl(cluster));
  } else {
    solConnection = new web3.Connection(rpc);
  }

  // Configure the client to use the local cluster.
  anchor.setProvider(
    new anchor.AnchorProvider(solConnection, wallet, {
      skipPreflight: true,
      commitment: 'confirmed',
    })
  );
  payer = wallet;

  provider = anchor.getProvider();
  console.log('Wallet Address: ', wallet.publicKey.toBase58());

  // Generate the program client from IDL.
  program = new anchor.Program(IDL as anchor.Idl, programId);
  console.log('ProgramId: ', program.programId.toBase58());

  if (fm) {
    feeMultiplier = fm;
    console.log('Fee Multiplier: ', fm);
  }
};

export const getGasIxs = () => {
  if (feeMultiplier === 1) return [];

  const updateCpIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: Math.floor(5_000_000 * feeMultiplier),
  });
  const updateCuIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.floor(200_000 * feeMultiplier),
  });
  return [updateCpIx, updateCuIx];
};

export const initProject = async (treasury: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createInitializeIx(payer.publicKey, treasury, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const transferAuthority = async (authority: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await transferSuperAdminIx(payer.publicKey, authority, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const initUser = async (user: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createInitUserIx(payer.publicKey, user, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const changeRole = async (
  user: PublicKey,
  admin: boolean | null,
  updater: boolean | null
) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createChangeRoleIx(payer.publicKey, user, program, admin, updater)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const setTreasury = async (treasury: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await changeTreasuryIx(payer.publicKey, treasury, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const registerCollection = async (collection: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createRegisterCollectionIx(payer.publicKey, collection, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const revokeCollection = async (collection: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createRevokeCollectionIx(payer.publicKey, collection, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const deposit = async (mint: PublicKey, userId: string) => {
  try {
    const tx = await createDepositNftTx(
      payer as Wallet,
      userId,
      mint,
      program,
      solConnection
    );

    await addAdminSignAndConfirm(tx);
  } catch (e) {
    console.log(e);
  }
};

export const updateDeposit = async (
  pda: PublicKey,
  locked: boolean | null,
  status: DepositStatus | null
) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createUpdateDepositIx(payer.publicKey, pda, status, locked, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const withdrawOwner = async (pda: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createWithdrawOwnerIx(payer.publicKey, pda, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const withdrawTreasury = async (pda: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createWithdrawTreasuryIx(payer.publicKey, pda, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const finalizeDeposit = async (pda: PublicKey) => {
  try {
    const tx = new Transaction().add(
      ...getGasIxs(),
      await createFinalizeDepositIx(payer.publicKey, pda, program)
    );
    const { blockhash } = await solConnection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    payer.signTransaction(tx);

    const txId = await provider.sendAndConfirm(tx, [], {
      commitment: 'confirmed',
    });

    console.log('txHash: ', txId);
  } catch (e) {
    console.log(e);
  }
};

export const getGlobalInfo = async () => {
  const globalState = await getGlobalState(program);
  console.log('global state: ', globalState);
};

export const getUserRole = async (user: PublicKey) => {
  const globalState = await getUserPoolState(user, program);
  console.log('user pool state: ', globalState);
};

export const getAllRoles = async () => {
  const res = await findAllUserPools(program);
  console.dir(res, { depth: null });
};

export const getCollectionInfo = async (collection: PublicKey) => {
  const collectionState = await getCollectionPoolState(collection, program);
  console.log('collection pool state: ', collectionState);
};

export const getDepositInfo = async (mint: PublicKey) => {
  const depositState = await getNftDepositState(mint, program);
  console.log('nft deposit state: ', depositState);
};

export const getAllDeposits = async ({
  owner,
  locked,
  status,
}: IFindDepositFilter) => {
  const res = await findAllDeposits({ owner, locked, status }, program);
  console.dir(res, { depth: null });
};

export const addAdminSignAndConfirm = async (txData: Buffer) => {
  // Deserialize the transaction
  const tx = Transaction.from(txData);

  // Sign the transaction with admin's Keypair
  // tx = await adminWallet.signTransaction(tx);
  // console.log("signed admin: ", adminWallet.publicKey.toBase58());

  const sTx = tx.serialize();

  // Send the raw transaction
  const options = {
    commitment: 'confirmed',
    skipPreflight: false,
  };
  // Confirm the transaction
  const signature = await solConnection.sendRawTransaction(sTx, options);
  await solConnection.confirmTransaction(signature, 'confirmed');

  console.log('Transaction confirmed:', signature);
};
