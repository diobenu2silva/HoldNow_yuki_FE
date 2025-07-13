import { useQuery } from 'react-query';
import { getCoinsInfoBySort, getSolPriceInUSD, getLatestReplies, getReplyCounts } from '@/utils/util';
import { coinInfo } from '@/utils/types';

interface UseCoinsOptions {
  sortType: string;
  page: number;
  itemsPerPage: number;
  enabled?: boolean;
}

interface UseCoinsReturn {
  coins: coinInfo[];
  total: number;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

export const useCoins = ({ 
  sortType, 
  page, 
  itemsPerPage, 
  enabled = true 
}: UseCoinsOptions): UseCoinsReturn => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['coins', sortType, page, itemsPerPage],
    async () => {
      // Calculate the correct page number for the API (0-based)
      const apiPage = page - 1;
      
      // For "All" option, we'll handle it differently - fetch with a large limit
      const actualPage = itemsPerPage >= 1000 ? 0 : apiPage;
      const actualLimit = itemsPerPage >= 1000 ? 1000 : itemsPerPage;
      
      const response = await getCoinsInfoBySort(
        sortType === 'market cap' ? 'mcap' : 'latest', 
        actualPage, 
        actualLimit
      );
      
      return {
        coins: response.coins || [],
        total: response.total || 0,
        page: response.page || 0,
        numberOfCoins: response.numberOfCoins || 0
      };
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  return {
    coins: data?.coins || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch
  };
};

interface UseEssentialDataReturn {
  solPrice: number;
  latestReplies: { coinId: string; latestReplyTime: string }[];
  replyCounts: { [coinId: string]: number };
  isLoading: boolean;
  error: any;
}

export const useEssentialData = (): UseEssentialDataReturn => {
  const {
    data: solPrice,
    isLoading: isSolPriceLoading,
    error: solPriceError
  } = useQuery(
    ['solPrice'],
    getSolPriceInUSD,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );

  const {
    data: latestReplies,
    isLoading: isRepliesLoading,
    error: repliesError
  } = useQuery(
    ['latestReplies'],
    getLatestReplies,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const {
    data: replyCounts,
    isLoading: isCountsLoading,
    error: countsError
  } = useQuery(
    ['replyCounts'],
    async () => {
      const counts = await getReplyCounts();
      const replyCountsMap: { [coinId: string]: number } = {};
      counts.forEach((item: { coinId: string; replyCount: number }) => {
        replyCountsMap[item.coinId] = item.replyCount;
      });
      return replyCountsMap;
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  return {
    solPrice: solPrice || 0,
    latestReplies: latestReplies || [],
    replyCounts: replyCounts || {},
    isLoading: isSolPriceLoading || isRepliesLoading || isCountsLoading,
    error: solPriceError || repliesError || countsError
  };
}; 