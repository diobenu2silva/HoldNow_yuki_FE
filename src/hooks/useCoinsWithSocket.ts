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
      
      // Don't update all queries - this was causing the new token to appear on all pages
      // Instead, we'll only update the specific pages that need to be updated
      
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
          
          // If we have more coins than itemsPerPage, handle the overflow properly
          if (updatedCoins.length > itemsPerPage) {
            const overflowCoin = updatedCoins[itemsPerPage];
            console.log('__yuki__ useCoinsWithSocket: Moving overflow coin to page 2:', overflowCoin.name);
            
            // Update page 2 to include the overflow coin
            queryClient.setQueryData(['coins', sortType, 2, itemsPerPage], (page2Data: any) => {
              if (page2Data) {
                const page2Coins = page2Data.coins || [];
                // Check if overflow coin already exists on page 2
                const existsOnPage2 = page2Coins.find((token: coinInfo) => 
                  token._id === overflowCoin._id || token.token === overflowCoin.token
                );
                
                if (!existsOnPage2) {
                  console.log('__yuki__ useCoinsWithSocket: Adding overflow coin to page 2');
                  const updatedPage2Coins = [overflowCoin, ...page2Coins];
                  // Keep exactly itemsPerPage tokens on page 2 as well
                  const finalPage2Coins = updatedPage2Coins.slice(0, itemsPerPage);
                  
                  // If page 2 also overflows, handle page 3
                  if (updatedPage2Coins.length > itemsPerPage) {
                    const page2OverflowCoin = updatedPage2Coins[itemsPerPage];
                    console.log('__yuki__ useCoinsWithSocket: Moving overflow coin to page 3:', page2OverflowCoin.name);
                    
                    queryClient.setQueryData(['coins', sortType, 3, itemsPerPage], (page3Data: any) => {
                      if (page3Data) {
                        const page3Coins = page3Data.coins || [];
                        const existsOnPage3 = page3Coins.find((token: coinInfo) => 
                          token._id === page2OverflowCoin._id || token.token === page2OverflowCoin.token
                        );
                        
                        if (!existsOnPage3) {
                          console.log('__yuki__ useCoinsWithSocket: Adding overflow coin to page 3');
                          return {
                            ...page3Data,
                            coins: [page2OverflowCoin, ...page3Coins]
                          };
                        }
                      }
                      return page3Data;
                    });
                  }
                  
                  return {
                    ...page2Data,
                    coins: finalPage2Coins
                  };
                }
              }
              return page2Data;
            });
          }
          
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