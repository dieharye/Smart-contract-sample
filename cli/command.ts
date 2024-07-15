import { program } from 'commander';
import { Cluster, PublicKey } from '@solana/web3.js';
import {
  changeRole,
  deposit,
  finalizeDeposit,
  getAllDeposits,
  getAllRoles,
  getCollectionInfo,
  getDepositInfo,
  getGlobalInfo,
  getUserRole,
  initProject,
  initUser,
  loadWalletFromKeypair,
  registerCollection,
  revokeCollection,
  setConnection,
  setTreasury,
  transferAuthority,
  updateDeposit,
  withdrawOwner,
  withdrawTreasury,
} from './scripts';
import { IFindDepositFilter } from '../lib/scripts';
import { DepositStatus } from '../lib/types';

program.version('0.0.1');

programCommand('status')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm: parseInt(fm),
    });

    await getGlobalInfo();
  });

programCommand('init')
  .requiredOption('-t --treasury <string>', 'treasury address')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { treasury, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await initProject(new PublicKey(treasury));
  });

programCommand('transfer_authority')
  .requiredOption('-a --address <string>', 'New admin authority')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await transferAuthority(new PublicKey(address));
  });

programCommand('init_user')
  .requiredOption('-a --address <string>', 'Address of user')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await initUser(new PublicKey(address));
  });

programCommand('set_role')
  .requiredOption('-a, --address <string>', 'Address of user')
  .option('-m, --admin <number>', 'Admin authority (1 - Assign / 0 - Revoke)')
  .option(
    '-u, --updater <number>',
    'Updater authority (1 - Assign / 0 - Revoke)'
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, admin, updater, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await changeRole(
      new PublicKey(address),
      admin === undefined ? null : Number(admin) === 1,
      updater === undefined ? null : Number(updater) === 1
    );
  });

programCommand('get_roles')
  .option('-a, --address <string>', 'Address of user')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    if (address) await getUserRole(new PublicKey(address));
    else await getAllRoles();
  });

programCommand('set_treasury')
  .requiredOption('-a --address <string>', 'Address of new treasury')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await setTreasury(new PublicKey(address));
  });

programCommand('register_collection')
  .requiredOption('-a --address <string>', 'Address of collection')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await registerCollection(new PublicKey(address));
  });

programCommand('revoke_collection')
  .requiredOption('-a --address <string>', 'Address of collection')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await revokeCollection(new PublicKey(address));
  });

programCommand('collection_status')
  .requiredOption('-a --address <string>', 'Address of collection')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { address, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await getCollectionInfo(new PublicKey(address));
  });

programCommand('create_deposit')
  .requiredOption('-m --mint <string>', 'Address of Nft')
  .requiredOption('-u --userid <string>', 'uuid of User')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { mint, userid, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await deposit(new PublicKey(mint), userid);
  });

programCommand('get_deposits')
  .option(
    '-a --address <string>',
    'Filter by wallet address of deposit PDA owner'
  )
  .option('-l --locked <number>', 'Filter 1/0 Locked/unlocked PDA')
  .option('-s --status <number>', 'Filter by status of PDA')
  .option('-m --mint <string>', 'Filter by deposited nft mint')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { mint, address, locked, status, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    if (mint) await getDepositInfo(new PublicKey(mint));
    else {
      let filters: IFindDepositFilter = {};
      if (address) filters.owner = new PublicKey(address);
      if (locked !== undefined) filters.locked = Number(locked) === 1;
      if (status !== undefined) filters.status = Number(status);
      await getAllDeposits(filters);
    }
  });

programCommand('update_deposit')
  .requiredOption('-a --pda <string>', 'Address of deposit PDA')
  .option('-l --locked <number>', '1/0 Locked/unlocked')
  .option('-s --status <number>', 'deposit status')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { pda, locked, status, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await updateDeposit(
      new PublicKey(pda),
      locked === undefined ? null : Number(locked) === 1,
      status === undefined ? null : (Number(status) as DepositStatus)
    );
  });

programCommand('withdraw_to_treasury')
  .requiredOption('-a --pda <string>', 'Address of deposit PDA')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { pda, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await withdrawTreasury(new PublicKey(pda));
  });

programCommand('withdraw_to_owner')
  .requiredOption('-a --pda <string>', 'Address of deposit PDA')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { pda, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await withdrawOwner(new PublicKey(pda));
  });

programCommand('finalize_deposit')
  .requiredOption('-a --pda <string>', 'Address of deposit PDA')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { pda, env, keypair, rpc, fm } = cmd.opts();

    await setConnection({
      cluster: env as Cluster,
      wallet: loadWalletFromKeypair(keypair),
      rpc,
      fm,
    });

    await finalizeDeposit(new PublicKey(pda));
  });

function programCommand(name: string) {
  return program
    .command(name)
    .requiredOption('-e, --env <string>', 'alias to web3.Cluster', 'devnet') // mainnet-beta, testnet, devnet
    .option('-r, --rpc <string>', 'Solana cluster RPC')
    .option(
      '-k, --keypair <string>',
      'Solana wallet keypair path',
      './keys/user.json'
    )
    .option('-f, --fm <string>', 'fee multiplier');
}

program.parse(process.argv);
