'use client';
import { FC, useContext, useEffect, useState } from 'react';
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
}

const TrendingBanner: FC<TrendingBannerProps> = ({ onCoinClick }) => {
  const { solPrice } = useContext(UserContext);
  const { replyCounts } = useSocket();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Use React Query hook for trending coins
  const { trendingCoins, isLoading, error } = useTrendingCoins({ limit: 3 });

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    if (trendingCoins.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % trendingCoins.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [trendingCoins.length]);

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

  if (trendingCoins.length === 0) {
    return (
      <div className="w-full h-[250px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">No trending coins available</div>
      </div>
    );
  }

  const currentCoin = trendingCoins[currentSlide];
  const replyCount = replyCounts[currentCoin._id] || 0;
  const marketCapUSD = (currentCoin.progressMcap * (solPrice || 0) / 1e18 || 0);
  const stageProgress = Math.min(((currentCoin.currentStage - 1) / currentCoin.stagesNumber) * 100, 100);

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-foreground mb-4">King of Coin</h2>
      <div className="relative h-[250px] rounded-lg overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCoin._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
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
                    ${marketCapUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                  <span>{stageProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stageProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {trendingCoins.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + trendingCoins.length) % trendingCoins.length)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % trendingCoins.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all duration-200"
            >
              →
            </button>
          </>
        )}

        {/* Slide indicators */}
        {trendingCoins.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {trendingCoins.map((_, index) => (
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
    </div>
  );
};

export default TrendingBanner; 