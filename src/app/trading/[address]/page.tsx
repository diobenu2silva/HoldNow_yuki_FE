'use client';
import { useState, useEffect } from 'react';
import TradingPage from '@/components/trading';
import PageLoader from '@/components/loadings/PageLoader';

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setIsLoading(false), 500);
          return 100;
        }
        return prev + 20;
      });
    }, 200);

    return () => clearInterval(progressInterval);
  }, []);

  if (isLoading) {
    return (
      <PageLoader 
        message="Loading token data..." 
        showProgress={true}
        progress={loadingProgress}
      />
    );
  }

  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)]">
      <div className="container">
        <TradingPage />
      </div>
    </div>
  );
}
