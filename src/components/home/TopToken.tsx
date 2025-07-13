'use client';
import { FC, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import UserContext from '@/context/UserContext';
import { errorAlert } from '@/components/others/ToastGroup';
import { motion } from 'framer-motion';
import CreateTokenButton from './CreateTokenButton';

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
    <div className="w-full h-full px-2 relative">
      <div className="top-1 mr-2 mt-2 z-30 flex justify-end">
        <CreateTokenButton />
      </div>
      {/* Centered heading/subheading */}
      <div className="w-full flex flex-col items-center text-center mt-3">
        <div className="text-2xl xs:text-4xl font-bold text-foreground">
          Start Launch Your Next 1000X Meme
        </div>
        <div className="mt-4 text-md xs:text-xl text-muted-foreground">
          Ready to Become a Crypto Millionaire?
          <br />
          Fairlaunch Now in 10 Seconds
        </div>
      </div>
    </div>
  );
};

export default TopToken;
