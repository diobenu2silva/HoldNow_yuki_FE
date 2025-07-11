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
import * as Tabs from '@radix-ui/react-tabs';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { userInfo } from '@/utils/types';

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
  const [tradeSortDir, setTradeSortDir] = useState<'asc' | 'desc'>('desc');
  const [holderSortDir, setHolderSortDir] = useState<'desc' | 'asc'>('desc');

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

  // Sort trades by lamportAmount (SOL)
  const sortedTrades = trades.record ? [...trades.record].sort((a, b) => {
    const aVal = a.lamportAmount;
    const bVal = b.lamportAmount;
    return tradeSortDir === 'asc' ? aVal - bVal : bVal - aVal;
  }) : [];

  // Sort holders by amount
  const sortedHolders = holders ? [...holders].sort((a, b) => {
    const aVal = a.amount;
    const bVal = b.amount;
    return holderSortDir === 'asc' ? aVal - bVal : bVal - aVal;
  }) : [];

  return (
    <Tabs.Root defaultValue="thread" className="w-full pt-8">
      <Tabs.List className="flex gap-2 bg-muted/30 rounded-full p-1 mb-4 w-fit mx-auto">
        <Tabs.Trigger
          value="thread"
          className="px-6 py-2 rounded-full text-base font-semibold transition-all duration-200
            data-[state=active]:bg-primary data-[state=active]:text-white
            data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
            shadow-none outline-none focus:ring-2 focus:ring-primary"
        >
          Thread
        </Tabs.Trigger>
        <Tabs.Trigger
          value="transaction"
          className="px-6 py-2 rounded-full text-base font-semibold transition-all duration-200
            data-[state=active]:bg-primary data-[state=active]:text-white
            data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
            shadow-none outline-none focus:ring-2 focus:ring-primary"
        >
          Transaction
        </Tabs.Trigger>
        <Tabs.Trigger
          value="top holders"
          className="px-6 py-2 rounded-full text-base font-semibold transition-all duration-200
            data-[state=active]:bg-primary data-[state=active]:text-white
            data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
            shadow-none outline-none focus:ring-2 focus:ring-primary"
        >
          Top Holders
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="thread">
        <div className="flex flex-col gap-4 px-2 py-4 max-w-2xl mx-auto">
          {messages &&
            messages.map((message, index) => (
              <div
                key={index}
                className="flex gap-3 items-start bg-white/10 rounded-xl shadow p-4"
              >
                <Avatar className="w-10 h-10 rounded-full">
                  <AvatarImage src={(message.sender as userInfo)?.avatar} alt="User" />
                  <AvatarFallback>
                    {(message.sender as userInfo)?.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {(message.sender as userInfo)?.name || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.time
                        ? formatDistanceToNow(new Date(message.time), { addSuffix: true })
                        : ""}
                    </span>
                  </div>
                  {message.img && (
                    <img
                      src={message.img}
                      alt="Attachment"
                      className="rounded-lg mt-2 max-w-xs max-h-40 object-cover border border-border"
                    />
                  )}
                  <div className="mt-2 text-white/90">{message.msg}</div>
                </div>
              </div>
            ))}
          <button
            onClick={() => setPostReplyModal(true)}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white font-bold shadow-lg hover:scale-105 transition-all text-lg"
          >
            <PlusCircledIcon className="w-5 h-5" />
            Post Reply
          </button>
          {postReplyModal && <ReplyModal data={coin} />}
        </div>
      </Tabs.Content>
      <Tabs.Content value="transaction">
        {/* Transaction content goes here */}
        <div className="w-full max-w-3xl mx-auto py-4">
          <div className="bg-white/10 rounded-xl shadow p-4">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-b-border">
                <tr className="text-base text-primary">
                  <th className="py-2 px-2">Account</th>
                  <th className="py-2 px-2">Type</th>
                  <th
                    className="py-2 px-2 flex flex-row gap-1 justify-center items-center cursor-pointer select-none"
                    onClick={() => setTradeSortDir(tradeSortDir === 'asc' ? 'desc' : 'asc')}
                  >
                    SOL
                    <span>{tradeSortDir === 'asc' ? '▲' : '▼'}</span>
                  </th>
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades &&
                  sortedTrades.map((trade, index) => (
                    <tr key={index} className="hover:bg-primary/10 transition-colors duration-150 rounded-lg">
                      <Trade trade={trade} />
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Tabs.Content>
      <Tabs.Content value="top holders">
        {/* Top holders content goes here */}
        <div className="w-full max-w-3xl mx-auto py-4">
          <div className="bg-white/10 rounded-xl shadow p-4">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-b-border">
                <tr className="text-base text-primary">
                  <th className="py-2 px-2">Account</th>
                  <th
                    className="py-2 px-2 flex flex-row gap-1 justify-center items-center cursor-pointer select-none"
                    onClick={() => setHolderSortDir(holderSortDir === 'asc' ? 'desc' : 'asc')}
                  >
                    Amount
                    <span>{holderSortDir === 'asc' ? '▲' : '▼'}</span>
                  </th>
                  <th className="py-2 px-2">solscan</th>
                </tr>
              </thead>
              <tbody>
                {sortedHolders &&
                  sortedHolders.map((holder, index) => (
                    <tr key={index} className="hover:bg-primary/10 transition-colors duration-150 rounded-lg">
                      <Holder holder={holder} />
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
};
