'use client';
import { FC, useContext, useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { coinInfo } from '@/utils/types';
import { getCoinsInfoBySort } from '@/utils/util';
import UserContext from '@/context/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface TrendingCoinsProps {
  onCoinClick: (coinId: string) => void;
}

const TrendingCoins: FC<TrendingCoinsProps> = ({ onCoinClick }) => {
  const { solPrice } = useContext(UserContext);
  const { replyCounts } = useSocket();
  const [trendingCoins, setTrendingCoins] = useState<coinInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trending coins (top 6 by market cap)
  useEffect(() => {
    const fetchTrendingCoins = async () => {
      try {
        const response = await getCoinsInfoBySort('mcap', 0, 10);
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

  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
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
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-muted rounded-lg p-3 animate-pulse flex-shrink-0" style={{ width: '225px', height: '150px' }}>
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

  if (trendingCoins.length === 0) {
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
      <h2 className="text-2xl font-bold text-foreground mb-4">Trending Coins</h2>
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 bg-background/90 hover:bg-background border border-border rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
        >
          ‹
        </button>

        {/* Right Arrow */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 bg-background/90 hover:bg-background border border-border rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
        >
          ›
        </button>

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {trendingCoins.map((coin, index) => {
            const replyCount = replyCounts[coin._id] || 0;
            const marketCapUSD = (coin.progressMcap * (solPrice || 0) / 1e18 || 0);
            const stageProgress = Math.min(((coin.currentStage - 1) / coin.stagesNumber) * 100, 100);

            return (
              <motion.div
                key={coin._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => onCoinClick(`/trading/${coin._id}`)}
                className="bg-card border border-border rounded-lg cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 flex-shrink-0 relative overflow-hidden flex flex-col"
                style={{ 
                  width: '225px', 
                  height: '150px',
                  backgroundImage: coin.frontBanner ? `url(${coin.frontBanner})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onError={(e) => {
                  // Fallback to default background if banner image fails to load
                  const target = e.target as HTMLDivElement;
                  target.style.backgroundImage = 'none';
                  target.style.backgroundColor = 'var(--card)';
                }}
              >
                {/* Overlay gradient for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                
                {/* Content overlay */}
                <div className="relative z-10 flex flex-col h-full justify-between p-3">
                  {/* Header Section */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-border">
                      <Image
                        src={coin.url}
                        alt={coin.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to default token image if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/user-avatar.png';
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
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="w-4 h-4 text-white" />
                      <div>
                        <div className="text-xs text-white/80 drop-shadow-lg">Market Cap</div>
                        <div className="font-semibold text-white text-sm drop-shadow-lg">
                          ${marketCapUSD.toLocaleString()}K
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-white" />
                      <div>
                        <div className="text-xs text-white/80 drop-shadow-lg">Replies</div>
                        <div className="font-semibold text-white text-sm drop-shadow-lg">
                          {replyCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stage Progress - Now at the bottom */}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs text-white/80 mb-1">
                      <span className="text-xs font-medium drop-shadow-lg">Stage {coin.currentStage}</span>
                      <span className="text-xs font-medium drop-shadow-lg">{Math.round(stageProgress)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className="h-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${stageProgress}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrendingCoins; 