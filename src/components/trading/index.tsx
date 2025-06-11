"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { Chatting } from "@/components/trading/Chatting";
import { TradeForm } from "@/components/trading/TradeForm";
import { TradingChart } from "@/components/TVChart/TradingChart";
import UserContext from "@/context/UserContext";
import { coinInfo, userInfo } from "@/utils/types";
import { claim, getClaim, getCoinInfo, getSolPriceInUSD } from "@/utils/util";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import SocialList from "../others/socialList";
import TokenData from "../others/TokenData";
import { DataCard } from "../cards/DataCard";
import { FaCopy } from "react-icons/fa6";
import { successAlert } from "../others/ToastGroup";
import { ConnectButton } from "../buttons/ConnectButton";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getClaimAmount, getTokenBalance } from "@/program/web3";
import { showCountdownToast } from "@/utils/showCountdownToast";
import { useQuery } from "react-query";
import { useClaim } from "@/context/ClaimContext";
import { PublicKey } from "@solana/web3.js";

const getBalance = async (wallet: string, token: string) => {
  try {
    const balance = await getTokenBalance(wallet, token);
    return balance;
  } catch (error) {
    return 0;
  }
};

const isUserInfo = (obj: any): obj is userInfo => {
  return obj && typeof obj === "object" && "_id" in obj;
};

export default function TradingPage() {
  const { coinId, setCoinId, login, user, web3Tx, setWeb3Tx } = useContext(UserContext);
  const { publicKey } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const pathname = usePathname();
  const [param, setParam] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [coin, setCoin] = useState<coinInfo>({} as coinInfo);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [stageProg, setStageProg] = useState<number>(0);
  const [sellTax, setSellTax] = useState<number>(0);
  const { claimAmount, setClaimAmount } = useClaim();
  const router = useRouter();

  const segments = pathname.split("/");
  const parameter = segments[segments.length - 1];

  setClaimAmount(0); // Reset claim amount on page load
  console.log("Yuki: TradingPage: parameter:", parameter);
  
  useEffect(() => {
    setParam(parameter);
    setCoinId(parameter);
  }, [parameter]);

  // const { data, refetch } = useQuery<coinInfo | undefined>(["coinInfo", parameter], () => getCoinInfo(parameter), {
  //   refetchInterval: 30000, // Refetch every 30s
  // });

  useEffect(() => {
    const fetchData = async () => {
      const data = await getCoinInfo(parameter);
      if (!data) return;

      setCoin(data);

      const millisecondsInADay = 120 * 1000;
      const nowDate = new Date();
      const atStageStartedDate = new Date(data.atStageStarted);
      const period = nowDate.getTime() - atStageStartedDate.getTime();
      const stageProgress = Math.round((period * 10000) / (millisecondsInADay * data.stageDuration)) / 100;
      setStageProg(stageProgress > 100 ? 100 : stageProgress);

      const solPrice = await getSolPriceInUSD();
      setProgress(Math.round((data.progressMcap * solPrice) / 10) / 100);
      setLiquidity(Math.round((data.lamportReserves / 1e9) * solPrice * 2 / 10) / 100);
    };

    fetchData();

    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [publicKey, web3Tx, parameter]);

  console.log("yuki: airdropstage1:", coin.airdropStage);
  useEffect(() => {
    console.log("yuki: airdropstage:", coin.airdropStage);
    if (!coin.airdropStage || !coin.atStageStarted || !coin.currentStage) return;

    // const millisecondsInADay = 24 * 60 * 60 * 1000;
    const millisecondsInADay = 120 * 1000;
    const startTime = new Date(coin.atStageStarted);
    const futureTime = new Date(startTime.getTime() + millisecondsInADay);

    showCountdownToast(
      futureTime,
      `Stage ${coin.currentStage - 1} has completed. Next stage will begin in`,
      "New Stage has begun!"
    );
  }, [coin.airdropStage]);

  useEffect(() => {
    console.log("yuki: stageProg: ", stageProg, "coin:", coin);
    if (stageProg > coin.sellTaxDecay) {
      setSellTax(coin.sellTaxMin);
      console.log("yuki: sellTax1:", sellTax);
    } else {
      setSellTax(Math.round(coin.sellTaxMax - (coin.sellTaxMax - coin.sellTaxMin) / coin.sellTaxDecay * stageProg ));
      console.log("yuki: sellTax2:", sellTax);
    }
  }, [stageProg, coin]);

  const copyToClipBoard = async (copyMe: string) => {
    try {
      await navigator.clipboard.writeText(copyMe);
      setCopySuccess("Copied!");
      successAlert("Copied!");
    } catch (err) {
      setCopySuccess("Failed to copy!");
    }
  };
  const wallet = useWallet();
  const handleClaim = async () => {
    const res = await claim(user, coin, wallet);
    if (res === "success") setWeb3Tx(res);

    setTimeout(async () => {
      const newAmount = await getClaimAmount(new PublicKey(coin.token), wallet);
      setClaimAmount(newAmount);
      console.log("Yuki: setClaimAmount/index: ", newAmount);
    }, 1000);
    
  };

  return (
    <div className="w-full flex flex-col px-3 mx-auto gap-5 pb-20">
      <div className="text-center">
        <div className="w-full flex flex-col">
          <div onClick={() => router.push("/")} className="w-24 cursor-pointer text-white text-2xl flex flex-row items-center gap-2 pb-2">
            <IoMdArrowRoundBack /> Back
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col md3:flex-row gap-4">
        <div className="w-full px-2">
          <div className="w-full flex flex-col justify-between text-white gap-2">
            <div className="flex flex-row gap-2 items-center justify-between">
              <p className="font-semibold">Token Name - {coin?.name}</p>
              <p className="font-semibold">Ticker: {coin?.ticker}</p>
            </div>
            <div className="flex flex-row justify-end items-center gap-2 pb-2">
              <p className="font-semibold">CA: {coin?.token}</p>
              <p onClick={() => copyToClipBoard(coin?.token)} className="cursor-pointer text-xl">
                <FaCopy />
              </p>
            </div>
          </div>
          <TradingChart param={coin} />
          <Chatting param={param} coin={coin} />
        </div>

        <div className="w-full max-w-[300px] 2xs:max-w-[420px] px-2 gap-4 flex flex-col mx-auto">
          <TradeForm coin={coin} progress={progress} />

          <div className="w-full flex flex-col text-center text-white gap-4 py-4 border-[1px] border-[#64ffda] rounded-lg px-3">
            <p className="font-semibold text-xl">
              Stage {coin.airdropStage ? coin.currentStage - 1 : coin.currentStage} Reward Claim
              </p>
            {(login && publicKey) ? (
              <div className="w-full justify-center items-center flex flex-col gap-2">
                <p className="text-sm px-5">You are eligible to claim:</p>
                <p className="text-xl font-semibold">{`${Number(claimAmount).toFixed(2)} ${coin.name}`}</p>
              </div>
            ) : (
              <p className="text-sm px-5">Connect your wallet to check your eligibility to claim this token</p>
            )}
            <div className="flex flex-col">
              {(login && publicKey) ? (
                <div
                  onClick={coin.airdropStage ? handleClaim : undefined}
                  className={`w-1/2 border-[1px] border-[#64ffda] cursor-pointer rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto
                    ${coin.airdropStage ? 'hover:bg-[#64ffda]/30' : 'bg-gray-300 cursor-not-allowed'}`}
                >
                  Claim
                </div>
              ) : (
                <div
                  className="w-1/2 border-[1px] border-[#64ffda] cursor-pointer hover:bg-[#64ffda]/30 rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto"
                  onClick={() => setVisible(true)}
                >
                  Connect Wallet
                </div>
              )}
            </div>
          </div>

          <div className="text-white font-bold flex flex-row items-center gap-1 text-xl justify-center">
            <p>HODL</p>
            <p onClick={() => copyToClipBoard(coinId)} className="cursor-pointer"><FaCopy /></p>
            / <p>SOL</p>
          </div>

          <SocialList coin={coin} />

          <div className="w-full flex flex-col gap-4 text-white">
            <div className="w-full flex flex-col 2xs:flex-row gap-4 items-center justify-between">
              <DataCard text="MKP CAP" data={`${progress} k`} />
              <DataCard text="Liquidity" data={`${liquidity} k`} />
            </div>
            <div className="w-full flex flex-col 2xs:flex-row gap-4 items-center justify-between">
              <DataCard text="Stage" data={`${coin.currentStage} of ${coin.stagesNumber}`} />
              <DataCard text="Sell Tax" data={`${sellTax} %`} />
              <DataCard text="Redistribution" data="$ 15.2K" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="w-full flex flex-col gap-2 px-3 py-2">
              <p className="text-white text-base lg:text-xl">
                {coin.airdropStage
                  ? `Airdrop ${coin.currentStage - 1} Completion : ${stageProg}% of ${coin.stageDuration} Days`
                  : `Stage ${coin.currentStage} Completion : ${stageProg}% of ${coin.stageDuration} Days`}
              </p>
              <div className="bg-white rounded-full h-2 relative">
                <div
                  className="bg-custom-gradient rounded-full h-2"
                  style={{ width: `${stageProg}%` }}
                ></div>
              </div>
            </div>
          </div>

          <TokenData coinData={coin} />
        </div>
      </div>
    </div>
  );
}
