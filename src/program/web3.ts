import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram, Transaction, clusterApiUrl } from '@solana/web3.js';
import { Holdnow } from './holdnow'
import idl from "./holdnow.json"
import * as anchor from '@coral-xyz/anchor';
import { WalletContextState, } from '@solana/wallet-adapter-react';
import { errorAlert } from '@/components/others/ToastGroup';
import { Program } from '@coral-xyz/anchor';
import { coinInfo, launchDataInfo } from '@/utils/types';
import { HOLDNOW_PROGRAM_ID } from './programId';
import { MintLayout, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createInitializeMintInstruction, createMintToInstruction, getOrCreateAssociatedTokenAccount, createSetAuthorityInstruction, AuthorityType } from "@solana/spl-token"
import { PROGRAM_ID, DataV2, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { BONDING_CURVE, CLAIM_DATA_SEED, GLOBAL_STATE_SEED, REWARD_STATE_SEED, SOL_VAULT_SEED, VAULT_SEED } from './seed';
import { BN } from 'bn.js';
import { sendTx, sleep } from '@/utils/util';
import { simulateTransaction } from '@coral-xyz/anchor/dist/cjs/utils/rpc';
import { connect } from 'http2';
import base58 from 'bs58';
import { publicKey } from '@coral-xyz/anchor/dist/cjs/utils';
import { useState } from 'react';

export const commitmentLevel = "processed";

export const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://devnet.helius-rpc.com/?api-key=3b5315ac-170e-4e0e-a60e-4ff5b444fbcf';
export const connection = new Connection(endpoint, commitmentLevel);
export const pumpProgramId = new PublicKey(HOLDNOW_PROGRAM_ID);
export const pumpProgramInterface = JSON.parse(JSON.stringify(idl));
const backendPubkey = new PublicKey(process.env.NEXT_PUBLIC_BACKEND_WALLET_PUBLIC_KEY);

// Send Fee to the Fee destination
export const createToken = async (wallet: WalletContextState, coinData: launchDataInfo) => {
  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" })
  anchor.setProvider(provider);
  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;

  // check the connection
  if (!wallet.publicKey || !connection) {
    errorAlert("Wallet Not Connected");
    return "WalletError";
  }
  try {
    const mintKp = Keypair.generate();
    const mint = mintKp.publicKey;
    const tokenAta = await getAssociatedTokenAddress(mint, wallet.publicKey)
    const [metadataPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ], PROGRAM_ID
    );
    const amount = new anchor.BN(10 ** 9).mul(new anchor.BN(10 ** coinData.decimals))
    const tokenMetadata: DataV2 = {
      name: coinData.name,
      symbol: coinData.symbol,
      uri: coinData.uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null
    };
    const mint_rent = await getMinimumBalanceForRentExemptMint(connection)
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
      createInitializeMintInstruction(mint, coinData.decimals, wallet.publicKey, null),
      createAssociatedTokenAccountInstruction(wallet.publicKey, tokenAta, wallet.publicKey, mint),
      createMintToInstruction(mint, tokenAta, wallet.publicKey, BigInt(amount.toString())),

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
            collectionDetails: null
          }
        }
      )
    )
    const airdropAmount = 0;

    // Create Pool instruction
    const [rewardRecipient] = await PublicKey.findProgramAddress(
      [Buffer.from(REWARD_STATE_SEED)],
      program.programId
    );
    const [associatedRewardRecipient] = await PublicKey.findProgramAddress(
      [Buffer.from(REWARD_STATE_SEED),
      mint.toBuffer()
      ],
      program.programId
    );
    const [bondingCurve] = await PublicKey.findProgramAddress(
      [Buffer.from(BONDING_CURVE),
      mint.toBuffer()
      ],
      program.programId
    );
    const [vault] = await PublicKey.findProgramAddress(
      [Buffer.from(SOL_VAULT_SEED),
      mint.toBuffer()
      ],
      program.programId
    )
    const [associatedBondingCurve] = await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_SEED),
      mint.toBuffer()
      ],
      program.programId
    )
    const associatedUserAccount = await getAssociatedTokenAddress(
      mint,
      wallet.publicKey
    )
    const [global] = await PublicKey.findProgramAddress(
      [Buffer.from(GLOBAL_STATE_SEED)],
      program.programId
    );
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
        new anchor.BN(airdropAmount),
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
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction();

    transaction.add(createIx);

    transaction.feePayer = wallet.publicKey;
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;

    transaction.sign(mintKp);

    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize();
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
      await sleep(500);
      await sendTx(signature, mint, wallet.publicKey);
      return res;
    }
  } catch (error) {
    return false;
  }
};

export const getClaimAmount = async (mint: PublicKey, wallet: WalletContextState): Promise<number> => {
  // check the connection
  if (!wallet.publicKey || !connection) {
    return 0;
  }

  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });

  const program = new Program(
    pumpProgramInterface,
    pumpProgramId,
    provider
  ) as Program<Holdnow>;
  
  const [claim] = await PublicKey.findProgramAddress(
    [Buffer.from(CLAIM_DATA_SEED), mint.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );
  
  const claimData = await program.account.claimData.fetch(claim);
  if (!claimData) {
    return 0;
  }
  const claimAmount = claimData.claimAmount.toNumber() / Math.pow(10, 6);
  return claimAmount;
}

// Swap transaction
export const swapTx = async (mint: PublicKey, wallet: WalletContextState, amount: number, type: number, slipAmount: number): Promise<any> => {
  // check the connection
  if (!wallet.publicKey || !connection) {
    return;
  }
  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" })
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
    [Buffer.from(REWARD_STATE_SEED)],
    program.programId
  );
  const [associatedRewardRecipient] = await PublicKey.findProgramAddress(
    [Buffer.from(REWARD_STATE_SEED),
    mint.toBuffer()
    ],
    program.programId
  );
  const [bondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(BONDING_CURVE),
    mint.toBuffer()
    ],
    program.programId
  );
  const [vault] = await PublicKey.findProgramAddress(
    [Buffer.from(SOL_VAULT_SEED),
    mint.toBuffer()
    ],
    program.programId
  )
  const [associatedBondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_SEED),
    mint.toBuffer()
    ],
    program.programId
  )
  const associatedUserAccount = await getAssociatedTokenAddress(
    mint,
    wallet.publicKey,
  );
  const info = await connection.getAccountInfo(associatedUserAccount)
  const [claimData] = await PublicKey.findProgramAddress(
    [Buffer.from(CLAIM_DATA_SEED), mint.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );

  try {
    const transaction = new Transaction()
    const cpIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 });
    const cuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
    transaction.add(cpIx, cuIx)
    if (!info) {
      transaction.add(
        createAssociatedTokenAccountInstruction(wallet.publicKey, associatedUserAccount, wallet.publicKey, mint),
      )
    }
    if (type == 0) {
      const buyIx = await program.methods.buy(
        new anchor.BN(amount * Math.pow(10, 6)),
        new anchor.BN(amount * Math.pow(10, 6) * (101 / 100)),)
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
          claimAccount: claimData,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY
        })
        .instruction()
      transaction.add(buyIx)
    } else {
      const sellIx = await program.methods.sell(
        new anchor.BN(amount * Math.pow(10, 6)),
        // new anchor.BN(slipAmount  * (80 / 100)),
        new anchor.BN(0)
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
          claimAccount: claimData,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY
        })
        .instruction()
      transaction.add(sellIx)
    }
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize();
      const signature = await connection.sendRawTransaction(sTx, {
        preflightCommitment: "confirmed",
        skipPreflight: false,
      });
      const blockhash = await connection.getLatestBlockhash();
      console.log(await connection.simulateTransaction(signedTx));
      const res = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash.blockhash,
          lastValidBlockHeight: blockhash.lastValidBlockHeight,
        },
        "confirmed"
      );
      await sendTx(signature, mint, wallet.publicKey);
    
      return res;
    }
  } catch (error) {
    throw error;
  }
};

//Claim transaction
export const claimTx = async (coin: coinInfo, wallet: WalletContextState) => {
  const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" })
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
    [Buffer.from(REWARD_STATE_SEED)],
    program.programId
  );
  const [associatedRewardRecipient] = await PublicKey.findProgramAddress(
    [Buffer.from(REWARD_STATE_SEED),
    mint.toBuffer()
    ],
    program.programId
  );
  const [vault] = await PublicKey.findProgramAddress(
    [Buffer.from(SOL_VAULT_SEED),
    mint.toBuffer()
    ],
    program.programId
  )
  const [bondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(BONDING_CURVE),
    mint.toBuffer()
    ],
    program.programId
  );
  const [associatedBondingCurve] = await PublicKey.findProgramAddress(
    [Buffer.from(VAULT_SEED),
    mint.toBuffer()
    ],
    program.programId
  )
  const [claimData] = await PublicKey.findProgramAddress(
    [Buffer.from(CLAIM_DATA_SEED), mint.toBuffer(), wallet.publicKey.toBuffer()],
    program.programId
  );
  const associatedUserAccount = await getAssociatedTokenAddress(
    mint,
    wallet.publicKey,
  );
  const info = await connection.getAccountInfo(associatedUserAccount)
  const transaction = new Transaction()
  const cpIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 });
  const cuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 });
  transaction.add(cpIx, cuIx)
  if (!info) {
    transaction.add(
      createAssociatedTokenAccountInstruction(wallet.publicKey, associatedUserAccount, wallet.publicKey, mint),
    )
  }
  const claimIx = await program.methods.claim(false)
    .accounts({
      mint,
      rewardRecipient,
      global,
      associatedRewardRecipient,
      vault,
      bondingCurve,
      associatedBondingCurve,
      associatedUser: associatedUserAccount,
      claimAccount: claimData,
      user: wallet.publicKey,
      backendWallet: backendPubkey,
    })
    .instruction()

  transaction.add(claimIx)
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  try {
    if (wallet.signTransaction) {
      const signedTx = await wallet.signTransaction(transaction);
      const sTx = signedTx.serialize({
        requireAllSignatures: false, // ✅ allow partial sigs
        verifySignatures: false,     // ✅ skip sig check (backend will add its own)
      });
      return sTx;
    }
  } catch (error) {
    console.error("Error signing transaction:", error);
  }
}

export const getTokenBalance = async (walletAddress: string, tokenMintAddress: string) => {
  const wallet = new PublicKey(walletAddress);
  const tokenMint = new PublicKey(tokenMintAddress);
 
  // Fetch the token account details
  const response = await connection.getTokenAccountsByOwner(wallet, {
    mint: tokenMint
  });

  if (response.value.length == 0) {
    return 0;
  }

  // Get the balance
  const tokenAccountInfo = await connection.getTokenAccountBalance(response.value[0].pubkey);

  // Convert the balance from integer to decimal format

  return tokenAccountInfo.value.uiAmount;
};
