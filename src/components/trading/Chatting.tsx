import { coinInfo, holderInfo, tradeInfo } from '@/utils/types';
import { MessageForm } from '../MessageForm';
import { ChangeEvent, useContext, useEffect, useMemo, useState } from 'react';
import { Trade } from './Trade';
import { findHolders, getCoinTrade, getMessageByCoin } from '@/utils/util';
import UserContext from '@/context/UserContext';
import ReplyModal from '../modals/ReplyModal';
import { BiSort } from 'react-icons/bi';
import { Holder } from './Holders';
import { motion } from 'framer-motion';

interface ChattingProps {
  param: string | null;
  coin: coinInfo;
}

export const Chatting: React.FC<ChattingProps> = ({ param, coin }) => {
  const {
    messages,
    setMessages,
    newMsg,
    coinId,
    postReplyModal,
    setPostReplyModal,
  } = useContext(UserContext);
  const [trades, setTrades] = useState<tradeInfo>({} as tradeInfo);
  const [holders, setHolders] = useState<holderInfo[]>([] as holderInfo[]);
  const [currentTable, setCurrentTable] = useState<string>('thread');
  const tempNewMsg = useMemo(() => newMsg, [newMsg]);

  useEffect(() => {
    const fetchData = async () => {
      if (param) {
        if (currentTable === 'thread') {
          const data = await getMessageByCoin(param);
          setMessages(data);
        } else if (currentTable === 'transaction') {
          const data = await getCoinTrade(param);
          setTrades(data);
        } else {
          const data = await findHolders(coin.token);
          setHolders(data);
        }
      }
    };
    fetchData();
  }, [currentTable, param]);
  useEffect(() => {
    if (coinId == coin._id) {
      setMessages([...messages, tempNewMsg]);
    }
  }, [tempNewMsg]);

  return (
    <div className="pt-8">
      <div className="flex flex-row items-center font-semibold">
        <div
          onClick={() => setCurrentTable('thread')}
          className={`border-b-[2px] px-4 py-1 text-base cursor-pointer transition-colors duration-200 ${
            currentTable === 'thread'
              ? 'border-b-primary text-primary'
              : 'border-b-muted-foreground text-muted-foreground'
          }`}
        >
          Thread
        </div>
        <div
          onClick={() => setCurrentTable('transaction')}
          className={`border-b-[2px] px-4 py-1 text-base cursor-pointer transition-colors duration-200 ${
            currentTable === 'transaction'
              ? 'border-b-primary text-primary'
              : 'border-b-muted-foreground text-muted-foreground'
          }`}
        >
          Transaction
        </div>
        <div
          onClick={() => setCurrentTable('top holders')}
          className={`border-b-[2px] px-4 py-1 text-base cursor-pointer transition-colors duration-200 ${
            currentTable === 'top holders'
              ? 'border-b-primary text-primary'
              : 'border-b-muted-foreground text-muted-foreground'
          }`}
        >
          Top Holders
        </div>
      </div>
      <div>
        <div>
          {currentTable == 'thread' && coin && (
            <div>
              {messages &&
                messages.map((message, index) => (
                  <MessageForm key={index} msg={message}></MessageForm>
                ))}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPostReplyModal(true)}
                className="w-[200px] flex flex-col justify-center text-center font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-2 text-xl cursor-pointer mx-auto mt-4 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Post Reply
              </motion.div>
            </div>
          )}
        </div>
        <div>
          {currentTable == 'transaction' && (
            <div className="w-full h-full py-4">
              <table className="w-full h-full">
                <thead className="w-full border-b-2 border-b-border">
                  <tr className="text-lg">
                    <th className="py-2 text-primary">Account</th>
                    <th className="py-2 text-primary">Type</th>
                    <th className="py-2 flex flex-row gap-1 justify-center items-center cursor-pointer text-primary">
                      SOL
                      <BiSort className="text-primary" />
                    </th>
                    <th className="py-2 text-primary">Date</th>
                    <th className="py-2 text-primary">Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.record &&
                    trades.record.map((trade, index) => (
                      <Trade key={index} trade={trade}></Trade>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          {currentTable == 'top holders' && (
            <div className="w-full h-full py-4">
              <table className="w-full h-full">
                <thead className="w-full border-b-2 border-b-border">
                  <tr className="text-lg">
                    <th className="py-2 text-primary">Account</th>
                    <th className="py-2 flex flex-row gap-1 justify-center items-center cursor-pointer text-primary">
                      Amount
                      <BiSort className="text-primary" />
                    </th>
                    <th className="py-2 text-primary">solscan</th>
                  </tr>
                </thead>
                <tbody>
                  {holders &&
                    holders.map((holder, index) => (
                      <Holder key={index} holder={holder}></Holder>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>{postReplyModal && <ReplyModal data={coin} />}</div>
      </div>
    </div>
  );
};
