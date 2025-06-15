import { coinInfo } from '@/utils/types';
import { getClaimData, getCoinInfo } from '@/utils/util';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { usePathname } from 'next/navigation';
import { run } from 'node:test';
import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

type ClaimContextType = {
  claimAmount: [number, number, number, coinInfo];
  setClaimAmount: React.Dispatch<React.SetStateAction<[number, number, number, coinInfo]>>;
};

const ClaimContext = createContext<ClaimContextType | undefined>(undefined);

export const ClaimProvider: React.FC<{ children: React.ReactNode; intervalMs?: number }> = ({ children, intervalMs = 5000, }) => {
  const [claimAmount, setClaimAmount] = useState<[number, number, number, coinInfo]>([0, 0, 0, {} as coinInfo]);
  const pathname = usePathname();
  const wallet = useWallet();

  const _getClaimAmount = async () => {
    const segments = pathname.split("/");
    const parameter = segments[segments.length - 1];
    const coin = await getCoinInfo(parameter);
    try {
      const response = await getClaimData(coin.token, wallet.publicKey.toBase58());
      console.log("__yuki__ claim data response:", response, "type is ", typeof response.claimInUSD);
      setClaimAmount([response.claimInUSD ?? 0, response.claimHodl ?? 0, response.solPrice ?? 0, coin ?? {} as coinInfo]);
    } catch (error) {
      console.error("__yuki__ Error fetching claim data:", error);
      setClaimAmount([0, 0, 0, coin]);
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    console.log("__yuki__ useeffect");
    const run = async () => {
        await _getClaimAmount()
      };
      
    run();

    intervalId = setInterval(run, intervalMs)
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [wallet.connected, pathname, intervalMs]);

  return (
    <ClaimContext.Provider value={{ claimAmount, setClaimAmount }}>
      {children}
    </ClaimContext.Provider>
  );
};

export const useClaim = () => {
  const context = useContext(ClaimContext);
  if (!context) {
    throw new Error('useClaim must be used within a ClaimProvider');
  }
  return context;
};
