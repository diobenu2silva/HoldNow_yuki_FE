'use client';

import { io, Socket } from 'socket.io-client';
import type {
  Bar,
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from '@/libraries/charting_library';

import { queryClient } from '../../provider/providers';
import { Chart } from '@/utils/types';

let socket: Socket | undefined = undefined;
let initialTimeStamp: number = new Date().getTime();
let lastUpdated = 0;

if (typeof window !== 'undefined') {
  socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!);
}

type SubscriptionItem = {
  subscriberUID: string;
  resolution: ResolutionString;
  lastBar: Bar;
  handlers: {
    id: string;
    callback: SubscribeBarsCallback;
  }[];
  pairIndex: number;
  token: string; // Add token to track which token this subscription is for
};

const channelToSubscription = new Map<number, SubscriptionItem>();

// Helper to fetch full chart data for a token
async function fetchFullChartData(token: string, resolution: string, countBack: number) {
  // Adjust the endpoint and params as needed for your backend
  const res = await fetch(`/chart/${resolution}/${token}/${countBack}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.length) return null;
  // Convert to Bar format if needed
  return data.map((bar: any) => ({
    ...bar,
    time: bar.time * 1000, // Convert seconds to ms if needed
  }));
}

if (socket) {
  socket.on('connect', () => {
    console.log('[socket] Connected', socket!.id);
    initialTimeStamp = new Date().getTime();
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    if (socket!.active) {
      // temporary failure, the socket will automatically try to reconnect
    } else {
      // the connection was denied by the server
      // in that case, `socket.connect()` must be manually called in order to reconnect
      console.log('[socket] Error:', error.message);
    }
  });

  // Listen for coin info updates from backend
  socket.on('coinInfoUpdated', async (data: { token: string; coinInfo: any }) => {
    console.log('[socket] coinInfoUpdated received:', data);
    console.log('[socket] Processing coinInfoUpdated for token:', data.token);
    console.log('[socket] Current subscriptions:', Array.from(channelToSubscription.keys()));
    console.log('[socket] coinInfo structure:', {
      tokenReserves: data.coinInfo.tokenReserves,
      lamportReserves: data.coinInfo.lamportReserves,
      hasTokenReserves: 'tokenReserves' in data.coinInfo,
      hasLamportReserves: 'lamportReserves' in data.coinInfo,
      coinInfoKeys: Object.keys(data.coinInfo)
    });

    // Find subscriptions for this token
    for (const [pairIndex, subscriptionItem] of channelToSubscription.entries()) {
      console.log('[socket] Checking subscription:', pairIndex, 'token:', data.token, 'target token:', subscriptionItem.token);
      
      if (subscriptionItem.token === data.token) {
        console.log('[socket] Processing chart update for token:', data.token, 'pairIndex:', pairIndex);
        
        const lastBar = subscriptionItem.lastBar;
        const tradeTime = new Date().getTime();
        const resolution = subscriptionItem.resolution;
        const nextBarTime = getNextBarTime(lastBar.time, +resolution);

        // Calculate price from reserves (same as backend calculation)
        const price = data.coinInfo.lamportReserves / data.coinInfo.tokenReserves; // No need to divide by 1e9, reserves are already in correct units
        
        console.log('[socket] Calculated price:', price, 'from reserves:', data.coinInfo.lamportReserves, data.coinInfo.tokenReserves);
        
        // For real-time updates, we'll use a simple approach:
        // If price increased, treat as buy (direction 1), if decreased, treat as sell (direction 0)
        let tradeDirection = 1; // Default to buy
        if (lastBar.close && price < lastBar.close) {
          tradeDirection = 0; // Price went down, treat as sell
        } else if (lastBar.close && price > lastBar.close) {
          tradeDirection = 1; // Price went up, treat as buy
        }
        // If price is the same, keep the previous direction
        
        console.log('[socket] Determined trade direction:', tradeDirection, 'price change:', lastBar.close ? price - lastBar.close : 'N/A');
        
        let bar: Bar;

        if (tradeTime >= nextBarTime) {
          // Create new bar
          bar = {
            time: nextBarTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0, // We don't have volume data from coinInfo
          };
          console.log('[socket] Generate new bar', bar);
          console.log('[socket] Bar time (ISO):', new Date(bar.time).toISOString());
        } else {
          // Update current bar based on trade direction
          let newHigh = lastBar.high;
          let newLow = lastBar.low;
          let newOpen = lastBar.open;
          let newClose = price;
          
          if (tradeDirection === 1) { // BUY - price should go up
            newHigh = Math.max(lastBar.high, price);
            newLow = Math.min(lastBar.low, price);
            newOpen = lastBar.open;
            newClose = price;
          } else if (tradeDirection === 0) { // SELL - price should go down
            newHigh = Math.max(lastBar.high, price);
            newLow = Math.min(lastBar.low, price);
            newOpen = lastBar.open;
            newClose = price;
          } else {
            newHigh = Math.max(lastBar.high, price);
            newLow = Math.min(lastBar.low, price);
            newOpen = lastBar.open;
            newClose = price;
          }
          bar = {
            ...lastBar,
            open: newOpen,
            high: newHigh,
            low: newLow,
            close: newClose,
          };
          console.log('[socket] Update current bar with direction', tradeDirection, 'OHLC:', { open: newOpen, high: newHigh, low: newLow, close: newClose });
          console.log('[socket] Bar time (ISO):', new Date(bar.time).toISOString());
        }
        
        subscriptionItem.lastBar = bar;

        // Send data to every subscriber of that symbol
        subscriptionItem.handlers.forEach((handler) => {
          try {
            console.log('[socket] Calling chart callback for handler:', handler.id, 'with bar:', bar);
            handler.callback(bar);
          } catch (error) {
            console.error('[socket] Error in chart callback:', error);
          }
        });
      }
    }
  });

  socket.on('coinInfoUpdated', async (data: { token: string; coinInfo: any }) => {
    console.log('[socket] coinInfoUpdated received:', data);
    // Find subscriptions for this token
    for (const [pairIndex, subscriptionItem] of channelToSubscription.entries()) {
      if (subscriptionItem.token === data.token) {
        // Option A: Fetch full chart data and redraw
        const bars = await fetchFullChartData(data.token, subscriptionItem.resolution, 100); // 100 = countBack, adjust as needed
        if (bars && bars.length) {
          // Update lastBar and call all handlers with the new bars
          subscriptionItem.lastBar = bars[bars.length - 1];
          // Redraw the chart by calling the callback for each bar
          bars.forEach((bar: Bar) => {
            subscriptionItem.handlers.forEach((handler) => {
              try {
                handler.callback(bar);
              } catch (error) {
                console.error('[socket] Error in chart callback:', error);
              }
            });
          });
        }
      }
    }
  });

  socket.on('currentPrices', (priceUpdates) => {
    const tradeTime = new Date().getTime();

    const state = queryClient.getQueryState<Chart>(['charts']);

    if (!state || !state.data || !priceUpdates) {
      return;
    }

    for (let i = 0; i < priceUpdates.length; i += 2) {
      const index = priceUpdates[i];
      const price = priceUpdates[i + 1];

      if (state.data.closes.length < index) {
        while (state.data.closes.length < index) state.data.closes.push(0);
      }

      state.data.closes[index] = price;
    }

    for (const pairIndex of channelToSubscription.keys()) {
      const subscriptionItem = channelToSubscription.get(pairIndex);

      if (!subscriptionItem) {
        continue;
      }

      const lastBar = subscriptionItem.lastBar;
      const resolution = subscriptionItem.resolution;
      const nextBarTime = getNextBarTime(lastBar.time, +resolution);

      let bar: Bar;

      if (tradeTime >= nextBarTime) {
        bar = {
          time: nextBarTime,
          open: state.data.closes[pairIndex],
          high: state.data.closes[pairIndex],
          low: state.data.closes[pairIndex],
          close: state.data.closes[pairIndex],
        };
        console.log('[socket] Generate new bar', bar);
      } else {
        bar = {
          ...lastBar,
          high: Math.max(lastBar.high, state.data.closes[pairIndex]),
          low: Math.min(lastBar.low, state.data.closes[pairIndex]),
          close: state.data.closes[pairIndex],
        };
      }
      subscriptionItem.lastBar = bar;

      // Send data to every subscriber of that symbol
      subscriptionItem.handlers.forEach((handler) => handler.callback(bar));
    }

    queryClient.setQueryData<Chart | undefined>(['charts'], (oldData) => {
      if (!oldData) {
        return oldData;
      }

      const priceData: Chart = {
        ...oldData,
        time: tradeTime,
      };

      for (let i = 0; i < priceUpdates.length; i += 2) {
        const index = priceUpdates[i];
        const price = priceUpdates[i + 1];

        if (priceData.closes.length < index) {
          while (priceData.closes.length < index) priceData.closes.push(0);
        }

        priceData.closes[index] = price;
      }

      return priceData;
    });
  });
}

// barTime is millisec, resolution is mins
// function getNextBarTime(barTime: number, resolution: number) {
//   const previousSegment = Math.floor(barTime / 1000 / 60 / resolution);
//   return (previousSegment + 1) * 1000 * 60 * resolution;
// }

// --- 5-second candle for rapid testing ---
function getNextBarTime(barTime: number, resolution: number) {
  const period = 5000; // 5 seconds in ms
  const previousSegment = Math.floor(barTime / period);
  return (previousSegment + 1) * period;
}

export function subscribeOnStream(
  symbolInfo: LibrarySymbolInfo,
  resolution: ResolutionString,
  onRealtimeCallback: SubscribeBarsCallback,
  subscriberUID: string,
  onResetCacheNeededCallback: () => void,
  lastBar: Bar,
  pairIndex: number,
  token?: string // Add token parameter
) {
  const handler = {
    id: subscriberUID,
    callback: onRealtimeCallback,
  };
  let subscriptionItem = channelToSubscription.get(pairIndex);
  if (subscriptionItem) {
    // Already subscribed to the channel, use the existing subscription
    subscriptionItem.handlers.push(handler);
    return;
  }

  subscriptionItem = {
    subscriberUID,
    resolution,
    lastBar,
    handlers: [handler],
    pairIndex,
    token: token || '', // Store the token
  } as SubscriptionItem;
  channelToSubscription.set(pairIndex, subscriptionItem);
  console.log('[subscribeBars]: Subscribe to streaming. Channel:', pairIndex, 'Token:', token);
}

export function unsubscribeFromStream(subscriberUID: string) {
  // Find a subscription with id === subscriberUID
  for (const pairIndex of channelToSubscription.keys()) {
    const subscriptionItem = channelToSubscription.get(pairIndex);

    if (!subscriptionItem) {
      continue;
    }

    const handlerIndex = subscriptionItem.handlers.findIndex(
      (handler) => handler.id === subscriberUID
    );

    if (handlerIndex !== -1) {
      // Remove from handlers
      subscriptionItem.handlers.splice(handlerIndex, 1);

      if (subscriptionItem.handlers.length === 0) {
        // Unsubscribe from the channel if it was the last handler
        console.log(
          '[unsubscribeBars]: Unsubscribe from streaming. Channel:',
          pairIndex
        );
        // socket.emit("SubRemove", { subs: [channelString] });
        channelToSubscription.delete(pairIndex);
        break;
      }
    }
  }
}
