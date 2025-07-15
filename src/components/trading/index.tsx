'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Chatting } from '@/components/trading/Chatting';
import { ChatPanel } from '@/components/trading/ChatPanel';
import { TradeForm } from '@/components/trading/TradeForm';
import { TradingChart } from '@/components/TVChart/TradingChart';
import UserContext from '@/context/UserContext';
import { coinInfo, userInfo } from '@/utils/types';
import {
  claim,
  getClaim,
  getClaimData,
  getCoinInfo,
  getSolPriceInUSD,
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
import { PublicKey } from '@solana/web3.js';
import { useCountdownToast } from '@/utils/useCountdownToast';
import { token } from '@coral-xyz/anchor/dist/cjs/utils';
import { motion } from 'framer-motion';
import { useSocket } from '@/contexts/SocketContext';
import { Send } from 'lucide-react';

// Lazy load heavy components
const LazyTradingChart = lazy(() => import('@/components/TVChart/TradingChart').then(module => ({ default: module.TradingChart })));
const LazyChatting = lazy(() => import('@/components/trading/Chatting').then(module => ({ default: module.Chatting })));

const getBalance = async (wallet: string, token: string) => {
  try {
    if (!wallet || !token) {
      console.log('__yuki__ getBalance: Invalid parameters - wallet or token is undefined/null');
      return 0;
    }
    const balance = await getTokenBalance(wallet, token);
    return balance;
  } catch (error) {
    console.error('__yuki__ getBalance error:', error);
    return 0;
  }
};

const isUserInfo = (obj: any): obj is userInfo => {
  return obj && typeof obj === 'object' && '_id' in obj;
};

export default function TradingPage() {
  const { coinId, setCoinId, login, user, web3Tx, setWeb3Tx, setSolPrice } =
    useContext(UserContext);
  const wallet = useWallet();
  const { visible, setVisible } = useWalletModal();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [publicKey, setPublicKey] = useState<PublicKey | null>(wallet.publicKey);
  const [param, setParam] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [coin, setCoin] = useState<coinInfo>({} as coinInfo);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [stageProg, setStageProg] = useState<number>(0);
  const [sellTax, setSellTax] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isErrorExpanded, setIsErrorExpanded] = useState<boolean>(false);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [claimData, setClaimData] = useState<[number, number, number, number, number, number]>([0, 0, 0, 0, 0, 0]);
  const { onClaimDataUpdate, onStageChange, onCoinInfoUpdate } = useSocket();
  const router = useRouter();
  
  // Chat panel state
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const [chatSize, setChatSize] = useState({ width: 350, height: 500 });

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'chat' | 'trade'>('chart');

  // Only destructure the first 6 values, use claimData[6] for coinData
  // Ensure claimData is always an array to prevent destructuring errors
  const [claimInUSD, claimHodl, currentClaim, solPrice, rewardCap, tokenBalance] = Array.isArray(claimData) ? claimData : [0, 0, 0, 0, 0, 0];
  


  // Memoized calculations for performance
  const memoizedStageProgress = useMemo(() => {
    if (!coin.atStageStarted) return 0;
    
    const millisecondsInADay = 120 * 1000; // 2 minutes for testing
    const nowDate = new Date();
    const atStageStartedDate = new Date(coin.atStageStarted);
    const period = nowDate.getTime() - atStageStartedDate.getTime();
    const stageProgress =
      Math.round(
        (period * 10000) / (millisecondsInADay * (coin.airdropStage ? 1 : coin.stageDuration))
      ) / 100;
    
    return stageProgress > 100 ? 100 : stageProgress;
  }, [coin.atStageStarted, coin.airdropStage, coin.stageDuration]);

  const memoizedDerivedData = useMemo(() => {
    if (!coin.bondingCurve) {
      const progress = Math.round((coin.progressMcap * solPrice / 1e15) / 10) / 100;
      const liquidity = Math.round(((coin.lamportReserves / 1e9) * solPrice * 2) / 10) / 100;
      return { progress, liquidity, stageProg: memoizedStageProgress };
    } else {
      if (coin.movedToRaydium && !coin.moveRaydiumFailed) {
        return { progress: 100, liquidity: 0, stageProg: 100 };
      } else {
        const progress = Math.round((coin.progressMcap * solPrice / 1e15) / 10) / 100;
        const liquidity = Math.round(((coin.lamportReserves / 1e9) * solPrice * 2) / 10) / 100;
        return { progress, liquidity, stageProg: 100 };
      }
    }
  }, [coin.bondingCurve, coin.progressMcap, coin.lamportReserves, coin.movedToRaydium, coin.moveRaydiumFailed, solPrice, memoizedStageProgress]);

  // React Query for data fetching
  const { data: coinData, isLoading: isCoinLoading, error: coinError } = useQuery(
    ['coin', param],
    () => getCoinInfo(param),
    {
      enabled: !!param,
      staleTime: 30000, // 30 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const { data: claimDataQuery, isLoading: isClaimLoading } = useQuery(
    ['claimData', param, publicKey?.toBase58()],
    async () => {
      const data = await getClaimData(param, publicKey?.toBase58() || '');
      // Transform the object response to array format expected by the component
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return [
          data.claimInUSD ?? 0,
          data.claimHodl ?? 0,
          data.currentClaim ?? 0,
          data.solPrice ?? 0,
          data.rewardCap ?? 0,
          data.tokenBalance ?? 0,
        ];
      }
      return data;
    },
    {
      enabled: !!param && !!publicKey,
      staleTime: 10000, // 10 seconds
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

  // Update coin data when query data changes
  useEffect(() => {
    if (coinData) {
      setCoin(coinData);
      setIsLoading(false);
    }
  }, [coinData]);

  // Update claim data when query data changes
  useEffect(() => {
    if (claimDataQuery && Array.isArray(claimDataQuery)) {
      setClaimData(claimDataQuery as [number, number, number, number, number, number]);
    }
  }, [claimDataQuery]);

  // Update UserContext solPrice when claimData changes
  useEffect(() => {
    if (solPrice > 0) {
      setSolPrice(solPrice);
    }
  }, [solPrice, setSolPrice]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Adjust chat position for mobile
      if (window.innerWidth < 768) {
        setChatPosition({ x: 0, y: 0 });
        setChatSize({ width: window.innerWidth, height: window.innerHeight * 0.6 });
      } else {
        setChatPosition({ x: window.innerWidth - 380, y: window.innerHeight - 540 });
        setChatSize({ width: 350, height: 500 });
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
        (period * 10000) / (millisecondsInADay * (coinData.airdropStage ? 1 : coinData.stageDuration))
      ) / 100;
    
    return stageProgress > 100 ? 100 : stageProgress;
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

      setProgress(Math.round((coinData.progressMcap * solPrice / 1e15) / 10) / 100);
      setLiquidity(
        Math.round(((coinData.lamportReserves / 1e9) * solPrice * 2) / 10) / 100
      );
    } else {
      console.log('__yuki__ bondingCurve is true, and claim requested');
      if (coinData.movedToRaydium && !coinData.moveRaydiumFailed) {
        setProgress(100);
        setLiquidity(0);
        setStageProg(100);
      } else {
        setProgress(Math.round((coinData.progressMcap * solPrice / 1e15) / 10) / 100);
        setLiquidity(
          Math.round(((coinData.lamportReserves / 1e9) * solPrice * 2) / 10) / 100
        );
        setStageProg(100);
      }
    }
  }, [calculateStageProgress, solPrice]);

  // Handle real-time claim data updates with debouncing
  const handleClaimDataUpdate = useCallback((payload: any) => {
    // Only process if coin is properly loaded and has a token
    if (!coin.token) {
      return;
    }
    
    // Compare payload.token (token address) with coin.token (token address)
    if (payload.token === coin.token && publicKey && payload.user === publicKey.toBase58()) {
      // Update React Query cache directly for better performance
      queryClient.setQueryData(['claimData', param, publicKey.toBase58()], [
        payload.claimData.claimInUSD ?? 0,
        payload.claimData.claimHodl ?? 0,
        payload.claimData.currentClaim ?? 0,
        payload.claimData.solPrice ?? 0,
        payload.claimData.rewardCap ?? 0,
        payload.claimData.tokenBalance ?? 0,
      ]);
      
      // Also update local state for immediate UI updates
      setClaimData([
        payload.claimData.claimInUSD ?? 0,
        payload.claimData.claimHodl ?? 0,
        payload.claimData.currentClaim ?? 0,
        payload.claimData.solPrice ?? 0,
        payload.claimData.rewardCap ?? 0,
        payload.claimData.tokenBalance ?? 0,
      ]);
    }
  }, [coin.token, publicKey, param, queryClient]);

  // Handle real-time stage changes with optimized updates
  const handleStageChange = useCallback((payload: any) => {
    // Only process if coin is properly loaded and has a token
    if (!coin.token) {
      return;
    }
    
    // Compare payload.token (token address) with coin.token (token address)
    if (payload.token === coin.token) {
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
        
        console.log('__yuki__ Trading: Stage change updated coin data:', updatedCoin);
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
    }
  }, [coin.token, param, queryClient]);

  // Handle real-time coin info updates with optimized caching
  const handleCoinInfoUpdate = useCallback((payload: any) => {
    // Only process if coin is properly loaded and has a token
    if (!coin.token) {
      return;
    }
    
    if (payload.token === coin.token) {
      // Update React Query cache directly for better performance
      queryClient.setQueryData(['coin', param], payload.coinInfo);
      
      // Also update local state for immediate UI updates
      setCoin(payload.coinInfo);
      
      // Update derived data (but not stage progress if we have real-time timer running)
      updateDerivedData(payload.coinInfo);
    }
  }, [coin.token, param, queryClient, updateDerivedData]);

  // Register socket callbacks
  useEffect(() => {
    if (onClaimDataUpdate) {
      onClaimDataUpdate(handleClaimDataUpdate);
    }
    if (onStageChange) {
      onStageChange(handleStageChange);
    }
    if (onCoinInfoUpdate) {
      onCoinInfoUpdate(handleCoinInfoUpdate);
    }
  }, [onClaimDataUpdate, onStageChange, onCoinInfoUpdate, handleClaimDataUpdate, handleStageChange, handleCoinInfoUpdate]);

  useEffect(() => {
    const segments = pathname.split('/');
    const parameter = segments[segments.length - 1];
    
    // Only update if the parameter actually changed
    if (param !== parameter) {
      setParam(parameter);
      setCoinId(parameter);
      setCoin({} as coinInfo);
      setIsLoading(true);
      
      // Immediately fetch coin data to avoid waiting for ClaimContext
      const fetchInitialData = async () => {
        try {
          const coinData = await getCoinInfo(parameter);
          setCoin(coinData);
          updateDerivedData(coinData);
          setIsLoading(false);
        } catch (error) {
          console.error('Error fetching initial coin data:', error);
          setIsLoading(false);
        }
      };
      
      fetchInitialData();
    }
  }, [pathname, updateDerivedData]);

  useEffect(() => {
    if (coin.token && publicKey) {
      console.log('__yuki__ Wallet changed, fetching claim data for new wallet');
      const fetchClaimDataForWallet = async () => {
        try {
          const response = await getClaimData(
            coin.token,
            publicKey.toBase58()
          );
          setClaimData([
            response.claimInUSD ?? 0,
            response.claimHodl ?? 0,
            response.currentClaim ?? 0,
            response.solPrice ?? 0,
            response.rewardCap ?? 0,
            response.tokenBalance ?? 0,
          ]);
          console.log('__yuki__ Claim data updated for new wallet:', response);
        } catch (error) {
          console.error('__yuki__ Error fetching claim data for new wallet:', error);
          setClaimData([0, 0, 0, 0, 0, 0]);
        }
      };
      fetchClaimDataForWallet();
    } else if (coin.token && !publicKey) {
      // Wallet disconnected, reset claim data
      setClaimData([0, 0, 0, 0, 0, 0]);
    }
  }, [publicKey, coin.token]);

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
    console.log('__yuki__ Timer useEffect triggered:', {
      hasCoin: !!coin,
      hasToken: !!coin?.token,
      atStageStarted: coin?.atStageStarted,
      bondingCurve: coin?.bondingCurve,
      currentStage: coin?.currentStage,
      stagesNumber: coin?.stagesNumber
    });

    // Stop timer if no coin, no token, no stage started, or bonding curve is true
    if (!coin || !coin.token || !coin.atStageStarted || coin.bondingCurve) {
      console.log('__yuki__ Stopping timer - conditions not met');
      setIsTimerActive(false);
      // Set stage progress to 100 when bonding curve is true
      if (coin?.bondingCurve) {
        setStageProg(100);
      }
      return; // Exit early, don't set up interval
    }

    console.log('__yuki__ Starting timer - conditions met');
    setIsTimerActive(true);

    const updateProgress = () => {
      const stageProgress = calculateStageProgress(coin);
      setStageProg(stageProgress);
      
      // Also update other derived data that depends on time
      if (!coin.bondingCurve) {
        setProgress(Math.round((coin.progressMcap * solPrice / 1e15) / 10) / 100);
        setLiquidity(
          Math.round(((coin.lamportReserves / 1e9) * solPrice * 2) / 10) / 100
        );
      }
      
    };

    // Update immediately
    updateProgress();

    // Set up interval to update every second
    const interval = setInterval(updateProgress, 1000);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      console.log('__yuki__ Cleaning up timer interval');
      clearInterval(interval);
      setIsTimerActive(false);
    };
  }, [coin?.atStageStarted, coin?.bondingCurve, coin?.airdropStage, coin?.stagesNumber, calculateStageProgress, solPrice]);

  // Handle Raydium status changes and trigger notifications
  useEffect(() => {
    // Only process if coin is properly loaded
    if (!coin || !coin.token) {
      console.log('__yuki__ Coin not loaded yet, skipping Raydium status check');
      return;
    }
    
    console.log('__yuki__ Trading page Raydium status useEffect triggered:', {
      movedToRaydium: coin.movedToRaydium,
      moveRaydiumFailed: coin.moveRaydiumFailed,
      moveRaydiumFailureReason: coin.moveRaydiumFailureReason,
      raydiumUrl: coin.raydiumUrl,
      isLoading,
      coinName: coin.name,
      coinToken: coin.token
    });
    
    if (coin.moveRaydiumFailed) {
      console.log('__yuki__ Move to Raydium failed:', coin.moveRaydiumFailureReason);
      // The notification will be displayed automatically via the conditional rendering
    }
    
    if (coin.movedToRaydium) {
      console.log('__yuki__ Moved to Raydium successfully:', coin.raydiumUrl);
      // The notification will be displayed automatically via the conditional rendering
    }
  }, [coin?.movedToRaydium, coin?.moveRaydiumFailed, coin?.moveRaydiumFailureReason, coin?.raydiumUrl, isLoading, coin?.token]);

  // Debug logging for render state
  useEffect(() => {
    // Only log if coin is properly loaded
    if (!coin || !coin.token) {
      return;
    }
    
    console.log('__yuki__ Render check - coin state:', {
      name: coin.name,
      movedToRaydium: coin.movedToRaydium,
      moveRaydiumFailed: coin.moveRaydiumFailed,
      moveRaydiumFailureReason: coin.moveRaydiumFailureReason
    });
  }, [coin?.movedToRaydium, coin?.moveRaydiumFailed, coin?.moveRaydiumFailureReason, coin?.token]);

  // Use countdown toast hook for real-time updates
  useCountdownToast(coin);

  // Update sell tax based on stage progress
  useEffect(() => {
    if (coin.airdropStage) {
      setSellTax(0);
    } else if (stageProg > coin.sellTaxDecay) {
      setSellTax(coin.sellTaxMin);
    } else {
      setSellTax(
        Math.round(
          coin.sellTaxMax -
            ((coin.sellTaxMax - coin.sellTaxMin) / coin.sellTaxDecay) *
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
    const res = await claim(user, coin, wallet, Number(claimHodl));
    // fetchData();

    if (res !== 'success') {
      console.log('__yuki__ claim failed');
      errorAlert('Claim failed');
    }
    console.log('__yuki__ claim res : ', res);
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

          {/* Loading Indicator */}
          {(isLoading || isCoinLoading) && (
            <div className="w-full space-y-6">
              {/* Header Skeleton */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-6 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                </div>
              </div>

              {/* Token Balance Skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-6 bg-muted rounded animate-pulse w-32"></div>
                <div className="h-6 bg-muted rounded animate-pulse w-16"></div>
              </div>

              {/* Mobile Tab Skeleton */}
              <div className="flex bg-card border border-border rounded-lg p-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 py-2 px-4">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Content Skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-8 bg-muted rounded animate-pulse"></div>
                  <div className="h-64 bg-muted rounded animate-pulse"></div>
                  <div className="h-64 bg-muted rounded animate-pulse"></div>
                </div>
                
                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="h-32 bg-muted rounded animate-pulse"></div>
                  <div className="h-32 bg-muted rounded animate-pulse"></div>
                  <div className="h-32 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Raydium Move Failed Notification - Show only if failed, even if later succeeded */}
          {!isLoading && !coin.movedToRaydium && (
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
                      className={`text-white font-medium text-sm sm:text-base break-words flex-1 cursor-pointer hover:text-gray-200 transition-colors overflow-hidden ${
                        isErrorExpanded ? 'whitespace-normal' : 'truncate'
                      }`}
                      onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                      title={isErrorExpanded ? 'Click to collapse' : 'Click to expand'}
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
          {!isLoading && coin.movedToRaydium && (
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
            <span className="text-lg">{tokenBalance ?? 0}</span>
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
            <div className={`${isMobile ? 'w-full' : 'flex-1'} px-2 transition-all duration-300 ease-in-out ${isChatPanelOpen && !isMobile ? 'mr-4' : ''}`}>
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
            
            {/* Chat Panel - Desktop Only */}
            {!isMobile && (
              <ChatPanel 
                param={param}
                coin={coin}
                isOpen={isChatPanelOpen}
                onClose={() => setIsChatPanelOpen(false)}
                onMinimize={() => setIsChatMinimized(!isChatMinimized)}
                isMinimized={isChatMinimized}
                position={chatPosition}
                onPositionChange={setChatPosition}
                size={chatSize}
                onSizeChange={setChatSize}
              />
            )}

            {/* Trade Panel */}
            <div className={`${isMobile ? 'w-full' : 'w-full max-w-[300px] 2xs:max-w-[420px]'} px-2 gap-4 flex flex-col mx-auto ${(!isMobile || activeTab === 'trade') ? 'block' : 'hidden'}`}>
              <TradeForm coin={coin} progress={progress} />

              <div className="w-full flex flex-col text-center gap-4 py-4 border-2 border-primary/30 rounded-lg px-3 bg-card shadow-lg">
                {coin.bondingCurve ? (
                  <p className="font-semibold text-xl text-foreground">{`All Stages Completed`}</p>
                ) : (
                  <p className="font-semibold text-xl text-foreground">
                    {`Stage ${Math.min(coin.currentStage, coin.stagesNumber)} Reward Claim`}
                  </p>
                )}
                {login && publicKey ? (
                  <div className="w-full justify-center items-center flex flex-col gap-2">             
                    <p className="text-sm px-5 text-muted-foreground">You are eligible to claim:</p>
                    <p className="text-xl font-semibold text-primary">{`${Number(claimInUSD).toPrecision(9)} USD`}</p>
                    <p className="text-xl font-semibold text-primary">{`${Number(claimHodl).toPrecision(6)} HODL`}</p>
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
                          coin.airdropStage
                            ? handleClaim
                            : undefined
                        }
                        className={`w-1/2 border-2 border-primary/30 cursor-pointer rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto transition-all duration-200
                          ${
                            coin.airdropStage
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
                <p>HODL</p>
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
                  <DataCard text="MCAP" data={`${progress} k`} />
                  <DataCard text="Liquidity" data={`${liquidity} k`} />
                </div>
                <div className="w-full grid grid-cols-2 gap-2 sm:gap-4">
                  <DataCard
                    text="Stage"
                    data={`${Math.min(coin.currentStage, coin.stagesNumber)} of ${coin.stagesNumber}`}
                  />
                  <DataCard text="Sell Tax" data={`${sellTax} %`} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-full flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground text-sm sm:text-base lg:text-xl">
                      {coin.bondingCurve
                        ? 'All Stages Completed'
                        : coin.airdropStage
                          ? `Airdrop ${Math.min(coin.currentStage, coin.stagesNumber)} : ${stageProg}% of 1 Day`
                          : `Stage ${Math.min(coin.currentStage, coin.stagesNumber)} : ${stageProg}% of ${coin.stageDuration} Days`}
                    </p>
                    {isTimerActive && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" title="Updating in real-time"></div>
                    )}
                  </div>
                  <div className="bg-muted rounded-full h-2 relative">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${stageProg}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <TokenData coinData={coin} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Button - Fixed in bottom right corner */}
      <motion.button
        onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground hover:from-primary/95 hover:via-primary/90 hover:to-primary/80 transition-all duration-500 shadow-[0_6px_24px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl border border-white/20 hover:border-white/30"
        whileHover={{ scale: 1.1, y: -2, rotate: 3 }}
        whileTap={{ scale: 0.92 }}
        initial={{ opacity: 0, y: 20, scale: 0.7, rotate: -5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 150, damping: 15 }}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
          <svg className="w-6 h-6 drop-shadow-lg relative z-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
        </div>
      </motion.button>
    </div>
  );
}