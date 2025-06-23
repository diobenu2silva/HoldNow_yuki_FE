import { toast } from 'react-toastify';

// Global toast and interval trackers
let activeToastId: string | number | null = null;
let countdownInterval: NodeJS.Timeout | null = null;

export const showCountdownToast = (
  finalTime: Date,
  mainMsg: string,
  finalMsg: string
) => {
  // Clean up any existing timer
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  const commonStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    whiteSpace: 'normal' as const,
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

  // Check if this is the "All stages completed" message
  const isAllStagesCompleted = mainMsg.includes('All Stages has completed');

  countdownInterval = setInterval(() => {
    const now = new Date();
    const diff = finalTime.getTime() - now.getTime();

    if (diff <= 0) {
      if (isAllStagesCompleted) {
        // For "All stages completed" message, show it for longer
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

    // Show the toast immediately with the countdown
    if (!activeToastId) {
      activeToastId = toast.info(`${mainMsg} ${timeStr}. Stay tuned!`, {
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
        render: `${mainMsg} ${timeStr}. Stay tuned!`,
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
