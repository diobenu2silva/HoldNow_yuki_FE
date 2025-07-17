import { coinInfo, userInfo, replyInfo } from '@/utils/types';
import { ChangeEvent, useContext, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { getMessageByCoin, postReply } from '@/utils/util';
import UserContext from '@/context/UserContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { useSocket } from '@/contexts/SocketContext';
import { Send, Image, Smile, X, Minimize2, Maximize2, Check, CheckCheck } from 'lucide-react';
import { uploadImage } from '@/utils/fileUpload';

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
  const animationFrameRef = useRef<number | null>(null);

  const { onTransactionUpdate, onHoldersUpdate } = useSocket();

  // Listen for real-time message updates from socket
  useEffect(() => {
    if (newMsg && newMsg.coinId === coin._id) {
      console.log('__yuki__ ChatPanel: New message received via socket:', newMsg);
      // Debug: Log message structure to see what fields are available
      console.log('__yuki__ ChatPanel: Message structure:', {
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
      const { scrollTop, scrollHeight } = chatContainerRef.current;
      // With flex-col-reverse, the bottom is at scrollTop = 0
      setIsAtBottom(scrollTop === scrollHeight);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Always scroll to bottom when new messages arrive
    scrollToBottom();
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



  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    animationFrameRef.current = requestAnimationFrame(() => {
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
            // newX = resizeStart.windowX + deltaX;
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
        
        // Update size and position atomically to prevent visual glitches
        onSizeChange({ width: newWidth, height: newHeight });
        onPositionChange({ x: newX, y: newY });
      }
    });
  }, [isDragging, isResizing, dragOffset, resizeStart, isMinimized, size, onPositionChange, onSizeChange]);

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

  // Single effect to manage all mouse event listeners
  useEffect(() => {
    if (!isDragging && !isResizing) {
      return;
    }

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        // Cancel any pending animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        setIsDragging(false);
        setIsResizing(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

      // Upload image to IPFS if selected
      let uploadedImageUrl: string | undefined;
      if (selectedImage && imagePreview) {
        console.log('Uploading image to IPFS...');
        const uploadResult = await uploadImage(imagePreview);
        if (uploadResult) {
          uploadedImageUrl = uploadResult;
          console.log('Image uploaded successfully:', uploadedImageUrl);
        } else {
          console.error('Failed to upload image to IPFS');
        }
      }

      // Create message data using the correct replyInfo type
      const messageData: replyInfo = {
        coinId: coinId,
        sender: user._id,
        msg: chatMessage.trim(),
        img: uploadedImageUrl
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

  // Sort messages by timestamp and filter out empty messages and unknown users
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    
    return [...messages]
      .filter(message => {
        // Filter out empty messages
        if (!message.msg || message.msg.trim() === '') return false;
        
        // Filter out messages from unknown users
        const senderName = (message.sender as userInfo)?.name;
        if (!senderName || senderName === 'Unknown') return false;
        
        return true;
      })
      .sort((a, b) => {
        const aTime = a.time ? new Date(a.time).getTime() : 0;
        const bTime = b.time ? new Date(b.time).getTime() : 0;
        return aTime - bTime;
      });
  }, [messages]);

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
              className="p-1 hover:bg-white/20 dark:hover:bg-gray-700/40 rounded transition-colors z-70 relative"
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
              className="absolute top-0 left-0 w-2 h-2 cursor-nw-resize z-50 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={(e) => handleCornerResize(e, 'nw')}
            />
            {/* Top-right */}
            <div
              className="absolute top-0 right-0 w-2 h-2 cursor-ne-resize z-40 pointer-events-auto"
              style={{ background: 'transparent'}} // Shrink width and move left so it doesn't overlap close button
              onMouseDown={(e) => handleCornerResize(e, 'ne')}
            />
            {/* Bottom-left */}
            <div
              className="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize z-50 pointer-events-auto"
              style={{ background: 'transparent' }}
              onMouseDown={(e) => handleCornerResize(e, 'sw')}
            />
            {/* Bottom-right */}
            <div
              className="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize z-50 pointer-events-auto"
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
              className="absolute top-0 right-0 w-2 h-full cursor-e-resize z-45 pointer-events-auto"
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
              className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize z-60 pointer-events-auto"
              style={{ background: 'transparent', bottom: '0px' }}
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
              className="absolute top-0 left-0 w-2 h-full cursor-w-resize z-40 pointer-events-auto"
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
              className="absolute left-0 w-full h-2 cursor-n-resize z-60 pointer-events-auto"
              style={{ background: 'transparent', top: '0px' }}
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
                  const isOwnMessage = (message.sender as userInfo)?._id === user._id;
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
                            <AvatarImage 
                              src={(message.sender as userInfo)?.avatar || '/assets/images/user-avatar.png'} 
                              alt="User" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/assets/images/user-avatar.png';
                              }}
                            />
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
                          
                          <div className={`rounded-2xl px-4 py-2 max-w-full min-h-[80px] ${
                            isOwnMessage 
                              ? 'bg-blue-500 text-white rounded-br-md' 
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                          }`}>
                            {(message.img || (message.images && message.images.length > 0)) && (
                              <div className="mb-2 w-[25%] h-full">
                                {message.images && message.images.length > 0 ? (
                                  // Handle new images array
                                  message.images.map((img: string, imgIndex: number) => (
                                    <img
                                      key={imgIndex}
                                      src={img}
                                      alt="Attachment"
                                      className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm"
                                    />
                                  ))
                                ) : (
                                  // Handle old single img field
                                  <img
                                    src={message.img}
                                    alt="Attachment"
                                    className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm"
                                  />
                                )}
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
                    className="w-[25%] h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm"
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
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground hover:from-primary/95 hover:via-primary/90 hover:to-primary/85 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-400 shadow-[0_3px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] border border-white/25 hover:border-white/40 backdrop-blur-sm"
                  whileHover={{ scale: 1.08, y: -1, rotate: 2 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent rounded-xl"></div>
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin relative z-10" />
                    ) : (
                      <svg className="w-4 h-4 drop-shadow-md relative z-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    )}
                  </div>
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