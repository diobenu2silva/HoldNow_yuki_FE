import { coinInfo, holderInfo, tradeInfo } from "@/utils/types";
import { MessageForm } from "../MessageForm";
import { ChangeEvent, useContext, useEffect, useMemo, useState } from "react";
import { Trade } from "./Trade";
import { findHolders, getCoinTrade, getMessageByCoin } from "@/utils/util";
import UserContext from "@/context/UserContext";
import ReplyModal from "../modals/ReplyModal";
import { BiSort } from "react-icons/bi";
import { Holder } from "./Holders";

interface ChattingProps {
  param: string | null;
  coin: coinInfo
}

export const Chatting: React.FC<ChattingProps> = ({ param, coin }) => {
  const { messages, setMessages, newMsg, coinId, postReplyModal, setPostReplyModal } = useContext(UserContext);
  const [trades, setTrades] = useState<tradeInfo>({} as tradeInfo);
  const [holders, setHolders] = useState<holderInfo[]>([] as holderInfo[]);
  const [currentTable, setCurrentTable] = useState<string>("thread");
  const tempNewMsg = useMemo(() => newMsg, [newMsg]);

  useEffect(() => {
    const fetchData = async () => {
      if (param) {
        console.log(currentTable)
        if (currentTable === "thread") {
          const data = await getMessageByCoin(param);
          setMessages(data);
        } else if (currentTable === "transaction") {
          const data = await getCoinTrade(param);
          setTrades(data)
        } else {
          const data = await findHolders(coin.token);
          setHolders(data);
        }
      }
    }
    fetchData();
  }, [currentTable, param])
  console.log("trade-->", trades)
  useEffect(() => {
    if (coinId == coin._id) {
      setMessages([...messages, tempNewMsg])
    }
  }, [tempNewMsg])

  return (
    <div className="pt-8">
      <div className="flex flex-row items-center text-white font-semibold">
        <div
          onClick={() => setCurrentTable("thread")}
          className={`border-b-[2px] px-4 py-1 text-base cursor-pointer ${currentTable === "thread" ? "border-b-[#2C8DFE]" : "border-b-[#143F72]"
            }`}
        >
          Thread
        </div>
        <div
          onClick={() => setCurrentTable("transaction")}
          className={`border-b-[2px] px-4 py-1 text-base cursor-pointer ${currentTable === "transaction" ? "border-b-[#2C8DFE]" : "border-b-[#143F72]"
            }`}
        >
          Transaction
        </div>
        <div
          onClick={() => setCurrentTable("top holders")}
          className={`border-b-[2px] px-4 py-1 text-base cursor-pointer ${currentTable === "top holders" ? "border-b-[#2C8DFE]" : "border-b-[#143F72]"
            }`}
        >
          Top Holders
        </div>
      </div>
      <div>
        <div>
          {currentTable == "thread" && (coin &&
            <div>
              {messages && messages.map((message, index) => (
                <MessageForm key={index} msg={message} ></MessageForm>
              ))}
              <div onClick={() => setPostReplyModal(true)} className="w-[200px] flex flex-col justify-center text-center font-semibold bg-custom-gradient rounded-full px-8 py-2 text-xl cursor-pointer text-white mx-auto">Post Reply</div>
            </div>
          )}
        </div>
        <div>
          {currentTable == "transaction" && (
            <div className="w-full h-full py-4">
              <table className="w-full h-full">
                <thead className="w-full border-b-[1px] border-b-[#0F3159] text-white">
                  <tr className="text-lg">
                    <th className="py-2 text-gradient">Account</th>
                    <th className="py-2 text-gradient">Type</th>
                    <th className="py-2 flex flex-row gap-1 justify-center items-center cursor-pointer text-gradient">
                      SOL
                      <BiSort style={{ color: "#0047CA" }} />
                    </th>
                    <th className="py-2 text-gradient">Date</th>
                    <th className="py-2 text-gradient">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.record && trades.record.map((trade, index) => (
                    <Trade key={index} trade={trade}></Trade>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          {
            currentTable == "top holders" && (
              <div className="w-full h-full py-4">
                <table className="w-full h-full">
                  <thead className="w-full border-b-[1px] border-b-[#0F3159] text-white">
                    <tr className="text-lg">
                      <th className="py-2 text-gradient">Account</th>
                      <th className="py-2 flex flex-row gap-1 justify-center items-center cursor-pointer text-gradient">
                        Amount
                        <BiSort style={{ color: "#0047CA" }} />
                      </th>
                      <th className="py-2 text-gradient">solscan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holders && holders.map((holder, index) => (
                      <Holder holder={holder}></Holder>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
        <div>
          {postReplyModal &&
            <ReplyModal data={coin} />
          }
        </div>
      </div>
    </div>
  );
};
