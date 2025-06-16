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
    display: 'inline-block',
    whiteSpace: 'nowrap',
    maxWidth: 'none',
    width: 'auto',
    marginLeft: '-120px',
    marginTop: '40px',
    fontSize: '1.1rem',
    borderRadius: '12px',
    padding: '10px 20px',
  };

  // Show new toast or reuse existing one
  if (!activeToastId) {
    activeToastId = toast.info('Preparing countdown...', {
      position: 'top-center',
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
      draggable: false,
      icon: false,
      style: commonStyle,
    });
  }

  countdownInterval = setInterval(() => {
    const now = new Date();
    const diff = finalTime.getTime() - now.getTime();

    if (diff <= 0) {
      toast.dismiss(activeToastId as string | number);
      clearInterval(countdownInterval!);
      countdownInterval = null;
      activeToastId = null;
      return;
    }

    // if (diff <= 0) {
    //   toast.update(activeToastId as string | number, {
    //     render: finalMsg,
    //     type: "success",
    //     autoClose: 3000,
    //     closeButton: true,
    //     icon: false,
    //     style: commonStyle,
    //   });
    //   clearInterval(countdownInterval!);
    //   countdownInterval = null;
    //   activeToastId = null;
    //   return;
    // }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const timeStr = `${hours}h ${minutes}m ${seconds}s`;

    toast.update(activeToastId as string | number, {
      render: `${mainMsg} ${timeStr}. Stay tuned!`,
      icon: false,
      style: commonStyle,
    });
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
