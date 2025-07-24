import { coinInfo, holderInfo, tradeInfo, msgInfo } from '@/utils/types';
import { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Trade } from './Trade';
import { getHoldersWithUserInfo, getCoinTrade, getMessageByCoin, addMessageFavorite, removeMessageFavorite } from '@/utils/util';
import UserContext from '@/context/UserContext';
import { Holder } from './Holders';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { useSocket } from '@/contexts/SocketContext';
import { SwapDirection } from '@/utils/constants';
import { RefreshCw, ArrowUpDown, ThumbsUp, ThumbsDown, Heart, MessageCircle, Reply } from 'lucide-react';
import ReplyModal from '@/components/modals/ReplyModal';

interface ChattingProps {
  param: string | null;
  coin: coinInfo;
}

type SortDirection = 'asc' | 'desc';
type TransactionSortField = 'account' | 'type' | 'sol' | 'date' | 'transaction' | 'tokens';
type HolderSortField = 'account' | 'amount' | 'address';
type ChatSortField = 'date' | 'account' | 'message';

export const Chatting: React.FC<ChattingProps> = ({ param, coin }) => {
  const {
    user,
    coinId,
    postReplyModal,
    setPostReplyModal,
    messages,
    newMsg,
    setMessages,
  } = useContext(UserContext);
  const [trades, setTrades] = useState<tradeInfo>({} as tradeInfo);
  const [holders, setHolders] = useState<holderInfo[]>([] as holderInfo[]);
  const [currentTable, setCurrentTable] = useState<string>('chat');
  
  // Sort state for each table
  const [transactionSortField, setTransactionSortField] = useState<TransactionSortField>('date');
  const [transactionSortDir, setTransactionSortDir] = useState<SortDirection>('desc');
  
  const [holderSortField, setHolderSortField] = useState<HolderSortField>('amount');
  const [holderSortDir, setHolderSortDir] = useState<SortDirection>('desc');
  
  const [chatSortField, setChatSortField] = useState<ChatSortField>('date');
  const [chatSortDir, setChatSortDir] = useState<SortDirection>('desc');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  
  // Loading states for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Handler for tab changes
  const handleTabChange = (value: string) => {
    setCurrentTable(value);
  };

  
  const { onTransactionUpdate, onHoldersUpdate } = useSocket();

  // Helper function to check if user has favorited a message
  const hasUserFavorited = (message: any, type: 'thumbUp' | 'thumbDown' | 'heart') => {
    if (!user || !message.favorites) return false;
    return message.favorites.some((fav: any) => 
      fav.userId === user._id && fav.type === type
    );
  };

  // Helper function to handle favorite toggle
  const handleFavoriteToggle = async (message: any, type: 'thumbUp' | 'thumbDown' | 'heart') => {
    try {
      const hasFavorited = hasUserFavorited(message, type);
      
      if (hasFavorited) {
        // Remove favorite
        console.log(`__yuki__ Removing ${type} from message:`, message._id, 'by user:', user._id);
        const result = await removeMessageFavorite(message._id, type, user._id);
        console.log(`__yuki__ Remove ${type} result:`, result);
        
        if (!result.error) {
          // Update the message in the local state
          const updatedMessages = messages.map(msg => 
            msg._id === message._id ? { 
              ...msg, 
              [type]: Math.max(0, (msg[type] || 0) - 1),
              favorites: msg.favorites.filter((fav: any) => !(fav.userId === user._id && fav.type === type))
            } : msg
          );
          setMessages(updatedMessages);
        } else {
          console.error(`__yuki__ Remove ${type} error:`, result.error);
        }
      } else {
        // Add favorite
        console.log(`__yuki__ Adding ${type} to message:`, message._id, 'by user:', user._id);
        const result = await addMessageFavorite(message._id, type, user._id);
        console.log(`__yuki__ Add ${type} result:`, result);
        
        if (!result.error) {
          // Update the message in the local state
          const updatedMessages = messages.map(msg => 
            msg._id === message._id ? { 
              ...msg, 
              [type]: (msg[type] || 0) + 1,
              favorites: [...(msg.favorites || []), { userId: user._id, type }]
            } : msg
          );
          setMessages(updatedMessages);
        } else {
          console.error(`__yuki__ Add ${type} error:`, result.error);
        }
      }
    } catch (error) {
      console.error(`Error toggling ${type}:`, error);
    }
  };

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

  const handleChatSort = (field: ChatSortField) => {
    if (chatSortField === field) {
      setChatSortDir(chatSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setChatSortField(field);
      setChatSortDir('asc');
    }
  };

  const handleReplyClick = (message: any) => {
    setReplyingTo(message);
    setPostReplyModal(true);
  };

  const handleModalClose = () => {
    setReplyingTo(null);
    setPostReplyModal(false);
  };

  const scrollToMessage = (targetMessage: any) => {
    // Find the message element and scroll to it
    const messageElement = document.querySelector(`[data-message-id="${targetMessage._id}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.classList.add('ring-2', 'ring-primary', 'ring-opacity-50');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary', 'ring-opacity-50');
      }, 2000);
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

  const getChatSortValue = (message: any, field: string) => {
    switch (field) {
      case 'account':
        return message.sender?.name || '';
      case 'date':
        return message.time ? new Date(message.time) : null;
      case 'message':
        return message.msg || '';
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
      } else if (currentTable === 'chat') {
        if (coin.token) {
          const data = await getMessageByCoin(coin.token);
          setMessages(data);
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
          } else if (currentTable === 'chat') {
            const data = await getMessageByCoin(coin._id);
            setMessages(data);
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

  // Effect to fetch messages when chat tab is active
  useEffect(() => {
    if (currentTable === 'chat' && coin._id) {
      const fetchMessages = async () => {
        try {
          console.log('Fetching messages for coin ID:', coin._id);
          const data = await getMessageByCoin(coin._id);
          console.log('Fetched messages:', data);
          // Debug: Log message structure to see what fields are available
          if (data && data.length > 0) {
            console.log('First message structure:', {
              id: data[0]._id,
              hasImages: !!data[0].images,
              imagesLength: data[0].images?.length,
              hasImg: !!data[0].img,
              imgValue: data[0].img,
              imagesValue: data[0].images
            });
            
            // Log all messages with images
            data.forEach((msg, index) => {
              if (msg.img || (msg.images && msg.images.length > 0)) {
                console.log(`Message ${index} has images:`, {
                  id: msg._id,
                  img: msg.img,
                  images: msg.images,
                  msg: msg.msg?.substring(0, 50) + '...'
                });
              }
            });
          }
          setMessages(data);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };
      
      fetchMessages();
    }
  }, [currentTable, coin._id]);

  // Listen for real-time message updates from socket
  useEffect(() => {
    if (newMsg && newMsg.coinId === coin._id) {
      console.log('__yuki__ Chatting: New message received via socket:', newMsg);
      // Debug: Log message structure to see what fields are available
      console.log('__yuki__ Chatting: Message structure:', {
        id: newMsg._id,
        hasImages: !!newMsg.images,
        imagesLength: newMsg.images?.length,
        hasImg: !!newMsg.img,
        imgValue: newMsg.img,
        imagesValue: newMsg.images
      });
      
      // Add the new message to the existing messages
      if (!messages) {
        setMessages([newMsg]);
      } else {
        // Check if message already exists to prevent duplicates
        // Compare by message content, sender, and time (within 5 seconds to account for slight timing differences)
        const messageExists = messages.some(msg => {
          const msgTime = msg.time instanceof Date ? msg.time : new Date(msg.time || 0);
          const newMsgTime = newMsg.time instanceof Date ? newMsg.time : new Date(newMsg.time || 0);
          const timeDiff = Math.abs(msgTime.getTime() - newMsgTime.getTime());
          return msg.msg === newMsg.msg && 
                 timeDiff < 5000 && // Within 5 seconds
                 (msg.sender as any)?._id === (newMsg.sender as any)?._id;
        });
        if (!messageExists) {
          setMessages([...messages, newMsg]);
        }
      }
    }
  }, [newMsg, coin._id, messages, setMessages]);

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
        } else if (currentTable === 'chat') {
          // Only fetch messages if coin._id is available
          if (coin._id) {
            const data = await getMessageByCoin(coin._id);
            setMessages(data);
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

  // Sort messages for chat
  const sortedMessages = useMemo(() => {
    console.log('Computing sorted messages. Messages:', messages);
    if (!messages || !Array.isArray(messages)) {
      console.log('No messages or not array, returning empty array');
      return [];
    }
    const sorted = sortData(messages, chatSortField, chatSortDir, getChatSortValue);
    console.log('Sorted messages:', sorted);
    return sorted;
  }, [messages, chatSortField, chatSortDir]);

  return (
    <div className="w-full pt-8">
      <Tabs.Root defaultValue="chat" value={currentTable} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1"></div>
          <Tabs.List className="flex gap-2 bg-muted/30 rounded-full p-1 w-fit">
            <Tabs.Trigger
              value="chat"
              className="px-6 py-2 rounded-full text-base font-semibold transition-all duration-300 ease-in-out
                data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg
                data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground
                shadow-none outline-none focus:ring-2 focus:ring-primary hover:scale-105"
            >
              Chat
            </Tabs.Trigger>
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

        <Tabs.Content value="chat">
          <motion.div 
            className="w-full py-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-white/10 rounded-xl shadow p-4">
              {/* Chat Header with Sort */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleChatSort('date')}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span className="text-sm font-medium">Sort by Time</span>
                    {chatSortField === 'date' && (
                      <span className="text-primary">{chatSortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setPostReplyModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                >
                  Post Reply
                </button>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4 max-h-[800px] overflow-y-auto">
                {sortedMessages && sortedMessages.length > 0 ? (
                  sortedMessages.map((message: any, index: number) => (
                    <div key={index} data-message-id={message._id} className="bg-card/50 rounded-lg p-4 border border-border/50 h-full min-h-[120px]">
                      {/* Reply to Message (if exists) */}
                      {message.replyTo && (
                        <div 
                          className="mb-3 p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => scrollToMessage(message.replyTo)}
                        >
                          <div className="text-xs text-muted-foreground">Replying to:</div>
                          <div className="text-sm text-foreground truncate">
                            {message.replyTo.msg || 'Original message'}
                          </div>
                        </div>
                      )}

                      {/* Message Content Row */}
                      <div className="flex gap-4 h-full min-h-[120px]">
                        {/* Main Content (75% width) */}
                        <div className="flex-1">
                          {/* Message Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {/* User Avatar */}
                              <motion.img
                                src={message.sender?.avatar || '/assets/images/user-avatar.png'}
                                alt={`${message.sender?.name || 'User'} avatar`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-primary/30 cursor-pointer hover:scale-110 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/assets/images/user-avatar.png';
                                }}
                                onClick={() => {
                                  if (message.sender?._id) {
                                    window.location.href = `/profile/${message.sender._id}`;
                                  }
                                }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                              />
                              
                              {/* User Info */}
                              <div>
                                <div className="font-semibold text-foreground">
                                  {message.sender?.name || 'Unknown User'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(message.time).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            
                            {/* Reply Button - Fashionable Styling */}
                            <button
                              onClick={() => handleReplyClick(message)}
                              className="group relative p-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-primary/25 backdrop-blur-sm"
                              title="Reply to this message"
                            >
                              <Reply className="w-4 h-4 text-primary group-hover:text-primary/80 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                              {/* Glow effect */}
                              <div className="absolute inset-0 rounded-full bg-primary/0 group-hover:bg-primary/5 transition-all duration-300 blur-sm"></div>
                            </button>
                          </div>

                          {/* Message Text */}
                          <div className="mb-3">
                            <p className="text-foreground">{message.msg}</p>
                          </div>
                        </div>

                        {/* Images Section - 25% width, table height */}
                        {((message.images && message.images.length > 0) || message.img) && (
                          <div className="w-[25%] h-full flex flex-col gap-2">
                            {/* Handle new images array */}
                            {message.images && message.images.length > 0 && 
                              message.images.map((img: string, imgIndex: number) => (
                                <img
                                  key={imgIndex}
                                  src={img}
                                  alt="Message image"
                                  className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setSelectedImage(img)}
                                />
                              ))
                            }
                            {/* Handle old single img field */}
                            {message.img && !message.images && (
                              <img
                                src={message.img}
                                alt="Message image"
                                className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedImage(message.img)}
                              />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Actions - Moved to bottom */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-4 text-sm">
                          {/* Show favorite buttons for all users to interact with */}
                          {user && (
                            <>
                              <button 
                                className={`flex items-center gap-1 transition-colors ${
                                  hasUserFavorited(message, 'thumbUp') 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground hover:text-primary'
                                }`}
                                onClick={async () => {
                                  await handleFavoriteToggle(message, 'thumbUp');
                                }}
                              >
                                <ThumbsUp className="w-4 h-4" />
                                <span>{message.thumbUp || 0}</span>
                              </button>
                              <button 
                                className={`flex items-center gap-1 transition-colors ${
                                  hasUserFavorited(message, 'thumbDown') 
                                    ? 'text-red-500' 
                                    : 'text-muted-foreground hover:text-red-500'
                                }`}
                                onClick={async () => {
                                  await handleFavoriteToggle(message, 'thumbDown');
                                }}
                              >
                                <ThumbsDown className="w-4 h-4" />
                                <span>{message.thumbDown || 0}</span>
                              </button>
                              <button 
                                className={`flex items-center gap-1 transition-colors ${
                                  hasUserFavorited(message, 'heart') 
                                    ? 'text-pink-500' 
                                    : 'text-muted-foreground hover:text-pink-500'
                                }`}
                                onClick={async () => {
                                  await handleFavoriteToggle(message, 'heart');
                                }}
                              >
                                <Heart className="w-4 h-4" />
                                <span>{message.heart || 0}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages found
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </Tabs.Content>
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

      {/* Image Zoom Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-4xl">
            <img
              src={selectedImage}
              alt="Zoomed image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      <ReplyModal 
        open={postReplyModal} 
        onOpenChange={handleModalClose}
        param={param}
        coin={coin}
        replyingTo={replyingTo}
      />
    </div>
  );
};
