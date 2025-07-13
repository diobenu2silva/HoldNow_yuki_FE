'use client';
import { FC, useContext, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { coinInfo } from '@/utils/types';
import { getCoinsInfoBySort } from '@/utils/util';
import UserContext from '@/context/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface TrendingBannerProps {
  onCoinClick: (coinId: string) => void;
}

const TrendingBanner: FC<TrendingBannerProps> = ({ onCoinClick }) => {
  const { solPrice } = useContext(UserContext);
  const { replyCounts } = useSocket();
  const [trendingCoins, setTrendingCoins] = useState<coinInfo[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trending coins (top 3 by market cap)
  useEffect(() => {
    const fetchTrendingCoins = async () => {
      try {
        const response = await getCoinsInfoBySort('mcap', 0, 3);
        // Handle the new API response structure
        if (response && typeof response === 'object' && 'coins' in response) {
          setTrendingCoins(response.coins);
        } else if (Array.isArray(response)) {
          setTrendingCoins(response);
        } else {
          setTrendingCoins([]);
        }
      } catch (error) {
        console.error('Error fetching trending coins:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingCoins();
  }, []);

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
    <div className="w-full h-[250px] relative overflow-hidden rounded-lg">
      {/* Banner Image */}
      <div className="w-full h-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCoin._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full relative"
          >
            <Image
              src={currentCoin.frontBanner || '/assets/images/banner.jpg'}
              alt={`${currentCoin.name} Banner`}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                // Fallback to default banner if image fails to load
                const target = e.target as HTMLImageElement;
                target.src = '/assets/images/banner.jpg';
              }}
            />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Token Image Overlay */}
        <div className="absolute top-4 left-4 z-10">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 backdrop-blur-sm">
            <Image
              src={currentCoin.url}
              alt={currentCoin.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to default token image if image fails to load
                const target = e.target as HTMLImageElement;
                target.src = '/assets/images/user-avatar.png';
              }}
            />
          </div>
        </div>

        {/* Coin Info Overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="flex items-end justify-between">
            <div className="flex-1">
              <h3 className="text-white font-bold text-xl mb-1">{currentCoin.name}</h3>
              <p className="text-white/80 text-sm mb-2">{currentCoin.ticker}</p>
              
              {/* Stage Progress */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-white/80 text-xs mb-1">
                  <span>Stage {currentCoin.currentStage} of {currentCoin.stagesNumber}</span>
                  <span>{Math.round(stageProgress)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stageProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Market Cap and Replies */}
            <div className="text-right text-white ml-4">
              <div className="flex items-center gap-1 mb-1">
                <CurrencyDollarIcon className="w-4 h-4" />
                <span className="text-sm">Market Cap</span>
              </div>
              <div className="font-bold text-lg mb-2">
                ${marketCapUSD.toLocaleString()} K
              </div>
              
              <div className="flex items-center gap-1">
                <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
                <span className="text-sm">{replyCount} Replies</span>
              </div>
            </div>
          </div>
        </div>

        {/* Click overlay */}
        <div 
          className="absolute inset-0 cursor-pointer z-5"
          onClick={() => onCoinClick(`/trading/${currentCoin._id}`)}
        />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Dots */}
      {trendingCoins.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {trendingCoins.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* Navigation Arrows */}
      {trendingCoins.length > 1 && (
        <>
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + trendingCoins.length) % trendingCoins.length)}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center z-20 transition-all duration-200"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % trendingCoins.length)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center z-20 transition-all duration-200"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
};

export default TrendingBanner; 