import { coinInfo, userInfo } from '@/utils/types';
import { FC, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { motion } from 'framer-motion';
import { HiOutlineGlobeAlt, HiOutlineChatBubbleLeftRight, HiOutlineInformationCircle } from 'react-icons/hi2';
import { FaTwitter, FaTelegramPlane } from 'react-icons/fa';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, UserIcon } from '@heroicons/react/24/outline';

interface CoinBlogProps {
  coin: coinInfo;
  componentKey: string;
  isNSFW?: boolean; // new prop for future use
}

export const CoinBlog: React.FC<CoinBlogProps> = ({ coin, componentKey, isNSFW }) => {
  const router = useRouter();

  // Calculate current stage progress (percentage)
  const [stageProg, setStageProg] = useState(0);

  useEffect(() => {
    if (!coin.bondingCurve && coin.atStageStarted && coin.stageDuration) {
      const millisecondsInADay = 120 * 1000; // match trading page logic

      const updateProgress = () => {
        const nowDate = new Date();
        const atStageStartedDate = new Date(coin.atStageStarted);
        const period = nowDate.getTime() - atStageStartedDate.getTime();
        const progress =
          Math.round((period * 10000) / (millisecondsInADay * coin.stageDuration)) / 100;
        setStageProg(progress > 100 ? 100 : progress);
      };

      updateProgress(); // initial call only - no interval
    } else {
      setStageProg(100);
    }
  }, [coin.currentStage, coin.atStageStarted, coin.stageDuration]);

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
      {(() => { console.log("_yuki__coin_frontBanner", coin.frontBanner); return null; })()}
      <div
        className="relative w-full overflow-hidden rounded-t-xl"
        style={coin.frontBanner ? {
          backgroundImage: `url(${coin.frontBanner})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : { background: 'var(--card)' }}
      >
      {/* Image and Info Row */}
      <div className="flex flex-col px-4 pt-3 gap-3 items-start min-h-0">
        <div className="flex items-start gap-3 w-full">
          <img
            src={coin?.url}
            alt={coin?.name}
            className="w-16 h-16 object-cover rounded-lg border-4 border-card bg-card shadow-lg mt-0 flex-shrink-0"
            style={{ marginTop: 0 }}
          />
          <div className="flex flex-col flex-1 gap-1 min-w-0">
            <div className="flex items-center gap-2 mt-1">
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                {coin?.name}
              </h3>
              <span className="badge badge-primary text-xs">{coin?.ticker}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <UserIcon className="w-4 h-4" />
              <button
                onClick={e => {
                  e.stopPropagation();
                  router.push(`/profile/${(coin?.creator as userInfo)?._id}`);
                }}
                className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 ml-1"
                >
                {(coin?.creator as userInfo)?.name}
              </button>
            </div>
          </div>
        </div>
        {componentKey === 'coin' && coin?.description && (
          <div className="w-full p-2 bg-primary/4 border border-primary/10 rounded-lg">
            <p className="text-muted-foreground text-sm flex items-start gap-1">
              <HiOutlineInformationCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
              <span className="text-foreground/90 leading-relaxed break-words line-clamp-2">{coin?.description}</span>
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
      <div className="p-4 bg-muted/50 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground text-sm">Stage Progress</span>
          </div>
          <div className="text-right">
            <div className="text-primary font-bold text-lg">
              {stageProg}%
            </div>
            <div className="text-muted-foreground text-xs">
              Stage {coin.currentStage} of {coin.stagesNumber}
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
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
