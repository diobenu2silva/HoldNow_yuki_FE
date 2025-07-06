'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Chatting } from '@/components/trading/Chatting';
import { TradeForm } from '@/components/trading/TradeForm';
import { TradingChart } from '@/components/TVChart/TradingChart';
import UserContext from '@/context/UserContext';
import { coinInfo, userInfo } from '@/utils/types';
import {
  claim,
  getClaim,
  getClaimData,
  getCoinInfo,
  getSolPriceInUSD,
} from '@/utils/util';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { IoMdArrowRoundBack } from 'react-icons/io';
import SocialList from '../others/socialList';
import TokenData from '../others/TokenData';
import { DataCard } from '../cards/DataCard';
import { FaCopy } from 'react-icons/fa6';
import { errorAlert, successAlert } from '../others/ToastGroup';
import { ConnectButton } from '../buttons/ConnectButton';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { getTokenBalance } from '@/program/web3';
import { showCountdownToast } from '@/utils/showCountdownToast';
import { useQuery } from 'react-query';
import { useClaim } from '@/context/ClaimContext';
import { PublicKey } from '@solana/web3.js';
import { useCountdownToast } from '@/utils/useCountdownToast';
import { token } from '@coral-xyz/anchor/dist/cjs/utils';
import { motion } from 'framer-motion';

const getBalance = async (wallet: string, token: string) => {
  try {
    const balance = await getTokenBalance(wallet, token);
    return balance;
  } catch (error) {
    return 0;
  }
};

const isUserInfo = (obj: any): obj is userInfo => {
  return obj && typeof obj === 'object' && '_id' in obj;
};

export default function TradingPage() {
  const { coinId, setCoinId, login, user, web3Tx, setWeb3Tx } =
    useContext(UserContext);
  const { publicKey } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const pathname = usePathname();
  const [param, setParam] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [coin, setCoin] = useState<coinInfo>({} as coinInfo);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [stageProg, setStageProg] = useState<number>(0);
  const [sellTax, setSellTax] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [manualClaimInUSD, setManualClaimInUSD] = useState<number | null>(null);
  const [manualClaimHodl, setManualClaimHodl] = useState<number | null>(null);
  const [isErrorExpanded, setIsErrorExpanded] = useState<boolean>(false);
  const { claimAmount } = useClaim();
  const router = useRouter();

  const segments = pathname.split('/');
  const parameter = segments[segments.length - 1];

  useEffect(() => {
    setParam(parameter);
    setCoinId(parameter);
    setCoin({} as coinInfo);
    setIsLoading(true);
    
    // Immediately fetch coin data to avoid waiting for ClaimContext
    const fetchInitialData = async () => {
      try {
        const coinData = await getCoinInfo(parameter);
        setCoin(coinData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching initial coin data:', error);
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [parameter]);

  const [claimInUSD, claimHodl, currentClaim, solPrice, rewardCap, coinData] =
    claimAmount;
  // console.log("__yuki__ claimInUSD:", claimInUSD, " claimHodl:", claimHodl, "currentClaim:", currentClaim, "solPrice:", solPrice, "coinData:", coinData);
  const fetchData = async () => {
    // Only update if we have new coin data and it's different from current
    if (coinData && coinData._id && coinData._id !== coin._id) {
      console.log('__yuki__ fetchData called with coinData:', {
        name: coinData.name,
        movedToRaydium: coinData.movedToRaydium,
        moveRaydiumFailed: coinData.moveRaydiumFailed,
        moveRaydiumFailureReason: coinData.moveRaydiumFailureReason
      });
      
      setCoin(coinData);
    }
    if (!coinData.bondingCurve) {
      const millisecondsInADay = 120 * 1000;
      // const millisecondsInADay = 24 * 60 * 60 * 1000;
      const nowDate = new Date();
      const atStageStartedDate = new Date(coinData.atStageStarted);
      const period = nowDate.getTime() - atStageStartedDate.getTime();
      const stageProgress =
        Math.round(
          (period * 10000) / (millisecondsInADay * (coinData.airdropStage ? 1 : coinData.stageDuration))
        ) / 100;
      setStageProg(stageProgress > 100 ? 100 : stageProgress);

      setProgress(Math.round((coinData.progressMcap * solPrice) / 10) / 100);
      setLiquidity(
        Math.round(((coinData.lamportReserves / 1e9) * solPrice * 2) / 10) / 100
      );
    } else {

      console.log('__yuki__ bondingCurve is true, and claim requested');
      setProgress(100);
      setLiquidity(0);
      setStageProg(100);

      const fetchUpdatedData = async () => {

        const segments = pathname.split('/');
        const parameter = segments[segments.length - 1];
        const coin = await getCoinInfo(parameter);
        
        if (coin.token && wallet.publicKey) {
          console.log('__yuki__ 2nd fetchUpdatedData called');
          try {
            const response = await getClaimData(
              coin.token,
              wallet.publicKey.toBase58()
            );
            setManualClaimInUSD(response.claimInUSD ?? 0);
            setManualClaimHodl(response.claimHodl ?? 0);
            console.log('__yuki__ Manual values set:', {
              manualClaimInUSD: response.claimInUSD ?? 0,
              manualClaimHodl: response.claimHodl ?? 0
            });
          } catch (error) {
            setManualClaimInUSD(0);
            setManualClaimHodl(0);
          }
        }
      };
      
      // Fetch once after a short delay to ensure backend has updated the data
      setTimeout(fetchUpdatedData, 100);

    }
  };

  useEffect(() => {
    fetchData();
  }, [publicKey, web3Tx, claimInUSD, claimHodl, solPrice, coinData]);

  // Handle Raydium status changes and trigger notifications
  useEffect(() => {
    console.log('__yuki__ Trading page useEffect triggered - coinData:', {
      movedToRaydium: coinData.movedToRaydium,
      moveRaydiumFailed: coinData.moveRaydiumFailed,
      moveRaydiumFailureReason: coinData.moveRaydiumFailureReason,
      raydiumUrl: coinData.raydiumUrl
    });
    
    if (coinData.moveRaydiumFailed) {
      console.log('__yuki__ Move to Raydium failed:', coinData.moveRaydiumFailureReason);
      // The notification will be displayed automatically via the conditional rendering
    }
    
    if (coinData.movedToRaydium) {
      console.log('__yuki__ Moved to Raydium successfully:', coinData.raydiumUrl);
      // The notification will be displayed automatically via the conditional rendering
    }
  }, [coinData.movedToRaydium, coinData.moveRaydiumFailed, coinData.moveRaydiumFailureReason, coinData.raydiumUrl]);

  // Debug logging for render state
  useEffect(() => {
    console.log('__yuki__ Render check - coin state:', {
      name: coin.name,
      movedToRaydium: coin.movedToRaydium,
      moveRaydiumFailed: coin.moveRaydiumFailed,
      moveRaydiumFailureReason: coin.moveRaydiumFailureReason
    });
  }, [coin.movedToRaydium, coin.moveRaydiumFailed, coin.moveRaydiumFailureReason]);

  useCountdownToast(coin);

  useEffect(() => {
    if (coinData.airdropStage) {
      setSellTax(0);
    } else if (stageProg > coin.sellTaxDecay) {
      setSellTax(coin.sellTaxMin);
    } else {
      setSellTax(
        Math.round(
          coin.sellTaxMax -
            ((coin.sellTaxMax - coin.sellTaxMin) / coin.sellTaxDecay) *
              stageProg
        )
      );
    }
  }, [stageProg, coin]);

  const copyToClipBoard = async (copyMe: string) => {
    try {
      await navigator.clipboard.writeText(copyMe);
      setCopySuccess('Copied!');
      successAlert('Copied!');
    } catch (err) {
      setCopySuccess('Failed to copy!');
    }
  };

  const copyErrorToClipboard = async () => {
    const errorMessage = coin.moveRaydiumFailureReason || 'Unknown error';
    try {
      await navigator.clipboard.writeText(errorMessage);
      successAlert('Error message copied to clipboard!');
    } catch (err) {
      errorAlert('Failed to copy error message');
    }
  };
  const wallet = useWallet();
  const handleClaim = async () => {
    const res = await claim(user, coin, wallet, Number(claimHodl));
    fetchData();

    if (res !== 'success') {
      console.log('__yuki__ claim failed');
      errorAlert('Claim failed');
    }
    console.log('__yuki__ claim res : ', res);
  };

  return (
    <div className="w-full min-h-screen">
      <div className="container py-8">
        <div className="w-full flex flex-col px-3 mx-auto gap-5 pb-20">
          <div className="text-center">
            <div className="w-full flex flex-col">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="w-24 cursor-pointer text-foreground text-2xl flex flex-row items-center gap-2 pb-2 hover:text-primary transition-colors duration-200"
              >
                <IoMdArrowRoundBack /> Back
              </motion.div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="w-full flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-foreground">Loading token data...</span>
            </div>
          )}

          {/* Raydium Move Failed Notification - Show only if failed, even if later succeeded */}
          {!isLoading && coin.moveRaydiumFailed && (
            <div className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white p-4 rounded-lg">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-xl font-bold mb-2">❌ Move to Raydium Failed</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/10 p-3 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                    <span className="text-red-300 flex-shrink-0">✗</span>
                    <span className="font-medium truncate">{coin.name} ({coin.ticker})</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span 
                      className={`text-white font-medium text-sm sm:text-base break-words flex-1 cursor-pointer hover:text-gray-200 transition-colors overflow-hidden ${
                        isErrorExpanded ? 'whitespace-normal' : 'truncate'
                      }`}
                      onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                      title={isErrorExpanded ? 'Click to collapse' : 'Click to expand'}
                    >
                      {coin.moveRaydiumFailureReason || 'Unknown error'}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={copyErrorToClipboard}
                      className="flex-shrink-0 text-white hover:text-gray-200 transition-colors p-1"
                      title="Copy error message"
                    >
                      <FaCopy className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Raydium Success Notification - Show only if succeeded AND never failed */}
          {!isLoading && coin.movedToRaydium && !coin.moveRaydiumFailed && (
            <div className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="max-w-6xl mx-auto">
                <h3 className="text-xl font-bold mb-2">Moved to Raydium Successfully!</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/10 p-3 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-shrink-0">
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span className="font-medium truncate">{coin.name} ({coin.ticker})</span>
                  </div>
                  <a
                    href={coin.raydiumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex-shrink-0 ml-auto sm:ml-0"
                  >
                    Trade on Raydium
                  </a>
                </div>
              </div>
            </div>
          )}

          <div className="w-full flex flex-col md3:flex-row gap-4">
            <div className="w-full px-2">
              <div className="w-full flex flex-col justify-between gap-2">
                <div className="flex flex-row gap-2 items-center justify-between">
                  <p className="font-semibold text-foreground">Token Name - {coin?.name}</p>
                  <p className="font-semibold text-foreground">Ticker: {coin?.ticker}</p>
                </div>
                <div className="flex flex-row justify-end items-center gap-2 pb-2">
                  <p className="font-semibold text-foreground">CA: {coin?.token}</p>
                  <motion.p
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipBoard(coin?.token)}
                    className="cursor-pointer text-xl text-primary hover:text-primary/80 transition-colors duration-200"
                  >
                    <FaCopy />
                  </motion.p>
                </div>
              </div>
              <TradingChart param={coin} />
              <Chatting param={param} coin={coin} />
            </div>

            <div className="w-full max-w-[300px] 2xs:max-w-[420px] px-2 gap-4 flex flex-col mx-auto">
              <TradeForm coin={coin} progress={progress} />

              <div className="w-full flex flex-col text-center gap-4 py-4 border-2 border-primary/30 rounded-lg px-3 bg-card shadow-lg">
                {coin.bondingCurve ? (
                  <p className="font-semibold text-xl text-foreground">{`All Stages Completed`}</p>
                ) : (
                  <p className="font-semibold text-xl text-foreground">
                    {`Stage ${Math.min(coin.currentStage, coin.stagesNumber)} Reward Claim`}
                  </p>
                )}
                {login && publicKey ? (
                  <div className="w-full justify-center items-center flex flex-col gap-2">             
                    <p className="text-sm px-5 text-muted-foreground">You are eligible to claim:</p>
                    <p className="text-xl font-semibold text-primary">{`${Number(
                      (coin.bondingCurve && ( manualClaimInUSD !== null )) ? manualClaimInUSD : claimInUSD
                    ).toPrecision(9)} USD`}</p>
                    <p className="text-xl font-semibold text-primary">{`${Number(
                      (coin.bondingCurve && ( manualClaimHodl !== null )) ? manualClaimHodl : claimHodl
                    ).toPrecision(6)} HODL`}</p>
                  </div>
                ) : (
                  <p className="text-sm px-5 text-muted-foreground">
                    Connect your wallet to check your eligibility to claim this
                    token
                  </p>
                )}
                <div className="flex flex-col">
                  { (
                    login && publicKey ? (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={
                          coin.airdropStage
                            ? handleClaim
                            : undefined
                        }
                        className={`w-1/2 border-2 border-primary/30 cursor-pointer rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto transition-all duration-200
                          ${
                            coin.airdropStage
                              ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                      >
                        Claim
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-1/2 border-2 border-primary/30 cursor-pointer hover:bg-accent rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto transition-all duration-200 text-primary"
                        onClick={() => setVisible(true)}
                      >
                        Connect Wallet
                      </motion.div>
                    )
                  )}
                </div>
              </div>

              <div className="text-foreground font-bold flex flex-row items-center gap-1 text-xl justify-center">
                <p>HODL</p>
                <motion.p
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => copyToClipBoard(coin.token)}
                  className="cursor-pointer text-primary hover:text-primary/80 transition-colors duration-200"
                >
                  <FaCopy />
                </motion.p>
                / <p>SOL</p>
              </div>

              <SocialList coin={coin} />

              <div className="w-full flex flex-col gap-4">
                <div className="w-full flex flex-col 2xs:flex-row gap-4 items-center justify-between">
                  <DataCard text="MKP CAP" data={`${progress} k`} />
                  <DataCard text="Liquidity" data={`${liquidity} k`} />
                </div>
                <div className="w-full flex flex-col 2xs:flex-row gap-4 items-center justify-between">
                  <DataCard
                    text="Stage"
                    data={`${Math.min(coin.currentStage, coin.stagesNumber)} of ${coin.stagesNumber}`}
                  />
                  <DataCard text="Sell Tax" data={`${sellTax} %`} />
                  <DataCard text="Redistribution" data="$ 15.2K" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-full flex flex-col gap-2 px-3 py-2">
                  <p className="text-foreground text-base lg:text-xl">
                    {coin.bondingCurve
                      ? 'All Stages Completed'
                      : coin.airdropStage
                        ? `Airdrop ${Math.min(coin.currentStage, coin.stagesNumber)} Completion : ${stageProg}% of 1 Day`
                        : `Stage ${Math.min(coin.currentStage, coin.stagesNumber)} Completion : ${stageProg}% of ${coin.stageDuration} Days`}
                  </p>
                  <div className="bg-muted rounded-full h-2 relative">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-300"
                      style={{ width: `${stageProg}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <TokenData coinData={coin} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}