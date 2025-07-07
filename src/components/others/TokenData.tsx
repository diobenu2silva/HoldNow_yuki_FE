'use client';
import { coinInfo } from '@/utils/types';
import { FC, useContext, useState } from 'react';

interface TokenDataProps {
  coinData: coinInfo;
}

const TokenData: FC<TokenDataProps> = ({ coinData }) => {
  return (
    <div className="flex flex-col xs:flex-row gap-3 px-2 py-3 bg-card border-2 border-primary/30 rounded-lg shadow-sm">
      <img
        src={coinData.url}
        className="rounded-md w-24 h-24 border-2 border-primary/20 mx-auto xs:mx-0"
        alt="Token IMG"
      />
      <div className="flex flex-col gap-1 py-1 min-w-0 flex-1">
        <p className="font-semibold text-foreground">Token Name: {coinData?.name}</p>
        <p className="text-muted-foreground break-words leading-relaxed">{coinData?.description}</p>
      </div>
    </div>
  );
};

export default TokenData;
