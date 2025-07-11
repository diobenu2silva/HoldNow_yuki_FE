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
          console.log('__yuki__ CoinBlog: Creator data:', {
            creator: payload.coinInfo.creator,
            creatorType: typeof payload.coinInfo.creator,
            hasName: payload.coinInfo.creator?.name,
            hasId: payload.coinInfo.creator?._id
          });
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
      className="card card-hover card-glow overflow-hidden group cursor-pointer border-border flex flex-col justify-between"
      style={currentCoin.frontBanner ? {
        backgroundImage: `url(${currentCoin.frontBanner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : { background: 'var(--card)' }}
    >
      <div className="relative w-full overflow-hidden">
        {/* Social Links - Top Right Corner */}
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
          {currentCoin.description && currentCoin.description.length > 50 && (
            <div
              className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full cursor-help"
              title={currentCoin.description}
            >
              <HiOutlineInformationCircle className="w-3 h-3" />
            </div>
          )}
          {currentCoin.website && (
            <a
              href={currentCoin.website}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/60 transition-colors duration-200"
              title="Website"
              onClick={e => e.stopPropagation()}
            >
              <HiOutlineGlobeAlt className="w-3 h-3" />
            </a>
          )}
          {currentCoin.twitter && (
            <a
              href={currentCoin.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/60 transition-colors duration-200"
              title="Twitter"
              onClick={e => e.stopPropagation()}
            >
              <FaTwitter className="w-3 h-3" />
            </a>
          )}
          {currentCoin.telegram && (
            <a
              href={currentCoin.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/60 transition-colors duration-200"
              title="Telegram"
              onClick={e => e.stopPropagation()}
            >
              <FaTelegramPlane className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Image and Info Row */}
        <div className="flex flex-col px-2 pt-3 gap-2 items-start min-h-0">
          <div className="flex items-start gap-3 w-full">
            <img
              src={currentCoin?.url}
              alt={currentCoin?.name}
              className="w-16 h-16 object-cover rounded-lg border-4 border-card bg-card shadow-lg mt-0 flex-shrink-0"
              style={{ marginTop: 0 }}
            />
            <div className="flex flex-col flex-1 gap-1 min-w-0 w-full">
              <div className="bg-black/30 backdrop-blur-sm px-2 py-1 rounded max-w-[calc(100%-32px)] mr-2 overflow-hidden">
                <div className="flex items-center gap-2 w-full">
                  <h3 className="text-xl font-bold text-white drop-shadow-lg group-hover:text-primary transition-colors duration-300 truncate min-w-0">
                    {currentCoin?.name}
                  </h3>
                  <span className="badge badge-primary text-xs text-white drop-shadow-lg flex-shrink-0">{currentCoin?.ticker}</span>
                </div>
                <div className="flex items-center gap-1 text-sm mt-1 w-full">
                  <UserIcon className="w-4 h-4 text-white drop-shadow-lg flex-shrink-0" />
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const creatorId = typeof currentCoin?.creator === 'string' 
                        ? currentCoin.creator 
                        : (currentCoin?.creator as userInfo)?._id;
                      if (creatorId) {
                        router.push(`/profile/${creatorId}`);
                      }
                    }}
                    className="text-white hover:text-primary/80 font-medium transition-colors duration-200 drop-shadow-lg truncate min-w-0"
                    >
                    {(currentCoin?.creator as userInfo)?.name || 'Unknown Creator'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {componentKey === 'coin' && currentCoin?.description && (
            <div className="w-full px-1.5 max-w-[calc(100%-27px)] mb-2">
              <div className="text-white drop-shadow-lg bg-black/30 px-2 py-1 rounded backdrop-blur-sm text-sm flex items-start gap-2 w-full overflow-hidden">
                <HiOutlineInformationCircle className="w-4 h-4 text-white drop-shadow-lg flex-shrink-0 mt-0.5" />
                <span className="truncate min-w-0">
                  {currentCoin?.description}
                </span>
              </div>
            </div>
          )}
        </div>
      
      </div>  
      {/* Stage Progress Section */}
      <div className="p-2 bg-black/40 backdrop-blur-sm border-t border-white/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <ArrowTrendingUpIcon className="w-4 h-4 text-white" />
            <span className="text-white/80 text-sm">Stage Progress</span>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-base">
              {stageProg}%
            </div>
            <div className="text-white/70 text-xs">
              Stage {Math.min(currentCoin.currentStage, currentCoin.stagesNumber)} of {currentCoin.stagesNumber} ({currentCoin.bondingCurve ? ((currentCoin.movedToRaydium && !currentCoin.moveRaydiumFailed) ? "Completed" : "Failed") : (currentCoin.airdropStage ? "Airdrop Stage" : "Trading Stage1")})
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              variants={progressVariants}
              initial="hidden"
              animate="visible"
              className="h-full bg-white rounded-full relative"
            />
          </div>
        </div>
        
        {/* Market Cap Display */}
        <div className="mt-1 pt-1 border-t border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <CurrencyDollarIcon className="w-4 h-4 text-white" />
              <span className="text-white/80 text-sm">Market Cap</span>
            </div>
            <div className="text-right">
              <div className="text-white font-bold text-base">
                ${(currentCoin.progressMcap * (solPrice || 0) / 1e18 || 0).toLocaleString()} K
              </div>
              <div className="text-white/70 text-xs">
                Real-time
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
