"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { Chatting } from "@/components/trading/Chatting";
import { TradeForm } from "@/components/trading/TradeForm";
import { TradingChart } from "@/components/TVChart/TradingChart";
import UserContext from "@/context/UserContext";
import { coinInfo } from "@/utils/types";
import { claim, getClaim, getCoinInfo, getCoinTrade, getCoinsInfoBy, getSolPriceInUSD } from "@/utils/util";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import SocialList from "../others/socialList";
import TokenData from "../others/TokenData";
import TokenDistribution from "../others/TokenDistribution";
import { DataCard } from "../cards/DataCard";
import { FaCopy } from "react-icons/fa6";
import { successAlert } from "../others/ToastGroup";
import { ConnectButton } from "../buttons/ConnectButton";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getTokenBalance } from "@/program/web3";


const getBalance = async (wallet : string, token: string) => {
  try {
    const balance = await getTokenBalance(wallet, token);
    return balance;
  } catch (error) {
    return 0;
  }
}

export default function TradingPage() {
  const { coinId, setCoinId, login, user, web3Tx, setWeb3Tx } = useContext(UserContext);
  const { publicKey } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const pathname = usePathname();
  const [param, setParam] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [coin, setCoin] = useState<coinInfo>({} as coinInfo);
  const [copySuccess, setCopySuccess] = useState<string>(null);
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const [liquidity, setLiquidity] = useState<number>(0);
  const [stageProg, setStageProg] = useState<number>(0)
  const [sellTax, setSellTax] = useState<number>(0);
  const wallet = useWallet()

  const router = useRouter()

  const copyToClipBoard = async (copyMe: string) => {
    try {
      await navigator.clipboard.writeText(copyMe);
      setCopySuccess('Copied!');
      successAlert("Copied!")
    }
    catch (err) {
      setCopySuccess('Failed to copy!');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Split the pathname and extract the last segment
      const segments = pathname.split("/");
      const parameter = segments[segments.length - 1];
      setParam(parameter);
      setCoinId(parameter);
      const data = await getCoinInfo(parameter);
      if(!publicKey) return;
      if (data && claimAmount == 0) {
        const claimData = await getClaim(parameter, data.creator._id);
        if (claimData) {
            getBalance(publicKey.toBase58(), data.token).then((balance) => {
              console.log("leo: balance========> ", balance, " \n pubkey: ", publicKey.toBase58());
            const amt = 
              (parseInt(claimData.claimAmount) * balance) / parseInt(data.tokenSupply);
            setClaimAmount(amt);
          });
        };
      }
      const millisecondsInADay = 24 * 60 * 60 * 1000;
      const nowDate = new Date();
      const atStageStartedDate = new Date(data.atStageStarted)
      const period = nowDate.getTime() - atStageStartedDate.getTime();
      const progress = Math.round(period * 10000 / (millisecondsInADay * data.stageDuration)) / 100;
      const stageProg = progress > 100 ? 100 : progress;
      setStageProg(stageProg);
      const solPrice = await getSolPriceInUSD();
      const prog = Math.round(data.progressMcap * solPrice / 10) / 100;
      // setProgress(prog > 1 ? 100 : Math.round(prog * 100000) / 1000);
      setLiquidity(Math.round(data.lamportReserves / 1000000000 * solPrice * 2 / 10) / 100)
      setCoin(data);
      setProgress(prog)
    }
    fetchData()
  }, [pathname, publicKey, web3Tx, claimAmount]);
  useEffect(() => {
    if (stageProg > coin.sellTaxDecay) {
      setSellTax(coin.sellTaxMin)
    } else {
      console.log((coin.sellTaxMax - coin.sellTaxMin) * stageProg)
      setSellTax(Math.round((coin.sellTaxMax - (coin.sellTaxMax - coin.sellTaxMin) * stageProg / coin.sellTaxDecay) * 10) / 10)
    }
  }, [stageProg, coin])
  const handleClaim = async () => {
    const res = await claim(user, claimAmount, coin, wallet)
    if (res == "success") setWeb3Tx(res)
  }
  return (
    <div className="w-full flex flex-col px-3 mx-auto gap-5 pb-20">
      <div className="text-center">
        <div className="w-full flex flex-col">
          <div onClick={() => router.push('/')} className="w-24 cursor-pointer text-white text-2xl flex flex-row items-center gap-2 pb-2">
            <IoMdArrowRoundBack />
            Back
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col md3:flex-row gap-4">
        {/* trading view chart  */}
        <div className="w-full px-2">
          <div className="w-full flex flex-col justify-between text-white gap-2">
            <div className="flex flex-row gap-2 items-center justify-between">
              <p className="font-semibold">Token Name - {coin?.name}</p>
              <p className="font-semibold">Ticker: {coin?.ticker}</p>
            </div>
            <div className="flex flex-row justify-end items-center gap-2 pb-2">
              <p className="font-semibold">CA: {coin?.token}</p>
              <p onClick={(e) => copyToClipBoard(coin?.token)} className="cursor-pointer text-xl">
                <FaCopy />
              </p>
            </div>
          </div>
          <TradingChart param={coin}></TradingChart>
          <Chatting param={param} coin={coin}></Chatting>
        </div>
        <div className="w-full max-w-[300px] 2xs:max-w-[420px] px-2 gap-4 flex flex-col mx-auto">
          <TradeForm coin={coin} progress={progress}></TradeForm>

          <div className="w-full flex flex-col text-center text-white gap-4 py-4 border-[1px] border-[#64ffda] rounded-lg px-3">
            <p className="font-semibold text-xl">
              Stage 1 Reward Claim
            </p>
            {(login && publicKey) ?
              <div className="w-full justify-center items-center flex flex-col gap-2">
                <p className="text-sm px-5">
                  You are eligible to claim:
                </p>
                {/* <p className="text-2xl font-extrabold">$ 250</p> */}
                <p className="text-xl font-semibold">{`${Number(claimAmount).toFixed(2)} ${coin.name}`}</p>
              </div>
              :
              <p className="text-sm px-5">
                Connect your wallet to check your eligibilith to claim this token
              </p>
            }
            <div className="flex flex-col">
              {(login && publicKey) ?
                <div
                  onClick={coin.airdropStage ? () => handleClaim() : undefined} // Only call handleClaim if airdropStage is true
                  className={`w-1/2 border-[1px] border-[#64ffda] cursor-pointer rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto
                    ${coin.airdropStage ? 'hover:bg-[#64ffda]/30' : 'bg-gray-300 cursor-not-allowed'}`} // Change background and cursor on disable
                >
                  Claim {coin.airdropStage?.toString()}
                </div>
                :
                <div className="w-1/2 border-[1px] border-[#64ffda] cursor-pointer hover:bg-[#64ffda]/30 rounded-lg py-2 px-6 font-semibold flex flex-col mx-auto" onClick={() => setVisible(true)} >
                  Connect Wallet
                </div>
              }
            </div>
          </div>

          <div className="text-white font-bold flex flex-row items-center gap-1 text-xl justify-center">
            <p className="">HODL</p>
            <p onClick={(e) => copyToClipBoard(coinId)} className="cursor-pointer">
              <FaCopy />
            </p>
            /
            <p className="">SOL</p>
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
            <div className="w-full flex flex-col gap-2 px-3 py-2 ">
              <p className="text-white text-base lg:text-xl">
                {coin.airdropStage ? (`Airdrop ${coin.currentStage}  Completion : ${stageProg}% of ${coin.stageDuration} Days`)
                  :
                  (`Stage ${coin.currentStage}  Completion : ${stageProg}% of ${coin.stageDuration} Days`)}
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
          {/* <TokenDistribution data={coin} /> */}
        </div>
      </div>
    </div>
  );
}
