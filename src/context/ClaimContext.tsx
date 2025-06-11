import { getClaimAmount } from '@/program/web3';
import { getCoinInfo } from '@/utils/util';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { usePathname } from 'next/navigation';
import React, { createContext, useState, useContext, useEffect } from 'react';

type ClaimContextType = {
  claimAmount: number;
  setClaimAmount: React.Dispatch<React.SetStateAction<number>>;
};

const ClaimContext = createContext<ClaimContextType | undefined>(undefined);

export const ClaimProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const pathname = usePathname();

  const wallet = useWallet();

  const _getClaimAmount = async () => {
    const segments = pathname.split("/");
    const parameter = segments[segments.length - 1];
    console.log("parameter ", parameter)
    const coin = await getCoinInfo(parameter);
    console.log(">> coin: ", coin)
    console.log("wallet.connected ", wallet.connected)
    if (coin && wallet.connected) {

        const newAmount = await getClaimAmount(new PublicKey(coin.token), wallet);
        console.log("initial new amount ", newAmount)
        setClaimAmount(newAmount)
    }
  }

  useEffect(() => {
    if (wallet.connected) {
        _getClaimAmount()
    } else {
        setClaimAmount(0)
    }
  }, [wallet])

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
