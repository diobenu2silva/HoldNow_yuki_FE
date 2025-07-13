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
    await new Promise(resolve => setTimeout(resolve, 300));
    router.push('/create-coin');
  };

  return (
    <motion.div
      whileHover={!isNavigating ? { scale: 1.05 } : {}}
      whileTap={!isNavigating ? { scale: 0.95 } : {}}
      onClick={handleCreateToken}
      className={`px-3 py-2 w-28 text-primary flex flex-col justify-center items-center border-2 border-primary/30 rounded-full cursor-pointer bg-card hover:bg-accent transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm text-sm font-semibold relative overflow-hidden text-center ${
        isNavigating ? 'opacity-75 cursor-not-allowed' : ''
      }`}
      title="Create a Coin"
    >
      {isNavigating ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mx-auto"
        />
      ) : (
        <span className="select-none w-full text-center">Create</span>
      )}
    </motion.div>
  );
};

export default CreateTokenButton; 