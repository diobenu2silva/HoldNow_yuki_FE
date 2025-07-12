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
      <td className="flex flex-row gap-2 items-center justify-center py-2">
        <div className="text-lg">{holder.name}</div>
      </td>
      <td className="text-center py-2">
        {holder.amount}
      </td>
      <td className="text-center py-2">
        <p
          onClick={() =>
            handleToRouter(
              `https://solscan.io/accounts/${holder.owner}?cluster=devnet`
            )
          }
          className="text-lg leading-10 hover:cursor-pointer hover:text-white"
        >
          <BsArrow90DegRight />
        </p>
      </td>
    </>
  );
};
