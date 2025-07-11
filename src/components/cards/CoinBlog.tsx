import { coinInfo, userInfo } from '@/utils/types';
import { FC, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { motion } from 'framer-motion';
import { HiOutlineGlobeAlt, HiOutlineChatBubbleLeftRight, HiOutlineInformationCircle } from 'react-icons/hi2';
import { FaTwitter, FaTelegramPlane } from 'react-icons/fa';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, UserIcon } from '@heroicons/react/24/outline';
import { useSocket } from '@/contexts/SocketContext';

interface CoinBlogProps {
  coin: coinInfo;
  componentKey: string;
  isNSFW?: boolean; // new prop for future use
}

export const CoinBlog: React.FC<CoinBlogProps> = ({ coin, componentKey, isNSFW }) => {
  const router = useRouter();
  const { onCoinInfoUpdate } = useSocket();
  const { solPrice } = useContext(UserContext);

  // Calculate current stage progress (percentage)
  const [stageProg, setStageProg] = useState(0);
  const [currentCoin, setCurrentCoin] = useState(coin);

  // Update local coin state when prop changes
  useEffect(() => {
    setCurrentCoin(coin);
  }, [coin]);

  // Real-time coin info updates
  useEffect(() => {
    if (onCoinInfoUpdate) {
      const handleCoinUpdate = (payload: any) => {
        if (payload.token === currentCoin.token) {
          console.log('__yuki__ CoinBlog: Coin info updated:', payload);
          setCurrentCoin(prevCoin => ({ ...prevCoin, ...payload.coinInfo }));
        }
      };
      
      onCoinInfoUpdate(handleCoinUpdate);
    }
  }, [onCoinInfoUpdate, currentCoin.token]);

  useEffect(() => {
    console.log('__yuki__ CoinBlog Timer useEffect triggered:', {
      bondingCurve: currentCoin.bondingCurve,
      atStageStarted: currentCoin.atStageStarted,
      stageDuration: currentCoin.stageDuration,
      currentStage: currentCoin.currentStage
    });

    // Stop timer if bonding curve is true, no stage started, or no stage duration
    if (currentCoin.bondingCurve || !currentCoin.atStageStarted || !currentCoin.stageDuration) {
      console.log('__yuki__ CoinBlog: Stopping timer - conditions not met');
      setStageProg(100);
      return; // Exit early, don't set up interval
    }

    console.log('__yuki__ CoinBlog: Starting timer - conditions met');
    const millisecondsInADay = 120 * 1000; // match trading page logic

    const updateProgress = () => {
      const nowDate = new Date();
      const atStageStartedDate = new Date(currentCoin.atStageStarted);
      const period = nowDate.getTime() - atStageStartedDate.getTime();
      const progress =
        Math.round((period * 10000) / (millisecondsInADay * currentCoin.stageDuration)) / 100;
      setStageProg(progress > 100 ? 100 : progress);
    };

    updateProgress(); // initial call
    
    // Set up real-time timer
    const intervalId = setInterval(updateProgress, 1000);
    
    return () => {
      console.log('__yuki__ CoinBlog: Cleaning up timer interval');
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentCoin.currentStage, currentCoin.atStageStarted, currentCoin.stageDuration, currentCoin.bondingCurve]);

  // Progress bar animation
  const progressVariants = {
    hidden: { width: 0 },
    visible: {
      width: `${stageProg}%`,
      transition: { duration: 1, ease: 'easeOut' as const, delay: 0.3 },
    },
  };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }, hover: { y: -5, transition: { duration: 0.2, ease: 'easeOut' } } }}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className="card card-hover card-glow overflow-hidden group cursor-pointer bg-card border-border flex flex-col justify-between gap-2"
    >
      <div
        className="relative w-full overflow-hidden rounded-t-xl"
        style={currentCoin.frontBanner ? {
          backgroundImage: `url(${currentCoin.frontBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : { background: 'var(--card)' }}
      >
      {/* Image and Info Row */}
      <div className="flex flex-col px-4 pt-3 gap-3 items-start min-h-0">
        <div className="flex items-start gap-3 w-full">
          <img
            src={currentCoin?.url}
            alt={currentCoin?.name}
            className="w-16 h-16 object-cover rounded-lg border-4 border-card bg-card shadow-lg mt-0 flex-shrink-0"
            style={{ marginTop: 0 }}
          />
          <div className="flex flex-col flex-1 gap-1 min-w-0">
            <div className="flex items-center gap-2 mt-1">
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {currentCoin?.name}
              </h3>
              <span className="badge badge-primary text-xs">{currentCoin?.ticker}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <UserIcon className="w-4 h-4" />
              <button
                onClick={e => {
                  e.stopPropagation();
                  router.push(`/profile/${(currentCoin?.creator as userInfo)?._id}`);
                }}
                className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 ml-1"
                >
                {(currentCoin?.creator as userInfo)?.name}
              </button>
            </div>
          </div>
        </div>
        {componentKey === 'coin' && currentCoin?.description && (
          <div className="w-full p-2 bg-primary/4 border border-primary/10 rounded-lg">
            <p className="text-muted-foreground text-sm flex items-start gap-1">
              <HiOutlineInformationCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
              <span className="text-foreground/90 leading-relaxed break-words line-clamp-2">{currentCoin?.description}</span>
            </p>
          </div>
        )}
      </div>
      {/* Links below image/info row */}
      {/* <div className="flex flex-col gap-1 px-4 pb-2 pt-2">
        <span className="font-semibold text-muted-foreground">Links:</span>
        <div className="flex flex-row gap-3 mt-1">
          {coin.website && (
            <a
              href={coin.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
              onClick={e => e.stopPropagation()}
              title="Website"
            >
              <HiOutlineGlobeAlt className="w-6 h-6" />
            </a>
          )}
          {coin.twitter && (
            <a
              href={coin.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
              onClick={e => e.stopPropagation()}
              title="Twitter"
            >
              <FaTwitter className="w-6 h-6" />
            </a>
          )}
          {coin.telegram && (
            <a
              href={coin.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary"
              onClick={e => e.stopPropagation()}
              title="Telegram"
            >
              <FaTelegramPlane className="w-6 h-6" />
            </a>
          )}
          {!coin.website && !coin.twitter && !coin.telegram && (
            <span className="text-muted-foreground text-xs">No links available.</span>
          )}
        </div>
      </div> */}

      </div>  
      {/* Stage Progress Section */}
      <div className="p-2 bg-muted/50 border-t border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <ArrowTrendingUpIcon className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground text-sm">Stage Progress</span>
          </div>
          <div className="text-right">
            <div className="text-primary font-bold text-base">
              {stageProg}%
            </div>
            <div className="text-muted-foreground text-xs">
              Stage {Math.min(currentCoin.currentStage, currentCoin.stagesNumber)} of {currentCoin.stagesNumber} ({currentCoin.bondingCurve ? ((currentCoin.movedToRaydium && !currentCoin.moveRaydiumFailed) ? "Completed" : "Failed") : (currentCoin.airdropStage ? "Airdrop Stage" : "Trading Stage1")})
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              variants={progressVariants}
              initial="hidden"
              animate="visible"
              className="h-full bg-primary rounded-full relative"
            />
          </div>
        </div>
        
        {/* Market Cap Display */}
        <div className="mt-1 pt-1 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <CurrencyDollarIcon className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-sm">Market Cap</span>
            </div>
            <div className="text-right">
              <div className="text-primary font-bold text-base">
                ${(currentCoin.progressMcap * (solPrice || 0) / 1e18 || 0).toLocaleString()} K
              </div>
              <div className="text-muted-foreground text-xs">
                Real-time
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
