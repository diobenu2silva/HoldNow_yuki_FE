'use client';
import { FC, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import UserContext from '@/context/UserContext';
import { errorAlert } from '@/components/others/ToastGroup';
import { motion } from 'framer-motion';

const TopToken: FC = () => {
  const { setIsLoading } = useContext(UserContext);
  const router = useRouter();
  const { connected } = useWallet();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleCreateToken = async () => {
    if (!connected) {
      errorAlert('Please connect your wallet first to create a token.');
      return;
    }
    setIsNavigating(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/create-coin');
  };

  return (
    <div className="w-full h-full px-2">
      <div className="w-full flex flex-col items-center text-center gap-6">
        <div className="w-full max-w-[600px] flex flex-col gap-6 justify-center items-center">
          {/* Heading and Button Row */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="text-2xl xs:text-4xl font-bold text-foreground text-center sm:text-left">
              Start Launch Your Next 1000X Meme
            </div>
            <motion.div
              whileHover={!isNavigating ? { scale: 1.05 } : {}}
              whileTap={!isNavigating ? { scale: 0.95 } : {}}
              onClick={handleCreateToken}
              className={`mt-3 sm:mt-0 sm:ml-6 px-4 py-2 sm:px-6 sm:py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
                isNavigating ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
              <span className="relative z-10 flex items-center gap-2">
                {isNavigating && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                )}
                {isNavigating ? 'Creating...' : 'Create a Token'}
              </span>
            </motion.div>
          </div>
          {/* Subheading */}
          <div className="w-full text-md xs:text-xl text-muted-foreground">
            Ready to Become a Crypto Millionaire?
            <br />
            Fairlaunch Now in 10 Seconds
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopToken;
