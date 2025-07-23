import { useQuery, useQueryClient } from 'react-query';
import { getTrendingCoins, getKingOfCoin } from '@/utils/util';
import { coinInfo } from '@/utils/types';
import { useSocket } from '@/contexts/SocketContext';
import { useEffect } from 'react';

interface UseTrendingCoinsOptions {
  timePeriod: '5m' | '1h' | '6h' | '24h';
  enabled?: boolean;
}

interface UseTrendingCoinsReturn {
  trendingCoins: coinInfo[];
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

export const useTrendingCoins = ({ 
  timePeriod, 
  enabled = true 
}: UseTrendingCoinsOptions): UseTrendingCoinsReturn => {
  const queryClient = useQueryClient();
  const { onTrendingUpdate } = useSocket();

  // Listen for trending updates from socket
  useEffect(() => {
    if (!enabled) return;

    const handleTrendingUpdate = (payload: any) => {
      if (payload.timePeriod === timePeriod) {
        console.log(`__yuki__ useTrendingCoins: Received trending update for ${timePeriod}`);
        // Invalidate and refetch the query
        queryClient.invalidateQueries(['trendingCoins', timePeriod]);
      }
    };

    onTrendingUpdate(handleTrendingUpdate);

    return () => {
      // Cleanup is handled by the socket context
    };
  }, [timePeriod, enabled, onTrendingUpdate, queryClient]);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['trendingCoins', timePeriod],
    async () => {
      const response = await getTrendingCoins(timePeriod);
      return response || [];
    },
    {
      enabled,
      staleTime: 2 * 60 * 1000, // 2 minutes (matches backend cache)
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

interface UseKingOfCoinReturn {
  kingCoins: coinInfo[];
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

export const useKingOfCoin = (enabled: boolean = true): UseKingOfCoinReturn => {
  const queryClient = useQueryClient();
  const { onTrendingUpdate } = useSocket();

  // Listen for trending updates from socket (King of Coin should update when any trending data changes)
  useEffect(() => {
    if (!enabled) return;

    const handleTrendingUpdate = (payload: any) => {
      console.log(`__yuki__ useKingOfCoin: Received trending update, invalidating King of Coin`);
      // Invalidate and refetch the King of Coin query
      queryClient.invalidateQueries(['kingOfCoin']);
    };

    onTrendingUpdate(handleTrendingUpdate);

    return () => {
      // Cleanup is handled by the socket context
    };
  }, [enabled, onTrendingUpdate, queryClient]);

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery(
    ['kingOfCoin'],
    async () => {
      const response = await getKingOfCoin();
      return response || [];
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
    kingCoins: data || [],
    isLoading,
    error,
    refetch
  };
}; 