'use client';

import { coinInfo } from '@/utils/types';
import { FC } from 'react';
import { FaTelegramPlane } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { TbWorld } from 'react-icons/tb';
import { motion } from 'framer-motion';

interface SocialListProps {
  coin: coinInfo;
}

const SocialList: FC<SocialListProps> = ({ coin }) => {
  return (
    <div className="flex flex-row gap-4 px-2 justify-center">
      {coin.website && (
        <motion.a
          href={coin.website}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="cursor-pointer bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20"
        >
          <TbWorld className="w-4 h-4 drop-shadow-sm" />
        </motion.a>
      )}

      {coin.twitter && (
        <motion.a
          href={coin.twitter}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="cursor-pointer bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20"
        >
          <FaXTwitter className="w-4 h-4 drop-shadow-sm" />
        </motion.a>
      )}

      {coin.telegram && (
        <motion.a
          href={coin.telegram}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="cursor-pointer bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20"
        >
          <FaTelegramPlane className="w-4 h-4 drop-shadow-sm" />
        </motion.a>
      )}
    </div>
  );
};

export default SocialList;
