import { holderInfo, recordInfo } from "@/utils/types";
import { useRouter } from "next/navigation";
import React from "react";
import { BsArrow90DegRight } from "react-icons/bs";
interface HolderPropsInfo {
  holder: holderInfo;
}

export const Holder: React.FC<HolderPropsInfo> = ({ holder }) => {
  const router = useRouter()
  const handleToRouter = (id: string) => {
    router.push(id)
  }

  return (
    <tr className="w-full border-b-[1px] border-b-[#0F3159] text-white">
      <td className="flex flex-row gap-2 items-center justify-center py-2">
        <div className="text-lg">
          {holder.name}
        </div>
      </td>
      <td className="text-center py-2">{Math.ceil(holder.amount / Math.pow(10, 6))}</td>
      <td className="text-center py-2">
        <p onClick={() => handleToRouter(`https://solscan.io/tx/${holder.owner}?cluster=devnet`)} className="text-lg leading-10 hover:cursor-pointer hover:text-white">
          <BsArrow90DegRight />
        </p>
      </td>
    </tr>
  );
};
