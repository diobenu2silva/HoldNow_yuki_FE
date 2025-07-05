'use client';
import { FC } from 'react';
import { motion } from 'framer-motion';
import { 
  CurrencyDollarIcon, 
  ChartBarIcon, 
  UserGroupIcon,
  CogIcon 
} from '@heroicons/react/24/outline';

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

const PageLoader: FC<PageLoaderProps> = ({ 
  message = "Loading token data...", 
  showProgress = false,
  progress = 0 
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        type: "spring" as const,
        stiffness: 200
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/80 backdrop-blur-sm">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass p-8 rounded-2xl max-w-md w-full mx-4 text-center"
      >
        {/* Main loading icon */}
        <motion.div
          variants={iconVariants}
          className="mx-auto mb-6 w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center"
        >
          <CurrencyDollarIcon className="w-10 h-10 text-white" />
        </motion.div>

        {/* Loading message */}
        <motion.h3
          variants={itemVariants}
          className="text-xl font-semibold text-white mb-4"
        >
          {message}
        </motion.h3>

        {/* Progress bar */}
        {showProgress && (
          <motion.div
            variants={itemVariants}
            className="w-full bg-white/10 rounded-full h-2 mb-6 overflow-hidden"
          >
            <motion.div
              className="h-full bg-gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </motion.div>
        )}

        {/* Loading indicators */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center gap-4 mb-6"
        >
          {[
            { icon: ChartBarIcon, color: "from-accent-400 to-accent-600" },
            { icon: UserGroupIcon, color: "from-secondary-400 to-secondary-600" },
            { icon: CogIcon, color: "from-warning-400 to-warning-600" }
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={pulseVariants}
              animate="pulse"
              style={{ animationDelay: `${index * 0.2}s` }}
              className={`w-8 h-8 bg-gradient-to-r ${item.color} rounded-full flex items-center justify-center`}
            >
              <item.icon className="w-4 h-4 text-white" />
            </motion.div>
          ))}
        </motion.div>

        {/* Loading dots */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center gap-1"
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-primary-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </motion.div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="loading-shimmer h-full" />
        </div>
      </motion.div>
    </div>
  );
};

export default PageLoader; 