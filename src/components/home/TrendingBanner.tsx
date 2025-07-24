'use client';
import { FC, useContext, useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { coinInfo } from '@/utils/types';
import UserContext from '@/context/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useKingOfCoin } from '@/hooks/useTrendingCoins';

interface TrendingBannerProps {
  onCoinClick: (coinId: string) => void;
  maxCount?: number; // Optional prop to set maximum king of coin count
  timePeriod?: string; // Time period for trending (5m, 1h, 6h, 24h) - not used for King of Coin
}

const TrendingBanner: FC<TrendingBannerProps> = ({ 
  onCoinClick, 
  maxCount = 3,
  timePeriod = '5m'
}) => {
  const { solPrice } = useContext(UserContext);
  const { replyCounts, onCoinInfoUpdate } = useSocket();
  
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trendingCoinsState, setTrendingCoinsState] = useState<coinInfo[]>([]);
  const [stageProgressMap, setStageProgressMap] = useState<{[key: string]: number}>({});
  const prevTrendingCoinsRef = useRef<string>('');

  // Use React Query hook for King of Coin (always top 3 largest market cap coins)
  const { kingCoins, isLoading, error, refetch } = useKingOfCoin(true);

  // Handle page reload and recalculate King of Coin
  useEffect(() => {
    const handlePageReload = () => {
      console.log('__yuki__ TrendingBanner: Page reload detected, recalculating King of Coin');
      
      // Reset current slide to 0
      setCurrentSlide(0);
      
      // Clear any cached data and refetch trending coins
      refetch();
      
      // Reset stage progress map
      setStageProgressMap({});
      
      // Clear previous trending coins reference to force update
      prevTrendingCoinsRef.current = '';
    };

    // Multiple methods to detect page reload
    const detectPageReload = () => {
      // Method 1: Performance Navigation API
      if (performance.navigation && performance.navigation.type === 1) {
        return true;
      }
      
      // Method 2: Performance Entry API
      if (window.performance && window.performance.getEntriesByType) {
        const navigationEntries = window.performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
          const navEntry = navigationEntries[0] as any;
          if (navEntry.type === 'reload') {
            return true;
          }
        }
      }
      
      // Method 3: Check if page was loaded from cache
      if (performance.getEntriesByType) {
        const entries = performance.getEntriesByType('navigation');
        if (entries.length > 0) {
          const navEntry = entries[0] as any;
          if (navEntry.loadEventEnd === 0) {
            return true; // Page was reloaded
          }
        }
      }
      
      return false;
    };

    // Check if this is a page reload
    if (detectPageReload()) {
      handlePageReload();
    }

    // Also handle visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('__yuki__ TrendingBanner: Page became visible, refreshing data');
        // Small delay to ensure any background updates are complete
        setTimeout(() => {
          refetch();
        }, 100);
      }
    };

    // Handle beforeunload to prepare for reload
    const handleBeforeUnload = () => {
      console.log('__yuki__ TrendingBanner: Page unloading, preparing for reload');
      // Clear any ongoing timers or state
      setCurrentSlide(0);
      setStageProgressMap({});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [refetch]);

  // Update local state when trending coins change, filtering out tokens that moved to Raydium
  useEffect(() => {
    // Filter out tokens that have successfully moved to Raydium
    // These tokens are no longer in the bonding curve phase and shouldn't be shown in the banner
    const filteredCoins = kingCoins.filter(coin => !coin.movedToRaydium);
    
    console.log('__yuki__ TrendingBanner: Raw king coins:', kingCoins.length, 'Filtered coins:', filteredCoins.length);
    
    // If we don't have enough tokens after filtering, include some Raydium-moved tokens as fallback
    let bannerCoins = filteredCoins.slice(0, 3);
    
    if (bannerCoins.length < 3 && kingCoins.length >= 3) {
      console.log('__yuki__ TrendingBanner: Not enough non-Raydium tokens, including some Raydium tokens as fallback');
      // Take the first 3 tokens regardless of Raydium status
      bannerCoins = kingCoins.slice(0, 3);
    }
    
    console.log('__yuki__ TrendingBanner: Banner coins selected:', bannerCoins.length, 'coins');
    
    // Create a stable key to compare with previous state
    const newIds = bannerCoins.map(coin => coin._id).sort().join(',');
    
    // Only update if the data has actually changed to prevent infinite loops
    if (prevTrendingCoinsRef.current !== newIds) {
      prevTrendingCoinsRef.current = newIds;
      setTrendingCoinsState(bannerCoins);
    }
  }, [kingCoins]);

  // Real-time coin info updates
  useEffect(() => {
    if (onCoinInfoUpdate) {
      const handleCoinUpdate = (payload: any) => {
        setTrendingCoinsState(prevCoins => {
          // Update the coin if it exists
          const updatedCoins = prevCoins.map(coin => 
            coin.token === payload.token ? { ...coin, ...payload.coinInfo } : coin
          );
          
          // Filter out tokens that have moved to Raydium after the update
          const filteredCoins = updatedCoins.filter(coin => !coin.movedToRaydium);
          
          // If we don't have enough tokens after filtering, include some Raydium-moved tokens as fallback
          let bannerCoins = filteredCoins.slice(0, 3);
          
          if (bannerCoins.length < 3 && updatedCoins.length >= 3) {
            console.log('__yuki__ TrendingBanner: Real-time update - Not enough non-Raydium tokens, including some Raydium tokens as fallback');
            // Take the first 3 tokens regardless of Raydium status
            bannerCoins = updatedCoins.slice(0, 3);
          }
          
          return bannerCoins;
        });
      };
      
      onCoinInfoUpdate(handleCoinUpdate);
    }
  }, [onCoinInfoUpdate]); // Removed trendingCoins from dependencies to prevent infinite re-renders

  // Real-time progress calculation for all coins
  useEffect(() => {
    const updateProgress = () => {
      const newProgressMap: {[key: string]: number} = {};
      
      trendingCoinsState.forEach(coin => {
        if (coin.bondingCurve || !coin.atStageStarted || !coin.stageDuration) {
          newProgressMap[coin._id] = 100;
          return;
        }

        const nowDate = new Date();
        const atStageStartedDate = new Date(coin.atStageStarted);
        const period = nowDate.getTime() - atStageStartedDate.getTime();
        const millisecondsInADay = 120 * 1000; // match trading page logic
        const progress = Math.round((period * 10000) / (millisecondsInADay * coin.stageDuration)) / 100;
        newProgressMap[coin._id] = progress > 100 ? 100 : progress;
      });
      
      setStageProgressMap(newProgressMap);
    };

    updateProgress(); // initial call
    const intervalId = setInterval(updateProgress, 1000);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [trendingCoinsState]);

  // Auto-rotate slides every 5 seconds (only when we have exactly 3 tokens)
  useEffect(() => {
    if (trendingCoinsState.length !== 3) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % trendingCoinsState.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [trendingCoinsState.length]);

  if (isLoading) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground">Loading trending coins...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-red-500">Error loading trending coins</div>
      </div>
    );
  }

  if (trendingCoinsState.length === 0) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">Waiting for trending coins...</div>
      </div>
    );
  }

  const currentCoin = trendingCoinsState[currentSlide];
  const replyCount = replyCounts[currentCoin._id] || 0;
  const marketCapUSD = (currentCoin.progressMcap * (solPrice || 0) / 1e18 || 0);
  const currentStageProgress = stageProgressMap[currentCoin._id] || 0;

  return (
    <div className="w-full">
            <h2 className="text-2xl font-bold text-foreground">
          King of Coin
          {/* {kingCoins.length > 0 && kingCoins[0]?.trendingData?.isFallback && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Largest market cap coins)
            </span>
          )} */}
        </h2>
      <div className="flex gap-4 h-[250px]">
        {/* Left Side Banner */}
        {trendingCoinsState.length >= 3 && (
          <div className="w-1/5 h-[200px] relative rounded-lg overflow-hidden self-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={`left-${trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length]._id}`}
                initial={{ x: 50 }}
                animate={{ x: 0 }}
                exit={{ x: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={() => onCoinClick(`/trading/${trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length]._id}`)}
                className="w-full h-full cursor-pointer relative overflow-hidden"
                style={{
                  backgroundImage: trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].frontBanner 
                    ? `url(${trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].frontBanner})` 
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                  {/* Header Section */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                      <Image
                        src={trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].url || '/assets/images/test-token-bg~.png'}
                        alt={trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/test-token-bg~.png';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold drop-shadow-lg truncate">
                        {trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].name}
                      </h3>
                      <p className="text-sm text-white/80 drop-shadow-lg truncate">
                        {trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].ticker}
                      </p>
                    </div>
                  </div>

                  {/* Market Cap and Replies */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span className="text-sm font-semibold drop-shadow-lg">
                        ${((trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].progressMcap * (solPrice || 0) / 1e18 || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} K
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                      <span className="text-sm font-semibold drop-shadow-lg">
                        {replyCounts[trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length]._id] || 0}
                      </span>
                    </div>
                  </div>

                  {/* Stage Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Stage {Math.min(trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].currentStage, trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].stagesNumber)} of {trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].stagesNumber} ({getStageType(trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length])})</span>
                      <span>{(stageProgressMap[trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length]._id] || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${stageProgressMap[trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length]._id] || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Main Center Banner */}
        <div className="w-3/5 relative rounded-lg overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCoin._id}
            initial={{ x: 100 }}
            animate={{ x: 0 }}
            exit={{ x: -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onClick={() => onCoinClick(`/trading/${currentCoin._id}`)}
            className="w-full h-full cursor-pointer relative overflow-hidden"
            style={{
              backgroundImage: currentCoin.frontBanner ? `url(${currentCoin.frontBanner})` : 'none',
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            
            {/* Content overlay */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              {/* Header Section */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
                  <Image
                    src={currentCoin.url || '/assets/images/test-token-bg~.png'}
                    alt={currentCoin.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/assets/images/test-token-bg~.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold drop-shadow-lg">{currentCoin.name}</h3>
                  <p className="text-lg text-white/80 drop-shadow-lg">{currentCoin.ticker}</p>
                </div>
              </div>

              {/* Market Cap and Replies */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span className="text-lg font-semibold drop-shadow-lg">
                    ${marketCapUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} K
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <HiOutlineChatBubbleLeftRight className="w-5 h-5" />
                  <span className="text-lg font-semibold drop-shadow-lg">{replyCount}</span>
                </div>
              </div>

              {/* Stage Progress */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Stage {Math.min(currentCoin.currentStage, currentCoin.stagesNumber)} of {currentCoin.stagesNumber} ({getStageType(currentCoin)})</span>
                  <span>{currentStageProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentStageProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {trendingCoinsState.length >= 3 && (
          <>
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + trendingCoinsState.length) % trendingCoinsState.length)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % trendingCoinsState.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200"
            >
              →
            </button>
          </>
        )}

        {/* Slide indicators */}
        {trendingCoinsState.length >= 3 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {trendingCoinsState.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentSlide ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
        </div>

        {/* Right Side Banner */}
        {trendingCoinsState.length >= 3 && (
          <div className="w-1/5 h-[200px] relative rounded-lg overflow-hidden self-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={`right-${trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length]._id}`}
                initial={{ x: 50 }}
                animate={{ x: 0 }}
                exit={{ x: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={() => onCoinClick(`/trading/${trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length]._id}`)}
                className="w-full h-full cursor-pointer relative overflow-hidden"
                style={{
                  backgroundImage: trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].frontBanner 
                    ? `url(${trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].frontBanner})` 
                    : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
                  {/* Header Section */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20">
                      <Image
                        src={trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].url || '/assets/images/test-token-bg~.png'}
                        alt={trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/test-token-bg~.png';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold drop-shadow-lg truncate">
                        {trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].name}
                      </h3>
                      <p className="text-sm text-white/80 drop-shadow-lg truncate">
                        {trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].ticker}
                      </p>
                    </div>
                  </div>

                  {/* Market Cap and Replies */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span className="text-sm font-semibold drop-shadow-lg">
                        ${((trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].progressMcap * (solPrice || 0) / 1e18 || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} K
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                      <span className="text-sm font-semibold drop-shadow-lg">
                        {replyCounts[trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length]._id] || 0}
                      </span>
                    </div>
                  </div>

                  {/* Stage Progress */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Stage {Math.min(trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].currentStage, trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].stagesNumber)} of {trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].stagesNumber} ({getStageType(trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length])})</span>
                      <span>{(stageProgressMap[trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length]._id] || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${stageProgressMap[trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length]._id] || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingBanner; 