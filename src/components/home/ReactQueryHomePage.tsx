'use client';
import { FC, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { coinInfo } from '@/utils/types';
import { CoinBlog } from '../cards/CoinBlog';
import TopToken from './TopToken';
import TrendingBanner from './TrendingBanner';
import TrendingCoins from './TrendingCoins';
import FilterList from './FilterList';
import Pagination from './Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenCardSkeleton } from '../loadings/Skeleton';
import { Switch } from '@/components/ui/switch';
import { BiSearchAlt } from 'react-icons/bi';
import { isImageNSFW } from '@/utils/nsfwCheck';
import { useSocket } from '@/contexts/SocketContext';
import { useCoinsWithSocket } from '@/hooks/useCoinsWithSocket';
import { useEssentialData } from '@/hooks/useCoins';
import { useQueryClient } from 'react-query';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ReactQueryHomePage: FC = () => {
  const { setIsLoading } = useContext(UserContext);
  const { onNewTokenCreated, onCoinInfoUpdate, replyCounts, setReplyCounts } = useSocket();
  const queryClient = useQueryClient();
  
  // State management
  const [currentSort, setCurrentSort] = useState<string>('creation time');
  const [currentOrder, setCurrentOrder] = useState<string>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [nsfwFilterState, setNsfwFilterState] = useState(false);
  const [searchToken, setSearchToken] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string>('');
  const [nsfwMap, setNsfwMap] = useState<{[url: string]: boolean}>({});
  
  const router = useRouter();
  const pathname = usePathname();

  // React Query hooks
  const {
    coins: data,
    total: totalCoins,
    isLoading: isDataLoading,
    error,
    refetch: refetchCoins
  } = useCoinsWithSocket({
    sortType: currentSort,
    page: currentPage,
    itemsPerPage,
    enabled: true
  });

  const {
    solPrice,
    latestReplies,
    replyCounts: essentialReplyCounts,
    isLoading: isEssentialDataLoading,
    error: essentialDataError
  } = useEssentialData();

  // Update reply counts when essential data changes
  useEffect(() => {
    if (essentialReplyCounts) {
      setReplyCounts(essentialReplyCounts);
    }
  }, [essentialReplyCounts, setReplyCounts]);

  // Update sol price in context
  useEffect(() => {
    if (solPrice > 0) {
      setIsLoading(true);
    }
  }, [solPrice, setIsLoading]);

  const handleToRouter = useCallback((id: string) => {
    setIsNavigating(true);
    setNavigatingTo(id);
    router.push(id);
  }, [router]);

  // Function to extract creation time from coin metadata
  const getCreationTime = useCallback((coin: coinInfo): Date => {
    try {
      return new Date(coin.atLaunched);
    } catch (error) {
      console.error('__yuki__ Error parsing creation time:', error);
      return new Date(0);
    }
  }, []);

  // Function to get latest reply time for a coin
  const getLatestReplyTime = useCallback((coin: coinInfo): Date => {
    const replyData = latestReplies.find(reply => reply.coinId === coin._id);
    if (replyData) {
      return new Date(replyData.latestReplyTime);
    }
    return new Date(0);
  }, [latestReplies]);

  // Sorting function
  const sortCoins = useCallback((coins: coinInfo[], sortType: string, order: string): coinInfo[] => {
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
        sortedCoins.sort((a, b) => {
          const timeA = getCreationTime(a).getTime();
          const timeB = getCreationTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
    }
    
    return sortedCoins;
  }, [getCreationTime, getLatestReplyTime]);

  // Handle sort change from FilterListButton
  const handleSortChange = useCallback((sortType: string, order: string) => {
    setCurrentSort(sortType);
    setCurrentOrder(order);
    setCurrentPage(1); // Reset to first page when sorting changes
  }, []);

  // Reset to first page when filters change - simplified to prevent infinite loops
  useEffect(() => {
    setCurrentPage(1);
  }, [nsfwFilterState, searchToken]);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return sortCoins(data, currentSort, currentOrder);
  }, [data, currentSort, currentOrder, sortCoins]);

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
  const totalPages = Math.ceil(totalCoins / itemsPerPage);
  const currentData = filteredData;

  // NSFW image detection effect
  useEffect(() => {
    currentData.forEach(token => {
      if (token.url && nsfwMap[token.url] === undefined) {
        // isImageNSFW(token.url).then(isNsfw => {
        //   setNsfwMap(prev => ({ ...prev, [token.url]: isNsfw }));
        // });
      }
    });
  }, [currentData, nsfwMap]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  // Reset navigation state when route changes
  useEffect(() => {
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
      
      <div className="container py-0">
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
              <button
                onClick={() => setNsfwFilterState(!nsfwFilterState)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                  nsfwFilterState 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {nsfwFilterState ? 'ON' : 'OFF'}
              </button>
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

        {/* Items per page selector and Pagination */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-6"
        >
          {/* Full-width pagination with items per page on the left */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-1.5 bg-card border border-border rounded-lg">
              {/* Left side - Items per page selector */}
              <div className="flex items-center gap-2 whitespace-nowrap pl-3">
                <span className="text-muted-foreground text-sm">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 bg-background border border-border text-foreground text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                  <option value={48}>48</option>
                  <option value={1000}>All</option>
                </select>
              </div>
              
              {/* Right side - Pagination controls */}
              <div className="flex items-center gap-1">
                {/* Previous button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn-outline p-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-3 h-3" />
                </motion.button>

                {/* Page numbers */}
                <div className="flex items-center gap-0.5">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    
                    if (totalPages <= maxVisiblePages) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      if (currentPage <= 3) {
                        for (let i = 1; i <= 4; i++) {
                          pages.push(i);
                        }
                        pages.push('...');
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 3; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        pages.push(1);
                        pages.push('...');
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                          pages.push(i);
                        }
                        pages.push('...');
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages.map((page, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                        disabled={page === '...'}
                        className={`
                          min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition-all duration-200
                          ${page === currentPage
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : page === '...'
                            ? 'text-muted-foreground cursor-default'
                            : 'btn-outline hover:bg-accent'
                          }
                        `}
                      >
                        {page}
                      </motion.button>
                    ));
                  })()}
                </div>

                {/* Next button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-outline p-1.5 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="w-3 h-3" />
                </motion.button>
              </div>
            </div>
          )}
          
          {/* Items per page only (when no pagination needed) */}
          {totalPages <= 1 && (
            <div className="flex justify-end">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-muted-foreground text-sm">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1.5 bg-background border border-border text-foreground text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                  <option value={1000}>All</option>
                </select>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-red-500 text-lg mb-4">Error loading coins: {error.message}</div>
            <button
              onClick={() => refetchCoins()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

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

        {/* Bottom Pagination */}
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
              totalItems={totalCoins}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ReactQueryHomePage;