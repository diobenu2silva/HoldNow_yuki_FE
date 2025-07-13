import { useQuery } from 'react-query';
import { getCoinsInfoBySort } from '@/utils/util';
import { coinInfo } from '@/utils/types';

interface UseTrendingCoinsOptions {
  limit: number;
  enabled?: boolean;
}

interface UseTrendingCoinsReturn {
  trendingCoins: coinInfo[];
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

export const useTrendingCoins = ({ 
  limit, 
  enabled = true 
}: UseTrendingCoinsOptions): UseTrendingCoinsReturn => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['trendingCoins', limit],
    async () => {
      const response = await getCoinsInfoBySort('mcap', 0, limit);
      
      // Handle the API response structure
      if (response && typeof response === 'object' && 'coins' in response) {
        return response.coins;
      } else if (Array.isArray(response)) {
        return response;
      } else {
        return [];
      }
    },
    {
      enabled,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  return {
    trendingCoins: data || [],
    isLoading,
    error,
    refetch
  };
}; 