'use client';
import { FC, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages]);

  const handlePageClick = (page: number | string) => {
    if (typeof page === 'number' && page >= 1 && page <= totalPages) {
  
      onPageChange(page);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-card border border-border rounded-xl">
      {/* Items info */}
      <div className="text-sm text-muted-foreground pl-4">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-outline p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </motion.button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <motion.button
              key={`${page}-${index}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageClick(page)}
              disabled={page === '...'}
              className={`
                min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all duration-200
                ${page === currentPage
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : page === '...'
                  ? 'text-muted-foreground cursor-default'
                  : 'btn-outline hover:bg-accent'
                }
              `}
            >
              {page}
            </motion.button>
          ))}
        </div>

        {/* Next button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-outline p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};

export default Pagination; 