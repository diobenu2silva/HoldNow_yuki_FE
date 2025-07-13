import { useState, useEffect, useCallback, useRef } from 'react';
import { coinInfo } from '@/utils/types';
import { getCoinsInfoLazy } from '@/utils/util';

interface UseInfiniteScrollProps {
  sortType: string;
  sortOrder: string;
  searchQuery: string;
  nsfwFilter: boolean;
  initialLimit?: number;
}

interface UseInfiniteScrollReturn {
  coins: coinInfo[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  loadingRef: React.RefObject<HTMLDivElement>;
}

export const useInfiniteScroll = ({
  sortType,
  sortOrder,
  searchQuery,
  nsfwFilter,
  initialLimit = 12
}: UseInfiniteScrollProps): UseInfiniteScrollReturn => {
  const [coins, setCoins] = useState<coinInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Convert sort type to API format
  const getSortParam = useCallback(() => {
    switch (sortType) {
      case 'market cap':
        return 'mcap';
      case 'creation time':
        return 'latest';
      case 'last reply':
        return 'latest'; // We'll need to add this endpoint
      default:
        return 'latest';
    }
  }, [sortType]);

  // Load coins function
  const loadCoins = useCallback(async (page: number, append: boolean = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const sortParam = getSortParam();
      const result = await getCoinsInfoLazy(sortParam, page, initialLimit, {
        search: searchQuery,
        nsfw: nsfwFilter
      });

      if (append) {
        setCoins(prev => [...prev, ...result.coins]);
      } else {
        setCoins(result.coins);
      }
      
      setHasMore(result.hasMore);
      setCurrentPage(result.page);
    } catch (err) {
      setError('Failed to load coins');
      console.error('Error loading coins:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, getSortParam, searchQuery, nsfwFilter, initialLimit]);

  // Load more function
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadCoins(currentPage + 1, true);
    }
  }, [isLoading, hasMore, currentPage, loadCoins]);

  // Refresh function
  const refresh = useCallback(() => {
    setCoins([]);
    setCurrentPage(0);
    setHasMore(true);
    setError(null);
    loadCoins(0, false);
  }, [loadCoins]);

  // Initial load
  useEffect(() => {
    if (!isInitialized) {
      loadCoins(0, false);
      setIsInitialized(true);
    }
  }, [isInitialized, loadCoins]);

  // Reset when filters change
  useEffect(() => {
    if (isInitialized) {
      setCoins([]);
      setCurrentPage(0);
      setHasMore(true);
      setError(null);
      loadCoins(0, false);
    }
  }, [sortType, sortOrder, searchQuery, nsfwFilter, isInitialized, loadCoins]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before reaching the end
        threshold: 0.1
      }
    );

    observerRef.current = observer;

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore]);

  return {
    coins,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh,
    loadingRef
  };
}; 