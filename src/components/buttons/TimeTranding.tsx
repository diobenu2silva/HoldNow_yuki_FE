'use client';
import { FC, useState } from 'react';
import { BiLineChart } from 'react-icons/bi';

interface TimeTrendingProps {
  onTimePeriodChange?: (timePeriod: string) => void;
  selectedPeriod?: string;
}

const TimeTrending: FC<TimeTrendingProps> = ({ 
  onTimePeriodChange, 
  selectedPeriod = '5m' 
}) => {
  const [activePeriod, setActivePeriod] = useState(selectedPeriod);

  const Time = [
    { id: '5m', name: '5M' },
    { id: '1h', name: '1H' },
    { id: '6h', name: '6H' },
    { id: '24h', name: '24H' },
  ];

  const handleTimePeriodClick = (timePeriod: string) => {
    setActivePeriod(timePeriod);
    if (onTimePeriodChange) {
      onTimePeriodChange(timePeriod);
    }
  };

  return (
    <div className="bg-muted px-2 py-1 flex flex-row gap-2 text-foreground rounded-lg mx-auto border border-border">
      <div className="flex flex-row gap-1 items-center text-sm">
        <BiLineChart />
        Trending
      </div>
      {Time.map((item: any, index: number) => {
        const isActive = activePeriod === item.id;
        return (
          <div
            key={index}
            onClick={() => handleTimePeriodClick(item.id)}
            className={`py-1 px-2.5 xs:px-5 rounded-lg cursor-pointer hover:bg-accent text-sm transition-colors duration-200 ${
              isActive 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background hover:bg-accent'
            }`}
          >
            {item.name}
          </div>
        );
      })}
    </div>
  );
};

export default TimeTrending;
