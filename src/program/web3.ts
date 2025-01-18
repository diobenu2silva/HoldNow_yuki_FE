import { ComputeBudgetProgram, Connection, Keypair, PublicKey, Transaction, clusterApiUrl } from '@solana/web3.js';
import { Holdnow } from './holdnow'
import idl from "./holdnow.json"
import * as anchor from '@coral-xyz/anchor';
import { WalletContextState, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { errorAlert } from '@/components/others/ToastGroup';
import { Program } from '@coral-xyz/anchor';
import { SEED_CONFIG } from './seed';
import { launchDataInfo } from '@/utils/types';
import { PROGRAM_ID } from './programId';
export const commitmentLevel = "processed";

export const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
export const connection = new Connection(endpoint, commitmentLevel);
export const pumpProgramId = new PublicKey(PROGRAM_ID);
export const pumpProgramInterface = JSON.parse(JSON.stringify(idl));


// Send Fee to the Fee destination
export const createToken = async (wallet: WalletContextState, coinData: launchDataInfo) => {

  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" })
  anchor.setProvider(provider);
  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;

  console.log('========Fee Pay==============');

  // check the connection
  if (!wallet.publicKey || !connection) {
    errorAlert("Wallet Not Connected");
    console.log("Warning: Wallet not connected");
    return "WalletError";
  }

  try {
    console.log("coinData--->", coinData)
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_CONFIG)],
      program.programId
    );
    const configAccount = await program.account.config.fetch(configPda);

    const mintKp = Keypair.generate();

    const transaction = new Transaction()
    const updateCpIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 });
    const updateCuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000_000 });
    const createIx = await program.methods
      .launch(
        coinData.decimals,
        new anchor.BN(coinData.tokenSupply * Math.pow(10, 6)),
        new anchor.BN(coinData.virtualReserves * Math.pow(10, 9)),
        coinData.name,
        coinData.symbol,
        coinData.uri
      )
      .accounts({
        creator: wallet.publicKey,
        token: mintKp.publicKey,
        teamWallet: configAccount.teamWallet
      })
      .instruction();

    transaction.add(updateCpIx, updateCuIx, createIx);

    const swapIx = await program.methods.swap(
      new anchor.BN(coinData.presale * Math.pow(10, 9)),
      0,
      new anchor.BN(0),)
      .accounts({
        teamWallet: configAccount.teamWallet,
        user: wallet.publicKey,
        tokenMint: mintKp.publicKey,
      })
      .instruction()
    transaction.add(swapIx)
    transaction.feePayer = wallet.publicKey;
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;

    transaction.sign(mintKp);
    console.log("--------------------------------------");
    console.log(transaction);

    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize();
      console.log('----', await connection.simulateTransaction(signedTx));
      const signature = await connection.sendRawTransaction(
        sTx,
        {
          preflightCommitment: 'confirmed',
          skipPreflight: false
        }
      );
      const res = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        },
        "confirmed"
      );
      console.log("Successfully initialized.\n Signature: ", signature);
      return res;
    }
  } catch (error) {
    console.log("----", error);
    return false;
  }
};

// Swap transaction
export const swapTx = async (mint: PublicKey, wallet: WalletContextState, amount: string, type: number): Promise<any> => {
  console.log('========trade swap==============');

  // check the connection
  if (!wallet.publicKey || !connection) {
    console.log("Warning: Wallet not connected");
    return;
  }
  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" })
  anchor.setProvider(provider);
  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_CONFIG)],
    program.programId
  );

  const configAccount = await program.account.config.fetch(configPda);
  try {
    const transaction = new Transaction()
    const cpIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 });
    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });

    const swapIx = await program.methods.swap(
      new anchor.BN(parseFloat(amount) * Math.pow(10, 9)),
      type,
      new anchor.BN(0),)
      .accounts({
        teamWallet: configAccount.teamWallet,
        user: wallet.publicKey,
        tokenMint: mint,
      })
      .instruction()
    transaction.add(swapIx)
    transaction.add(cpIx, cuIx)
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize();
      console.log("----", await connection.simulateTransaction(signedTx));
      const signature = await connection.sendRawTransaction(sTx, {
        preflightCommitment: "confirmed",
        skipPreflight: false,
      });
      const blockhash = await connection.getLatestBlockhash();

      const res = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        },
        "confirmed"
      );
      console.log("Successfully initialized.\n Signature: ", signature);
      return res;
    }

  } catch (error) {
    console.log("Error in swap transaction", error);
  }
};
export const getTokenBalance = async (walletAddress: string, tokenMintAddress: string) => {
  const wallet = new PublicKey(walletAddress);
  const tokenMint = new PublicKey(tokenMintAddress);

  // Fetch the token account details
  const response = await connection.getTokenAccountsByOwner(wallet, {
    mint: tokenMint
  });

  if (response.value.length == 0) {
    console.log('No token account found for the specified mint address.');
    return;
  }

  // Get the balance
  const tokenAccountInfo = await connection.getTokenAccountBalance(response.value[0].pubkey);

  // Convert the balance from integer to decimal format

  console.log(`Token Balance: ${tokenAccountInfo.value.uiAmount}`);

  return tokenAccountInfo.value.uiAmount;
};
