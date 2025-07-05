'use client';
import { FC, useContext } from 'react';
import { BiLineChart } from 'react-icons/bi';

const TimeTranding: FC = () => {
  const Time = [
    { id: '5m', name: '5M' },
    { id: '1h', name: '1H' },
    { id: '6h', name: '6H' },
    { id: '24h', name: '24H' },
  ];

  return (
    <div className="bg-muted px-2 py-1 flex flex-row gap-2 text-foreground rounded-lg mx-auto border border-border">
      <div className="flex flex-row gap-1 items-center text-sm">
        <BiLineChart />
        Trending
      </div>
      {Time.map((item: any, index: number) => {
        return (
          <div
            key={index}
            onClick={() => console.log(item.id)}
            className="bg-background py-1 px-2.5 xs:px-5 rounded-lg cursor-pointer hover:bg-accent text-sm transition-colors duration-200"
          >
            {item.name}
          </div>
        );
      })}
    </div>
  );
};

export default TimeTranding;
