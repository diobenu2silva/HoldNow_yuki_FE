import React from 'react';
import { Spinner } from './Spinner';

interface LoadingPageProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[200px] space-y-4 ${className}`}>
      <Spinner />
      <p className="text-muted-foreground text-sm animate-pulse">{message}</p>
    </div>
  );
};

export const LoadingOverlay: React.FC<LoadingPageProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <LoadingPage message={message} />
    </div>
  );
};

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
    </div>
  );
}; 