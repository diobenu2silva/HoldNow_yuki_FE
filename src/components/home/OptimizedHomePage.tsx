'use client';
import { FC, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { coinInfo } from '@/utils/types';
import { getSolPriceInUSD, getLatestReplies, getReplyCounts } from '@/utils/util';
import { CoinBlog } from '../cards/CoinBlog';
import TopToken from './TopToken';
import TrendingBanner from './TrendingBanner';
import TrendingCoins from './TrendingCoins';
import FilterList from './FilterList';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { BiSearchAlt } from 'react-icons/bi';
import { isImageNSFW } from '@/utils/nsfwCheck';
import { useSocket } from '@/contexts/SocketContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import InfiniteScrollLoader from '../loadings/InfiniteScrollLoader';

const OptimizedHomePage: FC = () => {
  const { isLoading, setIsLoading, isCreated, solPrice, setSolPrice } =
    useContext(UserContext);
  const { onNewTokenCreated, onCoinInfoUpdate } = useSocket();
  const [totalStaked, setTotalStaked] = useState(0);
  const [token, setToken] = useState('');
  const [latestReplies, setLatestReplies] = useState<{ coinId: string; latestReplyTime: string }[]>([]);
  const [currentSort, setCurrentSort] = useState<string>('creation time');
  const [currentOrder, setCurrentOrder] = useState<string>('desc');
  const [king, setKing] = useState<coinInfo>({} as coinInfo);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [nsfwFilterState, setNsfwFilterState] = useState(false);
  const [searchToken, setSearchToken] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string>('');
  const router = useRouter();
  const pathname = usePathname();
  const { replyCounts, setReplyCounts } = useSocket();

  // Use the infinite scroll hook
  const {
    coins: data,
    isLoading: isDataLoading,
    hasMore,
    error,
    loadMore,
    refresh,
    loadingRef
  } = useInfiniteScroll({
    sortType: currentSort,
    sortOrder: currentOrder,
    searchQuery: searchToken,
    nsfwFilter: nsfwFilterState,
    initialLimit: 12
  });

  const handleToRouter = (id: string) => {
    setIsNavigating(true);
    setNavigatingTo(id);
    router.push(id);
  };

  // Initialize essential data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const [price, replies, replyCounts] = await Promise.all([
          getSolPriceInUSD(),
          getLatestReplies(),
          getReplyCounts()
        ]);
        
        setLatestReplies(replies);
        
        // Initialize reply counts from the fetched data
        const replyCountsMap: { [coinId: string]: number } = {};
        replyCounts.forEach((item: { coinId: string; replyCount: number }) => {
          replyCountsMap[item.coinId] = item.replyCount;
        });
        setReplyCounts(replyCountsMap);
        
        setSolPrice(price);
      } catch (error) {
        console.error('__yuki__ Error initializing data:', error);
      }
    };

    initializeData();
  }, [setReplyCounts, setSolPrice]);

  // Handle new token creation
  useEffect(() => {
    if (onNewTokenCreated) {
      const handleNewToken = (payload: any) => {
        console.log('__yuki__ New token created:', payload);
        // Refresh the data to include the new token
        refresh();
      };
      
      onNewTokenCreated(handleNewToken);
    }
  }, [onNewTokenCreated, refresh]);

  // Handle coin info updates (market cap, stage progress, etc.)
  useEffect(() => {
    if (onCoinInfoUpdate) {
      const handleCoinUpdate = (payload: any) => {
        console.log('__yuki__ Coin info updated:', payload);
        // Refresh data to get updated coin info
        refresh();
      };
      
      onCoinInfoUpdate(handleCoinUpdate);
    }
  }, [onCoinInfoUpdate, refresh]);

  // Reset navigation state when route changes
  useEffect(() => {
    if (isNavigating && pathname !== '/') {
      setIsNavigating(false);
      setNavigatingTo('');
    }
  }, [pathname, isNavigating]);

  // Handle sort change from FilterListButton
  const handleSortChange = (sortType: string, order: string) => {
    setCurrentSort(sortType);
    setCurrentOrder(order);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="w-full min-h-screen relative">
      {/* Navigation Loading Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-foreground text-lg font-medium">Loading trading page...</div>
            <div className="text-muted-foreground text-sm mt-2">
              Navigating to {navigatingTo.split('/').pop()}
            </div>
          </div>
        </div>
      )}
      
      <div className="container py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <TopToken />
        </motion.div>

        {/* Trending Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <TrendingBanner onCoinClick={handleToRouter} />
        </motion.div>

                {/* Trending Coins Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <TrendingCoins onCoinClick={handleToRouter} />
        </motion.div>

        {/* Filter and View Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <FilterList
            onSortChange={handleSortChange}
            currentSort={currentSort}
            currentOrder={currentOrder}
          />
        </motion.div>

        {/* Combined Controls - View Mode, NSFW Filter, Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex w-full items-center gap-x-6 mb-6 h-10"
        >
          {/* Left side - View Mode */}
          <div className="flex items-center h-full">
            <span className="text-muted-foreground text-sm whitespace-nowrap">View Mode:</span>
            <div className="flex bg-muted rounded-lg p-1 ml-2 h-full">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* Center - NSFW Filter */}
          <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card h-full">
              <span className="text-foreground text-sm whitespace-nowrap">Include NSFW</span>
              <Switch
                checked={nsfwFilterState}
                onCheckedChange={setNsfwFilterState}
                className="h-full data-[state=checked]:bg-pink-500 border-2 border-pink-400 focus:ring-2 focus:ring-pink-400"
              />
            </div>
          </div>

          {/* Right side - Search Box */}
          <div className="flex flex-1 items-center h-full">
            <div className="relative w-full h-full">
              <input
                type="text"
                value={searchToken}
                placeholder="Search for Token..."
                onChange={(e) => setSearchToken(e.target.value)}
                className="w-full h-full py-2 px-4 pl-10 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <BiSearchAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            </div>
          </div>
        </motion.div>

        {/* Coins Grid/List with Infinite Scroll */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full"
        >
          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-red-500 text-lg mb-4">{error}</div>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Coins Display */}
          {data && data.length > 0 && (
            <div className={`w-full ${
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }`}>
              <AnimatePresence>
                {data.map((temp, index) => (
                  <motion.div
                    key={`${temp._id}-${index}`}
                    variants={itemVariants}
                    layout
                    className={viewMode === 'list' ? 'w-full' : ''}
                  >
                    <div
                      onClick={() => handleToRouter(`/trading/${temp._id}`)}
                      className={viewMode === 'list' ? 'w-full' : 'cursor-pointer'}
                    >
                      <CoinBlog coin={temp} componentKey="coin" isNSFW={false} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Loading State */}
          {isDataLoading && data.length === 0 && (
            <InfiniteScrollLoader count={12} viewMode={viewMode} />
          )}

          {/* Infinite Scroll Trigger */}
          <div ref={loadingRef} className="w-full py-8">
            {isDataLoading && data.length > 0 && (
              <InfiniteScrollLoader count={6} viewMode={viewMode} />
            )}
            {!hasMore && data.length > 0 && (
              <div className="text-center text-muted-foreground py-4">
                No more tokens to load
              </div>
            )}
          </div>

          {/* Empty State */}
          {!isDataLoading && data.length === 0 && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-muted-foreground text-lg">
                {searchToken.trim() 
                  ? `No tokens found matching "${searchToken}"`
                  : "No tokens found"
                }
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default OptimizedHomePage; 