import axios, { AxiosRequestConfig } from 'axios';
import { ChartTable, coinInfo, holderInfo, msgInfo, replyInfo, userInfo } from './types';
import { claimTx } from '@/program/web3';
import { WalletContextState } from '@solana/wallet-adapter-react';

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const headers: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true'
};

const config: AxiosRequestConfig = {
  headers
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
export const updateUser = async (id: string, data: userInfo): Promise<any> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/user/update/${id}`, data, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const walletConnect = async ({ data }: { data: userInfo }): Promise<any> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/user/`, data);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};

export const confirmWallet = async ({ data }: { data: userInfo }): Promise<any> => {
  try {
    const response = await axios.post(`${BACKEND_URL}/user/confirm`, data, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};
export const getClaim = async (coinId: string, id: string): Promise<any> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/claim/airdrop/${id}/${coinId}`, config);
    return response.data;
  } catch (err) {
    return { error: 'error setting up the request' };
  }
};
export const getCoinsInfo = async (): Promise<coinInfo[]> => {
  const res = await axios.get(`${BACKEND_URL}/coin/`, config);
  return res.data;
};

export const getCoinsInfoBySort = async (sort: string, page: number, number: number): Promise<coinInfo[]> => {
  const res = await axios.get(`${BACKEND_URL}/coin/${sort}/${page}/${number}`, config);
  return res.data;
};

export const getCoinsInfoBy = async (id: string): Promise<coinInfo[]> => {
  const res = await axios.get<coinInfo[]>(`${BACKEND_URL}/coin/user/${id}`, config);
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
      user
    }
    const response = await axios.post(`${BACKEND_URL}/cointrade/signature`, data, config);
  } catch (error) {
    return { error: 'signature failed' }
  }
}

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
    const response = await axios.get(`${BACKEND_URL}/feedback/coin/${data}`, config);
    return response.data;
  } catch (err) {
    return [];
  }
};

export const getCoinTrade = async (data: string): Promise<any> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/cointrade/${data}`, config);
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

// ================== Get Holders ===========================
export const findHolders = async (mint: string) => {
  // Pagination logic
  let page = 1;
  // allOwners will store all the addresses that hold the token
  let allOwners: holderInfo[] = [];

  while (true) {
    const response = await fetch(process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://devnet.helius-rpc.com/?api-key=44b7171f-7de7-4e68-9d08-eff1ef7529bd', {
      //   const response = await fetch("https://white-aged-glitter.solana-mainnet.quiknode.pro/743d4e1e3949c3127beb7f7815cf2ca9743b43a6/", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
          mint: mint
        }
      })
    });
    const data = await response.json();
    // Pagination logic.
    if (!data.result || data.result.token_accounts.length === 0) {
      break;
    }
    // Adding unique owners to a list of token owners.
    data.result.token_accounts.forEach((account) => {
      allOwners.push({ name: account.owner.slice(0, 3) + `...` + account.owner.slice(-4), owner: account.owner, amount: account.amount });
    });
    page++;
  }

  return allOwners;
};

export const getSolPriceInUSD = async () => {
  try {
    // Fetch the price data from CoinGecko
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const solPriceInUSD = response.data.solana.usd;
    return solPriceInUSD;
  } catch (error) {
    throw error;
  }
};

export const claim = async (userData: userInfo, claimAmount: number, coin: coinInfo, wallet: WalletContextState) => {
  const signedTx = await claimTx(claimAmount, coin, wallet)
  const data = {
    user: userData.wallet,
    signedTx,
    coin: coin.token,
    amount: claimAmount
  }
  try {
    const response = await axios.post(`${BACKEND_URL}/user/claim/`, data, config)
    return "success"
  } catch (error) {
    throw error;
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}