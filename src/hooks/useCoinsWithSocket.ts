import { useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import { getCoinsInfoBySort } from '@/utils/util';
import { coinInfo } from '@/utils/types';
import { useSocket } from '@/contexts/SocketContext';

interface UseCoinsWithSocketOptions {
  sortType: string;
  page: number;
  itemsPerPage: number;
  enabled?: boolean;
}

interface UseCoinsWithSocketReturn {
  coins: coinInfo[];
  total: number;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}

export const useCoinsWithSocket = ({ 
  sortType, 
  page, 
  itemsPerPage, 
  enabled = true 
}: UseCoinsWithSocketOptions): UseCoinsWithSocketReturn => {
  const queryClient = useQueryClient();
  const { onNewTokenCreated, onCoinInfoUpdate } = useSocket();

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

  // Handle new token creation
  useEffect(() => {
    if (onNewTokenCreated) {
      const handleNewToken = (payload: any) => {
        console.log('__yuki__ New token created:', payload);
        
        // Update the cache with the new token
        queryClient.setQueryData(['coins', sortType, page, itemsPerPage], (oldData: any) => {
          if (!oldData) return oldData;
          
          const newToken = payload.coinInfo;
          const existingCoins = oldData.coins || [];
          
          // Check if token already exists to avoid duplicates
          const exists = existingCoins.find((token: coinInfo) => 
            token._id === newToken._id || token.token === newToken.token
          );
          
          if (exists) return oldData;
          
          // Add new token to the beginning of the list
          return {
            ...oldData,
            coins: [newToken, ...existingCoins],
            total: oldData.total + 1
          };
        });
      };
      
      onNewTokenCreated(handleNewToken);
    }
  }, [onNewTokenCreated, queryClient, sortType, page, itemsPerPage]);

  // Handle coin info updates (market cap, stage progress, etc.)
  useEffect(() => {
    if (onCoinInfoUpdate) {
      const handleCoinUpdate = (payload: any) => {
        console.log('__yuki__ Coin info updated:', payload);
        
        // Update the cache with the updated coin info
        queryClient.setQueryData(['coins', sortType, page, itemsPerPage], (oldData: any) => {
          if (!oldData) return oldData;
          
          const updatedCoins = oldData.coins.map((coin: coinInfo) => 
            coin.token === payload.token ? { ...coin, ...payload.coinInfo } : coin
          );
          
          return {
            ...oldData,
            coins: updatedCoins
          };
        });
      };
      
      onCoinInfoUpdate(handleCoinUpdate);
    }
  }, [onCoinInfoUpdate, queryClient, sortType, page, itemsPerPage]);

  return {
    coins: data?.coins || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch
  };
}; 