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
import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { IoMdArrowRoundBack } from 'react-icons/io';
import SocialList from '../others/socialList';
import TokenData from '../others/TokenData';
import { DataCard } from '../cards/DataCard';
import { FaCopy } from 'react-icons/fa6';
import { errorAlert, successAlert } from '../others/ToastGroup';
import { ConnectButton } from '../buttons/ConnectButton';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { getTokenBalance } from '@/program/web3';

import { useQuery } from 'react-query';
import { PublicKey } from '@solana/web3.js';
import { useCountdownToast } from '@/utils/useCountdownToast';
import { token } from '@coral-xyz/anchor/dist/cjs/utils';
import { motion } from 'framer-motion';
import { useSocket } from '@/contexts/SocketContext';
import { Send } from 'lucide-react';

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
  const { coinId, setCoinId, login, user, web3Tx, setWeb3Tx } =
    useContext(UserContext);
  const wallet = useWallet();
  const { visible, setVisible } = useWalletModal();
  const pathname = usePathname();
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
  const [chatPosition, setChatPosition] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 540 });
  const [chatSize, setChatSize] = useState({ width: 350, height: 500 });

  // Only destructure the first 6 values, use claimData[6] for coinData
  const [claimInUSD, claimHodl, currentClaim, solPrice, rewardCap, tokenBalance] = claimData;

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

  // Handle real-time claim data updates
  const handleClaimDataUpdate = useCallback((payload: any) => {
    console.log('__yuki__ handleClaimDataUpdate called with payload:', payload);
    console.log('__yuki__ Current coin.token:', coin.token);
    console.log('__yuki__ Current publicKey:', publicKey?.toBase58());
    console.log('__yuki__ Payload user:', payload.user);
    console.log('__yuki__ Is coin loaded:', !!coin.token);
    
    // Only process if coin is properly loaded and has a token
    if (!coin.token) {
      console.log('__yuki__ Coin not loaded yet, ignoring claim data update');
      return;
    }
    
    // Compare payload.token (token address) with coin.token (token address)
    if (payload.token === coin.token && publicKey && payload.user === publicKey.toBase58()) {
      console.log('__yuki__ Conditions met, updating claimData');
      
      setClaimData([
        payload.claimData.claimInUSD ?? 0,
        payload.claimData.claimHodl ?? 0,
        payload.claimData.currentClaim ?? 0,
        payload.claimData.solPrice ?? 0,
        payload.claimData.rewardCap ?? 0,
        payload.claimData.tokenBalance ?? 0,
      ]);
      console.log('__yuki__ claimData updated with new values:', {
        claimInUSD: payload.claimData.claimInUSD,
        claimHodl: payload.claimData.claimHodl,
        currentClaim: payload.claimData.currentClaim,
        solPrice: payload.claimData.solPrice,
        rewardCap: payload.claimData.rewardCap,
        tokenBalance: payload.claimData.tokenBalance
      });
    } else {
      console.log('__yuki__ Conditions not met:', {
        tokenMatch: payload.token === coin.token,
        hasPublicKey: !!publicKey,
        userMatch: publicKey ? payload.user === publicKey.toBase58() : false
      });
    }
  }, [coin.token, publicKey]);

  // Handle real-time stage changes
  const handleStageChange = useCallback((payload: any) => {
    console.log('__yuki__ handleStageChange called with payload:', payload);
    console.log('__yuki__ Current coin.token:', coin.token);
    console.log('__yuki__ Payload token:', payload.token);
    console.log('__yuki__ Token match:', payload.token === coin.token);
    console.log('__yuki__ Is coin loaded:', !!coin.token);
    
    // Only process if coin is properly loaded and has a token
    if (!coin.token) {
      console.log('__yuki__ Coin not loaded yet, ignoring stage change');
      return;
    }
    
    // Compare payload.token (token address) with coin.token (token address)
    if (payload.token === coin.token) {
      console.log('__yuki__ Token match confirmed, updating stage data');
      
      // Update coin data with new stage information
      setCoin(prevCoin => {
        const updatedCoin = {
          ...prevCoin,
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
    } else {
      console.log('__yuki__ Token mismatch in stage change, ignoring update');
    }
  }, [coin.token]);

  // Handle real-time coin info updates
  const handleCoinInfoUpdate = useCallback((payload: any) => {
    console.log('__yuki__ handleCoinInfoUpdate called with payload:', payload);
    console.log('__yuki__ Current coin.token:', coin.token);
    console.log('__yuki__ Payload token:', payload.token);
    console.log('__yuki__ Token match:', payload.token === coin.token);
    console.log('__yuki__ Is coin loaded:', !!coin.token);
    
    // Only process if coin is properly loaded and has a token
    if (!coin.token) {
      console.log('__yuki__ Coin not loaded yet, ignoring coin info update');
      return;
    }
    
    if (payload.token === coin.token) {
      console.log('__yuki__ Token match confirmed, updating coin data');
      
      // Log token reserves changes for debugging
      if (payload.coinInfo.tokenReserves !== coin.tokenReserves) {
        console.log('__yuki__ Token reserves changed, chart should update:', {
          previous: coin.tokenReserves,
          current: payload.coinInfo.tokenReserves,
          priceChange: payload.coinInfo.lamportReserves / payload.coinInfo.tokenReserves - coin.lamportReserves / coin.tokenReserves
        });
      }
      
      // Log stage and Raydium status changes
      if (payload.coinInfo.currentStage !== coin.currentStage) {
        console.log('__yuki__ Stage changed:', {
          previous: coin.currentStage,
          current: payload.coinInfo.currentStage
        });
      }
      
      if (payload.coinInfo.movedToRaydium !== coin.movedToRaydium) {
        console.log('__yuki__ Raydium status changed:', {
          previous: coin.movedToRaydium,
          current: payload.coinInfo.movedToRaydium
        });
      }
      
      if (payload.coinInfo.moveRaydiumFailed !== coin.moveRaydiumFailed) {
        console.log('__yuki__ Raydium failure status changed:', {
          previous: coin.moveRaydiumFailed,
          current: payload.coinInfo.moveRaydiumFailed
        });
      }
      
      // Update coin data
      setCoin(payload.coinInfo);
      
      // Update derived data (but not stage progress if we have real-time timer running)
      updateDerivedData(payload.coinInfo);
      
      console.log('__yuki__ Trading: Coin info updated from socket, new coin data:', payload.coinInfo);
      // The useCountdownToast hook will handle countdown toasts automatically
    } else {
      console.log('__yuki__ Token mismatch, ignoring update');
    }
  }, [coin.token, coin.tokenReserves, coin.currentStage, coin.movedToRaydium, coin.moveRaydiumFailed, updateDerivedData]);

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
          {isLoading && (
            <div className="w-full flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-foreground">Loading token data...</span>
            </div>
          )}

          {/* Raydium Move Failed Notification - Show only if failed, even if later succeeded */}
          {!isLoading && !coin.movedToRaydium && coin.moveRaydiumFailed && (
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
          {!isLoading && coin.movedToRaydium && !coin.moveRaydiumFailed && (
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

          <div className="w-full flex flex-col md3:flex-row gap-4">
            <div className={`flex-1 px-2 transition-all duration-300 ease-in-out ${isChatPanelOpen ? 'mr-4' : ''}`}>
              <div className="w-full flex flex-col justify-between gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="font-semibold text-foreground">Token Name - {coin?.name}</p>
                  <p className="font-semibold text-foreground">Ticker: {coin?.ticker}</p>
                </div>
                <div className="flex flex-row justify-end items-center gap-2 pb-2">
                  <p className="font-semibold text-foreground">CA: {coin?.token}</p>
                  <motion.p
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipBoard(coin?.token)}
                    className="cursor-pointer text-xl text-primary hover:text-primary/80 transition-colors duration-200"
                  >
                    <FaCopy />
                  </motion.p>
                </div>
              </div>
              <TradingChart param={coin} tokenReserves={coin.tokenReserves} />
              <Chatting param={param} coin={coin} />
            </div>
            
            {/* Chat Panel */}
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

            <div className="w-full max-w-[300px] 2xs:max-w-[420px] px-2 gap-4 flex flex-col mx-auto">
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
                <div className="w-full flex flex-col 2xs:flex-row gap-4 items-center justify-between">
                  <DataCard text="MCAP" data={`${progress} k`} />
                  <DataCard text="Liquidity" data={`${liquidity} k`} />
                </div>
                <div className="w-full flex flex-col 2xs:flex-row gap-4 items-center justify-between">
                  <DataCard
                    text="Stage"
                    data={`${Math.min(coin.currentStage, coin.stagesNumber)} of ${coin.stagesNumber}`}
                  />
                  <DataCard text="Sell Tax" data={`${sellTax} %`} />
                  <DataCard text="Redistribution" data="$ 15.2K" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-full flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                  <p className="text-foreground text-base lg:text-xl">
                    {coin.bondingCurve
                      ? 'All Stages Completed'
                      : coin.airdropStage
                        ? `Airdrop ${Math.min(coin.currentStage, coin.stagesNumber)} : ${stageProg}% of 1 Day`
                        : `Stage ${Math.min(coin.currentStage, coin.stagesNumber)} : ${stageProg}% of ${coin.stageDuration} Days`}
                  </p>
                    {isTimerActive && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Updating in real-time"></div>
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
      
      {/* Reply Button - Fixed in bottom right corner */}
      <motion.button
        onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-10 h-10 rounded-full text-blue-500 border border-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-all p-0 bg-transparent shadow-none"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Send className="w-5 h-5" />
      </motion.button>
    </div>
  );
}