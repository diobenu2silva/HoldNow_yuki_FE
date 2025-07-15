import { coinInfo, holderInfo, tradeInfo } from '@/utils/types';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Trade } from './Trade';
import { getHoldersWithUserInfo, getCoinTrade } from '@/utils/util';
import UserContext from '@/context/UserContext';
import { Holder } from './Holders';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { useSocket } from '@/contexts/SocketContext';
import { SwapDirection } from '@/utils/constants';
import { RefreshCw, ArrowUpDown } from 'lucide-react';

interface ChattingProps {
  param: string | null;
  coin: coinInfo;
}

type SortDirection = 'asc' | 'desc';
type TransactionSortField = 'account' | 'type' | 'sol' | 'date' | 'transaction' | 'tokens';
type HolderSortField = 'account' | 'amount' | 'address';

export const Chatting: React.FC<ChattingProps> = ({ param, coin }) => {
  const {
    coinId,
    postReplyModal,
    setPostReplyModal,
  } = useContext(UserContext);
  const [trades, setTrades] = useState<tradeInfo>({} as tradeInfo);
  const [holders, setHolders] = useState<holderInfo[]>([] as holderInfo[]);
  const [currentTable, setCurrentTable] = useState<string>('transaction');
  
  // Sort state for each table
  const [transactionSortField, setTransactionSortField] = useState<TransactionSortField>('date');
  const [transactionSortDir, setTransactionSortDir] = useState<SortDirection>('desc');
  
  const [holderSortField, setHolderSortField] = useState<HolderSortField>('amount');
  const [holderSortDir, setHolderSortDir] = useState<SortDirection>('desc');
  
  // Loading states for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setCurrentTable(value);
  };

  
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
  const getTransactionSortValue = (trade: any, field: string) => {
    switch (field) {
      case 'account':
        return trade.holder?.name || '';
      case 'type':
        return trade.swapDirection === SwapDirection.BUY ? 'BUY' : 
               trade.swapDirection === SwapDirection.CLAIM ? 'CLAIM' : 
               trade.swapDirection === SwapDirection.TOKEN_CREATE ? 'CREATE' : 
               trade.swapDirection === SwapDirection.AIRDROP ? 'AIRDROP' :
               trade.swapDirection === SwapDirection.SELL ? 'SELL' : '';
      case 'sol':
        return trade.lamportAmount || 0;
      case 'date':
        return trade.time ? new Date(trade.time) : null;
      case 'transaction':
        return trade.tx || '';
      case 'tokens':
        return trade.tokenAmount || 0;
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
      case 'address':
        return holder.owner || '';
      default:
        return '';
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    if (!param || isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (currentTable === 'transaction') {
        const tokenToUse = coin.token || param;
        const data = await getCoinTrade(tokenToUse);
        setTrades(data);
      } else if (currentTable === 'top holders') {
        if (coin.token) {
          const data = await getHoldersWithUserInfo(coin.token);
          setHolders(data);
        }
      }
    } catch (error) {
      // Error handling - could be enhanced with user notification if needed
    } finally {
      setIsRefreshing(false);
    }
  };

  // Effect to handle token changes and refresh data
  useEffect(() => {
    if (coin.token) {
      setIsRefreshing(true);
      
      const refreshDataForNewToken = async () => {
        try {
          // Reset data for new token
          setTrades({} as tradeInfo);
          setHolders([]);
          
          // Fetch fresh data based on current table
          if (currentTable === 'transaction') {
            const data = await getCoinTrade(coin.token);
            setTrades(data);
          } else if (currentTable === 'top holders') {
            const data = await getHoldersWithUserInfo(coin.token);
            setHolders(data);
          }
        } catch (error) {
          // Error handling - could be enhanced with user notification if needed
        } finally {
          setIsRefreshing(false);
        }
      };
      
      refreshDataForNewToken();
    }
  }, [coin.token]);

  useEffect(() => {
    const fetchData = async () => {
      if (param) {
        if (currentTable === 'transaction') {
          // Use coin.token if available, otherwise fall back to param
          const tokenToUse = coin.token || param;
          const data = await getCoinTrade(tokenToUse);
          setTrades(data);
        } else if (currentTable === 'top holders') {
          // Only fetch holders if coin.token is available
          if (coin.token) {
            const data = await getHoldersWithUserInfo(coin.token);
            setHolders(data);
          }
        }
      }
    };
    fetchData();
  }, [currentTable, param]);

  useEffect(() => {
    if (!onTransactionUpdate || !coin.token) return;
    const handleTransactionUpdate = async (payload) => {
      if (payload.token === coin.token) {
        const tradedata = await getCoinTrade(coin.token)
        setTrades(tradedata);
      }
    };
    onTransactionUpdate(handleTransactionUpdate);
    // No cleanup needed as context manages callbacks
  }, [onTransactionUpdate, coin.token]);

  useEffect(() => {
    if (!onHoldersUpdate || !coin.token) return;
    const handleHoldersUpdate = (payload) => {
      if (payload.token === coin.token) {
        setHolders(payload.holders);
      }
    };
    onHoldersUpdate(handleHoldersUpdate);
    // No cleanup needed as context manages callbacks
  }, [onHoldersUpdate, coin.token]);

  // Check if we should show loading state
  const isLoading = !coin.token;

  // Sort data using the generic sort function
  const sortedTrades = trades.record ? sortData(trades.record, transactionSortField, transactionSortDir, getTransactionSortValue) : [];
  const sortedHolders = holders ? sortData(holders, holderSortField, holderSortDir, getHolderSortValue) : [];

  // Filter out transactions with "txId", TOKEN_CREATE, and BUY with 0 SOL from display
  const filteredTrades = sortedTrades.filter(trade => 
    trade.tx !== 'txId' && 
    trade.swapDirection !== SwapDirection.TOKEN_CREATE &&
    !(trade.swapDirection === SwapDirection.BUY && trade.lamportAmount === 0)
  );

  return (
    <div className="w-full pt-8">
      <Tabs.Root defaultValue="transaction" value={currentTable} onValueChange={handleTabChange} className="w-full">
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
              Transactions
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
          <div className="flex-1 flex justify-end pr-4">
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
            </motion.button>
          </div>
        </div>

        <Tabs.Content value="transaction">
          <motion.div 
            className="w-full py-4"
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
                      onClick={() => handleTransactionSort('tokens')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Tokens
                        {transactionSortField === 'tokens' && (
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
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted-foreground">
                        Loading transaction data...
                      </td>
                    </tr>
                  ) : filteredTrades && filteredTrades.length > 0 ? (
                    filteredTrades.map((trade, index) => (
                      <tr key={index} className="hover:bg-primary/10 transition-colors duration-150 rounded-lg">
                        <Trade trade={trade} />
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted-foreground">
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
            className="w-full py-4"
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
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded w-3/10"
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
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded w-1/2"
                      onClick={() => handleHolderSort('address')}
                    >
                      <div className="flex items-center gap-2 group">
                        <ArrowUpDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        Address
                        {holderSortField === 'address' && (
                          <span className="text-primary">{holderSortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2 cursor-pointer select-none hover:text-white transition-all duration-200 hover:bg-white/5 rounded w-1/5"
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
