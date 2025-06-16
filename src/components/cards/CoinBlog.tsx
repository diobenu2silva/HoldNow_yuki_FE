import { coinInfo, userInfo } from '@/utils/types';
import { FC, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { HiOutlinePuzzle } from 'react-icons/hi';
import { TbWorld } from 'react-icons/tb';
import { FaXTwitter } from 'react-icons/fa6';
import { FaTelegramPlane } from 'react-icons/fa';

interface CoinBlogProps {
  coin: coinInfo;
  componentKey: string;
}

export const CoinBlog: React.FC<CoinBlogProps> = ({ coin, componentKey }) => {
  const { solPrice } = useContext(UserContext);
  const [marketCapValue, setMarketCapValue] = useState<number>(0);
  const router = useRouter();

  const handleToProfile = (id: string) => {
    router.push(`/profile/${id}`);
  };

  const getMarketCapData = async (coin: coinInfo) => {
    const prog = coin.progressMcap * solPrice;
    setMarketCapValue(Math.round(prog / 100) / 10);
  };

  useEffect(() => {
    getMarketCapData(coin);
  }, [coin]);

  return (
    <div className="flex flex-col h-full items-center justify-between border-[#64ffda] border-[1px] hover:bg-custom-gradient rounded-lg text-white gap-2">
      <div className="flex flex-row w-full">
        <img
          src={coin?.url}
          alt="image"
          className="w-28 h-28 object-cover overflow-hidden rounded-tl-md"
        />
        <div className="flex flex-col px-2 gap-1 pt-3">
          <div className="w-full text-xl text-white font-bold">
            {coin?.name}
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-row gap-1 items-center">
              Created by
              <HiOutlinePuzzle className="text-2xl" />
            </div>
            <div
              onClick={() => handleToProfile((coin?.creator as userInfo)?._id)}
            >
              <div className="text-white px-1">
                {(coin?.creator as userInfo)?.name}
              </div>
            </div>
          </div>
          {/* <div>replies: {coin?.replies}</div> */}
          <div>
            {coin?.name} [ticker: {coin?.ticker}]
          </div>

          {componentKey === 'coin' ? (
            coin?.description && <div>{coin?.description}</div>
          ) : (
            <></>
          )}
          <div className="w-full flex flex-row gap-1 items-center text-white text-xl">
            {coin.twitter && (
              <a
                href={coin.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl text-[#64ffda] bg-[#64ffda]/30 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/30 p-2 cursor-pointer rounded-full border-[1px] border-[#143F72]"
              >
                <FaXTwitter />
              </a>
            )}
            {coin.website && (
              <a
                href={coin.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl text-[#64ffda] bg-[#64ffda]/30 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/30 p-2 cursor-pointer rounded-full border-[1px] border-[#143F72]"
              >
                <TbWorld />
              </a>
            )}
            {coin.telegram && (
              <a
                href={coin.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl text-[#64ffda] bg-[#64ffda]/30 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/30 p-2 cursor-pointer rounded-full border-[1px] border-[#143F72]"
              >
                <FaTelegramPlane />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col gap-1 p-3">
        <div className="w-full flex flex-row items-center justify-between">
          <div className="flex flex-row gap-1 items-center">
            Market Cap
            <div className="text-gradient font-bold">
              {((coin.progressMcap * solPrice) / 1000).toFixed(2)} K
            </div>
            {`(${marketCapValue}%)`}
          </div>
          <div className="text-gradient font-bold">100 K</div>
        </div>
        <div className="w-full h-2 rounded-full bg-white relative flex">
          <div
            className="justify-start h-2 rounded-full absolute top-0 left-0 bg-blue-700"
            style={{ width: `${marketCapValue}%` }} // Fix: Corrected percentage calculation
          />
        </div>
      </div>
    </div>
  );
};
