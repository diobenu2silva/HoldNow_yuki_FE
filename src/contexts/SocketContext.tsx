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
    airdropClaim: number;
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

interface TransactionUpdatePayload {
  token: string;
  txId: string;
  type: string;
  amount: number;
  user: string;
  timestamp: number;
}

interface HoldersUpdatePayload {
  token: string;
  holders: { name: string; amount: number; owner: string; avatar?: string }[];
  timestamp: number;
}

// Validation callback types with validation parameters
interface ValidationParams {
  expectedToken?: string;
  expectedUser?: string;
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
  // New methods for real-time updates with validation
  onClaimDataUpdate?: (callback: (payload: ClaimDataUpdatedPayload) => void, validation?: ValidationParams) => void;
  onCoinInfoUpdate?: (callback: (payload: CoinInfoUpdatedPayload) => void, validation?: ValidationParams) => void;
  onStageChange?: (callback: (payload: StageChangedPayload) => void, validation?: ValidationParams) => void;
  onNewTokenCreated?: (callback: (payload: CoinInfoUpdatedPayload) => void, validation?: ValidationParams) => void;
  onTransactionUpdate?: (callback: (payload: TransactionUpdatePayload) => void, validation?: ValidationParams) => void;
  onHoldersUpdate?: (callback: (payload: HoldersUpdatePayload) => void, validation?: ValidationParams) => void;
  replyCounts?: { [coinId: string]: number };
  setReplyCounts?: Function;
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

  // Add reply counts state
  const [replyCounts, setReplyCounts] = useState<{ [coinId: string]: number }>({});


  // Callback storage for real-time updates with validation
  const [claimDataCallbacks, setClaimDataCallbacks] = useState<Array<{
    callback: (payload: ClaimDataUpdatedPayload) => void;
    validation?: ValidationParams;
  }>>([]);
  const [coinInfoCallbacks, setCoinInfoCallbacks] = useState<Array<{
    callback: (payload: CoinInfoUpdatedPayload) => void;
    validation?: ValidationParams;
  }>>([]);
  const [stageChangeCallbacks, setStageChangeCallbacks] = useState<Array<{
    callback: (payload: StageChangedPayload) => void;
    validation?: ValidationParams;
  }>>([]);
  const [newTokenCreatedCallbacks, setNewTokenCreatedCallbacks] = useState<Array<{
    callback: (payload: CoinInfoUpdatedPayload) => void;
    validation?: ValidationParams;
  }>>([]);
  const [transactionUpdateCallbacks, setTransactionUpdateCallbacks] = useState<Array<{
    callback: (payload: TransactionUpdatePayload) => void;
    validation?: ValidationParams;
  }>>([]);
  const [holdersUpdateCallbacks, setHoldersUpdateCallbacks] = useState<Array<{ callback: (payload: HoldersUpdatePayload) => void, validation?: ValidationParams }>>([]);
  const [isSocketReady, setIsSocketReady] = useState(false);

  const router = useRouter();
  // const router = useRouter();
  // wallet Info
  const wallet = useWallet();
  const { connection } = useConnection();

  // Validation helper function
  const validatePayload = (payload: any, validation?: ValidationParams): boolean => {
    if (!validation) return true; // No validation required
    
    // Check token validation
    if (validation.expectedToken && payload.token !== validation.expectedToken) {
      console.log('__yuki__ Socket: Token validation failed. Expected:', validation.expectedToken, 'Received:', payload.token);
      return false;
    }
    
    // Check user validation (for payloads that have user field)
    if (validation.expectedUser && payload.user && payload.user !== validation.expectedUser) {
      console.log('__yuki__ Socket: User validation failed. Expected:', validation.expectedUser, 'Received:', payload.user);
      return false;
    }
    
    return true;
  };

  // Real-time update handlers with validation
  const onClaimDataUpdate = useCallback((callback: (payload: ClaimDataUpdatedPayload) => void, validation?: ValidationParams) => {
    setClaimDataCallbacks(prev => [...prev, { callback, validation }]);
  }, []);

  const onCoinInfoUpdate = useCallback((callback: (payload: CoinInfoUpdatedPayload) => void, validation?: ValidationParams) => {
    if (!isSocketReady) return;
    setCoinInfoCallbacks(prev => [...prev, { callback, validation }]);
  }, [isSocketReady]);

  const onStageChange = useCallback((callback: (payload: StageChangedPayload) => void, validation?: ValidationParams) => {
    if (!isSocketReady) return;
    setStageChangeCallbacks(prev => [...prev, { callback, validation }]);
  }, [isSocketReady]);

  const onNewTokenCreated = useCallback((callback: (payload: CoinInfoUpdatedPayload) => void, validation?: ValidationParams) => {
    console.log('__yuki__ Socket: Registering newTokenCreated callback, socket ready:', isSocketReady);
    if (!isSocketReady) {
      console.log('__yuki__ Socket: Socket not ready, skipping callback registration');
      return;
    }
    setNewTokenCreatedCallbacks(prev => {
      const newCallbacks = [...prev, { callback, validation }];
      console.log('__yuki__ Socket: Total newTokenCreated callbacks after registration:', newCallbacks.length);
      return newCallbacks;
    });
  }, [isSocketReady]);

  const onTransactionUpdate = useCallback((callback: (payload: TransactionUpdatePayload) => void, validation?: ValidationParams) => {
    if (!isSocketReady) return;
    setTransactionUpdateCallbacks(prev => [...prev, { callback, validation }]);
  }, [isSocketReady]);

  const onHoldersUpdate = useCallback((callback: (payload: HoldersUpdatePayload) => void, validation?: ValidationParams) => {
    if (!isSocketReady) return;
    setHoldersUpdateCallbacks(prev => [...prev, { callback, validation }]);
  }, [isSocketReady]);

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

  // Real-time event handlers with validation
  const coinInfoUpdatedHandler = (payload: CoinInfoUpdatedPayload) => {
    console.log('__yuki__ Socket: Coin info updated:', payload);
    coinInfoCallbacks.forEach(({ callback, validation }) => {
      if (validatePayload(payload, validation)) {
        callback(payload);
      }
    });
  };

  const claimDataUpdatedHandler = (payload: ClaimDataUpdatedPayload) => {
    console.log('__yuki__ Socket: Claim data updated:', payload);
    claimDataCallbacks.forEach(({ callback, validation }) => {
      if (validatePayload(payload, validation)) {
        callback(payload);
      }
    });
  };

  const stageChangedHandler = (payload: StageChangedPayload) => {
    console.log('__yuki__ Socket: Stage changed:', payload);
    stageChangeCallbacks.forEach(({ callback, validation }) => {
      if (validatePayload(payload, validation)) {
        callback(payload);
      }
    });
  };

  const newTokenCreatedHandler = (payload: CoinInfoUpdatedPayload) => {
    console.log('__yuki__ Socket: New token created:', payload);
    console.log('__yuki__ Socket: Number of newTokenCreated callbacks:', newTokenCreatedCallbacks.length);
    newTokenCreatedCallbacks.forEach(({ callback, validation }, index) => {
      console.log('__yuki__ Socket: Calling newTokenCreated callback', index);
      if (validatePayload(payload, validation)) {
        callback(payload);
      } else {
        console.log('__yuki__ Socket: Callback validation failed for index', index);
      }
    });
  };

  const transactionUpdateHandler = (payload: TransactionUpdatePayload, ack?: (msg: string) => void) => {
    console.log('__yuki__ Socket: Transaction update:', payload);
    transactionUpdateCallbacks.forEach(({ callback, validation }) => {
      if (validatePayload(payload, validation)) {
        callback(payload);
      }
    });
    if (ack) ack('ok');
  };

  const holdersUpdateHandler = (payload: HoldersUpdatePayload, ack?: (msg: string) => void) => {
    console.log('__yuki__ Socket: Holders update:', payload);
    holdersUpdateCallbacks.forEach(({ callback, validation }) => {
      if (validatePayload(payload, validation)) {
        callback(payload);
      }
    });
    if (ack) ack('ok');
  };

  // init socket client object and handle wallet changes
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL!, {
      transports: ['websocket'],
    });
    socket.on('connect', async () => {
      console.log(' --@ connected to backend', socket.id);
      setIsSocketReady(true);
    });
    socket.on('disconnect', () => {
      console.log(' --@ disconnected from backend', socket.id);
      setIsSocketReady(false);
    });
    setSocket(socket);

    // Reset socket connection when wallet changes
    const resetSocket = () => {
      console.log('__yuki__ Socket: Resetting socket connection for wallet change');
      
      // Clear all callbacks to prevent stale data
      setClaimDataCallbacks([]);
      setCoinInfoCallbacks([]);
      setStageChangeCallbacks([]);
      setNewTokenCreatedCallbacks([]);
      setTransactionUpdateCallbacks([]);
      setHoldersUpdateCallbacks([]);
      
      // Disconnect and reconnect socket
      socket.disconnect();
      
      // Small delay to ensure clean disconnect
      setTimeout(() => {
        socket.connect();
        console.log('__yuki__ Socket: Reconnected after wallet change');
      }, 100);
    };

    // Reset socket when wallet changes
    resetSocket();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [wallet.publicKey]); // Dependency on wallet.publicKey triggers reset on wallet change

  useEffect(() => {
    if (!socket) return;

    socket.on('connectionUpdated', connectionUpdatedHandler);
    socket.on('Creation', () => {
      console.log('--------@ Token Creation: ');
    });
    socket.on('TokenCreated', createSuccessHandler);
    socket.on('TokenNotCreated', createFailedHandler);
    socket.on('MessageUpdated', (coinId: string, message: any, replyCount: number) => {
      // Handle the existing message update logic
      createMessageHandler(coinId, message);
      
      // Also update the reply count
      setReplyCounts(prev => ({
        ...prev,
        [coinId]: replyCount
      }));
    });

    // Add new real-time event listeners
    socket.on('coinInfoUpdated', coinInfoUpdatedHandler);
    socket.on('claimDataUpdated', claimDataUpdatedHandler);
    socket.on('stageChanged', stageChangedHandler);
    socket.on('newTokenCreated', newTokenCreatedHandler);
    socket.on('transactionUpdate', transactionUpdateHandler);
    socket.on('holdersUpdate', holdersUpdateHandler);

    return () => {
      socket.off('connectionUpdated', connectionUpdatedHandler);
      socket.off('Creation');
      socket.off('TokenCreated', createSuccessHandler);
      socket.off('TokenNotCreated', createFailedHandler);
      socket.off('MessageUpdated');
      
      // Remove new real-time event listeners
      socket.off('coinInfoUpdated', coinInfoUpdatedHandler);
      socket.off('claimDataUpdated', claimDataUpdatedHandler);
      socket.off('stageChanged', stageChangedHandler);
      socket.off('newTokenCreated', newTokenCreatedHandler);
      socket.off('transactionUpdate', transactionUpdateHandler);
      socket.off('holdersUpdate', holdersUpdateHandler);
    };
  }, [socket, claimDataCallbacks, coinInfoCallbacks, stageChangeCallbacks, newTokenCreatedCallbacks, transactionUpdateCallbacks, holdersUpdateCallbacks]);

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
        // New methods for real-time updates with validation
        onClaimDataUpdate,
        onCoinInfoUpdate,
        onStageChange,
        onNewTokenCreated,
        onTransactionUpdate,
        onHoldersUpdate,
        replyCounts,
        setReplyCounts,
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
