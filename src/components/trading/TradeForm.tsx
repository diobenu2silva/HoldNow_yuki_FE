'use client';

import UserContext from '@/context/UserContext';
import { getTokenBalance, swapTx } from '@/program/web3';
import { coinInfo } from '@/utils/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { errorAlert } from '../others/ToastGroup';
import { useClaim } from '@/context/ClaimContext';
import { claim } from '@/utils/util';


interface TradingFormProps {
  coin: coinInfo;
  progress: Number;
}

export const TradeForm: React.FC<TradingFormProps> = ({ coin, progress }) => {
  const [amount, setSol] = useState<string>('');
  const [isSell, setIsBuy] = useState<number>(0);
  const [tokenBal, setTokenBal] = useState<number>(0);
  const [tokenName, setTokenName] = useState<string>('Token');
  const [canTrade, setCanTrade] = useState<boolean>(false);
  const { user, setWeb3Tx } = useContext(UserContext);
  
  const { claimAmount } = useClaim();
  
  const wallet = useWallet();
  const SolList = [
    { id: 0, price: 'reset' },
    { id: '1', price: '1 sol' },
    { id: '5', price: '5 sol' },
    { id: '10', price: '10 sol' },
  ];

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!isNaN(parseFloat(value))) {
      setSol(value);
    } else if (value === '') {
      setSol(''); // Allow empty string to clear the input
    }
  };

  const getBalance = async () => {
    try {
      if (!user || !user.wallet) {
        setTokenBal(0);
        return;
      }
      const balance = await getTokenBalance(user.wallet, coin.token);
      setTokenBal(balance ? balance : 0);
    } catch (error) {
      console.error('__yuki__ Error getting token balance:', error);
      setTokenBal(0);
    }
  };
  
  useEffect(() => {
    getBalance();
  }, [user, coin.token]);

  const handlTrade = async () => {
    if (!!!amount) {
      errorAlert('Please set Amount');
      return;
    }
    
    // Check if user and wallet are available
    if (!user || !user.wallet) {
      errorAlert('Please connect your wallet first');
      return;
    }
    
    try {
      const mint = new PublicKey(coin.token);
      const userWallet = new PublicKey(user.wallet);
      
      if (isSell == 0) {
      const totalLiquidity = coin.tokenReserves * coin.lamportReserves;
      const tokenAmount =
        coin.tokenReserves -
        totalLiquidity /
          (coin.lamportReserves + parseFloat(amount) * Math.pow(10, 9));
      const res = await swapTx(mint, wallet, tokenAmount, isSell, tokenAmount);
      // if (res) {
      //   setTimeout(async () => {
      //     window.location.reload();
      //   }, 500);
      // }
    } else {
      const totalLiquidity = coin.tokenReserves * coin.lamportReserves;
      const minSol =
        coin.lamportReserves -
        totalLiquidity /
          (coin.tokenReserves + parseFloat(amount) * Math.pow(10, 6));
      const res = await swapTx(
        mint,
        wallet,
        parseFloat(amount),
        isSell,
        minSol,
        0, // claimAmount[2],
      );
      // if (res) {
      //   setTimeout(async () => {
      //     window.location.reload();
      //   }, 500);
      // }
    }
    } catch (error) {
      console.error('__yuki__ Trade error:', error);
      errorAlert('Trade failed. Please try again.');
    }
  };

  useEffect(() => {
    if (coin.name !== '' && coin.name !== undefined && coin.name !== null)
      setTokenName(coin.name);
  }, [coin]);

  useEffect(() => {
    if (coin.airdropStage === false) {
      setCanTrade(true);
    } else {
      setCanTrade(false);
    }
  }, [coin.airdropStage]);

  return (
    <div className="p-3 rounded-lg bg-card border-2 border-primary/30 shadow-sm">
      <div className="flex flex-row justify-center px-3 py-2">
        <button
          className={`rounded-l-lg py-3 w-full transition-all duration-200 ${
            isSell === 0 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted hover:bg-accent text-foreground'
          }`}
          onClick={() => {setIsBuy(0); getBalance();}}
        >
          Buy
        </button>
        <button
          className={`rounded-r-lg py-3 w-full transition-all duration-200 ${
            isSell === 1 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted hover:bg-accent text-foreground'
          }`}
          onClick={() => {setIsBuy(1); getBalance();}}
        >
          Sell
        </button>
      </div>
      <div className="xs:px-4 flex flex-col relative">
        <div
          onClick={() => console.log('set max')}
          className="rounded bg-muted text-center w-[200px] p-2 block mb-2 text-ml font-medium text-foreground mx-auto border-2 border-primary/30 hover:bg-accent cursor-pointer transition-all duration-200"
        >
          Set max slippage
        </div>
        <div className="w-full flex flex-row items-center bg-background rounded-lg border-2 border-primary/30">
          <input
            type="number"
            id="setTrade"
            value={amount}
            onChange={handleInputChange}
            pattern="\d*"
            className="w-full outline-none text-foreground p-2.5 capitalize rounded-l-lg bg-transparent"
            placeholder="0.0"
            required
          />
          <div className="flex flex-col text-center p-2.5 border-l-2 border-l-primary/30 bg-primary text-primary-foreground rounded-r-md">
            {isSell === 0 ? 'SOL' : 'Token'}
          </div>
        </div>
        {isSell === 0 ? (
          <div className="flex flex-col xs:flex-row py-2 gap-3 text-center mx-auto xs:mx-0">
            {SolList.map((item: any, index: any) => {
              return (
                <div
                  key={item.id}
                  className="max-w-[100px] rounded-lg px-2 py-1 border-2 border-primary/30 hover:bg-accent cursor-pointer transition-all duration-200 text-foreground"
                  onClick={() => setSol(item.id)}
                >
                  {item.price}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col xs:flex-row py-2 gap-3 text-center mx-auto xs:mx-0">
            <button
              className="max-w-[100px] rounded-lg px-2 py-1 border-2 border-primary/30 hover:bg-accent cursor-pointer transition-all duration-200 text-foreground"
              onClick={() => setSol('')}
            >
              reset
            </button>
            <button
              disabled={tokenBal && tokenBal !== 0 ? false : true}
              className={`max-w-[100px] rounded-lg px-2 py-1 border-2 border-primary/30 transition-all duration-200 ${
                tokenBal && tokenBal !== 0 
                  ? 'cursor-pointer hover:bg-accent text-foreground' 
                  : 'cursor-not-allowed text-muted-foreground'
              }`}
              onClick={() => setSol((tokenBal / 10).toString())}
            >
              10%
            </button>
            <button
              disabled={tokenBal && tokenBal !== 0 ? false : true}
              className={`max-w-[100px] rounded-lg px-2 py-1 border-2 border-primary/30 transition-all duration-200 ${
                tokenBal && tokenBal !== 0 
                  ? 'cursor-pointer hover:bg-accent text-foreground' 
                  : 'cursor-not-allowed text-muted-foreground'
              }`}
              onClick={() => setSol((tokenBal / 4).toString())}
            >
              25%
            </button>
            <button
              disabled={tokenBal && tokenBal !== 0 ? false : true}
              className={`max-w-[100px] rounded-lg px-2 py-1 border-2 border-primary/30 transition-all duration-200 ${
                tokenBal && tokenBal !== 0 
                  ? 'cursor-pointer hover:bg-accent text-foreground' 
                  : 'cursor-not-allowed text-muted-foreground'
              }`}
              onClick={() => setSol((tokenBal / 2).toString())}
            >
              50%
            </button>
            <button
              disabled={tokenBal && tokenBal !== 0 ? false : true}
              className={`max-w-[100px] rounded-lg px-2 py-1 border-2 border-primary/30 transition-all duration-200 ${
                tokenBal && tokenBal !== 0 
                  ? 'cursor-pointer hover:bg-accent text-foreground' 
                  : 'cursor-not-allowed text-muted-foreground'
              }`}
              onClick={() => setSol(tokenBal.toString())}
            >
              100%
            </button>
          </div>
        )}

        {coin.airdropStage ? (
          <></>
        ) : (
          <div
            className="border-2 border-primary/30 cursor-pointer hover:bg-accent w-full text-center rounded-lg py-2 transition-all duration-200 text-foreground"
            onClick={handlTrade}
          >
            Place Trade
          </div>
        )}
      </div>
    </div>
  );
};