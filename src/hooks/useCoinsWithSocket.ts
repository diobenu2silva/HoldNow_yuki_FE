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
  const { onNewTokenCreated, onCoinInfoUpdate, socket } = useSocket();

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
      
      // Validate response data
      if (!response || !response.coins) {
        throw new Error('Invalid response from server');
      }
      
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
      // Disable refetch on mount to prevent double fetching
      refetchOnMount: false,
    }
  );

  // Handle new token creation
  useEffect(() => {
    if (!onNewTokenCreated || !socket) return;

    const handleNewToken = (payload: any) => {
      console.log('__yuki__ useCoinsWithSocket: New token created:', payload);
      console.log('__yuki__ useCoinsWithSocket: Current page:', page, 'sortType:', sortType, 'itemsPerPage:', itemsPerPage);
      
      // Update all query keys for this sort type to ensure new token appears
      // regardless of which page the user is on
      queryClient.setQueriesData(['coins', sortType], (oldData: any) => {
        if (!oldData) {
          console.log('__yuki__ useCoinsWithSocket: No old data found for query key:', ['coins', sortType]);
          return oldData;
        }
        
        const newToken = payload.coinInfo;
        const existingCoins = oldData.coins || [];
        
        console.log('__yuki__ useCoinsWithSocket: Existing coins count:', existingCoins.length);
        
        // Check if token already exists to avoid duplicates
        const exists = existingCoins.find((token: coinInfo) => 
          token._id === newToken._id || token.token === newToken.token
        );
        
        if (exists) {
          console.log('__yuki__ useCoinsWithSocket: Token already exists, skipping');
          return oldData;
        }
        
        console.log('__yuki__ useCoinsWithSocket: Adding new token to beginning of list');
        
        // Add new token to the beginning
        const updatedCoins = [newToken, ...existingCoins];
        
        return {
          ...oldData,
          coins: updatedCoins,
          total: oldData.total + 1
        };
      });
      
      // Also update the specific current page query
      queryClient.setQueryData(['coins', sortType, page, itemsPerPage], (oldData: any) => {
        if (!oldData) {
          console.log('__yuki__ useCoinsWithSocket: No old data found for specific page query:', ['coins', sortType, page, itemsPerPage]);
          return oldData;
        }
        
        const newToken = payload.coinInfo;
        const existingCoins = oldData.coins || [];
        
        // Check if token already exists to avoid duplicates
        const exists = existingCoins.find((token: coinInfo) => 
          token._id === newToken._id || token.token === newToken.token
        );
        
        if (exists) {
          console.log('__yuki__ useCoinsWithSocket: Token already exists on current page, skipping');
          return oldData;
        }
        
        // For first page, add new token to beginning
        if (page === 1) {
          console.log('__yuki__ useCoinsWithSocket: Adding new token to first page');
          const updatedCoins = [newToken, ...existingCoins];
          // Keep exactly itemsPerPage tokens
          const finalCoins = updatedCoins.slice(0, itemsPerPage);
          
          return {
            ...oldData,
            coins: finalCoins,
            total: oldData.total + 1
          };
        } else {
          console.log('__yuki__ useCoinsWithSocket: Updating total count for non-first page');
          // For other pages, just update total count
          return {
            ...oldData,
            total: oldData.total + 1
          };
        }
      });
      
      // Invalidate essential data to update any related information
      queryClient.invalidateQueries(['essentialData']);
      console.log('__yuki__ useCoinsWithSocket: Invalidated essential data');
    };
    
    onNewTokenCreated(handleNewToken);
    console.log('__yuki__ useCoinsWithSocket: Registered new token handler for page:', page, 'sortType:', sortType);
  }, [onNewTokenCreated, queryClient, sortType, page, itemsPerPage, socket]);

  // Handle coin info updates (market cap, stage progress, etc.)
  useEffect(() => {
    if (!onCoinInfoUpdate || !socket) return;

    const handleCoinUpdate = (payload: any) => {
      console.log('__yuki__ useCoinsWithSocket: Coin info updated:', payload);
      
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
  }, [onCoinInfoUpdate, queryClient, sortType, page, itemsPerPage, socket]);

  return {
    coins: data?.coins || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch: () => {
      console.log('__yuki__ Refetching coins for page:', page, 'itemsPerPage:', itemsPerPage);
      refetch();
    }
  };
}; 