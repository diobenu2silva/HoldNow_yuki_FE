'use client';
import { FC, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import UserContext from '@/context/UserContext';
import { errorAlert } from '@/components/others/ToastGroup';
import { motion } from 'framer-motion';

const CreateTokenButton: FC = () => {
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
    
    // Add a small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 300));
    
    router.push('/create-coin');
  };

  return (
    <div className="w-full flex justify-center py-8">
      <motion.div
        whileHover={!isNavigating ? { scale: 1.05 } : {}}
        whileTap={!isNavigating ? { scale: 0.95 } : {}}
        onClick={handleCreateToken}
        className={`px-14 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
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
  );
};

export default CreateTokenButton; 