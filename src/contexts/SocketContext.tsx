/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { errorAlert, successAlert } from '@/components/others/ToastGroup';
import { msgInfo, coinInfo } from '@/utils/types';
import UserContext from '@/context/UserContext';

// Socket event payload types
interface CoinInfoUpdatedPayload {
  token: string;
  coinInfo: coinInfo;
}

interface ClaimDataUpdatedPayload {
  token: string;
  user: string;
  claimData: {
    claimInUSD: number;
    claimHodl: number;
    currentClaim: number;
    solPrice: number;
    rewardCap: number;
    tokenBalance: number;
  };
}

interface StageChangedPayload {
  token: string;
  newStage: number;
  stageStarted: boolean;
  stageEnded: boolean;
  timestamp: number;
  isAirdropStage: boolean;
  isBondingCurve: boolean;
}

interface Context {
  socket?: Socket;
  counter?: number;
  randValue?: number;
  setRandValue?: Function;
  userArr?: any[];
  setUserArr?: Function;
  playerNumber?: number;
  setPlayerNumber?: Function;
  isLoading?: boolean;
  setIsLoading?: Function;
  isShowModal?: string;
  setIsShowModal?: Function;
  currentDepositAmount?: number;
  setCurrentDepositAmount?: Function;
  numberDecimals?: number;
  alertState?: AlertState;
  setAlertState?: Function;
  // New methods for real-time updates
  onClaimDataUpdate?: (callback: (payload: ClaimDataUpdatedPayload) => void) => void;
  onCoinInfoUpdate?: (callback: (payload: CoinInfoUpdatedPayload) => void) => void;
  onStageChange?: (callback: (payload: StageChangedPayload) => void) => void;
  onNewTokenCreated?: (callback: (payload: CoinInfoUpdatedPayload) => void) => void;
}

const context = createContext<Context>({});

export const useSocket = () => useContext(context);

const SocketProvider = (props: { children: any }) => {
  const { coinId, setCoinId, newMsg, setNewMsg } = useContext(UserContext);
  const [socket, setSocket] = useState<Socket>();
  const [counter, setCounter] = useState<number>(1);
  const [randValue, setRandValue] = useState<number>(0);
  const [userArr, setUserArr] = useState<any[]>();
  const [playerNumber, setPlayerNumber] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isShowModal, setIsShowModal] = useState('');
  const [currentDepositAmount, setCurrentDepositAmount] = useState(0);
  const [numberDecimals, setNumberDecimals] = useState(3);
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  // Callback storage for real-time updates
  const [claimDataCallbacks, setClaimDataCallbacks] = useState<((payload: ClaimDataUpdatedPayload) => void)[]>([]);
  const [coinInfoCallbacks, setCoinInfoCallbacks] = useState<((payload: CoinInfoUpdatedPayload) => void)[]>([]);
  const [stageChangeCallbacks, setStageChangeCallbacks] = useState<((payload: StageChangedPayload) => void)[]>([]);
  const [newTokenCreatedCallbacks, setNewTokenCreatedCallbacks] = useState<((payload: CoinInfoUpdatedPayload) => void)[]>([]);

  const router = useRouter();
  // const router = useRouter();
  // wallet Info
  const wallet = useWallet();
  const { connection } = useConnection();

  // Real-time update handlers
  const onClaimDataUpdate = useCallback((callback: (payload: ClaimDataUpdatedPayload) => void) => {
    setClaimDataCallbacks(prev => [...prev, callback]);
  }, []);

  const onCoinInfoUpdate = useCallback((callback: (payload: CoinInfoUpdatedPayload) => void) => {
    setCoinInfoCallbacks(prev => [...prev, callback]);
  }, []);

  const onStageChange = useCallback((callback: (payload: StageChangedPayload) => void) => {
    setStageChangeCallbacks(prev => [...prev, callback]);
  }, []);

  const onNewTokenCreated = useCallback((callback: (payload: CoinInfoUpdatedPayload) => void) => {
    setNewTokenCreatedCallbacks(prev => [...prev, callback]);
  }, []);

  const connectionUpdatedHandler = (data: number) => {
    setCounter(data);
  };

  const createSuccessHandler = (name: string, mint: string) => {
    console.log('Successfully Create Token Name:', name);
    setAlertState({
      open: true,
      message: 'Success',
      severity: 'success',
    });
    successAlert(`Successfully Created token: ${name} \n ${mint}`);
    setIsLoading(false);
  };

  const createFailedHandler = (name: string, mint: string) => {
    console.log('Failed Create Token Name:', name);
    setAlertState({
      open: true,
      message: 'Failed',
      severity: 'error',
    });
    errorAlert(`Failed Create token: ${name} \n ${mint}`);
    setIsLoading(false);
  };

  const createMessageHandler = (updateCoinId: string, updateMsg: msgInfo) => {
    console.log('Updated Message', updateCoinId, updateMsg);
    setCoinId(updateCoinId);
    setNewMsg(updateMsg);
  };

  // Real-time event handlers
  const coinInfoUpdatedHandler = (payload: CoinInfoUpdatedPayload) => {
    console.log('__yuki__ Socket: Coin info updated:', payload);
    coinInfoCallbacks.forEach(callback => callback(payload));
  };

  const claimDataUpdatedHandler = (payload: ClaimDataUpdatedPayload) => {
    console.log('__yuki__ Socket: Claim data updated:', payload);
    claimDataCallbacks.forEach(callback => callback(payload));
  };

  const stageChangedHandler = (payload: StageChangedPayload) => {
    console.log('__yuki__ Socket: Stage changed:', payload);
    stageChangeCallbacks.forEach(callback => callback(payload));
  };

  const newTokenCreatedHandler = (payload: CoinInfoUpdatedPayload) => {
    console.log('__yuki__ Socket: New token created:', payload);
    newTokenCreatedCallbacks.forEach(callback => callback(payload));
  };

  // init socket client object
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      transports: ['websocket'],
    });
    socket.on('connect', async () => {
      console.log(' --@ connected to backend', socket.id);
    });
    socket.on('disconnect', () => {
      console.log(' --@ disconnected from backend', socket.id);
    });
    setSocket(socket);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, []); // Remove router dependency to prevent recreation on route changes

  useEffect(() => {
    if (!socket) return;

    socket.on('connectionUpdated', connectionUpdatedHandler);
    socket.on('Creation', () => {
      console.log('--------@ Token Creation: ');
    });
    socket.on('TokenCreated', createSuccessHandler);
    socket.on('TokenNotCreated', createFailedHandler);
    socket.on('MessageUpdated', createMessageHandler);

    // Add new real-time event listeners
    socket.on('coinInfoUpdated', coinInfoUpdatedHandler);
    socket.on('claimDataUpdated', claimDataUpdatedHandler);
    socket.on('stageChanged', stageChangedHandler);
    socket.on('newTokenCreated', newTokenCreatedHandler);

    return () => {
      socket.off('connectionUpdated', connectionUpdatedHandler);
      socket.off('Creation');
      socket.off('TokenCreated', createSuccessHandler);
      socket.off('TokenNotCreated', createFailedHandler);
      socket.off('MessageUpdated', createMessageHandler);
      
      // Remove new real-time event listeners
      socket.off('coinInfoUpdated', coinInfoUpdatedHandler);
      socket.off('claimDataUpdated', claimDataUpdatedHandler);
      socket.off('stageChanged', stageChangedHandler);
      socket.off('newTokenCreated', newTokenCreatedHandler);
    };
  }, [socket, claimDataCallbacks, coinInfoCallbacks, stageChangeCallbacks, newTokenCreatedCallbacks]);

  return (
    <context.Provider
      value={{
        socket,
        counter,
        randValue,
        setRandValue,
        userArr,
        setUserArr,
        playerNumber,
        setPlayerNumber,
        isLoading,
        setIsLoading,
        isShowModal,
        setIsShowModal,
        currentDepositAmount,
        setCurrentDepositAmount,
        numberDecimals,
        alertState,
        setAlertState,
        // New methods for real-time updates
        onClaimDataUpdate,
        onCoinInfoUpdate,
        onStageChange,
        onNewTokenCreated,
      }}
    >
      {props.children}
    </context.Provider>
  );
};

export interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}

export default SocketProvider;
