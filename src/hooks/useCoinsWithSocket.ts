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

  // Optimized socket event handlers with debouncing and batch updates
  useEffect(() => {
    if (!onNewTokenCreated || !onCoinInfoUpdate || !socket) return;

    let newTokenTimeoutId: NodeJS.Timeout;
    let coinUpdateTimeoutId: NodeJS.Timeout;
    const pendingUpdates = new Map();

    const handleNewToken = (payload: any) => {
      console.log('__yuki__ useCoinsWithSocket: New token created:', payload);
      
      // Debounce new token updates
      clearTimeout(newTokenTimeoutId);
      newTokenTimeoutId = setTimeout(() => {
        queryClient.setQueryData(['coins', sortType, page, itemsPerPage], (oldData: any) => {
          if (!oldData) return oldData;
          
          const newToken = payload.coinInfo;
          const existingCoins = oldData.coins || [];
          
          // Check if token already exists to avoid duplicates
          const exists = existingCoins.find((token: coinInfo) => 
            token._id === newToken._id || token.token === newToken.token
          );
          
          if (exists) return oldData;
          
          // Only add to page 1, cascade overflow to other pages
          if (page === 1) {
            const updatedCoins = [newToken, ...existingCoins];
            
            // Handle overflow to page 2
            if (updatedCoins.length > itemsPerPage) {
              const overflowCoin = updatedCoins[itemsPerPage];
              queryClient.setQueryData(['coins', sortType, 2, itemsPerPage], (page2Data: any) => {
                if (page2Data && !page2Data.coins.find((t: coinInfo) => t._id === overflowCoin._id)) {
                  return {
                    ...page2Data,
                    coins: [overflowCoin, ...page2Data.coins].slice(0, itemsPerPage)
                  };
                }
                return page2Data;
              });
            }
            
            return {
              ...oldData,
              coins: updatedCoins.slice(0, itemsPerPage),
              total: oldData.total + 1
            };
          } else {
            return { ...oldData, total: oldData.total + 1 };
          }
        });
        
        // Batch invalidate related queries
        queryClient.invalidateQueries(['essentialData']);
      }, 200);
    };

    const handleCoinUpdate = (payload: any) => {
      // Batch coin updates to reduce cache writes
      pendingUpdates.set(payload.token, payload.coinInfo);
      
      clearTimeout(coinUpdateTimeoutId);
      coinUpdateTimeoutId = setTimeout(() => {
        if (pendingUpdates.size === 0) return;
        
        queryClient.setQueryData(['coins', sortType, page, itemsPerPage], (oldData: any) => {
          if (!oldData) return oldData;
          
          const updatedCoins = oldData.coins.map((coin: coinInfo) => {
            const update = pendingUpdates.get(coin.token);
            return update ? { ...coin, ...update } : coin;
          });
          
          pendingUpdates.clear();
          return { ...oldData, coins: updatedCoins };
        });
      }, 150);
    };
    
    onNewTokenCreated(handleNewToken);
    onCoinInfoUpdate(handleCoinUpdate);
    
    return () => {
      clearTimeout(newTokenTimeoutId);
      clearTimeout(coinUpdateTimeoutId);
      pendingUpdates.clear();
    };
  }, [onNewTokenCreated, onCoinInfoUpdate, queryClient, sortType, page, itemsPerPage, socket]);

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