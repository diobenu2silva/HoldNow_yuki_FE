'use client';
import { FC, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import TopToken from './TopToken';
import TrendingBanner from './TrendingBanner';
import TrendingCoins from './TrendingCoins';
import { motion } from 'framer-motion';

const SimpleHomePage: FC = () => {
  const { setIsLoading } = useContext(UserContext);
  const router = useRouter();
  const [nsfwFilterState, setNsfwFilterState] = useState(false);

  const handleToRouter = (id: string) => {
    router.push(id);
  };

  return (
    <div className="w-full min-h-screen relative">
      <div className="container py-0">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <TopToken />
        </motion.div>

        {/* Trending Banner Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <TrendingBanner onCoinClick={handleToRouter} />
        </motion.div>

        {/* Trending Coins Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <TrendingCoins onCoinClick={handleToRouter} />
        </motion.div>

        {/* Simple NSFW Filter Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4">
            <span className="text-foreground text-sm">Include NSFW:</span>
            <button
              onClick={() => setNsfwFilterState(!nsfwFilterState)}
              className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                nsfwFilterState 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {nsfwFilterState ? 'ON' : 'OFF'}
            </button>
          </div>
        </motion.div>

        {/* Simple Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center py-12"
        >
          <div className="text-muted-foreground text-lg">
            Simple Homepage - React Query Implementation
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            NSFW Filter State: {nsfwFilterState ? 'Enabled' : 'Disabled'}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SimpleHomePage; 