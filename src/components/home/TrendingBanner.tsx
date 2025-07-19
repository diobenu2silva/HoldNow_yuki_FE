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
import { useTrendingCoins } from '@/hooks/useTrendingCoins';

interface TrendingBannerProps {
  onCoinClick: (coinId: string) => void;
  maxCount?: number; // Optional prop to set maximum king of coin count
}

const TrendingBanner: FC<TrendingBannerProps> = ({ onCoinClick, maxCount = 3 }) => {
  const { solPrice } = useContext(UserContext);
  const { replyCounts, onCoinInfoUpdate } = useSocket();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trendingCoinsState, setTrendingCoinsState] = useState<coinInfo[]>([]);
  const [stageProgressMap, setStageProgressMap] = useState<{[key: string]: number}>({});
  const prevTrendingCoinsRef = useRef<string>('');

  // Use React Query hook for trending coins
  // Request more tokens initially to account for filtering out moved tokens
  const { trendingCoins, isLoading, error } = useTrendingCoins({ limit: 10 });

  // Update local state when trending coins change, filtering out tokens that moved to Raydium
  useEffect(() => {
    // Filter out tokens that have successfully moved to Raydium
    // These tokens are no longer in the bonding curve phase and shouldn't be shown in the banner
    const filteredCoins = trendingCoins.filter(coin => !coin.movedToRaydium);
    
    // Take exactly 3 tokens for the banner
    // If we have less than 3 after filtering, we'll show what we have
    // If we have more than 3, we'll take the first 3
    const bannerCoins = filteredCoins.slice(0, 3);
    
    // Create a stable key to compare with previous state
    const newIds = bannerCoins.map(coin => coin._id).sort().join(',');
    
    // Only update if the data has actually changed to prevent infinite loops
    if (prevTrendingCoinsRef.current !== newIds) {
      prevTrendingCoinsRef.current = newIds;
      setTrendingCoinsState(bannerCoins);
    }
  }, [trendingCoins]);

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
          
          // Take exactly 3 tokens
          return filteredCoins.slice(0, 3);
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
            <h2 className="text-2xl font-bold text-foreground mb-4">King of Coin</h2>
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
                        src={trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].url}
                        alt={trendingCoinsState[(currentSlide - 1 + trendingCoinsState.length) % trendingCoinsState.length].name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/user-avatar.png';
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
                      <span>Stage Progress</span>
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
                    src={currentCoin.url}
                    alt={currentCoin.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/assets/images/user-avatar.png';
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
                  <span>Stage Progress</span>
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
                        src={trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].url}
                        alt={trendingCoinsState[(currentSlide + 1) % trendingCoinsState.length].name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/user-avatar.png';
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
                      <span>Stage Progress</span>
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