import { FC } from 'react';
import { motion } from 'framer-motion';
import { TokenCardSkeleton } from './Skeleton';

interface InfiniteScrollLoaderProps {
  count?: number;
  viewMode?: 'grid' | 'list';
}

const InfiniteScrollLoader: FC<InfiniteScrollLoaderProps> = ({ 
  count = 6, 
  viewMode = 'grid' 
}) => {
  return (
    <div className={`w-full ${
      viewMode === 'grid'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
        : 'flex flex-col gap-4'
    }`}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={`skeleton-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.1,
            ease: 'easeOut'
          }}
          className={viewMode === 'list' ? 'w-full' : ''}
        >
          <TokenCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
};

export default InfiniteScrollLoader; 