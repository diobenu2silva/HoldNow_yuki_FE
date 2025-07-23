'use client';
import { coinInfo } from '@/utils/types';
import { FC, useContext, useState } from 'react';
import { HiOutlineTag, HiOutlineGlobeAlt, HiOutlineInformationCircle } from 'react-icons/hi2';
import { FaXTwitter } from 'react-icons/fa6';
import { FaTelegramPlane } from 'react-icons/fa';

interface TokenDataProps {
  coinData: coinInfo;
}

const TokenData: FC<TokenDataProps> = ({ coinData }) => {
  return (
    <div 
      className="relative flex flex-col xs:flex-row gap-3 px-2 py-3 border-2 border-primary/30 rounded-lg shadow-sm overflow-hidden"
      style={coinData.frontBanner ? {
        backgroundImage: `url(${coinData.frontBanner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { background: 'var(--card)' }}
    >
      {/* Social Links - Top Right Corner */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        {coinData.website && (
          <a
            href={coinData.website}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/60 transition-colors duration-200"
            title="Website"
          >
            <HiOutlineGlobeAlt className="w-3 h-3" />
          </a>
        )}
        {coinData.twitter && (
          <a
            href={coinData.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/60 transition-colors duration-200"
            title="Twitter"
          >
            <FaXTwitter className="w-3 h-3" />
          </a>
        )}
        {coinData.telegram && (
          <a
            href={coinData.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/60 transition-colors duration-200"
            title="Telegram"
          >
            <FaTelegramPlane className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col xs:flex-row gap-3 w-full">
        <img
          src={coinData.url}
          className="rounded-md w-24 h-24 border-2 border-primary/20 mx-auto xs:mx-0 bg-card/80 object-cover backdrop-blur-sm"
          alt="Token IMG"
        />
        <div className="flex flex-col gap-1 py-1 min-w-0 flex-1">
          <span className="inline-block">
            <span className="font-semibold text-white drop-shadow-lg bg-black/30 px-2 py-1 rounded backdrop-blur-sm inline-flex items-center gap-2">
              <HiOutlineTag className="w-4 h-4" />
              {coinData?.name}
            </span>
          </span>
          <span className="inline-block">
            <span className="text-white drop-shadow-lg bg-black/30 px-2 py-1 rounded backdrop-blur-sm break-words leading-relaxed inline-block  max-w-[calc(100%-30px)]">
            {coinData?.description}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TokenData;
