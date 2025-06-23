import { useEffect } from 'react';
import { showCountdownToast } from '@/utils/showCountdownToast';

export const useCountdownToast = (coin: any) => {

  const { airdropStage, atStageStarted, currentStage, bondingCurve } = coin;
  useEffect(() => {
    if (!airdropStage || !atStageStarted || !currentStage) return;
      

    const stage = coin.currentStage;
    console.log("showing countdown toast for stage:", stage, "bondingCurve :", bondingCurve);
    
    let alertText, completionMsg;
    if (bondingCurve) {
      // All stages completed, next is Move to Raydium
      alertText = (
        <>
          All Stages has completed.
          <br />
          <br />
          Move to Raydium will begin in
        </>
      );
      completionMsg = 'Move to Raydium has begun!';
    } else {
      // Regular stage progression
      alertText = (
        <>
          Stage {stage} has completed.
          <br />
          <br />
          Next stage will begin in
        </>
      );
      completionMsg = 'New Stage has begun!';
    }
    
    // const milliseconds = 24 * 60 * 60 * 1000;
    const milliseconds = (!bondingCurve) ? 120 * 1000 : 5 * 1000; // 10 min for demo
    
    const startTime = new Date(atStageStarted);
    const futureTime = new Date(startTime.getTime() + milliseconds);

    // Trigger the toast
    const cleanup = showCountdownToast(
      futureTime,
      alertText,
      completionMsg
    );

    // CLEANUP on unmount or coin change
    return () => {
      cleanup?.(); // Dismiss toast & clear interval
    };
  }, [coin.airdropStage, coin.atStageStarted, coin.currentStage]);
};
