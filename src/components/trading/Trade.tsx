import { recordInfo } from '@/utils/types';
import { useRouter } from 'next/navigation';
import React from 'react';
import { SwapDirection } from '@/utils/constants';
import { motion } from 'framer-motion';

interface TradePropsInfo {
  trade: recordInfo;
}

export const Trade: React.FC<TradePropsInfo> = ({ trade }) => {
  const router = useRouter();
  
  const handleToRouter = (id: string) => {
    window.open(id, '_blank');
  };

  const handleAvatarClick = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  return (
    <>
      <td className="py-2">{trade.time.toString()}</td>
      <td className="flex flex-row gap-2 items-center py-2">
        <motion.img
          src={trade.holder.avatar}
          alt="User Avatar"
          className="rounded-full w-10 h-10 border-2 border-primary/30 cursor-pointer hover:scale-110 transition-transform duration-200"
          width={40}
          height={40}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAvatarClick(trade.holder._id || '')}
        />
        <div className="text-lg">{trade.holder.name}</div>
      </td>
        <td className="py-2">
          {trade.swapDirection === SwapDirection.BUY ? 'BUY' : 
          trade.swapDirection === SwapDirection.SELL ? 'SELL' : 
           trade.swapDirection === SwapDirection.CLAIM ? 'CLAIM' : 
           trade.swapDirection === SwapDirection.TOKEN_CREATE ? 'CREATE' : 
           trade.swapDirection === SwapDirection.AIRDROP ? 'AIRDROP' : ''}
        </td>
      <td className="py-2">
        {Math.round(trade.lamportAmount / Math.pow(10, 6)) / 1000}
      </td>
      <td className="py-2">
        {trade.tokenAmount ? trade.tokenAmount.toLocaleString() : '0'}
      </td>
      <td className="py-2">
        <p
          onClick={() =>
            handleToRouter(`https://solscan.io/tx/${trade.tx}?cluster=devnet`)
          }
          className="text-lg leading-10 hover:cursor-pointer hover:text-white"
        >
          {trade.tx.slice(0, 4)}...{trade.tx.slice(-3)}
        </p>
      </td>
    </>
  );
};
