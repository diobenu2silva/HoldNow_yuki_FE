import { useEffect } from "react";
import { showCountdownToast } from "@/utils/showCountdownToast";

export const useCountdownToast = (coin: any) => {
  useEffect(() => {
    if (!coin.airdropStage || !coin.atStageStarted || !coin.currentStage) return;

    const millisecondsInADay = 600 * 1000; // 10 min for demo
    // const millisecondsInADay = 24 * 60 * 60 * 1000;
    const startTime = new Date(coin.atStageStarted);
    const futureTime = new Date(startTime.getTime() + millisecondsInADay);

    // Trigger the toast
    const cleanup = showCountdownToast(
      futureTime,
      `Stage ${coin.currentStage - 1} has completed. Next stage will begin in`,
      "New Stage has begun!"
    );

    // CLEANUP on unmount or coin change
    return () => {
      cleanup?.(); // Dismiss toast & clear interval
    };
  }, [coin.airdropStage, coin.atStageStarted, coin.currentStage]);
};
