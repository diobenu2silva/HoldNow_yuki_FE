import { recordInfo } from "@/utils/types";
import { useRouter } from "next/navigation";
import React from "react";
interface TradePropsInfo {
  trade: recordInfo;
}

export const Trade: React.FC<TradePropsInfo> = ({ trade }) => {
  const router = useRouter()

  const handleToRouter = (id: string) => {
    router.push(id)
  }

  return (
    <tr className="w-full border-b-[1px] border-b-[#0F3159] text-white">
      <td className="flex flex-row gap-2 items-center justify-center py-2">
        <img
          src={trade.holder.avatar}
          alt="Token IMG"
          className="rounded-full"
          width={40}
          height={40}
        />
        <div className="text-lg">
          {trade.holder.name}
        </div>
      </td>
      <td className="text-center py-2">{trade.holdingStatus == 2 ? "BUY" : "SELL"}</td>
      <td className="text-center py-2">{trade.amount}</td>
      <td className="text-center py-2">{trade.time.toString()}</td>
      <td className="text-center py-2">
        <p onClick={() => handleToRouter(`https://solscan.io/tx/${trade.tx}`)} className="text-lg leading-10 hover:cursor-pointer hover:text-white">
          {trade.tx.slice(0, 4)}...{trade.tx.slice(-3)}
        </p>
      </td>
    </tr>
  );
};
