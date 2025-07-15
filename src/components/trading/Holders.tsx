import { holderInfo } from '@/utils/types';
import { useRouter } from 'next/navigation';
import React from 'react';
import { BsArrow90DegRight } from 'react-icons/bs';
interface HolderPropsInfo {
  holder: holderInfo;
}

export const Holder: React.FC<HolderPropsInfo> = ({ holder }) => {
  const router = useRouter();
  const handleToRouter = (id: string) => {
    window.open(id, '_blank');
  };

  return (
    <>
      <td className="flex flex-row gap-2 items-center py-2 w-3/10">
        <img
          src={holder.avatar || '/assets/images/user-avatar.png'}
          alt="User Avatar"
          className="rounded-full w-10 h-10 border-2 border-primary/30"
          width={40}
          height={40}
        />
        <div className="text-lg">
          {holder.name}
        </div>
      </td>
      <td className="py-2 w-1/2">
        <div 
          className="text-sm hover:cursor-pointer hover:text-white transition-colors duration-200"
          onClick={() =>
            handleToRouter(
              `https://solscan.io/accounts/${holder.owner}?cluster=devnet`
            )
          }
        >
          {holder.owner.slice(0, 4)}...{holder.owner.slice(-4)}
        </div>
      </td>
      <td className="py-2 w-1/5">
        {holder.amount}
      </td>
    </>
  );
};
