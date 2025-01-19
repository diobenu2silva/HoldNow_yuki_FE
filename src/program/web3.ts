import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SYSVAR_CLOCK_PUBKEY, SystemProgram, Transaction, clusterApiUrl, sendAndConfirmTransaction } from '@solana/web3.js';
import { Holdnow } from './holdnow'
import idl from "./holdnow.json"
import * as anchor from '@coral-xyz/anchor';
import { WalletContextState, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { errorAlert } from '@/components/others/ToastGroup';
import { Program } from '@coral-xyz/anchor';
import { launchDataInfo } from '@/utils/types';
import { HOLDNOW_PROGRAM_ID } from './programId';
import { MintLayout, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createInitializeMintInstruction, createMintToInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token"
import { PROGRAM_ID, DataV2, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { BONDING_CURVE, GLOBAL_STATE_SEED, REWARD_STATE_SEED, SOL_VAULT_SEED, VAULT_SEED } from './seed';

export const commitmentLevel = "processed";

export const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
export const connection = new Connection(endpoint, commitmentLevel);
export const pumpProgramId = new PublicKey(HOLDNOW_PROGRAM_ID);
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
      createInitializeMintInstruction(mint, coinData.decimals, wallet.publicKey, wallet.publicKey),
      createAssociatedTokenAccountInstruction(wallet.publicKey, tokenAta, wallet.publicKey, mint),
      createMintToInstruction(mint, tokenAta, wallet.publicKey, BigInt(amount.toString())),
      // createUpdateMetadataAccountV2Instruction({
      //     metadata: metadataPDA,
      //     mint,
      //     mintAuthority: wallet.publicKey,
      //     payer: wallet.publicKey,
      //     updateAuthority: wallet.publicKey,
      // }, {
      //     updateMetadataAccountArgsV2: {
      //         data: tokenMetadata,
      //         isMutable: true,
      //         updateAuthority: wallet.publicKey,
      //         primarySaleHappened: true
      //     }
      // }
      // )
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
        new anchor.BN(coinData.tokenPoolDestination),
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
    wallet.publicKey,
    mint,
  );
  const info = await connection.getAccountInfo(associatedUserAccount)
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
        new anchor.BN(parseFloat(amount) * Math.pow(10, 9)),
        new anchor.BN(parseFloat(amount) * Math.pow(10, 9) * (101 / 100)),)
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
          clock: SYSVAR_CLOCK_PUBKEY
        })
        .instruction()
      transaction.add(buyIx)
    } else {
      const sellIx = await program.methods.buy(
        new anchor.BN(parseFloat(amount) * Math.pow(10, 9)),
        new anchor.BN(parseFloat(amount) * Math.pow(10, 9) * (101 / 100)),)
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
