'use client';
import { FC, useContext, useRef, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { coinInfo } from '@/utils/types';
import UserContext from '@/context/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useTrendingCoins } from '@/hooks/useTrendingCoins';

interface TrendingCoinsProps {
  onCoinClick: (coinId: string) => void;
  maxCount?: number; // Optional prop to set maximum trending coins count
  timePeriod?: string; // Time period for trending (5m, 1h, 6h, 24h)
}

const TrendingCoins: FC<TrendingCoinsProps> = ({ 
  onCoinClick, 
  maxCount = 20,
  timePeriod = '5m'
}) => {
  console.log('🚀🚀🚀 TRENDING COINS COMPONENT RENDERED 🚀🚀🚀');
  
  const { solPrice } = useContext(UserContext);
  const { replyCounts, onCoinInfoUpdate, onStageChange } = useSocket();
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [timerUpdate, setTimerUpdate] = useState(0);

  // Use React Query hook for trending coins with time period
  const { trendingCoins, isLoading, error } = useTrendingCoins({ 
    timePeriod: timePeriod as '5m' | '1h' | '6h' | '24h'
  });

  console.log('__yuki__ TrendingCoins: Component state:', {
    trendingCoinsCount: trendingCoins.length,
    isLoading,
    error,
    timerUpdate,
    solPrice
  });

  // Filter out tokens that have successfully moved to Raydium
  const filteredTrendingCoins = trendingCoins.filter(coin => !coin.movedToRaydium);

  console.log('__yuki__ TrendingCoins: Filtered coins count:', filteredTrendingCoins.length);

  // Debug: Check for coins that should be showing real-time progress
  useEffect(() => {
    const now = new Date();
    const coinsInProgress = filteredTrendingCoins.filter(coin => {
      if (!coin.atStageStarted || coin.bondingCurve) return false;
      const atStageStartedDate = new Date(coin.atStageStarted);
      const period = now.getTime() - atStageStartedDate.getTime();
      const millisecondsInADay = 120 * 1000;
      const stageDurationMs = millisecondsInADay * coin.stageDuration;
      return period < stageDurationMs;
    });
    
    console.log('__yuki__ TrendingCoins: Coins that should be showing real-time progress:', coinsInProgress.length);
    coinsInProgress.forEach(coin => {
      const atStageStartedDate = new Date(coin.atStageStarted);
      const period = now.getTime() - atStageStartedDate.getTime();
      const millisecondsInADay = 120 * 1000;
      const progress = Math.round((period * 10000) / (millisecondsInADay * coin.stageDuration)) / 100;
      console.log('__yuki__ TrendingCoins: Coin in progress:', coin.name, 'progress:', progress, 'stageDuration:', coin.stageDuration, 'days since start:', period / (1000 * 60 * 60 * 24));
    });
  }, [filteredTrendingCoins, timerUpdate]);

  // Debug: Track component re-renders
  useEffect(() => {
    console.log('__yuki__ TrendingCoins: Component re-rendered, timerUpdate:', timerUpdate);
    console.log('__yuki__ TrendingCoins: Trending coins data changed, count:', trendingCoins.length);
  }, [timerUpdate, trendingCoins.length]);

  // Helper function to get stage type description
  const getStageType = (coin: coinInfo) => {
    if (coin.bondingCurve) {
      return coin.movedToRaydium ? "On Dex" : "Failed";
    } else if (coin.airdropStage) {
      return "Airdrop Stage";
    } else {
      return "Trading Stage";
    }
  };

  // Real-time stage progress calculation
  const calculateStageProgress = (coin: coinInfo) => {
    console.log('__yuki__ TrendingCoins: calculateStageProgress called for coin:', coin.name, 'token:', coin.token);
    console.log('__yuki__ TrendingCoins: Coin data for progress calculation:', {
      atStageStarted: coin.atStageStarted,
      bondingCurve: coin.bondingCurve,
      stageDuration: coin.stageDuration,
      currentStage: coin.currentStage,
      stagesNumber: coin.stagesNumber
    });
    
    if (!coin || !coin.atStageStarted || coin.bondingCurve) {
      const result = coin?.bondingCurve ? 100 : 0;
      console.log('__yuki__ TrendingCoins: Stage progress early return:', result, 'for coin:', coin.name);
      return result;
    }
    
    const nowDate = new Date();
    const atStageStartedDate = new Date(coin.atStageStarted);
    const period = nowDate.getTime() - atStageStartedDate.getTime();
    const millisecondsInADay = 120 * 1000; // match trading page logic
    const progress = Math.round((period * 10000) / (millisecondsInADay * coin.stageDuration)) / 100;
    const result = progress > 100 ? 100 : progress;
    
    console.log('__yuki__ TrendingCoins: Stage progress calculation for', coin.name, ':', {
      nowDate: nowDate.toISOString(),
      atStageStartedDate: atStageStartedDate.toISOString(),
      period: period,
      millisecondsInADay: millisecondsInADay,
      stageDuration: coin.stageDuration,
      progress: progress,
      finalResult: result,
      timerUpdate: timerUpdate,
      // Add more detailed calculation info
      periodInDays: period / (1000 * 60 * 60 * 24),
      stageDurationInDays: coin.stageDuration,
      shouldBeInProgress: period < (millisecondsInADay * coin.stageDuration)
    });
    
    return result;
  };

  // Real-time timer for progress updates
  useEffect(() => {
    console.log('__yuki__ TrendingCoins: Setting up timer for progress updates');
    const interval = setInterval(() => {
      console.log('__yuki__ TrendingCoins: Timer update triggered, setting timerUpdate to:', Date.now());
      setTimerUpdate(Date.now());
    }, 1000); // Update every second

    return () => {
      console.log('__yuki__ TrendingCoins: Cleaning up timer interval');
      clearInterval(interval);
    };
  }, []);

  // Real-time coin info updates
  useEffect(() => {
    console.log('__yuki__ TrendingCoins: Setting up coin info update handler');
    if (onCoinInfoUpdate) {
      const handleCoinUpdate = (payload: any) => {
        console.log('__yuki__ TrendingCoins: Coin info update received for token:', payload.token);
        console.log('__yuki__ TrendingCoins: Update payload:', payload.coinInfo);
        // Force re-render when any coin is updated
        setTimerUpdate(Date.now());
        console.log('__yuki__ TrendingCoins: Timer update triggered by coin info update');
      };
      
      onCoinInfoUpdate(handleCoinUpdate);
      console.log('__yuki__ TrendingCoins: Coin info update handler registered');
    } else {
      console.log('__yuki__ TrendingCoins: onCoinInfoUpdate not available');
    }
  }, [onCoinInfoUpdate]);

  // Real-time stage change updates
  useEffect(() => {
    console.log('__yuki__ TrendingCoins: Setting up stage change handler');
    if (onStageChange) {
      const handleStageChange = (payload: any) => {
        console.log('__yuki__ TrendingCoins: Stage change received for token:', payload.token);
        console.log('__yuki__ TrendingCoins: Stage change payload:', payload);
        // Force re-render when any stage changes
        setTimerUpdate(Date.now());
        console.log('__yuki__ TrendingCoins: Timer update triggered by stage change');
      };
      
      onStageChange(handleStageChange);
      console.log('__yuki__ TrendingCoins: Stage change handler registered');
    } else {
      console.log('__yuki__ TrendingCoins: onStageChange not available');
    }
  }, [onStageChange]);

  const scrollLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Left arrow clicked'); // Debug log
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Right arrow clicked'); // Debug log
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold text-foreground mb-4">Trending Coins</h2>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {Array.from({ length: 6}).map((_, index) => (
              <div key={index} className="bg-muted rounded-lg p-3 animate-pulse flex-shrink-0" style={{ width: '275px', height: '125px' }}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 bg-muted-foreground/20 rounded-full"></div>
                  <div className="w-full">
                    <div className="h-3 bg-muted-foreground/20 rounded mb-1"></div>
                    <div className="h-2 bg-muted-foreground/20 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold text-foreground mb-4">Trending Coins</h2>
        <div className="text-center py-8 text-red-500">
          Error loading trending coins
        </div>
      </div>
    );
  }

  if (filteredTrendingCoins.length === 0) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold text-foreground mb-4">Trending Coins</h2>
        <div className="text-center py-8 text-muted-foreground">
          No trending coins available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-foreground mb-4">
        Trending Coins
        {trendingCoins.length > 0 && trendingCoins[0]?.trendingData?.isFallback && (
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (Showing largest market cap coins - no recent activity)
          </span>
        )}
      </h2>
      <div className="relative">
        {/* Wrapper for scrollable container */}
        <div className="relative overflow-hidden">
          {/* Scrollable container */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredTrendingCoins.map((coin, index) => {
              console.log('__yuki__ TrendingCoins: Rendering coin:', coin.name, 'index:', index);
              
              const replyCount = replyCounts[coin._id] || 0;
              const marketCapUSD = (coin.progressMcap * (solPrice || 0) / 1e18 || 0);
              // Use real-time stage progress calculation instead of static stage completion
              const stageProgress = calculateStageProgress(coin);
              
              console.log('__yuki__ TrendingCoins: Coin render data for', coin.name, ':', {
                replyCount,
                marketCapUSD,
                stageProgress,
                currentStage: coin.currentStage,
                stagesNumber: coin.stagesNumber,
                atStageStarted: coin.atStageStarted,
                stageDuration: coin.stageDuration,
                timerUpdate
              });

              return (
                <motion.div
                  key={coin._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={() => onCoinClick(`/trading/${coin._id}`)}
                  className="bg-card border border-border rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 flex-shrink-0 relative overflow-hidden flex flex-col"
                  style={{ 
                    width: '275px', 
                    height: '125px',
                    backgroundImage: coin.frontBanner ? `url(${coin.frontBanner})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLDivElement;
                    target.style.backgroundImage = 'none';
                    target.style.backgroundColor = 'var(--card)';
                  }}
                >
                  {/* Overlay gradient for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Content overlay */}
                  <div className="relative z-10 p-3 flex flex-col h-full">
                    {/* Header Section */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                        <Image
                          src={coin.url || '/assets/images/test-token-bg~.png'}
                          alt={coin.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/assets/images/test-token-bg~.png';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate drop-shadow-lg">{coin.name}</h3>
                        <p className="text-xs text-white/80 drop-shadow-lg">{coin.ticker}</p>
                      </div>
                    </div>

                    {/* Market Cap and Replies */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <CurrencyDollarIcon className="w-4 h-4 text-white/80" />
                        <span className="text-xs text-white/90 font-medium drop-shadow-lg">
                          ${marketCapUSD.toLocaleString(undefined, { maximumFractionDigits: 1 })} K
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-white/80" />
                        <span className="text-xs text-white/90 font-medium drop-shadow-lg">{replyCount}</span>
                      </div>
                    </div>

                    {/* Stage Progress */}
                    <div className="mt-auto">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/80">Stage {Math.min(coin.currentStage, coin.stagesNumber)} of {coin.stagesNumber} ({getStageType(coin)})</span>
                        <span className="text-white/90 font-medium">{stageProgress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 shadow-lg shadow-yellow-400/50 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${stageProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Badges */}
                    {coin.movedToRaydium && !coin.moveRaydiumFailed && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <CheckCircleIcon className="w-3 h-3" />
                          Listed on DEX
                        </div>
                      </div>
                    )}
                    {coin.moveRaydiumFailed && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <XCircleIcon className="w-3 h-3" />
                          Failed
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Navigation arrows - positioned outside scrollable container */}
        {filteredTrendingCoins.length > 4 && (
          <>
            <button
              onClick={scrollLeft}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 z-20 w-10 h-10 bg-background/90 hover:bg-background border border-border rounded-full flex items-center justify-center shadow-lg transition-all duration-200 text-lg font-bold"
              style={{ pointerEvents: 'auto' }}
            >
              ‹
            </button>
            <button
              onClick={scrollRight}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-2 z-20 w-10 h-10 bg-background/90 hover:bg-background border border-border rounded-full flex items-center justify-center shadow-lg transition-all duration-200 text-lg font-bold"
              style={{ pointerEvents: 'auto' }}
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TrendingCoins; 