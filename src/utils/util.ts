import axios, { AxiosRequestConfig } from 'axios';
import {
  ChartTable,
  coinInfo,
  holderInfo,
  msgInfo,
  replyInfo,
  userInfo,
} from './types';
import { claimTx } from '@/program/web3';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const headers: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
};

const config: AxiosRequestConfig = {
  headers,
};

export const test = async () => {
  const res = await fetch(`${BACKEND_URL}`);
  const data = await res.json();
};

export const getUser = async ({ id }: { id: string }): Promise<any> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/user/${id}`, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const getClaimData = async (
  mint: string,
  wallet: string
): Promise<any> => {
  try {
    if (!wallet) {
      wallet = '_';
    }
    const response = await axios.get(
      `${BACKEND_URL}/claimData/${mint}/${wallet}`,
      config
    );

    console.log('__yuki__ getClaimData: response.data', response.data);
    return response.data;
  } catch (err) {
    console.log('__yuki__ error getting the claim data : ', err);
    return {
      tokenBal: 0,
      hodlSum: 0,
      airdropClaim: 0,
      isBlocked: true,
      tokenReserves: 0,
      lamportReserves: 0,
      solPrice: 0,
    };
  }
};

export const updateUser = async (id: string, data: userInfo): Promise<any> => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/user/update/${id}`,
      data,
      config
    );
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const walletConnect = async ({
  data,
}: {
  data: userInfo;
}): Promise<any> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/user/`, data);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const confirmWallet = async ({
  data,
}: {
  data: userInfo;
}): Promise<any> => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/user/confirm`,
      data,
      config
    );
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};
export const getClaim = async (coinId: string, id: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/claim/airdrop/${id}/${coinId}`,
      config
    );
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};
export const getCoinsInfo = async (): Promise<coinInfo[]> => {
  try {
    const res = await axios.get(`${BACKEND_URL}/coin/`, config);
    return res.data;
  } catch (err) {
    console.log('__yuki__ getCoinsInof Error fetching coins info:', err);
    return [];
  }
};

export const getCoinsInfoBySort = async (
  sort: string,
  page: number,
  number: number
): Promise<{ coins: coinInfo[]; total: number; page: number; numberOfCoins: number }> => {
  try {
    const res = await axios.get(
      `${BACKEND_URL}/coin/${sort}/${page}/${number}`,
      config
    );
    return res.data;
  } catch (err) {
    console.log('__yuki__ getCoinsInfoBySort Error:', err);
    return { coins: [], total: 0, page, numberOfCoins: number };
  }
};

// New function for lazy loading with better error handling
export const getCoinsInfoLazy = async (
  sort: string = 'latest',
  page: number = 0,
  limit: number = 12,
  filters?: {
    search?: string;
    nsfw?: boolean;
  }
): Promise<{ coins: coinInfo[]; total: number; hasMore: boolean; page: number }> => {
  try {
    const res = await axios.get(
      `${BACKEND_URL}/coin/${sort}/${page}/${limit}`,
      config
    );
    
    const { coins, total, page: currentPage } = res.data;
    const hasMore = (currentPage + 1) * limit < total;
    
    return {
      coins: coins || [],
      total: total || 0,
      hasMore,
      page: currentPage
    };
  } catch (err) {
    console.log('__yuki__ getCoinsInfoLazy Error:', err);
    return { coins: [], total: 0, hasMore: false, page };
  }
};

export const getCoinsInfoBy = async (id: string): Promise<coinInfo[]> => {
  const res = await axios.get<coinInfo[]>(
    `${BACKEND_URL}/coin/user/${id}`,
    config
  );
  return res.data;
};

export const getCoinInfo = async (data: string): Promise<any> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/coin/${data}`, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const sendTx = async (signature, token, user) => {
  try {
    const data = {
      signature,
      token,
      user,
    };
    const response = await axios.post(
      `${BACKEND_URL}/cointrade/signature`,
      data,
      config
    );
  } catch (error) {
    return { error: 'signature failed' };
  }
};

export const getUserInfo = async (data: string): Promise<any> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/user/${data}`, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const getMessageByCoin = async (data: string): Promise<msgInfo[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/feedback/coin/${data}`,
      config
    );
    return response.data;
  } catch (err) {
    return [];
  }
};

export const getLatestReplies = async (): Promise<{ coinId: string; latestReplyTime: string }[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/feedback/latest-replies`,
      config
    );
    return response.data;
  } catch (err) {
    console.log('__yuki__ getLatestReplies Error fetching latest replies:', err);
    return [];
  }
};

export const getReplyCounts = async (): Promise<{ coinId: string; replyCount: number }[]> => {
  try {
    console.log('__yuki__ getReplyCounts: Fetching reply counts from backend');
    const response = await axios.get(`${BACKEND_URL}/feedback/reply-counts`, config);
    console.log('__yuki__ getReplyCounts: Response:', response.data);
    return response.data;
  } catch (err) {
    console.log('__yuki__ getReplyCounts Error fetching reply counts:', err);
    return [];
  }
};

export const getCoinTrade = async (data: string): Promise<any> => {
  try {
    console.log('__yuki__ getCoinTrade data:', data);
    const response = await axios.get(
      `${BACKEND_URL}/cointrade/${data}`,
      config
    );
    console.log('__yuki__ getCoinTrade response:', response.data);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const postReply = async (data: replyInfo) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/feedback/`, data, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

// Add favorite to message (only message author can increment)
export const addMessageFavorite = async (messageId: string, type: 'thumbUp' | 'thumbDown' | 'heart', userId: string) => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/feedback/${messageId}/favorite`,
      { type, userId },
      config
    );
    return response.data;
  } catch (err) {
    console.error('Error adding favorite:', err);
    return { error: 'Failed to add favorite' };
  }
};

// Remove favorite from message (only message author can decrement)
export const removeMessageFavorite = async (messageId: string, type: 'thumbUp' | 'thumbDown' | 'heart', userId: string) => {
  try {
    const response = await axios.delete(
      `${BACKEND_URL}/feedback/${messageId}/favorite`,
      {
        ...config,
        data: { type, userId }
      }
    );
    return response.data;
  } catch (err) {
    console.error('Error removing favorite:', err);
    return { error: 'Failed to remove favorite' };
  }
};

// ================== Get Holders ===========================
export const findHolders = async (mint: string) => {
  // Pagination logic
  let page = 1;
  // allOwners will store all the addresses that hold the token
  let allOwners: holderInfo[] = [];

  while (true) {
    const response = await fetch(
      process.env.NEXT_PUBLIC_SOLANA_RPC ||
        'https://devnet.helius-rpc.com/?api-key=44b7171f-7de7-4e68-9d08-eff1ef7529bd',
      {
        //   const response = await fetch("https://white-aged-glitter.solana-mainnet.quiknode.pro/743d4e1e3949c3127beb7f7815cf2ca9743b43a6/", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'getTokenAccounts',
          id: 'helius-test',
          params: {
            page: page,
            limit: 1000,
            displayOptions: {},
            //mint address for the token we are interested in
            mint: mint,
          },
        }),
      }
    );
    const data = await response.json();
    // Pagination logic.
    if (!data.result || data.result.token_accounts.length === 0) {
      break;
    }
    // Adding unique owners to a list of token owners.
    data.result.token_accounts.forEach((account) => {
      allOwners.push({
        name: account.owner.slice(0, 3) + `...` + account.owner.slice(-4),
        owner: account.owner,
        amount: account.amount,
      });
    });
    page++;
  }

  return allOwners;
};

// ================== Get Holders with User Info ===========================
export const getHoldersWithUserInfo = async (token: string): Promise<holderInfo[]> => {
  try {
    console.log('__yuki__ Getting holders with user info for token:', token);
    const response = await axios.get(`${BACKEND_URL}/coin/holders/${token}`, config);
    console.log('__yuki__ Holders with user info response:', response.data);
    return response.data.holders || [];
  } catch (err) {
    console.error('__yuki__ Error getting holders with user info:', err);
    return [];
  }
};

export const getSolPriceInUSD = async () => {
  try {
    // Fetch the price data from CoinGecko with proper error handling
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        timeout: 5000, // 5 second timeout
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    if (response.data && response.data.solana && response.data.solana.usd) {
      return response.data.solana.usd;
    } else {
      console.warn('__yuki__ getSolPriceInUSD: Invalid response format');
      return null;
    }
  } catch (error) {
    console.warn('__yuki__ getSolPriceInUSD: Failed to fetch SOL price:', error.message);
    return null;
  }
};

export const claim = async (
  userData: userInfo,
  coin: coinInfo,
  wallet: WalletContextState,
  amount: number,
  airdrop: boolean,
) => {
  const signedTx = await claimTx(coin, wallet, wallet.publicKey, amount, airdrop);
  if (!signedTx) {
    console.log('Claim transaction failed');
    return;
  }
  const data = {
    signedTxBase64: Buffer.from(signedTx).toString('base64'),
    token: coin.token,
    user: userData.wallet,
  };
  try {
    const response = await axios.post(
      `${BACKEND_URL}/user/claim/`,
      data,
      config
    );
    if (response.data.error) {
      console.log('Claim axios error: ', response.data.error);
      return response.data.error;
    }
    return 'success';
  } catch (error) {
    console.log('Claim error: ', error.response?.data || error.message);
  }
};

export const getTrendingCoins = async (timePeriod: string): Promise<coinInfo[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/coin/trending/${timePeriod}`,
      config
    );
    
    if (response.data && response.data.coins) {
      return response.data.coins;
    }
    
    return [];
  } catch (err) {
    console.log('__yuki__ getTrendingCoins Error fetching trending coins:', err);
    return [];
  }
};

export const getKingOfCoin = async (): Promise<coinInfo[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/coin/king-of-coin`,
      config
    );
    if (response.data && response.data.coins) {
      return response.data.coins;
    }
    return [];
  } catch (err) {
    console.log('__yuki__ getKingOfCoin Error fetching king of coin:', err);
    return [];
  }
};

// Follow/Unfollow functions
export const followUser = async (followerWallet: string, followingWallet: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/user/follow`,
      { followerWallet, followingWallet },
      config
    );
    return response.data;
  } catch (err) {
    console.log('__yuki__ followUser Error:', err);
    return { error: 'Failed to follow user' };
  }
};

export const unfollowUser = async (followerWallet: string, followingWallet: string): Promise<any> => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/user/unfollow`,
      { followerWallet, followingWallet },
      config
    );
    return response.data;
  } catch (err) {
    console.log('__yuki__ unfollowUser Error:', err);
    return { error: 'Failed to unfollow user' };
  }
};

export const getFollowers = async (wallet: string): Promise<userInfo[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/user/${wallet}/followers`,
      config
    );
    return response.data.followers || [];
  } catch (err) {
    console.log('__yuki__ getFollowers Error:', err);
    return [];
  }
};

export const getFollowing = async (wallet: string): Promise<userInfo[]> => {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/user/${wallet}/following`,
      config
    );
    return response.data.following || [];
  } catch (err) {
    console.log('__yuki__ getFollowing Error:', err);
    return [];
  }
};

// Get user's coins held using web3 API
export const getUserCoinsHeld = async (wallet: string): Promise<any[]> => {
  try {
    console.log('__yuki__ getUserCoinsHeld: Calling API for wallet:', wallet);
    const response = await axios.get(
      `${BACKEND_URL}/coin/user-held/${wallet}`,
      config
    );
    console.log('__yuki__ getUserCoinsHeld: API response:', response.data);
    return response.data.coins || [];
  } catch (err) {
    console.log('__yuki__ getUserCoinsHeld Error:', err);
    return [];
  }
};

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
