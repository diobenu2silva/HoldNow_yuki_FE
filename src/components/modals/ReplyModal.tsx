import UserContext from '@/context/UserContext';
import { coinInfo, replyInfo, tradeInfo, userInfo } from '@/utils/types';
import { postReply, updateUser } from '@/utils/util';
import { uploadImage } from '@/utils/fileUpload';
import React, {
  ChangeEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { errorAlert, successAlert } from '../others/ToastGroup';
import ImgIcon from '@/../public/assets/images/imce-logo.jpg';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  param: string | null;
  coin: coinInfo;
  replyingTo?: any;
}

const ReplyModal: React.FC<ModalProps> = ({ open, onOpenChange, param, coin, replyingTo }) => {
  const { user } = useContext(UserContext);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const replyPost = async () => {
    if (!user) {
      errorAlert('Please Connect Wallet');
      return;
    }
    
    if (!msg.trim()) {
      errorAlert('Please enter a message');
      return;
    }

    setIsSubmitting(true);
    try {
      let reply: replyInfo;
      const uploadedImages: string[] = [];

      // Upload images if any
      if (imageUrls.length > 0) {
        for (const imageUrl of imageUrls) {
          const url = await uploadImage(imageUrl);
          if (url) {
            uploadedImages.push(url);
          }
        }
      }

              if (user._id) {
          reply = {
            coinId: coin._id,
            sender: user._id,
            msg: msg,
            images: uploadedImages,
            replyTo: replyingTo?._id,
          };
        
        await postReply(reply);
        successAlert('Reply posted successfully!');
        handleModalClose();
      }
    } catch (error) {
      errorAlert('Failed to post reply');
      console.error('Reply post error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setMsg('');
    setFileNames([]);
    setImageUrls([]);
    onOpenChange(false);
  };

  // Clear reply state when modal closes
  useEffect(() => {
    if (!open) {
      // Reset reply state in parent component
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFileNames: string[] = [];
      const newImageUrls: string[] = [];

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) {
          errorAlert('Please select valid image files.');
          return;
        }
        
        const url = URL.createObjectURL(file);
        newFileNames.push(file.name);
        newImageUrls.push(url);
      });

      setFileNames(prev => [...prev, ...newFileNames]);
      setImageUrls(prev => [...prev, ...newImageUrls]);
    }
  };

  const removeImage = (index: number) => {
    setFileNames(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Remove the local uploadImage function since we're importing it from fileUpload

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="fixed inset-0 bg-black/50"
          onClick={handleModalClose}
        />
        
        <motion.div
          className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Post Reply</h2>
            <button
              onClick={handleModalClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Reply Information */}
            {replyingTo && (
              <div className="p-3 bg-muted/30 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground mb-1">Replying to:</div>
                <div className="text-sm text-foreground">
                  {replyingTo.sender?.name || 'Unknown User'}: {replyingTo.msg}
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="w-full h-32 p-3 bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                placeholder="Write your message here..."
                required
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Images (Optional)
              </label>
              
              {/* Upload Button */}
              <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload images</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>

              {/* Image Previews */}
              {imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group w-[25%] h-24">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/20">
            <button
              onClick={handleModalClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={replyPost}
              disabled={isSubmitting || !msg.trim()}
              className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReplyModal;
