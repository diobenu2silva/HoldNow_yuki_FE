'use client';

import { coinInfo } from '@/utils/types';
import { FC } from 'react';
import { FaTwitter } from 'react-icons/fa';
import { FaTelegramPlane } from 'react-icons/fa';
import { TbWorld } from 'react-icons/tb';

interface SocialListProps {
  coin: coinInfo;
}

const SocialList: FC<SocialListProps> = ({ coin }) => {
  return (
    <div className="flex flex-row gap-4 px-2 justify-center">
      {coin.website && (
        <a
          href={coin.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl text-[#64ffda] bg-[#64ffda]/30 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/30 p-2 cursor-pointer rounded-full border-[1px] border-[#143F72]"
        >
          <TbWorld />
        </a>
      )}

      {coin.twitter && (
        <a
          href={coin.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl text-[#64ffda] bg-[#64ffda]/30 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/30 p-2 cursor-pointer rounded-full border-[1px] border-[#143F72]"
        >
          <FaTwitter />
        </a>
      )}

      {coin.telegram && (
        <a
          href={coin.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="text-2xl text-[#64ffda] bg-[#64ffda]/30 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/30 p-2 cursor-pointer rounded-full border-[1px] border-[#143F72]"
        >
          <FaTelegramPlane />
        </a>
      )}
    </div>
  );
};

export default SocialList;
