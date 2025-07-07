'use client';
import { FC, useContext, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import UserContext from '@/context/UserContext';
import { errorAlert } from '@/components/others/ToastGroup';
import TestTokenImg from '@/../public/assets/images/banner.jpg';
import { motion } from 'framer-motion';

const TopToken: FC = () => {
  const { setIsLoading, setSolPrice } = useContext(UserContext);
  const router = useRouter();
  const { connected } = useWallet();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleCreateToken = async () => {
    if (!connected) {
      errorAlert('Please connect your wallet first to create a token.');
      return;
    }
    
    setIsNavigating(true);
    
    // Add a small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 300));
    
    router.push('/create-coin');
  };

  return (
    <div className="w-full h-full px-2">
      <div className="w-full justify-between flex flex-col xs:flex-row items-start gap-6">
        <div className="w-full h-full relative overflow-hidden">
          <Image
            src={TestTokenImg}
            alt="TestTokenImg"
            className="h-[160px] w-full object-full xs:h-[250px] rounded-lg animate-hero-zoom"
          />
          <div className="absolute inset-0 z-10 w-[calc(200%)] pointer-events-none">
            <div
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"
              style={{ filter: 'blur(8px)' }}
            />
          </div>
        </div>
        <div className="w-full max-w-[450px] h-full flex flex-col gap-6 justify-between items-start">
          <div className="w-full text-2xl xs:text-4xl text-center xs:text-start font-bold text-foreground">
            Start Launch Your Next 1000X Meme
          </div>
          <div className="w-full text-md xs:text-xl text-center xs:text-start text-muted-foreground">
            Ready to Become a Crypto Millionaire?
            <br />
            Fairlaunch Now in 10 Seconds
          </div>
          <motion.div
            whileHover={!isNavigating ? { scale: 1.05 } : {}}
            whileTap={!isNavigating ? { scale: 0.95 } : {}}
            onClick={handleCreateToken}
            className={`px-14 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer mx-auto xs:mx-20 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
              isNavigating ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
            <span className="relative z-10 flex items-center gap-2">
              {isNavigating && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                />
              )}
              {isNavigating ? 'Creating...' : 'Create a Token'}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TopToken;
