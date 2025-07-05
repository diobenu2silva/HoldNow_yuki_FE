'use client';
import { FC } from 'react';
import { Skeleton as UISkeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

export const Skeleton: FC<SkeletonProps> = ({ 
  className = "", 
  count = 1, 
  height = "h-4", 
  width = "w-full" 
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <UISkeleton className={`${height} ${width} ${className}`} />
        </motion.div>
      ))}
    </div>
  );
};

// Specialized skeleton components
export const CardSkeleton: FC = () => (
  <div className="card p-6 space-y-4">
    <div className="flex items-center space-x-4">
      <UISkeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <UISkeleton className="h-4 w-3/4" />
        <UISkeleton className="h-3 w-1/2" />
      </div>
    </div>
    <UISkeleton className="h-4 w-full" />
    <UISkeleton className="h-4 w-2/3" />
    <div className="flex justify-between items-center">
      <UISkeleton className="h-6 w-20" />
      <UISkeleton className="h-6 w-16" />
    </div>
  </div>
);

export const TokenCardSkeleton: FC = () => (
  <div className="card overflow-hidden">
    <div className="flex flex-row w-full relative">
      <UISkeleton className="w-28 h-28" />
      <div className="flex flex-col px-4 py-3 flex-1 gap-2">
        <div className="flex items-center gap-2">
          <UISkeleton className="h-6 w-24" />
          <UISkeleton className="h-5 w-12 rounded-full" />
        </div>
        <UISkeleton className="h-4 w-32" />
        <UISkeleton className="h-3 w-48" />
        <div className="flex items-center gap-2 mt-2">
          <UISkeleton className="w-8 h-8 rounded-lg" />
          <UISkeleton className="w-8 h-8 rounded-lg" />
          <UISkeleton className="w-8 h-8 rounded-lg" />
        </div>
      </div>
    </div>
    <div className="p-4 bg-gradient-to-r from-white/5 to-white/10 border-t border-white/10">
      <div className="flex items-center justify-between mb-3">
        <UISkeleton className="h-4 w-20" />
        <div className="text-right">
          <UISkeleton className="h-5 w-16 mb-1" />
          <UISkeleton className="h-3 w-12" />
        </div>
      </div>
      <UISkeleton className="w-full h-3 rounded-full" />
    </div>
  </div>
);

export const TableSkeleton: FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <UISkeleton 
            key={colIndex} 
            className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-24'}`} 
          />
        ))}
      </div>
    ))}
  </div>
); 