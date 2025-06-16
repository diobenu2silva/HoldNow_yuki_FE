'use client';
import { coinInfo } from '@/utils/types';
import { FC, useContext, useState } from 'react';

interface TokenDataProps {
  coinData: coinInfo;
}

const TokenData: FC<TokenDataProps> = ({ coinData }) => {
  return (
    <div className="flex flex-col xs:flex-row gap-3 px-2">
      <img
        src={coinData.url}
        className="rounded-md w-24 h-24 border-[1px] border-[#64ffda] mx-auto xs:mx-0"
        alt="Token IMG"
      />
      <div className="text-white flex flex-col gap-1 py-1">
        <p className="font-semibold">Token Name: {coinData?.name}</p>
        <p className="">{coinData?.description}</p>
      </div>
    </div>
  );
};

export default TokenData;
