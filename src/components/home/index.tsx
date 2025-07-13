'use client';
import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { coinInfo } from '@/utils/types';
import { getCoinsInfo, getSolPriceInUSD, getLatestReplies, getReplyCounts } from '@/utils/util';
import { CoinBlog } from '../cards/CoinBlog';
import TopToken from './TopToken';
import TrendingBanner from './TrendingBanner';
import TrendingCoins from './TrendingCoins';
import CreateTokenButton from './CreateTokenButton';
import FilterList from './FilterList';
import Pagination from './Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenCardSkeleton } from '../loadings/Skeleton';
import { Switch } from '@/components/ui/switch';
import { BiSearchAlt } from 'react-icons/bi';
import { isImageNSFW } from '@/utils/nsfwCheck';
import { useSocket } from '@/contexts/SocketContext';

const HomePage: FC = () => {
  const { isLoading, setIsLoading, isCreated, solPrice, setSolPrice } =
    useContext(UserContext);
  const { onNewTokenCreated, onCoinInfoUpdate } = useSocket();
  const [totalStaked, setTotalStaked] = useState(0);
  const [token, setToken] = useState('');
  const [data, setData] = useState<coinInfo[]>([]);
  const [latestReplies, setLatestReplies] = useState<{ coinId: string; latestReplyTime: string }[]>([]);
  const [currentSort, setCurrentSort] = useState<string>('creation time');
  const [currentOrder, setCurrentOrder] = useState<string>('desc');
  const [king, setKing] = useState<coinInfo>({} as coinInfo);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [nsfwFilterState, setNsfwFilterState] = useState(false);
  const [searchToken, setSearchToken] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string>('');
  const router = useRouter();
  const pathname = usePathname();
  const { replyCounts, setReplyCounts } = useSocket();

  const handleToRouter = (id: string) => {
    setIsNavigating(true);
    setNavigatingTo(id);
    
    router.push(id);
  };

  // Function to extract creation time from coin metadata
  const getCreationTime = (coin: coinInfo): Date => {
    try {
      // For now, use atLaunched as creation time
      // In the future, this should be extracted from coin.uri -> metadataInfo.createdOn
      return new Date(coin.atLaunched);
    } catch (error) {
      console.error('__yuki__ Error parsing creation time:', error);
      return new Date(0); // Default to epoch time if parsing fails
    }
  };

  // Function to get latest reply time for a coin
  const getLatestReplyTime = (coin: coinInfo): Date => {
    const replyData = latestReplies.find(reply => reply.coinId === coin._id);
    if (replyData) {
      return new Date(replyData.latestReplyTime);
    }
    return new Date(0); // Default to epoch time if no replies
  };

  // Sorting function
  const sortCoins = (coins: coinInfo[], sortType: string, order: string): coinInfo[] => {
    const sortedCoins = [...coins];
    
    switch (sortType) {
      case 'last reply':
        sortedCoins.sort((a, b) => {
          const timeA = getLatestReplyTime(a).getTime();
          const timeB = getLatestReplyTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
        
      case 'creation time':
        sortedCoins.sort((a, b) => {
          const timeA = getCreationTime(a).getTime();
          const timeB = getCreationTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
        
      case 'market cap':
        sortedCoins.sort((a, b) => {
          const marketCapA = a.progressMcap || 0;
          const marketCapB = b.progressMcap || 0;
          return order === 'desc' ? marketCapB - marketCapA : marketCapA - marketCapB;
        });
        break;
        
      default:
        // Default sorting by creation time
        sortedCoins.sort((a, b) => {
          const timeA = getCreationTime(a).getTime();
          const timeB = getCreationTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
    }
    
    return sortedCoins;
  };

  // Handle sort change from FilterListButton
  const handleSortChange = (sortType: string, order: string) => {
    setCurrentSort(sortType);
    setCurrentOrder(order);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Reset to first page when NSFW filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [nsfwFilterState, searchToken]);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return sortCoins(data, currentSort, currentOrder);
  }, [data, currentSort, currentOrder, latestReplies]);

  // NSFW detection map
  const [nsfwMap, setNsfwMap] = useState<{[url: string]: boolean}>({});

  // Filtering logic
  const filteredData = useMemo(() => {
    let filtered = sortedData;
    if (!nsfwFilterState) {
      filtered = filtered.filter(token => !nsfwMap[token.url]);
    }
    if (searchToken.trim()) {
      const searchLower = searchToken.toLowerCase();
      filtered = filtered.filter(token =>
        token.name.toLowerCase().includes(searchLower) ||
        token.ticker.toLowerCase().includes(searchLower) ||
        (token.description && token.description.toLowerCase().includes(searchLower))
      );
    }
    return filtered;
  }, [sortedData, nsfwFilterState, searchToken, nsfwMap]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // NSFW image detection effect (must come after currentData is defined)
  useEffect(() => {
    currentData.forEach(token => {
      if (token.url && nsfwMap[token.url] === undefined) {
        // isImageNSFW(token.url).then(isNsfw => {
        //   setNsfwMap(prev => ({ ...prev, [token.url]: isNsfw }));
        // });
      }
    });
  }, [currentData]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const [coins, price, replies, replyCounts] = await Promise.all([
          getCoinsInfo(),
          getSolPriceInUSD(),
          getLatestReplies(),
          getReplyCounts() // Add initial reply counts fetch
        ]);
      
      if (coins !== null) {
        setData(coins);
        setLatestReplies(replies);
        
        // Initialize reply counts from the fetched data
        const replyCountsMap: { [coinId: string]: number } = {};
        replyCounts.forEach((item: { coinId: string; replyCount: number }) => {
          replyCountsMap[item.coinId] = item.replyCount;
        });
        setReplyCounts(replyCountsMap);
        
        setIsLoading(true);
        setKing(coins[0]);
        setSolPrice(price);
      }
    } catch (error) {
      console.error('__yuki__ Error fetching data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  fetchData();
}, [setReplyCounts]); // Add setReplyCounts to dependencies

  // Handle new token creation
  useEffect(() => {
    if (onNewTokenCreated) {
      const handleNewToken = (payload: any) => {
        console.log('__yuki__ New token created:', payload);
        // Add the new token to the beginning of the list
        setData(prevData => {
          const newToken = payload.coinInfo;
          // Check if token already exists to avoid duplicates
          const exists = prevData.find(token => token._id === newToken._id || token.token === newToken.token);
          if (exists) {
            return prevData;
          }
          return [newToken, ...prevData];
        });
      };
      
      onNewTokenCreated(handleNewToken);
    }
  }, [onNewTokenCreated]);

  // Handle coin info updates (market cap, stage progress, etc.)
  useEffect(() => {
    if (onCoinInfoUpdate) {
      const handleCoinUpdate = (payload: any) => {
        console.log('__yuki__ Coin info updated:', payload);
        setData(prevData => 
          prevData.map(coin => 
            coin.token === payload.token ? { ...coin, ...payload.coinInfo } : coin
          )
        );
      };
      
      onCoinInfoUpdate(handleCoinUpdate);
    }
  }, [onCoinInfoUpdate]);

  // Reset navigation state when route changes
  useEffect(() => {
    // Reset navigation state when pathname changes (route has changed)
    if (isNavigating && pathname !== '/') {
      setIsNavigating(false);
      setNavigatingTo('');
    }
  }, [pathname, isNavigating]);

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

        {/* Create Token Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-8"
        >
          <CreateTokenButton />
        </motion.div>

        {/* Filter and View Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
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
          transition={{ duration: 0.6, delay: 0.5 }}
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

        {/* Items per page selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex justify-end items-center mb-6"
        >
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-muted-foreground text-sm">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="input bg-background border-border text-foreground text-sm px-3 py-1"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={36}>36</option>
              <option value={filteredData.length}>All ({filteredData.length})</option>
            </select>
          </div>
        </motion.div>

        {/* Coins Grid/List */}
        {isDataLoading ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`w-full ${
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }`}
          >
            {Array.from({ length: itemsPerPage }).map((_, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className={viewMode === 'list' ? 'w-full' : ''}
              >
                <TokenCardSkeleton />
              </motion.div>
            ))}
          </motion.div>
        ) : currentData && currentData.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={`w-full ${
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }`}
          >
            <AnimatePresence>
              {currentData.map((temp, index) => (
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
                    <CoinBlog coin={temp} componentKey="coin" isNSFW={!!nsfwMap[temp.url]} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-8"
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={filteredData.length}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};
export default HomePage;
