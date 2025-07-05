import { coinInfo, userInfo } from '@/utils/types';
import { FC, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { motion } from 'framer-motion';
import { 
  HiOutlineGlobeAlt, 
  HiOutlineChatBubbleLeftRight 
} from 'react-icons/hi2';
import { 
  FaTwitter, 
  FaTelegramPlane 
} from 'react-icons/fa';
import { 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface CoinBlogProps {
  coin: coinInfo;
  componentKey: string;
}

export const CoinBlog: React.FC<CoinBlogProps> = ({ coin, componentKey }) => {
  const { solPrice } = useContext(UserContext);
  const [marketCapValue, setMarketCapValue] = useState<number>(0);
  const router = useRouter();

  const handleToProfile = (id: string) => {
    router.push(`/profile/${id}`);
  };

  const getMarketCapData = async (coin: coinInfo) => {
    const prog = coin.progressMcap * solPrice;
    setMarketCapValue(Math.round(prog / 100) / 10);
  };

  useEffect(() => {
    getMarketCapData(coin);
  }, [coin]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const
      }
    },
    hover: {
      y: -5,
      transition: {
        duration: 0.2,
        ease: "easeOut" as const
      }
    }
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: { 
      width: `${marketCapValue}%`,
      transition: {
        duration: 1,
        ease: "easeOut" as const,
        delay: 0.3
      }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="card card-hover card-glow overflow-hidden group cursor-pointer bg-card border-border"
    >
      {/* Header Section */}
      <div className="flex flex-row w-full relative">
        {/* Token Image */}
        <div className="relative w-28 h-28 overflow-hidden">
          <img
            src={coin?.url}
            alt={coin?.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        {/* Token Info */}
        <div className="flex flex-col px-4 py-3 flex-1 gap-2">
          {/* Token Name */}
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
              {coin?.name}
            </h3>
            <span className="badge badge-primary text-xs">
              {coin?.ticker}
            </span>
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <UserIcon className="w-4 h-4" />
            <span>Created by</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                handleToProfile((coin?.creator as userInfo)?._id);
              }}
              className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
            >
              {(coin?.creator as userInfo)?.name}
            </motion.button>
          </div>

          {/* Description */}
          {componentKey === 'coin' && coin?.description && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {coin?.description}
            </p>
          )}

          {/* Social Links */}
          <div className="flex items-center gap-2 mt-2">
            {coin.twitter && (
              <motion.a
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                href={coin.twitter}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-gradient-primary rounded-lg text-white hover:shadow-glow transition-all duration-200"
              >
                                 <FaTwitter className="w-4 h-4" />
              </motion.a>
            )}
            {coin.website && (
              <motion.a
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                href={coin.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-gradient-accent rounded-lg text-white hover:shadow-glow transition-all duration-200"
              >
                <HiOutlineGlobeAlt className="w-4 h-4" />
              </motion.a>
            )}
            {coin.telegram && (
              <motion.a
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                href={coin.telegram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-gradient-secondary rounded-lg text-white hover:shadow-glow transition-all duration-200"
              >
                <FaTelegramPlane className="w-4 h-4" />
              </motion.a>
            )}
          </div>
        </div>
      </div>

      {/* Market Cap Section */}
      <div className="p-4 bg-muted/50 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground text-sm">Market Cap</span>
          </div>
          <div className="text-right">
            <div className="text-primary font-bold text-lg">
              {((coin.progressMcap * solPrice) / 1000).toFixed(2)} K
            </div>
            <div className="text-muted-foreground text-xs">
              {marketCapValue}% of target
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              variants={progressVariants}
              initial="hidden"
              animate="visible"
              className="h-full bg-primary rounded-full relative"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </motion.div>
          </div>
          
          {/* Target indicator */}
          <div className="absolute top-0 right-0 w-1 h-3 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Target Value */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-muted-foreground text-xs">Current</span>
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-semibold text-sm">100 K Target</span>
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
};
