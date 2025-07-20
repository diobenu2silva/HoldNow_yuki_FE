import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  TransactionInstruction,
} from '@solana/web3.js';
import { Holdnow } from './holdnow';
import idl from './holdnow.json';
import * as anchor from '@coral-xyz/anchor';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { errorAlert } from '@/components/others/ToastGroup';
import { Program } from '@coral-xyz/anchor';
import { coinInfo, launchDataInfo } from '@/utils/types';
import { HOLDNOW_PROGRAM_ID } from './programId';
import {
  MintLayout,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getOrCreateAssociatedTokenAccount,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import {
  PROGRAM_ID,
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  BONDING_CURVE,
  CLAIM_DATA_SEED,
  GLOBAL_STATE_SEED,
  REWARD_STATE_SEED,
  REWARD_VAULT_SEED,
  SOL_VAULT_SEED,
  VAULT_SEED,
} from './seed';
import { BN } from 'bn.js';
import { getClaimData, sendTx, sleep } from '@/utils/util';
import { simulateTransaction } from '@coral-xyz/anchor/dist/cjs/utils/rpc';
import { connect } from 'http2';
import base58 from 'bs58';
import { publicKey } from '@coral-xyz/anchor/dist/cjs/utils';
import { useState } from 'react';
import axios from 'axios';

export const commitmentLevel = 'processed';

export const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://devnet.helius-rpc.com/?api-key=3b5315ac-170e-4e0e-a60e-4ff5b444fbcf';
export const connection = new Connection(endpoint, commitmentLevel);
export const pumpProgramId = new PublicKey(HOLDNOW_PROGRAM_ID);
export const pumpProgramInterface = JSON.parse(JSON.stringify(idl));
const backendPubkey = new PublicKey(
  process.env.NEXT_PUBLIC_BACKEND_WALLET_PUBLIC_KEY
);

// Send Fee to the Fee destination
export const createToken = async (
  wallet: WalletContextState,
  coinData: launchDataInfo,
  csvAllocators: any[],
  solAmount: number
) => {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  anchor.setProvider(provider);
  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;

  // check the connection
  if (!wallet.publicKey || !connection) {
    errorAlert('Wallet Not Connected');
    return 'WalletError';
  }
  try {
    let transactions: Transaction[] = [];
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const tokenAta = await getAssociatedTokenAddress(mint, wallet.publicKey);
    const [metadataPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), PROGRAM_ID.toBuffer(), mint.toBuffer()],
      PROGRAM_ID
    );
    const amount = new anchor.BN(10 ** 9).mul(
      new anchor.BN(10 ** coinData.decimals)
    );
    const tokenMetadata: DataV2 = {
      name: coinData.name,
      symbol: coinData.symbol,
      uri: coinData.uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };
    const mint_rent = await getMinimumBalanceForRentExemptMint(connection);
    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 60_000,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 200_000,
      }),
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint,
        space: MintLayout.span,
        lamports: mint_rent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint,
        coinData.decimals,
        wallet.publicKey,
        null
      ),
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        tokenAta,
        wallet.publicKey,
        mint
      ),
      createMintToInstruction(
        mint,
        tokenAta,
        wallet.publicKey,
        BigInt(amount.toString())
      ),

      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: mint,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
          updateAuthority: wallet.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: tokenMetadata,
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );
    const airdropAmount = 0;

    // Create Pool instruction
    const [rewardRecipient] = await PublicKey.findProgramAddress(
      [Buffer.from(REWARD_STATE_SEED), mint.toBuffer()],
      program.programId
    );
    const [associatedRewardRecipient] = await PublicKey.findProgramAddress(
      [Buffer.from(REWARD_VAULT_SEED), mint.toBuffer()],
      program.programId
    );
    const [bondingCurve] = await PublicKey.findProgramAddress(
      [Buffer.from(BONDING_CURVE), mint.toBuffer()],
      program.programId
    );
    const [vault] = await PublicKey.findProgramAddress(
      [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
      program.programId
    );
    const [associatedBondingCurve] = await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_SEED), mint.toBuffer()],
      program.programId
    );
    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      wallet.publicKey
    );
    const [global] = await PublicKey.findProgramAddress(
      [Buffer.from(GLOBAL_STATE_SEED)],
      program.programId
    );

    // Create transfer instruction
    const transferIx = SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: vault,
      lamports: 890_880,
    });

    transaction.add(transferIx);

    const globalStateData = await program.account.global.fetch(global);
    const feeRecipient = globalStateData.feeRecipient;
    const createIx = await program.methods
      .create(
        new anchor.BN(coinData.tokenNumberStages),
        new anchor.BN(coinData.tokenStageDuration),
        new anchor.BN(coinData.tokenSellTaxRange[0]),
        new anchor.BN(coinData.tokenSellTaxRange[1]),
        new anchor.BN(coinData.tokenSellTaxDecay),
        new anchor.BN(coinData.tokenPoolDestination),
        amount,
        new anchor.BN(airdropAmount)
      )
      .accounts({
        rewardRecipient,
        associatedRewardRecipient,
        mint,
        feeRecipient,
        bondingCurve,
        associatedBondingCurve,
        associatedUserAccount,
        vault,
        global,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    transaction.add(createIx);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transactions.push(transaction);

    // for CSV claim
    let totalClaimAmount = 0;
    if (csvAllocators.length > 0) {

      console.log('__yuki__ Adding users to claim database for mint:', mint.toString());
      
      // Prepare users with their claim amounts for stage 1
      const usersWithClaims = csvAllocators.map(allocator => ({
        user: allocator.user || allocator.wallet || allocator.address,
        claimAmount: allocator.amount || 0
      }));

      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/claimData/addUsers`, {
          mint: mint.toString(),
          users: usersWithClaims,
        }, {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.data.success) {
          console.log('__yuki__ Successfully added users to claim database:', {
            mint: mint.toString(),
            totalUsers: response.data.totalUsers,
            successfulUsers: response.data.successfulUsers,
            errorUsers: response.data.errorUsers,
            skippedUsers: response.data.skippedUsers
          });
        } else {
          console.error('__yuki__ Backend returned error for addUsers:', response.data);
        }
      } catch (error) {
        console.error('__yuki__ Error adding users to claim database:', error);
        if (error.response) {
          console.error('__yuki__ Backend error response:', error.response.data);
        }
        // Don't fail the entire transaction if this fails
      }

      for (const allocator of csvAllocators) {
        totalClaimAmount += allocator.amount;
      }
      const claimInstructions = [];
      // for (const allocator of csvAllocators) {
        const pubkey = wallet.publicKey;
        const ataUserAccount = await getAssociatedTokenAddress(mint, pubkey);
        const cpIx_claim = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1_000_000,
        });
        const cuIx_claim = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
        const claimBatch: TransactionInstruction[] = [cpIx_claim, cuIx_claim];
        
        const bnAmount = new BN((totalClaimAmount * 1e6).toFixed(0));
        const claimIx = await program.methods
          .airdrop(bnAmount)
          .accounts({
            mint,
            rewardRecipient,
            global,
            associatedRewardRecipient,
            vault,
            bondingCurve,
            associatedBondingCurve,
            associatedUser: ataUserAccount,
            user: wallet.publicKey,
          })
          .instruction();
        claimBatch.push(claimIx);
        claimInstructions.push(claimBatch);
      // 2. Batch instructions into transactions
      const MAX_INSTRUCTIONS_PER_TX = 3; // adjust as needed
      let batch: TransactionInstruction[] = [];
      for (const claimBatch of claimInstructions) {
        if (batch.length + claimBatch.length > MAX_INSTRUCTIONS_PER_TX) {
          const tx = new Transaction();
          batch.forEach(ix => tx.add(ix));
          tx.feePayer = wallet.publicKey;
          tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          transactions.push(tx);
          batch = [];
        }
        batch.push(...claimBatch);
      }
      if (batch.length > 0) {
        const tx = new Transaction();
        batch.forEach(ix => tx.add(ix));
        tx.feePayer = wallet.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transactions.push(tx);
      }
    }

    // for buy sol amount for creator
    if (solAmount > 0) {
      let transaction_buy = new Transaction();
      const associatedUserAccount_buy = await getAssociatedTokenAddress(
        mint,
        wallet.publicKey
      );
      const info_buy = await connection.getAccountInfo(associatedUserAccount_buy);
    
      const cpIx_buy = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1_000_000,
      });
      const cuIx_buy = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
      transaction_buy.add(cpIx_buy, cuIx_buy);
  
      const tokenReserves = Math.pow(10, 15);
      const lamportReserves = 30 * Math.pow(10, 9);
      const totalLiquidity = (tokenReserves - totalClaimAmount) * lamportReserves;
      const tokenAmount =
        tokenReserves -
        totalLiquidity /
          (lamportReserves + solAmount * Math.pow(10, 9));
      console.log("__yuki__ createToken 2.2, tokenAmount: ", tokenAmount);
      const buyIx = await program.methods
        .buy(
          new anchor.BN(tokenAmount),
          new anchor.BN(20),
          new anchor.BN(solAmount * Math.pow(10, 9)),
        )
        .accounts({
          global,
          feeRecipient,
          rewardRecipient,
          associatedRewardRecipient,
          mint,
          vault,
          bondingCurve,
          associatedBondingCurve,
          associatedUser: associatedUserAccount_buy,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .instruction();
      transaction_buy.add(buyIx);
      transaction_buy.feePayer = wallet.publicKey;
      const blockhash = await connection.getLatestBlockhash();
      transaction_buy.recentBlockhash = blockhash.blockhash;
      
      transactions.push(transaction_buy);
    }

    // Sign the mint-creation transaction with mintKp
    transactions[0].sign(mintKp);

    // Sign all transactions with the wallet
    const signedTxs = await wallet.signAllTransactions(transactions);

    // Send each signed transaction
    const signatures = [];
    const confirmations = [];
    for (const signedTx of signedTxs) {
      const sTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(sTx, {
        preflightCommitment: 'confirmed',
        skipPreflight: true,
      });
      // Confirm the transaction with fresh blockhash
      const blockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        },
        'confirmed'
      );
      confirmations.push(confirmation);
      signatures.push(signature);
    }
    await sendTx(signatures[0], mint, wallet.publicKey);
    return { signatures, confirmations, mint: mint.toString() };
  } catch (error) {
    console.log("__yuki__ createToken Error: ", error);
    return false;
  }
};

// export const getClaimAmount = async (
//   mint: PublicKey,
//   wallet: WalletContextState
// ): Promise<number> => {
//   if (!wallet.publicKey || !connection) return 0;

//   try {
//     const provider = new anchor.AnchorProvider(connection, wallet, {
//       preflightCommitment: "confirmed",
//     });

//     const program = new Program(
//       pumpProgramInterface,
//       pumpProgramId,
//       provider
//     ) as Program<Holdnow>;

//     const [claim] = await PublicKey.findProgramAddress(
//       [
//         Buffer.from(CLAIM_DATA_SEED),
//         mint.toBuffer(),
//         wallet.publicKey.toBuffer(),
//       ],
//       program.programId
//     );

//     const claimData = await program.account.claimData.fetch(claim);

//     if (
//       !claimData ||
//       !claimData.claimAmount ||
//       typeof claimData.claimAmount.toNumber !== "function"
//     ) {
//       console.warn("Invalid claim data structure:", claimData);
//       return 0;
//     }

//     const claimAmount = claimData.claimAmount.toNumber() / 1e6;
//     return claimAmount;
//   } catch (err) {
//     console.error("Error fetching claim amount:", err);
//     return 0;
//   }
// };

// Swap transaction
export const swapTx = async (
  mint: PublicKey,
  wallet: WalletContextState,
  amount: number,
  type: number,
  slippage: number,
  solAmount: number = 0,
): Promise<any> => {
  // check the connection
  if (!wallet.publicKey || !connection) {
    return;
  }
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  anchor.setProvider(provider);
  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;
  const [global] = PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_STATE_SEED)],
    program.programId
  );
  const globalAccountData = await program.account.global.fetch(global);
  const feeRecipient = globalAccountData.feeRecipient;
  const [rewardRecipient] = await PublicKey.findProgramAddress(
    [Buffer.from(REWARD_STATE_SEED), mint.toBuffer()],
    program.programId
  );
  const [associatedRewardRecipient] = await PublicKey.findProgramAddress(
    [Buffer.from(REWARD_VAULT_SEED), mint.toBuffer()],
    program.programId
  );
  const [bondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(BONDING_CURVE), mint.toBuffer()],
    program.programId
  );
  const [vault] = await PublicKey.findProgramAddress(
    [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
    program.programId
  );
  const [associatedBondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_SEED), mint.toBuffer()],
    program.programId
  );
  const associatedUserAccount = await getAssociatedTokenAddress(
    mint,
    wallet.publicKey
  );
  const info = await connection.getAccountInfo(associatedUserAccount);

  try {
    const transaction = new Transaction();
    const cpIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 1_000_000,
    });
    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
    transaction.add(cpIx, cuIx);
    if (!info) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          associatedUserAccount,
          wallet.publicKey,
          mint
        )
      );
    }
    if (type == 0) {
      console.log("__yuki__ swapTx buy amount: ", amount);

      const buyIx = await program.methods
        .buy(
          new anchor.BN(amount * Math.pow(10, 6)),
          new anchor.BN(Math.floor(slippage * 100)),
          new anchor.BN(solAmount * Math.pow(10, 9)),
        )
        .accounts({
          global,
          feeRecipient,
          rewardRecipient,
          associatedRewardRecipient,
          mint,
          vault,
          bondingCurve,
          associatedBondingCurve,
          associatedUser: associatedUserAccount,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .instruction();
      transaction.add(buyIx);
    } else {
      const curClaim = solAmount * Math.pow(10, 6);
      const sellIx = await program.methods
        .sell(
          new anchor.BN(amount * Math.pow(10, 6)),
          new anchor.BN(Math.floor(slippage * 100)),
          new anchor.BN(curClaim),
        )
        .accounts({
          global,
          feeRecipient,
          rewardRecipient,
          associatedRewardRecipient,
          mint,
          vault,
          bondingCurve,
          associatedBondingCurve,
          associatedUser: associatedUserAccount,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .instruction();
      transaction.add(sellIx);
    }
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(sTx, {
        preflightCommitment: 'confirmed',
        skipPreflight: false,
      });
      const blockhash = await connection.getLatestBlockhash();
      console.log("__yuki__ swapTx simulateTransaction", await connection.simulateTransaction(signedTx));
      const res = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        },
        'confirmed'
      );
      await sendTx(signature, mint, wallet.publicKey);

      return res;
    }
  } catch (error) {
    console.log("__yuki__ swapTx Error: ", error);
    // errorAlert("Trade Error: " + error);
    return {};
  }
};

//Claim transaction
export const claimTx = async (
  coin: coinInfo,
  wallet: WalletContextState,
  pubkey: PublicKey,
  amount: number,
  free: boolean,
) => {
  const provider = new anchor.AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
  });
  anchor.setProvider(provider);
  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;

  const mint = new PublicKey(coin.token);
  const [global] = await PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_STATE_SEED)],
    program.programId
  );
  const [rewardRecipient] = await PublicKey.findProgramAddress(
    [Buffer.from(REWARD_STATE_SEED), mint.toBuffer()],
    program.programId
  );
  const [associatedRewardRecipient] = await PublicKey.findProgramAddress(
    [Buffer.from(REWARD_VAULT_SEED), mint.toBuffer()],
    program.programId
  );
  const [vault] = await PublicKey.findProgramAddress(
    [Buffer.from(SOL_VAULT_SEED), mint.toBuffer()],
    program.programId
  );
  const [bondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(BONDING_CURVE), mint.toBuffer()],
    program.programId
  );
  const [associatedBondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_SEED), mint.toBuffer()],
    program.programId
  );
  const associatedUserAccount = await getAssociatedTokenAddress(
    mint,
    pubkey
  );
  const info = await connection.getAccountInfo(associatedUserAccount);
  const transaction = new Transaction();
  const cpIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1_000_000,
  });
  const cuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
  transaction.add(cpIx, cuIx);
  if (!info) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        associatedUserAccount,
        pubkey,
        mint
      )
    );
  }
  
  const bnAmount = new BN((amount * 1e6).toFixed(0)); // Convert to lamports (1 token = 1e6 lamports)
  const claimIx = await program.methods
    .claim(bnAmount, free)
    .accounts({
      mint,
      rewardRecipient,
      global,
      associatedRewardRecipient,
      vault,
      bondingCurve,
      associatedBondingCurve,
      associatedUser: associatedUserAccount,
      user: wallet.publicKey,
      backendWallet: backendPubkey,
    })
    .instruction();

  transaction.add(claimIx);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  try {
    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize({
        requireAllSignatures: false, // ✅ allow partial sigs
        verifySignatures: false, // ✅ skip sig check (backend will add its own)
      });
      return sTx;
    }
  } catch (error) {
    console.error('Error signing transaction:', error);
  }
};

export const getTokenBalance = async (
  walletAddress: string,
  tokenMintAddress: string
) => {

  console.log('__yuki__ getTokenBalance called, walletAddress: ', walletAddress, 'tokenMintAddress: ', tokenMintAddress);
  
  // Add safety checks for undefined or null values
  if (!walletAddress || !tokenMintAddress) {
    console.log('__yuki__ getTokenBalance: Invalid parameters - walletAddress or tokenMintAddress is undefined/null');
    return 0;
  }
  
  try {
    let wallet: PublicKey;
    let tokenMint: PublicKey;
    
    try {
      wallet = new PublicKey(walletAddress);
      tokenMint = new PublicKey(tokenMintAddress);
    } catch (error) {
      console.log('__yuki__ getTokenBalance: Error creating PublicKey objects:', error);
      return 0;
    }

    // Fetch the token account details
    const response = await connection.getTokenAccountsByOwner(wallet, {
      mint: tokenMint,
    });

    if (response.value.length == 0) {
      console.log('__yuki__ No token account found for this mint');
      return 0;
    }

    console.log('__yuki__ Token Account:', response.value[0].pubkey.toBase58());
    
    // Get the balance
    let tokenAccountInfo;
    try {
      tokenAccountInfo = await connection.getTokenAccountBalance(
        response.value[0].pubkey
      );
    } catch (error) {
      console.log('__yuki__ getTokenBalance: Error getting token account balance:', error);
      return 0;
    }

    console.log('__yuki__ Token account info:', tokenAccountInfo);

    // Check if the response has the expected structure
    if (!tokenAccountInfo || !tokenAccountInfo.value) {
      console.log('__yuki__ Invalid token account info structure');
      return 0;
    }

    // Safely access uiAmount with fallback
    const balance = tokenAccountInfo.value.uiAmount ?? 0;
    console.log('__yuki__ Token balance:', balance);

    return balance;
  } catch (error) {
    console.error('__yuki__ Error in getTokenBalance:', error);
    return 0;
  }
};
