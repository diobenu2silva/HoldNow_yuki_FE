import { toast } from 'react-toastify';
import React from 'react';

// Global toast and interval trackers
let activeToastId: string | number | null = null;
let countdownInterval: NodeJS.Timeout | null = null;

export const showCountdownToast = (
  finalTime: Date,
  mainMsg: string | React.ReactElement,
  finalMsg: string
): (() => void) => {
  // Clean up any existing timer
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  const commonStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    whiteSpace: 'pre-line' as const,
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    fontSize: '1.1rem',
    borderRadius: '12px',
    padding: '15px 20px',
    textAlign: 'center' as const,
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
  };

  countdownInterval = setInterval(() => {
    const now = new Date();
    const diff = finalTime.getTime() - now.getTime();

    if (diff <= 0) {
      // Check if this is the "All stages completed" message by checking the finalMsg
      if (finalMsg.includes('Move to Raydium has begun')) {
        // For "Move to Raydium has begun" message, show it for longer
        toast.update(activeToastId as string | number, {
          render: finalMsg,
          type: "success",
          autoClose: 10000, // 10 seconds
          closeButton: true,
          icon: false,
          style: commonStyle,
        });
      } else {
        // For regular countdown, dismiss immediately
        toast.dismiss(activeToastId as string | number);
      }
      clearInterval(countdownInterval!);
      countdownInterval = null;
      activeToastId = null;
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const timeStr = `${hours}h ${minutes}m ${seconds}s`;

    // Convert JSX to string for toast display
    const mainMsgText = typeof mainMsg === 'string' ? mainMsg : 'All Stages has completed.\n\nMove to Raydium will begin in';

    // Show the toast immediately with the countdown
    if (!activeToastId) {
      activeToastId = toast.info(`${mainMsgText} ${timeStr}. Stay tuned!`, {
        position: 'top-center',
        autoClose: false,
        closeOnClick: false,
        closeButton: false,
        draggable: false,
        icon: false,
        style: commonStyle,
      });
    } else {
      toast.update(activeToastId as string | number, {
        render: `${mainMsgText} ${timeStr}. Stay tuned!`,
        icon: false,
        style: commonStyle,
      });
    }
  }, 1000);

  return () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (activeToastId) {
      toast.dismiss(activeToastId);
      activeToastId = null;
    }
  };
};
