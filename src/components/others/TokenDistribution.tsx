"use client"
import { coinInfo, holderInfo } from "@/utils/types";
import { FC, useContext, useEffect, useState } from "react";
import { findHolders } from "@/utils/util";

interface ModalProps {
  data: coinInfo;
}

const TokenDistribution: FC<ModalProps> = ({ data }) => {
  const [holders, setHolders] = useState<holderInfo[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (data) {
        const holderData = await findHolders(data.token);
        setHolders(holderData ? holderData : []);
      }
    }
    fetchData();
  }, [data])

  return (
    <div className="flex flex-col justify-between pt-4 m-4">
      <button className="px-5 py-1.5 bg-custom-gradient rounded-full text-white font-semibold">Generate bubble map</button>
      <div className="w-full flex flex-row justify-between items-center text-sm pt-3">
        <p className="text-md text-white leading-10">Holder Distribution</p>
        <p className="text-md text-white leading-10">Percentage</p>
      </div>
      <div className="w-full h-full p-3 border-[#2b7ee2] border-[1px] rounded-lg min-h-[180px] flex flex-col gap-2">
        <div className="m-4">
          {holders && holders.map((item:any, index:number) => (
            <div key={index} className="w-full flex flex-row justify-between text-[12px] text-white">
              <div className="flex flex-row gap-1 items-center">
                <div className="">{index + 1}.</div>
                <img src={item.slice} alt="holderImg" className="w-5 h-5 rounded-full" />
                <div className="">{item.slice}</div>
              </div>
              <div className="flex flex-col">{Math.floor(item.amount*100000 / data.tokenSupply)/1000}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenDistribution;
