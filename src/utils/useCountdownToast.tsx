import { useEffect } from 'react';
import { showCountdownToast } from '@/utils/showCountdownToast';

export const useCountdownToast = (coin: any) => {

  const { airdropStage, atStageStarted, currentStage, bondingCurve } = coin;
  useEffect(() => {
    if (!airdropStage || !atStageStarted || !currentStage) return;
      

    const stage = coin.currentStage;
    console.log("showing countdown toast for stage:", stage, "bondingCurve :", bondingCurve);
    const alertText = (bondingCurve) ?
      'All Stages has completed. The next stage will begin shortly, and a new link will be posted here when it begins. Stay tuned!'
      : `Stage ${stage} has started. Next stage will begin in`;
    // const milliseconds = 24 * 60 * 60 * 1000;
    const milliseconds = (!bondingCurve) ? 120 * 1000 : 5 * 1000; // 10 min for demo
    
    const startTime = new Date(atStageStarted);
    const futureTime = new Date(startTime.getTime() + milliseconds);

    // Trigger the toast
    const cleanup = showCountdownToast(
      futureTime,
      alertText,
      'New Stage has begun!'
    );

    // CLEANUP on unmount or coin change
    return () => {
      cleanup?.(); // Dismiss toast & clear interval
    };
  }, [coin.airdropStage, coin.atStageStarted, coin.currentStage]);
};
