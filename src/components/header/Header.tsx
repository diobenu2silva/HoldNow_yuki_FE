'use client';
import { FC, useContext, useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '../buttons/ConnectButton';
import { useRouter } from 'next/navigation';
import { FaWolfPackBattalion } from 'react-icons/fa';
import { PROGRAM_ID_IDL } from '@/program/programId';
import { connection } from '@/program/web3';
import { coinInfo, SwapInfo } from '@/utils/types';
import Link from 'next/link';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ThemeToggle } from '@/components/theme-toggle';
import { motion } from 'framer-motion';

const Header: FC = () => {
  const router = useRouter();

  const handleToRouter = (id: string) => {
    router.push(id);
  };

  const [latestCreatedToken, setLatestCreatedToken] =
    useState<coinInfo>(undefined);
  const [latestSwapInfo, setLatestSwapInfo] = useState<SwapInfo>(undefined);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full h-[80px] flex flex-col justify-center items-center bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 py-0">
        <div className="w-full h-full flex flex-row justify-between items-center px-5">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToRouter('/')}
            className="p-3 text-2xl text-primary flex flex-col justify-center items-center border-2 border-primary/30 rounded-full cursor-pointer bg-card hover:bg-accent transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            <FaWolfPackBattalion />
          </motion.div>

          {/* Latest Activity */}
          <div className="flex flex-col gap-2">
            {latestSwapInfo && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link
                  className="bg-green-600 text-white px-4 py-2 font-medium rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2"
                  href={`/trading/${latestSwapInfo.mintAddress}`}
                >
                  <span className="text-sm">
                    {`${latestSwapInfo.creator} ${latestSwapInfo.direction} ${(latestSwapInfo.solAmountInLamports / LAMPORTS_PER_SOL).toFixed(9)} SOL of ${latestSwapInfo.mintSymbol}`}
                  </span>
                  <img
                    src={latestSwapInfo.mintUri}
                    className="w-6 h-6 rounded-full"
                    alt={latestSwapInfo.mintSymbol}
                  />
                </Link>
              </motion.div>
            )}
            {latestCreatedToken && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Link
                  className="bg-blue-600 text-white px-4 py-2 font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
                  href={`/trading/${latestCreatedToken.token}`}
                >
                  <span className="text-sm">
                    {`${latestCreatedToken.creator} created `}
                  </span>
                  <img
                    src={latestCreatedToken.url}
                    className="w-6 h-6 rounded-full"
                    alt={latestCreatedToken.name}
                  />
                  <span className="text-sm">
                    {`${latestCreatedToken.name} on ${new Date().toDateString()}`}
                  </span>
                </Link>
              </motion.div>
            )}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ConnectButton />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default Header;
