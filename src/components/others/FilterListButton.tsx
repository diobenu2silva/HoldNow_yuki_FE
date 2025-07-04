'use client';
import { coinInfo } from '@/utils/types';
import { FC, useContext, useState } from 'react';
import { BiLineChart } from 'react-icons/bi';
import { CiFilter } from 'react-icons/ci';
import { BsFilterSquare } from 'react-icons/bs';

interface FilterListButtonProps {
  onSortChange: (sortType: string, order: string) => void;
  currentSort: string;
  currentOrder: string;
}

const FilterListButton: FC<FilterListButtonProps> = ({ onSortChange, currentSort, currentOrder }) => {
  const FilterText = [
    { id: 'last reply', text: 'Last Reply' },
    { id: 'creation time', text: 'Creation Time' },
    { id: 'market cap', text: 'Market Cap' },
  ];

  const handleSortSelection = (sortType: string) => {
    // Toggle order if same sort type is selected
    const newOrder = currentSort === sortType && currentOrder === 'desc' ? 'asc' : 'desc';
    onSortChange(sortType, newOrder);
  };

  return (
    <>
      <div className="w-full flex flex-col xs:flex-row gap-3 items-center justify-between">
        {FilterText.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSortSelection(item.id)}
            className={`w-full gap-2 flex flex-row items-center py-2 rounded-lg justify-center cursor-pointer text-lg ${
              currentSort === item.id 
                ? 'bg-custom-gradient' 
                : 'bg-[#143F72] hover:bg-custom-gradient'
            }`}
          >
            <p className="text-sm">{item.text}</p>
            <CiFilter />
            {currentSort === item.id && (
              <span className="text-xs ml-1">
                {currentOrder === 'desc' ? '↓' : '↑'}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default FilterListButton;
