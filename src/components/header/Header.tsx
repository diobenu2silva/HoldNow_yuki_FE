'use client';
import { FC, useContext, useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '../buttons/ConnectButton';
import { useRouter } from 'next/navigation';
import { FaWolfPackBattalion } from 'react-icons/fa';
import { PROGRAM_ID_IDL } from '@/program/programId';
import { connection } from '@/program/web3';
import { coinInfo, SwapInfo } from '@/utils/types';
import Link from 'next/link';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const Header: FC = () => {
  const router = useRouter();

  const handleToRouter = (id: string) => {
    router.push(id);
  };

  const [latestCreatedToken, setLatestCreatedToken] =
    useState<coinInfo>(undefined);
  const [latestSwapInfo, setLatestSwapInfo] = useState<SwapInfo>(undefined);

  return (
    <div className="w-full h-[100px] flex flex-col justify-center items-center">
      <div className="container">
        <div className="w-full h-full flex flex-row justify-between items-center px-5">
          <div
            onClick={() => handleToRouter('/')}
            className="p-2 text-2xl text-[#64ffda] flex flex-col justify-center items-center border-[1px] border-[#64ffda] rounded-full cursor-pointer"
          >
            <FaWolfPackBattalion />
          </div>
          {latestSwapInfo && (
            <div>
              <Link
                className="bg-green-600 w-[200px] h-[50px] font-medium rounded-md "
                href={`/trading/${latestSwapInfo.mintAddress}`}
              >
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                  <span>{`${latestSwapInfo.creator} ${latestSwapInfo.direction} ${(latestSwapInfo.solAmountInLamports / LAMPORTS_PER_SOL).toFixed(9)} SOL of ${latestSwapInfo.mintSymbol}`}</span>
                  <img
                    src={latestSwapInfo.mintUri}
                    style={{
                      width: '30px',
                      height: '30px',
                      marginRight: '10px',
                      borderRadius: '50%',
                    }}
                  />
                </div>
              </Link>
            </div>
          )}
          {latestCreatedToken && (
            <div>
              <Link
                className="bg-green-600 w-[200px] h-[50px] font-medium rounded-md "
                href={`/trading/${latestCreatedToken.token}`}
              >
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                  <span>{`${latestCreatedToken.creator} created `}</span>
                  <img
                    src={latestCreatedToken.url}
                    style={{
                      width: '30px',
                      height: '30px',
                      marginRight: '10px',
                      borderRadius: '50%',
                    }}
                  />
                  <span>{`${latestCreatedToken.name} on ${new Date().toDateString()}`}</span>
                </div>
              </Link>
            </div>
          )}
          <div className="flex flex-col">
            <ConnectButton></ConnectButton>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Header;
