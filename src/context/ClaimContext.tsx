import { coinInfo } from '@/utils/types';
import { getClaimData, getCoinInfo } from '@/utils/util';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { usePathname } from 'next/navigation';
import { run } from 'node:test';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useSocket } from '@/contexts/SocketContext';

type ClaimContextType = {
  claimAmount: [number, number, number, number, number, number, coinInfo];
  setClaimAmount: React.Dispatch<
    React.SetStateAction<[number, number, number, number, number, number, coinInfo]>
  >;
};

const ClaimContext = createContext<ClaimContextType | undefined>(undefined);

export const ClaimProvider: React.FC<{
  children: React.ReactNode;
  intervalMs?: number;
}> = ({ children, intervalMs = 3000 }) => {
  const [claimAmount, setClaimAmount] = useState<
    [number, number, number, number, number, number, coinInfo]
  >([0, 0, 0, 0, 0, 0, {} as coinInfo]);
  const pathname = usePathname();
  const wallet = useWallet();
  const { onClaimDataUpdate } = useSocket();

  const _getClaimAmount = async () => {
    const segments = pathname.split('/');
    const parameter = segments[segments.length - 1];
    const coin = await getCoinInfo(parameter);
    try {
      if (coin.token && wallet.publicKey) {
        const response = await getClaimData(
          coin.token,
          wallet.publicKey.toBase58()
        );
        setClaimAmount([
          response.claimInUSD ?? 0,
          response.claimHodl ?? 0,
          response.currentClaim ?? 0,
          response.solPrice ?? 0,
          response.rewardCap ?? 0,
          response.tokenBalance ?? 0,
          coin ?? ({} as coinInfo),
        ]);
      } else {
        // Set coin data even if wallet is not connected
        setClaimAmount([0, 0, 0, 0, 0, 0, coin ?? ({} as coinInfo)]);
      }
    } catch (error) {
      console.error('__yuki__ Error fetching claim data:', error);
      setClaimAmount([0, 0, 0, 0, 0, 0, coin]);
    }
  };

  // Clear cached data and fetch fresh data when pathname changes
  useEffect(() => {
    console.log('__yuki__ Pathname changed, clearing cache and fetching fresh data');
    // Clear the cached data immediately
    setClaimAmount([0, 0, 0, 0, 0, 0, {} as coinInfo]);
    // Fetch fresh data
    _getClaimAmount();
  }, [pathname]);

  // Handle real-time claim data updates from socket
  const handleClaimDataUpdate = useCallback((payload: any) => {
    // Only update if this is for the current user and token
    const segments = pathname.split('/');
    const currentToken = segments[segments.length - 1];
    console.log('__yuki__ handleClaimDataUpdate 11', );
    if (payload.token === currentToken && wallet.publicKey && payload.user === wallet.publicKey.toBase58()) {
      console.log('__yuki__ handleClaimDataUpdate Updating claim data from socket for current user');
      setClaimAmount(prev => [
        payload.claimData.claimInUSD ?? 0,
        payload.claimData.claimHodl ?? 0,
        payload.claimData.currentClaim ?? 0,
        payload.claimData.solPrice ?? 0,
        payload.claimData.rewardCap ?? 0,
        payload.claimData.tokenBalance ?? 0,
        prev[6], // Keep existing coin info
      ]);
    }
  }, [pathname, wallet.publicKey]);

  // Register socket callback for claim data updates
  useEffect(() => {
    if (onClaimDataUpdate) {
      onClaimDataUpdate(handleClaimDataUpdate);
    }
  }, [onClaimDataUpdate, handleClaimDataUpdate]);

  // Keep minimal polling only for initial data fetch and when socket is not available
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Only use polling as fallback if socket is not available or for initial data
    const shouldPoll = !onClaimDataUpdate || !claimAmount[6]?.token;
    
    if (shouldPoll && !claimAmount[6]?.movedToRaydium && !claimAmount[6]?.moveRaydiumFailed) {
      const run = async () => {
        await _getClaimAmount();
      };
      intervalId = setInterval(run, intervalMs);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [wallet.connected, intervalMs, claimAmount[6]?.movedToRaydium, claimAmount[6]?.moveRaydiumFailed, onClaimDataUpdate]);

  // Fetch updated coin data when movedToRaydium becomes true to get failure status
  useEffect(() => {
    if (claimAmount[6]?.movedToRaydium) {
      const fetchUpdatedData = async () => {
        const segments = pathname.split('/');
        const parameter = segments[segments.length - 1];
        const coin = await getCoinInfo(parameter);
        
        if (coin.token && wallet.publicKey) {
          try {
            const response = await getClaimData(
              coin.token,
              wallet.publicKey.toBase58()
            );
            setClaimAmount([
              response.claimInUSD ?? 0,
              response.claimHodl ?? 0,
              response.currentClaim ?? 0,
              response.solPrice ?? 0,
              response.rewardCap ?? 0,
              response.tokenBalance ?? 0,
              coin ?? ({} as coinInfo),
            ]);
          } catch (error) {
            console.error('__yuki__ Error fetching updated claim data:', error);
            setClaimAmount([0, 0, 0, 0, 0, 0, coin]);
          }
        }
      };
      
      // Fetch once after a short delay to ensure backend has updated the data
      setTimeout(fetchUpdatedData, 500);
    }
  }, [claimAmount[6]?.movedToRaydium, pathname, wallet.publicKey]);

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
