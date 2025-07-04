'use client';
import { FC, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserContext from '@/context/UserContext';
import { coinInfo } from '@/utils/types';
import { getCoinsInfo, getSolPriceInUSD, getLatestReplies } from '@/utils/util';
import { CoinBlog } from '../cards/CoinBlog';
import TopToken from './TopToken';
import FilterList from './FilterList';

const HomePage: FC = () => {
  const { isLoading, setIsLoading, isCreated, solPrice, setSolPrice } =
    useContext(UserContext);
  const [totalStaked, setTotalStaked] = useState(0);
  const [token, setToken] = useState('');
  const [data, setData] = useState<coinInfo[]>([]);
  const [latestReplies, setLatestReplies] = useState<{ coinId: string; latestReplyTime: string }[]>([]);
  const [currentSort, setCurrentSort] = useState<string>('creation time');
  const [currentOrder, setCurrentOrder] = useState<string>('desc');
  const [king, setKing] = useState<coinInfo>({} as coinInfo);
  const router = useRouter();

  const handleToRouter = (id: string) => {
    router.push(id);
  };

  // Function to extract creation time from coin metadata
  const getCreationTime = (coin: coinInfo): Date => {
    try {
      // For now, use atLaunched as creation time
      // In the future, this should be extracted from coin.uri -> metadataInfo.createdOn
      return new Date(coin.atLaunched);
    } catch (error) {
      console.error('Error parsing creation time:', error);
      return new Date(0); // Default to epoch time if parsing fails
    }
  };

  // Function to get latest reply time for a coin
  const getLatestReplyTime = (coin: coinInfo): Date => {
    const replyData = latestReplies.find(reply => reply.coinId === coin._id);
    if (replyData) {
      return new Date(replyData.latestReplyTime);
    }
    return new Date(0); // Default to epoch time if no replies
  };

  // Sorting function
  const sortCoins = (coins: coinInfo[], sortType: string, order: string): coinInfo[] => {
    const sortedCoins = [...coins];
    
    switch (sortType) {
      case 'last reply':
        sortedCoins.sort((a, b) => {
          const timeA = getLatestReplyTime(a).getTime();
          const timeB = getLatestReplyTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
        
      case 'creation time':
        sortedCoins.sort((a, b) => {
          const timeA = getCreationTime(a).getTime();
          const timeB = getCreationTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
        
      case 'market cap':
        sortedCoins.sort((a, b) => {
          const marketCapA = a.progressMcap || 0;
          const marketCapB = b.progressMcap || 0;
          return order === 'desc' ? marketCapB - marketCapA : marketCapA - marketCapB;
        });
        break;
        
      default:
        // Default sorting by creation time
        sortedCoins.sort((a, b) => {
          const timeA = getCreationTime(a).getTime();
          const timeB = getCreationTime(b).getTime();
          return order === 'desc' ? timeB - timeA : timeA - timeB;
        });
        break;
    }
    
    return sortedCoins;
  };

  // Handle sort change from FilterListButton
  const handleSortChange = (sortType: string, order: string) => {
    setCurrentSort(sortType);
    setCurrentOrder(order);
  };

  // Memoized sorted data
  const sortedData = useMemo(() => {
    return sortCoins(data, currentSort, currentOrder);
  }, [data, currentSort, currentOrder, latestReplies]);

  useEffect(() => {
    const fetchData = async () => {
      const [coins, price, replies] = await Promise.all([
        getCoinsInfo(),
        getSolPriceInUSD(),
        getLatestReplies()
      ]);
      
      if (coins !== null) {
        setData(coins);
        setLatestReplies(replies);
        setIsLoading(true);
        setKing(coins[0]);
        setSolPrice(price);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full h-full gap-4 flex flex-col">
      <TopToken />
      <FilterList 
        onSortChange={handleSortChange}
        currentSort={currentSort}
        currentOrder={currentOrder}
      />
      
      {sortedData && (
        <div className="w-full h-full flex flex-wrap gap-2 items-center">
          {sortedData.map((temp, index) => (
            <div
              key={index}
              onClick={() => handleToRouter(`/trading/${temp._id}`)}
              className="cursor-pointer mx-auto w-[380px] shadow-lg shadow-[#143F72] rounded-lg"
            >
              <CoinBlog coin={temp} componentKey="coin"></CoinBlog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default HomePage;
