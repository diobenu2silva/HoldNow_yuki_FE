'use client';
import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { coinInfo } from '@/utils/types';
import { getCoinsInfo, getSolPriceInUSD, getLatestReplies } from '@/utils/util';
import { CoinBlog } from '../cards/CoinBlog';
import TopToken from './TopToken';
import FilterList from './FilterList';
import Pagination from './Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenCardSkeleton } from '../loadings/Skeleton';

const HomePage: FC = () => {
  const { isLoading, setIsLoading, isCreated, solPrice, setSolPrice } =
    useContext(UserContext);
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
  const router = useRouter();

  const handleToRouter = (id: string) => {
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

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return sortCoins(data, currentSort, currentOrder);
  }, [data, currentSort, currentOrder, latestReplies]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

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
        const [coins, price, replies] = await Promise.all([
          getCoinsInfo(),
          getSolPriceInUSD(),
          getLatestReplies()
        ]);
        
        if (coins !== null) {
          setData(coins);
          setLatestReplies(replies);
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
  }, []);

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
    <div className="w-full min-h-screen">
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

        {/* Filter and View Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-6"
        >
          <FilterList 
            onSortChange={handleSortChange}
            currentSort={currentSort}
            currentOrder={currentOrder}
          />
        </motion.div>

        {/* View Mode Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-between items-center mb-6"
        >
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm">View Mode:</span>
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                List
              </button>
            </div>
          </div>

          {/* Items per page selector */}
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
              <option value={sortedData.length}>All ({sortedData.length})</option>
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
            <AnimatePresence mode="wait">
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
                    <CoinBlog coin={temp} componentKey="coin" />
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
            <div className="text-muted-foreground text-lg">No tokens found</div>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8"
          >
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={sortedData.length}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};
export default HomePage;
