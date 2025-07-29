'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Chatting } from '@/components/trading/Chatting';
import { TradeForm } from '@/components/trading/TradeForm';
import { TradingChart } from '@/components/TVChart/TradingChart';
import UserContext from '@/context/UserContext';
import { coinInfo, userInfo } from '@/utils/types';
import {
  claim,
  getClaimData,
  getCoinInfo,
} from '@/utils/util';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { IoMdArrowRoundBack } from 'react-icons/io';
import SocialList from '../others/socialList';
import TokenData from '../others/TokenData';
import { DataCard } from '../cards/DataCard';
import { FaCopy } from 'react-icons/fa6';
import { errorAlert, successAlert } from '../others/ToastGroup';
import { ConnectButton } from '../buttons/ConnectButton';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { getTokenBalance } from '@/program/web3';

import { useQuery, useQueryClient } from 'react-query';
import { useCountdownToast } from '@/utils/useCountdownToast';
import { motion } from 'framer-motion';
import { useSocket } from '@/contexts/SocketContext';

// Lazy load heavy components
const LazyTradingChart = lazy(() => import('@/components/TVChart/TradingChart').then(module => ({ default: module.TradingChart })));
const LazyChatting = lazy(() => import('@/components/trading/Chatting').then(module => ({ default: module.Chatting })));

const getBalance = async (wallet: string, token: string) => {
  try {
    if (!wallet || !token) {
  
      return 0;
    }
    const balance = await getTokenBalance(wallet, token);
    return balance;
  } catch (error) {
    console.error('__yuki__ tradingPage getBalance error:', error);
    return 0;
  }
};

const isUserInfo = (obj: any): obj is userInfo => {
  return obj && typeof obj === 'object' && '_id' in obj;
};

export default function TradingPage() {
  const { coinId, setCoinId, login, user, setSolPrice } =
    useContext(UserContext);
  const wallet = useWallet();
  const { visible, setVisible } = useWalletModal();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [param, setParam] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [coin, setCoin] = useState<coinInfo>({} as coinInfo);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [stageProg, setStageProg] = useState<number>(0);
  const [sellTax, setSellTax] = useState<number>(0);
  const [claimData, setClaimData] = useState<[number, number, number, number, number, number]>([0, 0, 0, 0, 0, 0]);
  const { onClaimDataUpdate, onStageChange, onCoinInfoUpdate } = useSocket();
  const router = useRouter();
  
  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'chat' | 'trade'>('chart');

  // Only destructure the first 6 values, use claimData[6] for coinData
  // Ensure claimData is always an array to prevent destructuring errors
  const [claimInUSD, claimHodl, redistribution, solPrice, airdropClaim, tokenBalance] = Array.isArray(claimData) ? claimData : [0, 0, 0, 0, 0, 0];
  const { publicKey } = wallet;

  // Helper function to safely format numbers and prevent NaN
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return defaultValue;
    }
    return Number(value) || defaultValue;
  };

  // Helper function to safely format currency values
  const safeCurrency = (value: any, precision: number = 9): string => {
    const num = safeNumber(value);
    return num.toPrecision(precision);
  };

  // Helper function to safely format percentage values
  const safePercentage = (value: any): string => {
    const num = safeNumber(value);
    return `${num}%`;
  };

  // Helper function to safely format stage progress
  const safeStageProgress = (value: any): string => {
    const num = safeNumber(value);
    return `${num}%`;
  };

  // Helper function to format claimHodl - show 0.000 HODL format when under 0.001
  const formatClaimHodl = (value: any): string => {
    const num = safeNumber(value);
    if (num < 0.001) {
      return '0.000';
    }
    return safeCurrency(num, 6);
  };

  // Memoized calculations for performance
  const memoizedStageProgress = useMemo(() => {
    if (!coin.atStageStarted) return 0;
    
    const millisecondsInADay = 120 * 1000; // 2 minutes for testing
    const nowDate = new Date();
    const atStageStartedDate = new Date(coin.atStageStarted);
    const period = nowDate.getTime() - atStageStartedDate.getTime();
    const stageProgress =
      Math.round(
        (period * 10000) / (millisecondsInADay * (coin.airdropStage ? 1 : safeNumber(coin.stageDuration, 1)))
      ) / 100;
    
    return stageProgress > 100 ? 100 : Math.max(0, stageProgress);
  }, [coin.atStageStarted, coin.airdropStage, coin.stageDuration]);

  const memoizedDerivedData = useMemo(() => {
    if (!coin.bondingCurve) {
      const progress = Math.round((safeNumber(coin.progressMcap) * safeNumber(solPrice) / 1e15) / 10) / 100;
      const liquidity = Math.round(((safeNumber(coin.lamportReserves) / 1e9) * safeNumber(solPrice) * 2) / 10) / 100;
      return { progress, liquidity, stageProg: memoizedStageProgress };
    } else {
      if (coin.movedToRaydium && !coin.moveRaydiumFailed) {
        return { progress: 100, liquidity: 0, stageProg: 100 };
      } else {
        const progress = Math.round((safeNumber(coin.progressMcap) * safeNumber(solPrice) / 1e15) / 10) / 100;
        const liquidity = Math.round(((safeNumber(coin.lamportReserves) / 1e9) * safeNumber(solPrice) * 2) / 10) / 100;
        return { progress, liquidity, stageProg: 100 };
      }
    }
  }, [coin.bondingCurve, coin.progressMcap, coin.lamportReserves, coin.movedToRaydium, coin.moveRaydiumFailed, solPrice, memoizedStageProgress]);

  const { data: claimDataQuery } = useQuery(
    ['claimData', param, publicKey?.toBase58()],
    async () => {
      const coinData = await getCoinInfo(param);
      if (coinData.token) {
        setCoin(coinData);
        const data = await getClaimData(coinData.token, publicKey?.toBase58() || '');

        // Transform the object response to array format expected by the component
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return [
            data.claimInUSD ?? 0,
            data.claimHodl ?? 0,
            data.redistribution ?? 0,
            data.solPrice ?? 0,
            data.airdropClaim ?? 0,  // Fixed: was data.rewardCap
            data.tokenBalance ?? 0,
          ];
        }
        return data;
      } else {
        return [0, 0, 0, 0, 0, 0];
      }
    },
    {
      enabled: !!param,
      staleTime: 10000, // 10 seconds - prevent unnecessary refetches
      cacheTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: false,
    }
  );

  // Update derived data when memoized data changes
  useEffect(() => {
    setProgress(memoizedDerivedData.progress);
    setLiquidity(memoizedDerivedData.liquidity);
    setStageProg(memoizedDerivedData.stageProg);
  }, [memoizedDerivedData]);

   // Update claim data when query data changes
  useEffect(() => {
    if (claimDataQuery && Array.isArray(claimDataQuery)) {

      setClaimData(claimDataQuery as [number, number, number, number, number, number]);
    }
  }, [claimDataQuery, publicKey?.toBase58()]);

  // Handle wallet disconnection
  useEffect(() => {
    if (!publicKey && coin.token) {
      setClaimData([0, 0, 0, 0, 0, 0]);
    }
  }, [publicKey, coin.token]);

  // Update UserContext solPrice when claimData changes
  useEffect(() => {
    if (solPrice > 0) {
      setSolPrice(solPrice);
    }
  }, [solPrice, setSolPrice]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Adjust layout for mobile
      if (window.innerWidth < 768) {
        // Mobile layout adjustments
      } else {
        // Desktop layout adjustments
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate stage progress based on current time and stage start time
  const calculateStageProgress = useCallback((coinData: coinInfo) => {
    if (!coinData.atStageStarted) return 0;
    
    const millisecondsInADay = 120 * 1000; // 2 minutes for testing
    // const millisecondsInADay = 24 * 60 * 60 * 1000; // 24 hours
    const nowDate = new Date();
    const atStageStartedDate = new Date(coinData.atStageStarted);
    const period = nowDate.getTime() - atStageStartedDate.getTime();
    const stageProgress =
      Math.round(
        (period * 10000) / (millisecondsInADay * (coinData.airdropStage ? 1 : safeNumber(coinData.stageDuration, 1)))
      ) / 100;
    
    return stageProgress > 100 ? 100 : Math.max(0, stageProgress);
  }, []);

  // Update all derived data based on coin info
  const updateDerivedData = useCallback((coinData: coinInfo) => {
    if (!coinData.bondingCurve) {
      // Only set stage progress if we're not in a stage that needs real-time updates
      // (i.e., if atStageStarted is not set, this is initial data)
      if (!coinData.atStageStarted) {
        const stageProgress = calculateStageProgress(coinData);
        setStageProg(stageProgress);
      }

      setProgress(Math.round((safeNumber(coinData.progressMcap) * safeNumber(solPrice) / 1e15) / 10) / 100);
      setLiquidity(
        Math.round(((safeNumber(coinData.lamportReserves) / 1e9) * safeNumber(solPrice) * 2) / 10) / 100
      );
          } else {
        if (coinData.movedToRaydium && !coinData.moveRaydiumFailed) {
          setProgress(100);
          setLiquidity(0);
          setStageProg(100);
        } else {
          setProgress(Math.round((safeNumber(coinData.progressMcap) * safeNumber(solPrice) / 1e15) / 10) / 100);
          setLiquidity(
            Math.round(((safeNumber(coinData.lamportReserves) / 1e9) * safeNumber(solPrice) * 2) / 10) / 100
          );
          setStageProg(100);
        }
      }
  }, [calculateStageProgress, solPrice]);

  // Handle real-time claim data updates with debouncing
  const handleClaimDataUpdate = useCallback((payload: any) => {
    
    console.log('__yuki__ handleClaimDataUpdate payload: ', payload);
    // Update React Query cache directly for better performance
    queryClient.setQueryData(['claimData', param, publicKey?.toBase58()], [
      payload.claimData.claimInUSD ?? 0,
      payload.claimData.claimHodl ?? 0,
      payload.claimData.redistribution ?? 0, // Updated field name
      payload.claimData.solPrice ?? 0,
      payload.claimData.airdropClaim ?? 0,
      payload.claimData.tokenBalance ?? 0,
    ]);
    
    // Also update local state for immediate UI updates
    setClaimData([
      payload.claimData.claimInUSD ?? 0,
      payload.claimData.claimHodl ?? 0,
      payload.claimData.redistribution ?? 0, // Updated field name
      payload.claimData.solPrice ?? 0,
      payload.claimData.airdropClaim ?? 0,
      payload.claimData.tokenBalance ?? 0,
    ]);
  }, [publicKey, param, queryClient, claimData]);

  // Handle real-time stage changes with optimized updates
  const handleStageChange = useCallback((payload: any) => {
    
    
    // Update React Query cache directly for better performance
    queryClient.setQueryData(['coin', param], (oldData: any) => {
      if (!oldData) return oldData;
      const updatedCoin = {
        ...oldData,
        currentStage: payload.newStage,
        atStageStarted: new Date(payload.timestamp),
        airdropStage: payload.isAirdropStage,
        bondingCurve: payload.isBondingCurve,
        stageStarted: payload.stageStarted,
        stageEnded: payload.stageEnded
      };
      

      return updatedCoin;
    });
    
    // Also update local state for immediate UI updates
    setCoin(prevCoin => ({
      ...prevCoin,
      currentStage: payload.newStage,
      atStageStarted: new Date(payload.timestamp),
      airdropStage: payload.isAirdropStage,
      bondingCurve: payload.isBondingCurve,
      stageStarted: payload.stageStarted,
      stageEnded: payload.stageEnded
    }));
  }, [param, queryClient, onStageChange]);

  // Handle real-time coin info updates with optimized caching
  const handleCoinInfoUpdate = useCallback((payload: any) => {
    // Update React Query cache directly for better performance
    queryClient.setQueryData(['coin', param], payload.coinInfo);
    
    // Also update local state for immediate UI updates
    setCoin(payload.coinInfo);
    
    // Update derived data (but not stage progress if we have real-time timer running)
    updateDerivedData(payload.coinInfo);
  }, [param, queryClient, updateDerivedData, onCoinInfoUpdate]);

  // Optimized socket callback registration and parameter handling
  useEffect(() => {
    const segments = pathname.split('/');
    const parameter = segments[segments.length - 1];
    
    // Only update if the parameter actually changed
    if (param !== parameter) {
      setParam(parameter);
      setCoinId(parameter);
      setCoin({} as coinInfo);
      
      // Parallel data fetching for initial load
      const fetchInitialData = async () => {
        try {
          const coindata = await getCoinInfo(parameter);
          if (coindata.token) {
            setCoin(coindata);
            updateDerivedData(coindata);
            const claimData = await getClaimData(coindata.token, publicKey?.toBase58() || '');
            if (claimData) setClaimData(claimData);
          }
          
        } catch (error) {
          console.error('__yuki__ tradingPage error: fetching initial data:', error);
        }
      };
      
      fetchInitialData();
    }
    
    // Register socket callbacks with optimized validation
    if (coin.token && publicKey?.toBase58()) {
      const validationParams = {
        expectedToken: coin.token,
        expectedUser: publicKey?.toBase58()
      };
      
      if (onClaimDataUpdate) {
        onClaimDataUpdate(handleClaimDataUpdate, validationParams);
      }
      if (onStageChange) {
        onStageChange(handleStageChange, { expectedToken: coin.token });
      }
      if (onCoinInfoUpdate) {
        onCoinInfoUpdate(handleCoinInfoUpdate, { expectedToken: coin.token });
      }
    }
    
    // Cleanup function to remove stale data when component unmounts or parameters change
    return () => {
      if (param) {
        queryClient.removeQueries(['claimData', param]);
      }
    };
  }, [pathname, param, coin.token, publicKey?.toBase58(), onClaimDataUpdate, onStageChange, onCoinInfoUpdate, handleClaimDataUpdate, handleStageChange, handleCoinInfoUpdate, queryClient, updateDerivedData]);

  // Handle wallet changes and manual claim data fetching
  useEffect(() => {
    // Only fetch if we have all required data
    if (coin.token && publicKey) {
      // Check if we already have cached data for this wallet
      const cachedData = queryClient.getQueryData(['claimData', param, publicKey.toBase58()]);
      
        if (!cachedData) {
          const fetchClaimDataForWallet = async () => {
          try {
            const response = await getClaimData(
              coin.token,
              publicKey.toBase58()
            );
            
            // Update React Query cache to keep it in sync
            queryClient.setQueryData(['claimData', param, publicKey.toBase58()], [
              response.claimInUSD ?? 0,
              response.claimHodl ?? 0,
              response.redistribution ?? 0, // Updated field name
              response.solPrice ?? 0,
              response.airdropClaim ?? 0,
              response.tokenBalance ?? 0,
            ]);
            
            setClaimData([
              response.claimInUSD ?? 0,
              response.claimHodl ?? 0,
              response.redistribution ?? 0, // Updated field name
              response.solPrice ?? 0,
              response.airdropClaim ?? 0,
              response.tokenBalance ?? 0,
            ]);
          } catch (error) {
            console.error('__yuki__ tradingPage error: fetching claim data for wallet:', error);
            setClaimData([0, 0, 0, 0, 0, 0]);
          }
        };
        fetchClaimDataForWallet();
      }
    }
  }, [publicKey, coin.token, param, queryClient]);

  const fetchData = async () => {
    updateDerivedData(coin);
    
    // Note: Claim data fetching is now handled by the dedicated useEffect above
    // This function only handles derived data updates
  };

  // Only fetch derived data when essential dependencies change (no more polling)
  useEffect(() => {
    if (coin && coin.token) {
      fetchData();
    }
  }, [publicKey, coin?.token, coin?.bondingCurve]);

  // Real-time stage progress timer
  useEffect(() => {
    // Stop timer if no coin, no token, no stage started, or bonding curve is true
    if (!coin || !coin.token || !coin.atStageStarted || coin.bondingCurve) {
      // Set stage progress to 100 when bonding curve is true
      if (coin?.bondingCurve) {
        setStageProg(100);
      }
      return; // Exit early, don't set up interval
    }

    const updateProgress = () => {
      const stageProgress = calculateStageProgress(coin);
      setStageProg(stageProgress);
      
      // Also update other derived data that depends on time
      if (!coin.bondingCurve) {
        setProgress(Math.round((safeNumber(coin.progressMcap) * safeNumber(solPrice) / 1e15) / 10) / 100);
        setLiquidity(
          Math.round(((safeNumber(coin.lamportReserves) / 1e9) * safeNumber(solPrice) * 2) / 10) / 100
        );
      }
      
    };

    // Update immediately
    updateProgress();

    // Set up interval to update every second
    const interval = setInterval(updateProgress, 1000);

    // Cleanup interval on unmount or when dependencies change
    return () => {
  
      clearInterval(interval);
    };
  }, [coin?.atStageStarted, coin?.bondingCurve, coin?.airdropStage, coin?.stagesNumber, calculateStageProgress, solPrice]);

  // Handle Raydium status changes and trigger notifications
  useEffect(() => {
    // Only process if coin is properly loaded
    if (!coin || !coin.token) {
      return;
    }
    
    if (coin.moveRaydiumFailed) {

    }
    
    if (coin.movedToRaydium) {

    }
  }, [coin?.movedToRaydium, coin?.moveRaydiumFailed, coin?.moveRaydiumFailureReason, coin?.raydiumUrl, coin?.token]);



  // Use countdown toast hook for real-time updates
  useCountdownToast(coin);

  // Update sell tax based on stage progress
  useEffect(() => {
    if (coin.airdropStage) {
      setSellTax(0);
    } else if (stageProg > safeNumber(coin.sellTaxDecay)) {
      setSellTax(safeNumber(coin.sellTaxMin));
    } else {
      setSellTax(
        Math.round(
          safeNumber(coin.sellTaxMax) -
            ((safeNumber(coin.sellTaxMax) - safeNumber(coin.sellTaxMin)) / safeNumber(coin.sellTaxDecay, 1)) *
              stageProg
        )
      );
    }
  }, [stageProg, coin, coin.airdropStage]);

  const copyToClipBoard = async (copyMe: string) => {
    try {
      await navigator.clipboard.writeText(copyMe);
      setCopySuccess('Copied!');
      successAlert('Copied!');
    } catch (err) {
      setCopySuccess('Failed to copy!');
    }
  };

  const copyErrorToClipboard = async () => {
    const errorMessage = coin.moveRaydiumFailureReason || 'Unknown error';
    try {
      await navigator.clipboard.writeText(errorMessage);
      successAlert('Error message copied to clipboard!');
    } catch (err) {
      errorAlert('Failed to copy error message');
    }
  };

  const handleClaim = async () => {
    const amount = coin.bondingCurve ? Number(airdropClaim + claimHodl) : Number(claimHodl);

    console.log('__yuki__ handleClaim wallet: ', wallet.publicKey.toBase58());
    const res = await claim(user, coin, wallet, Number(amount), coin.bondingCurve);
    // fetchData();

    if (res !== 'success') {

      errorAlert('Claim failed');
    }

  };

  return (
    <div className="w-full min-h-screen">
      <div className="container py-8">
        <div className="w-full flex flex-col px-3 mx-auto gap-5 pb-20">
          <div className="text-center">
            <div className="w-full flex flex-col">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="w-24 cursor-pointer text-foreground text-2xl flex flex-row items-center gap-2 pb-2 hover:text-primary transition-colors duration-200"
              >
                <IoMdArrowRoundBack /> Back
              </motion.div>
            </div>
          </div>

          {/* Raydium Move Failed Notification - Show only if failed, even if later succeeded */}
          {coin.bondingCurve && !coin.movedToRaydium && (
            <div className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white p-4 rounded-lg">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-xl font-bold mb-2">❌ Move to Raydium Failed</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/10 p-3 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                    <span className="text-red-300 flex-shrink-0">✗</span>
                    <span className="font-medium truncate">{coin.name} ({coin.ticker})</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span 
                      className="text-white font-medium text-sm sm:text-base break-words flex-1 cursor-pointer hover:text-gray-200 transition-colors overflow-hidden truncate"
                      title="Click to expand"
                    >
                      {coin.moveRaydiumFailureReason || 'Unknown error'}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={copyErrorToClipboard}
                      className="flex-shrink-0 text-white hover:text-gray-200 transition-colors p-1"
                      title="Copy error message"
                    >
                      <FaCopy className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Raydium Success Notification - Show only if succeeded AND never failed */}
          {coin.bondingCurve && coin.movedToRaydium && (
            <div className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-xl font-bold mb-2">Moved to Raydium Successfully!</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/10 p-3 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span className="font-medium truncate">{coin.name} ({coin.ticker})</span>
                  </div>
                  <a
                    href={coin.raydiumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex-shrink-0 ml-auto sm:ml-0"
                  >
                    Trade on Raydium
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Display token balance at the top */}
          <div className="mb-4 flex items-center gap-2">
            <span className="font-semibold text-primary">Your Token Balance:</span>
            <span className="text-lg">{safeNumber(tokenBalance)}</span>
            <span className="text-muted-foreground">{coin?.ticker || 'Token'}</span>
          </div>

          {/* Mobile Tab Navigation */}
          {isMobile && (
            <div className="flex bg-card border border-border rounded-lg p-1 mb-4">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'chart'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'chat'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('trade')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === 'trade'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Trade
              </button>
            </div>
          )}

          <div className={`w-full flex flex-col ${isMobile ? '' : 'md3:flex-row'} gap-4`}>
            {/* Main Content Area */}
            <div className={`${isMobile ? 'w-full' : 'flex-1'} px-2 transition-all duration-300 ease-in-out`}>
              {/* Token Info Header */}
              <div className="w-full flex flex-col justify-between gap-2 mb-4">
                <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 items-center justify-between`}>
                  <p className="font-semibold text-foreground text-sm sm:text-base">Token Name - {coin?.name}</p>
                  <p className="font-semibold text-foreground text-sm sm:text-base">Ticker: {coin?.ticker}</p>
                </div>
                <div className="flex flex-row justify-end items-center gap-2 pb-2">
                  <p className="font-semibold text-foreground text-xs sm:text-sm truncate">CA: {coin?.token}</p>
                  <motion.p
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipBoard(coin?.token)}
                    className="cursor-pointer text-lg sm:text-xl text-primary hover:text-primary/80 transition-colors duration-200 flex-shrink-0"
                  >
                    <FaCopy />
                  </motion.p>
                </div>
              </div>

              {/* Chart Section */}
              {(!isMobile || activeTab === 'chart') && (
                <div className={`${isMobile ? 'w-full' : ''} mb-4`}>
                  <Suspense fallback={
                    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-foreground">Loading Chart...</span>
                    </div>
                  }>
                    <LazyTradingChart param={coin} tokenReserves={coin.tokenReserves} />
                  </Suspense>
                </div>
              )}

              {/* Chat Section */}
              {(!isMobile || activeTab === 'chat') && (
                <div className={`${isMobile ? 'w-full' : ''}`}>
                  <Suspense fallback={
                    <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-foreground">Loading Chat...</span>
                    </div>
                  }>
                    <LazyChatting param={param} coin={coin} />
                  </Suspense>
                </div>
              )}
            </div>
            
            {/* Trade Panel */}
            <div className={`${isMobile ? 'w-full' : 'w-full max-w-[300px] 2xs:max-w-[420px]'} px-2 gap-4 flex flex-col mx-auto ${(!isMobile || activeTab === 'trade') ? 'block' : 'hidden'}`}>
              <TradeForm coin={coin} progress={progress} />

              <div className="w-full flex flex-col text-center gap-4 py-4 border-2 border-primary/30 rounded-lg px-3 bg-card shadow-lg">
                {coin.bondingCurve ? (
                  <p className="font-semibold text-xl text-foreground">{`All Stages Completed`}</p>
                ) : (
                  <p className="font-semibold text-xl text-foreground">
                    {`Stage ${Math.min(safeNumber(coin.currentStage), safeNumber(coin.stagesNumber))} Reward Claim`}
                  </p>
                )}
                {login && publicKey ? (
                  <div className="w-full justify-center items-center flex flex-col gap-2">             
                    <p className="text-sm px-5 text-muted-foreground">You are eligible to claim:</p>
                    <p className="text-xl font-semibold text-primary">{safeCurrency(claimInUSD)} USD</p>
                    <p className="text-xl font-semibold text-primary">{formatClaimHodl(claimHodl)} {coin.ticker}</p>
                    {airdropClaim > 0 && (
                      <p className="text-sm font-semibold text-primary">{safeCurrency(airdropClaim, 6)} {coin.ticker} ({coin.bondingCurve ? 'Airdrop' : 'Airdrop Locked'})</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm px-5 text-muted-foreground">
                    Connect your wallet to check your eligibility to claim this
                    token
                  </p>
                )}
                <div className="flex flex-col">
                  { (
                    login && publicKey ? (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={
                          coin.airdropStage && (coin.bondingCurve ? Number(airdropClaim + claimHodl) : Number(claimHodl)) > 0
                            ? handleClaim
                            : undefined
                        }
                        className={`w-1/2 border-2 border-primary/30 cursor-pointer rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto transition-all duration-200
                          ${
                            coin.airdropStage && (coin.bondingCurve ? Number(airdropClaim + claimHodl) : Number(claimHodl)) > 0
                              ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                      >
                        Claim
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-1/2 border-2 border-primary/30 cursor-pointer hover:bg-accent rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto transition-all duration-200 text-primary"
                        onClick={() => setVisible(true)}
                      >
                        Connect Wallet
                      </motion.div>
                    )
                  )}
                </div>
              </div>

              <div className="text-foreground font-bold flex flex-row items-center gap-1 text-xl justify-center">
                <p>{coin.ticker}</p>
                <motion.p
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyToClipBoard(coin.token)}
                  className="cursor-pointer text-primary hover:text-primary/80 transition-colors duration-200"
                >
                  <FaCopy />
                </motion.p>
                / <p>SOL</p>
              </div>

              <SocialList coin={coin} />

              <div className="w-full flex flex-col gap-4">
                <div className="w-full grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4">
                  <DataCard text="MCAP" data={`$${safeNumber(progress)} k`} />
                  <DataCard text="Liquidity" data={`$${safeNumber(liquidity)} k`} />
                </div>
                <div className="w-full grid grid-cols-2 gap-2 sm:gap-4">
                  <DataCard
                    text="Stage"
                    data={`${Math.min(safeNumber(coin.currentStage), safeNumber(coin.stagesNumber))} of ${safeNumber(coin.stagesNumber)}`}
                  />
                  <DataCard text="Sell Tax" data={safePercentage(sellTax)} />
                </div>
                <div className="w-full grid grid-cols-1 gap-2 sm:gap-4">
                  <DataCard 
                    text="Redistribution"
                    data={`$${safeCurrency(redistribution, 4)}`} 
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-full flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground text-sm sm:text-base lg:text-xl">
                      {coin.bondingCurve
                        ? 'All Stages Completed'
                        : coin.airdropStage
                          ? `Airdrop ${Math.min(safeNumber(coin.currentStage), safeNumber(coin.stagesNumber))} : ${safeStageProgress(stageProg)} of 1 Day`
                          : `Stage ${Math.min(safeNumber(coin.currentStage), safeNumber(coin.stagesNumber))} : ${safeStageProgress(stageProg)} of ${safeNumber(coin.stageDuration)} Days`}
                    </p>
                    {coin?.token && coin?.atStageStarted && !coin?.bondingCurve && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" title="Updating in real-time"></div>
                    )}
                  </div>
                  <div className="bg-muted rounded-full h-2 relative">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${safeNumber(stageProg)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <TokenData coinData={coin} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}