import { coinInfo, holderInfo, tradeInfo } from '@/utils/types';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Trade } from './Trade';
import { findHolders, getCoinTrade, getMessageByCoin } from '@/utils/util';
import UserContext from '@/context/UserContext';
import { Holder } from './Holders';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { userInfo } from '@/utils/types';
import { useSocket } from '@/contexts/SocketContext';
import { SwapDirection } from '@/utils/constants';
import { RefreshCw, ArrowUpDown, Send } from 'lucide-react';

interface ChattingProps {
  param: string | null;
  coin: coinInfo;
}

// Sort direction type
type SortDirection = 'asc' | 'desc';

// Sort field types for each table
type ThreadSortField = 'sender' | 'time' | 'message';
type TransactionSortField = 'account' | 'type' | 'sol' | 'date' | 'transaction';
type HolderSortField = 'account' | 'amount';

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
  
  // Sort state for each table
  const [threadSortField, setThreadSortField] = useState<ThreadSortField>('time');
  const [threadSortDir, setThreadSortDir] = useState<SortDirection>('desc');
  
  const [transactionSortField, setTransactionSortField] = useState<TransactionSortField>('date');
  const [transactionSortDir, setTransactionSortDir] = useState<SortDirection>('desc');
  
  const [holderSortField, setHolderSortField] = useState<HolderSortField>('amount');
  const [holderSortDir, setHolderSortDir] = useState<SortDirection>('desc');
  
  // Loading states for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  

  
  const { onTransactionUpdate, onHoldersUpdate } = useSocket();

  // Generic sort function
  const sortData = <T,>(data: T[], field: string, direction: SortDirection, getValue: (item: T, field: string) => any): T[] => {
    return [...data].sort((a, b) => {
      const aVal = getValue(a, field);
      const bVal = getValue(b, field);
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? -1 : 1;
      if (bVal == null) return direction === 'asc' ? 1 : -1;
      
      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return direction === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return direction === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
      }
      
      // Convert to string for comparison
      const aStr = String(aVal);
      const bStr = String(bVal);
      const comparison = aStr.toLowerCase().localeCompare(bStr.toLowerCase());
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  // Sort handlers
  const handleThreadSort = (field: ThreadSortField) => {
    if (threadSortField === field) {
      setThreadSortDir(threadSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setThreadSortField(field);
      setThreadSortDir('asc');
    }
  };

  const handleTransactionSort = (field: TransactionSortField) => {
    if (transactionSortField === field) {
      setTransactionSortDir(transactionSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setTransactionSortField(field);
      setTransactionSortDir('asc');
    }
  };

  const handleHolderSort = (field: HolderSortField) => {
    if (holderSortField === field) {
      setHolderSortDir(holderSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setHolderSortField(field);
      setHolderSortDir('asc');
    }
  };

  // Get sort value functions
  const getThreadSortValue = (message: any, field: string) => {
    switch (field) {
      case 'sender':
        return (message.sender as userInfo)?.name || '';
      case 'time':
        return message.time ? new Date(message.time) : null;
      case 'message':
        return message.msg || '';
      default:
        return '';
    }
  };

  const getTransactionSortValue = (trade: any, field: string) => {
    switch (field) {
      case 'account':
        return trade.holder?.name || '';
      case 'type':
        return trade.lamportAmount === 0 ? 'Create' : 
               trade.swapDirection === SwapDirection.BUY ? 'BUY' : 
               trade.swapDirection === SwapDirection.CLAIM ? 'CLAIM' : 
               trade.swapDirection === SwapDirection.TOKEN_CREATE ? 'CREATE' : 
               trade.swapDirection === SwapDirection.AIRDROP ? 'AIRDROP' : 'SELL';
      case 'sol':
        return trade.lamportAmount;
      case 'date':
        return trade.time ? new Date(trade.time) : null;
      case 'transaction':
        return trade.tx || '';
      default:
        return '';
    }
  };

  const getHolderSortValue = (holder: any, field: string) => {
    switch (field) {
      case 'account':
        return holder.name || '';
      case 'amount':
        return holder.amount;
      default:
        return '';
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    if (!param || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (currentTable === 'thread') {
        const data = await getMessageByCoin(param);
        setMessages(data);
      } else if (currentTable === 'transaction') {
        const tokenToUse = coin.token || param;
        const data = await getCoinTrade(tokenToUse);
        setTrades(data);
      } else if (currentTable === 'top holders') {
        if (coin.token) {
          const data = await findHolders(coin.token);
          setHolders(data);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };



  useEffect(() => {
    const fetchData = async () => {
      if (param) {
        if (currentTable === 'thread') {
          const data = await getMessageByCoin(param);
          setMessages(data);
        } else if (currentTable === 'transaction') {
          // Use coin.token if available, otherwise fall back to param
          const tokenToUse = coin.token || param;
          const data = await getCoinTrade(tokenToUse);
          setTrades(data);
        } else {
          // Only fetch holders if coin.token is available
          if (coin.token) {
            const data = await findHolders(coin.token);
            setHolders(data);
          }
        }
      }
    };
    fetchData();
  }, [currentTable, param, coin.token]);
  useEffect(() => {
    if (coinId == coin._id) {
      setMessages([...messages, tempNewMsg]);
    }
  }, [tempNewMsg]);

  useEffect(() => {
    if (!onTransactionUpdate || !coin.token) return;
    const handleTransactionUpdate = async (payload) => {
      console.log('__yuki__ Transaction update received 000:', payload);
      if (payload.token === coin.token) {
        console.log('__yuki__ Transaction update received:', payload);
        const tradedata = await getCoinTrade(coin.token)
        console.log('__yuki__ Transaction update received 111:', tradedata);
        setTrades(tradedata);
      }
    };
    onTransactionUpdate(handleTransactionUpdate);
    // No cleanup needed as context manages callbacks
  }, [onTransactionUpdate, coin.token]);

  useEffect(() => {
    if (!onHoldersUpdate || !coin.token) return;
    const handleHoldersUpdate = (payload) => {
      console.log('__yuki__ Holders update received 000:', payload);
      if (payload.token === coin.token) {
        console.log('__yuki__ Holders update received:', payload);
        setHolders(payload.holders);
      }
    };
    onHoldersUpdate(handleHoldersUpdate);
    // No cleanup needed as context manages callbacks
  }, [onHoldersUpdate, coin.token]);

  // Check if we should show loading state
  const isLoading = !coin.token;

  // Sort data using the generic sort function
  const sortedMessages = messages ? sortData(messages, threadSortField, threadSortDir, getThreadSortValue) : [];
  const sortedTrades = trades.record ? sortData(trades.record, transactionSortField, transactionSortDir, getTransactionSortValue) : [];
  const sortedHolders = holders ? sortData(holders, holderSortField, holderSortDir, getHolderSortValue) : [];

  return (
    <div className="w-full pt-8">
      <Tabs.Root defaultValue="transaction" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1"></div>
          <Tabs.List className="flex gap-2 bg-muted/30 rounded-full p-1 w-fit">
            <Tabs.Trigger
              value="transaction"
              className="px-6 py-2 rounded-full text-base font-semibold transition-all duration-300 ease-in-out
                data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg
                data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
                shadow-none outline-none focus:ring-2 focus:ring-primary hover:scale-105"
            >
              Transaction
            </Tabs.Trigger>
            <Tabs.Trigger
              value="top holders"
              className="px-6 py-2 rounded-full text-base font-semibold transition-all duration-300 ease-in-out
                data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg
                data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
                shadow-none outline-none focus:ring-2 focus:ring-primary hover:scale-105"
            >
              Top Holders
            </Tabs.Trigger>
          </Tabs.List>
          <div className="flex-1 flex justify-end">
            {/* Refresh Button */}
            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary font-medium 
                hover:bg-primary/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                border border-primary/30 hover:border-primary/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw 
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
              Refresh
            </motion.button>
          </div>
        </div>

        <Tabs.Content value="transaction">
          <motion.div 
            className="w-full max-w-3xl mx-auto py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-white/10 rounded-xl shadow p-4">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-b-border">
                  <tr className="text-base text-primary">
                    <th 
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleTransactionSort('account')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Account
                        {transactionSortField === 'account' && (
                          <span className="text-primary">{transactionSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleTransactionSort('type')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Type
                        {transactionSortField === 'type' && (
                          <span className="text-primary">{transactionSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleTransactionSort('sol')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        SOL
                        {transactionSortField === 'sol' && (
                          <span className="text-primary">{transactionSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleTransactionSort('date')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Date
                        {transactionSortField === 'date' && (
                          <span className="text-primary">{transactionSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleTransactionSort('transaction')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Transaction
                        {transactionSortField === 'transaction' && (
                          <span className="text-primary">{transactionSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => { console.log('__yuki__ sortedTrades', sortedTrades); return null; })()}
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted-foreground">
                        Loading transaction data...
                      </td>
                    </tr>
                  ) : sortedTrades && sortedTrades.length > 0 ? (
                    sortedTrades.map((trade, index) => (
                      <tr key={index} className="hover:bg-primary/10 transition-colors duration-150 rounded-lg">
                        <Trade trade={trade} />
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted-foreground">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </Tabs.Content>
        <Tabs.Content value="top holders">
          <motion.div 
            className="w-full max-w-3xl mx-auto py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-white/10 rounded-xl shadow p-4">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-b-border">
                  <tr className="text-base text-primary">
                    <th 
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleHolderSort('account')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Account
                        {holderSortField === 'account' && (
                          <span className="text-primary">{holderSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded"
                      onClick={() => handleHolderSort('amount')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Amount
                        {holderSortField === 'amount' && (
                          <span className="text-primary">{holderSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-2 px-2">solscan</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted-foreground">
                        Loading holders data...
                      </td>
                    </tr>
                  ) : sortedHolders && sortedHolders.length > 0 ? (
                    sortedHolders.map((holder, index) => (
                      <tr key={index} className="hover:bg-primary/10 transition-colors duration-150 rounded-lg">
                        <Holder holder={holder} />
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-4 text-muted-foreground">
                        No holders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};
