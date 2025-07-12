import { coinInfo, userInfo, replyInfo } from '@/utils/types';
import { ChangeEvent, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { getMessageByCoin, postReply } from '@/utils/util';
import UserContext from '@/context/UserContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { useSocket } from '@/contexts/SocketContext';
import { Send, Image, Smile, X, Minimize2, Maximize2, Check, CheckCheck } from 'lucide-react';

interface ChatPanelProps {
  param: string | null;
  coin: coinInfo;
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  size: { width: number; height: number };
  onSizeChange: (size: { width: number; height: number }) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ 
  param, 
  coin, 
  isOpen, 
  onClose, 
  onMinimize,
  isMinimized,
  position,
  onPositionChange,
  size,
  onSizeChange
}) => {
  const {
    messages,
    setMessages,
    newMsg,
    coinId,
    user,
  } = useContext(UserContext);
  
  const [chatMessage, setChatMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; windowX: number; windowY: number; width: number; height: number; resizeType?: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' }>(
    { mouseX: 0, mouseY: 0, windowX: 0, windowY: 0, width: 0, height: 0, resizeType: undefined }
  );
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { onTransactionUpdate, onHoldersUpdate } = useSocket();

  // Define header height for use in edge handle positioning
  const HEADER_HEIGHT = 40; // px, adjust if your header is taller/shorter

  // Function to get coin ID from token address
  const getCoinIdFromToken = async (tokenAddress: string): Promise<string | null> => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/coinTrade/coinID/${tokenAddress}`);
      return response.data.coinId._id;
    } catch (error) {
      console.error('Error getting coin ID from token:', error);
      return null;
    }
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      setIsAtBottom(chatContainerRef.current.scrollTop === 0);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - (isMinimized ? 300 : size.width);
      const maxY = window.innerHeight - (isMinimized ? 50 : size.height);
      
      onPositionChange({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    } else if (isResizing && resizeStart.resizeType) {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.windowX;
      let newY = resizeStart.windowY;
      const minWidth = 300, maxWidth = 800, minHeight = 400, maxHeight = 800;
      
      switch (resizeStart.resizeType) {
        case 'n':
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height - deltaY));
          newY = resizeStart.windowY + deltaY;
          break;
        case 's':
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY));
          break;
        case 'e':
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX));
          break;
        case 'w':
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width - deltaX));
          newX = resizeStart.windowX + deltaX;
          break;
        case 'nw':
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width - deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height - deltaY));
          newX = resizeStart.windowX + deltaX;
          newY = resizeStart.windowY + deltaY;
          break;
        case 'ne':
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height - deltaY));
          newY = resizeStart.windowY + deltaY;
          break;
        case 'sw':
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width - deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY));
          newX = resizeStart.windowX + deltaX;
          break;
        case 'se':
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX));
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY));
          break;
      }
      
      // Keep window within viewport bounds
      const maxX = window.innerWidth - newWidth;
      const maxY = window.innerHeight - newHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      onSizeChange({ width: newWidth, height: newHeight });
      onPositionChange({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: position.x,
      windowY: position.y,
      width: size.width,
      height: size.height,
      resizeType: undefined, // Reset direction for new resize
    });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, isMinimized, size, position]);

  // Chat functions
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() && !selectedImage) return;
    if (!user._id) {
      console.error('User not logged in');
      return;
    }
    if (isSending) return; // Prevent multiple sends
    
    setIsSending(true);
    try {
      // Get the coin ID - try coin._id first, then convert from token address
      let coinId = coin._id;
      if (!coinId && param) {
        coinId = await getCoinIdFromToken(param);
      }
      
      if (!coinId) {
        console.error('Could not determine coin ID');
        return;
      }

      // Create message data using the correct replyInfo type
      const messageData: replyInfo = {
        coinId: coinId,
        sender: user._id,
        msg: chatMessage.trim(),
        img: selectedImage ? imagePreview : undefined
      };

      // Send message to backend using the existing postReply function
      const response = await postReply(messageData);

      if (response && !response.error) {
        // Clear the form
        setChatMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        
        // Fetch the latest messages to update the chat
        if (param) {
          const updatedMessages = await getMessageByCoin(param);
          setMessages(updatedMessages);
        }
      } else {
        console.error('Failed to send message:', response?.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Sort messages by timestamp
  const sortedMessages = messages ? [...messages].sort((a, b) => {
    const aTime = a.time ? new Date(a.time).getTime() : 0;
    const bTime = b.time ? new Date(b.time).getTime() : 0;
    return aTime - bTime;
  }) : [];

  if (!isOpen) return null;

  const handleCornerResize = (e: React.MouseEvent, direction: 'nw' | 'ne' | 'sw') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: position.x,
      windowY: position.y,
      width: size.width,
      height: size.height,
      resizeType: direction,
    });
  };

  return (
    <motion.div
      ref={chatContainerRef}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '300px' : `${size.width}px`,
        height: isMinimized ? '40px' : `${size.height}px`
      }}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        width: isMinimized ? '300px' : `${size.width}px`,
        height: isMinimized ? '40px' : `${size.height}px`
      }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Chat Window */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden h-full relative">
        {/* Title Bar - Draggable */}
        <div 
          className="select-none flex items-center justify-between px-3 py-2 cursor-move"
          style={{
            background: 'linear-gradient(90deg, var(--tw-gradient-stops))',
            backgroundImage: 'linear-gradient(90deg, #f0f4f8 0%, #b3c0d1 100%)',
            ...(document.documentElement.classList.contains('dark') && {
              backgroundImage: 'linear-gradient(90deg, #23272f 0%, #3a4252 100%)'
            })
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Live Chat - {coin?.ticker}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-white/20 dark:hover:bg-gray-700/40 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 dark:hover:bg-gray-700/40 rounded transition-colors z-50 relative"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagonal Resize Handles (all corners) */}
        {!isMinimized && (
          <>
            {/* Top-left */}
            <div
              className="absolute top-0 left-0 w-6 h-6 cursor-nw-resize z-50 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={(e) => handleCornerResize(e, 'nw')}
            />
            {/* Top-right */}
            <div
              className="absolute top-0 right-0 w-6 h-6 cursor-ne-resize z-40 pointer-events-auto"
              style={{ background: 'transparent', width: '32px', height: '32px', right: '48px' }} // Shrink width and move left so it doesn't overlap close button
              onMouseDown={(e) => handleCornerResize(e, 'ne')}
            />
            {/* Bottom-left */}
            <div
              className="absolute bottom-0 left-0 w-6 h-6 cursor-sw-resize z-50 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={(e) => handleCornerResize(e, 'sw')}
            />
            {/* Bottom-right */}
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-50 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={handleResizeStart}
            />
          </>
        )}

        {/* Edge Resize Handles (thick, invisible) */}
        {!isMinimized && (
          <>
            {/* Right Edge */}
            <div
              className="absolute top-0 right-0 w-10 h-full cursor-e-resize z-40 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                setResizeStart({
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  windowX: position.x,
                  windowY: position.y,
                  width: size.width,
                  height: size.height,
                  resizeType: 'e',
                });
              }}
            />
            {/* Bottom Edge - positioned above input area */}
            <div
              className="absolute bottom-0 left-0 w-full h-8 cursor-s-resize z-40 pointer-events-auto"
              style={{ background: 'transparent', bottom: '60px' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                setResizeStart({
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  windowX: position.x,
                  windowY: position.y,
                  width: size.width,
                  height: size.height,
                  resizeType: 's',
                });
              }}
            />
            {/* Left Edge */}
            <div
              className="absolute top-0 left-0 w-10 h-full cursor-w-resize z-40 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                setResizeStart({
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  windowX: position.x,
                  windowY: position.y,
                  width: size.width,
                  height: size.height,
                  resizeType: 'w',
                });
              }}
            />
            {/* Top Edge (starts below the header) */}
            <div
              className="absolute left-0 w-full h-10 cursor-n-resize z-40 pointer-events-auto"
              style={{ background: 'transparent', top: `${HEADER_HEIGHT}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizing(true);
                setResizeStart({
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  windowX: position.x,
                  windowY: position.y,
                  width: size.width,
                  height: size.height,
                  resizeType: 'n',
                });
              }}
            />
          </>
        )}

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4" style={{ height: `calc(${size.height}px - 100px)` }} onScroll={handleScroll}>
              <div className="flex flex-col-reverse gap-3">
                {[...sortedMessages].reverse().map((message, index) => {
                  const isOwnMessage = (message.sender as userInfo)?._id === coinId;
                  const messageTime = message.time ? new Date(message.time) : new Date();
                  
                  return (
                    <motion.div 
                      key={index} 
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className={`flex gap-2 max-w-[80%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 rounded-full flex-shrink-0">
                            <AvatarImage src={(message.sender as userInfo)?.avatar} alt="User" />
                            <AvatarFallback className="bg-blue-500 text-white text-xs font-semibold">
                              {(message.sender as userInfo)?.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {!isOwnMessage && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {(message.sender as userInfo)?.name || "Unknown"}
                            </span>
                          )}
                          
                          <div className={`rounded-2xl px-4 py-2 max-w-full ${
                            isOwnMessage 
                              ? 'bg-blue-500 text-white rounded-br-md' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                          }`}>
                            {message.img && (
                              <div className="mb-2">
                                <img
                                  src={message.img}
                                  alt="Attachment"
                                  className="rounded-lg max-w-full max-h-48 object-cover"
                                />
                              </div>
                            )}
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {message.msg}
                            </div>
                          </div>
                          
                          <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(messageTime, 'HH:mm')}
                            </span>
                            {isOwnMessage && (
                              <div className="flex items-center">
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {/* Image Preview */}
              {imagePreview && (
                <motion.div 
                  className="mb-3 relative inline-block z-50"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="rounded-lg max-w-full max-h-32 object-cover border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )}
              
              {/* Input Field */}
              <div className="flex items-center gap-2 h-10 relative z-50">
                <div className="flex-1 relative h-full flex items-center">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Type a message..."
                    className="w-full h-9 px-3 pr-16 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm leading-[36px] flex items-center cursor-text no-scrollbar"
                    rows={1}
                    style={{ minHeight: '36px', maxHeight: '36px' }}
                  />
                  {/* Action Icons */}
                  <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex gap-1 h-8 items-center z-50">
                    <label className="cursor-pointer p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-500 dark:text-gray-400 flex items-center justify-center h-8 w-8" onMouseDown={(e) => e.stopPropagation()}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Image className="w-5 h-5" />
                    </label>
                    <button className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-500 dark:text-gray-400 flex items-center justify-center h-8 w-8" onMouseDown={(e) => e.stopPropagation()}>
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {/* Send Button */}
                <motion.button
                  onClick={handleSendMessage}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={(!chatMessage.trim() && !selectedImage) || isSending}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-blue-500 border border-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all p-0 bg-transparent shadow-none"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}; 

<style jsx global>{`
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 10+ */
  }
`}</style> 