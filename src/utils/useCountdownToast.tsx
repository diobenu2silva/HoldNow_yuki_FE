import { useEffect } from 'react';
import { showCountdownToast } from '@/utils/showCountdownToast';

export const useCountdownToast = (coin: any) => {

  const { airdropStage, atStageStarted, currentStage, bondingCurve, stagesNumber } = coin;
  useEffect(() => {
    if (!airdropStage || !atStageStarted || !currentStage) return;
      

    console.log("showing countdown toast for stage:", currentStage, "bondingCurve :", bondingCurve);
    
    let alertText, completionMsg;
    if (currentStage == stagesNumber) {
      // All stages completed, next is Move to Raydium
      alertText = (
        <>
          All Stages has completed.
          <br />
          Move to Raydium will begin in
        </>
      );
      completionMsg = 'Move to Raydium has begun!';
    } else {
      // Regular stage progression
      alertText = (
        <>
          Stage {currentStage} has completed.
          <br />
          <br />
          Next stage will begin in
        </>
      );
      completionMsg = 'New Stage has begun!';
    }
    
    // const milliseconds = 24 * 60 * 60 * 1000;
    const milliseconds = 120 * 1000;
    
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
