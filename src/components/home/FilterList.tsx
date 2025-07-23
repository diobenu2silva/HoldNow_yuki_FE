'use client';
import { FC, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import UserContext from '@/context/UserContext';
import TimeTrending from '../buttons/TimeTranding';
import { CiFilter } from 'react-icons/ci';
import switchOn from '@/../public/assets/images/switch-on.png';
import switchOff from '@/../public/assets/images/switch-off.png';
import { BiSearchAlt } from 'react-icons/bi';
import { coinInfo } from '@/utils/types';
import FilterListButton from '../others/FilterListButton';
import { Switch } from '@/components/ui/switch';

interface FilterListProps {
  onSortChange: (sortType: string, order: string) => void;
  currentSort: string;
  currentOrder: string;
  nsfwFilterState?: boolean;
  setNsfwFilterState?: (checked: boolean) => void;
  onTimePeriodChange?: (timePeriod: string) => void;
  currentTimePeriod?: string;
}

const FilterList: FC<FilterListProps> = ({ 
  onSortChange, 
  currentSort, 
  currentOrder, 
  nsfwFilterState, 
  setNsfwFilterState,
  onTimePeriodChange,
  currentTimePeriod = '5m'
}) => {
  const [token, setToken] = useState('');

  const searchToken = () => {};

  const handleTimePeriodChange = (timePeriod: string) => {
    if (onTimePeriodChange) {
      onTimePeriodChange(timePeriod);
    }
  };

  return (
    <div className="w-full gap-4 h-full flex flex-col px-2">
      <div className="flex flex-col md:flex-row gap-3">
        <TimeTrending 
          onTimePeriodChange={handleTimePeriodChange}
          selectedPeriod={currentTimePeriod}
        />
        <FilterListButton 
          onSortChange={onSortChange}
          currentSort={currentSort}
          currentOrder={currentOrder}
        />
      </div>
      {/* Only show NSFW filter if props are provided */}
      {nsfwFilterState !== undefined && setNsfwFilterState && (
        <div className="flex flex-col sm2:flex-row w-full h-full gap-4 justify-between">
          <div className="w-full flex flex-col xs:flex-row gap-2">
            <div className="min-w-[169px] flex flex-row items-center gap-2 px-3 py-1 border border-border rounded-lg mx-auto bg-card">
              <span className="text-foreground">Include NSFW</span>
              <Switch
                checked={nsfwFilterState}
                onCheckedChange={setNsfwFilterState}
                className="data-[state=checked]:bg-pink-500 border-2 border-pink-400 focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <div className="w-full max-w-[720px] flex flex-row items-center gap-1 pl-5 border border-border rounded-lg bg-card">
              <BiSearchAlt className="text-4xl text-muted-foreground" />
              <input
                type="text"
                value={token}
                placeholder=" Search for Token"
                onChange={(e) => setToken(e.target.value)}
                className="w-full py-1 outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
              />
              <button
                className="w-[100px] h-[40px] rounded-r-lg px-2 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
                onClick={searchToken}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterList;
