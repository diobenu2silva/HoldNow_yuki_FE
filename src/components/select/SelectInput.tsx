'use client';
import { useEffect, useRef, useState } from 'react';
import { FaSort } from 'react-icons/fa';

interface SelectInputProps {
  header: string;
  setSelectData: (inputData: { id: number; text: string }) => void;
  data: { id: number; text: string }[];
  style: string;
  firstData: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  header,
  setSelectData,
  data,
  style,
  firstData,
}) => {
  const menuDropdown = useRef<HTMLDivElement | null>(null);

  const [textData, setTextData] = useState<string>('');
  const [stageStateModal, setStageStateModal] = useState<boolean>(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuDropdown.current &&
        !menuDropdown.current.contains(event.target as Node)
      ) {
        setStageStateModal(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuDropdown]);

  const handleNumberStageChange = (e: any) => {
    setSelectData(e);
    setTextData(e.text);
  };

  useEffect(() => {
    setStageStateModal(false);
  }, [textData]);

  useEffect(() => {
    setTextData(firstData);
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor="presale" className="text-lg font-semibold text-foreground">
        {header}
      </label>
      <div
        onClick={() => setStageStateModal(true)}
        className="w-full p-3 rounded-lg bg-background text-foreground outline-none border-2 border-border relative capitalize flex flex-row justify-between items-center cursor-pointer hover:border-primary transition-colors duration-200"
      >
        {textData}
        <FaSort className="text-2xl text-muted-foreground" />
        <div
          ref={menuDropdown}
          className={`${stageStateModal ? `${style} border-2 border-primary` : 'h-0'} w-full absolute flex flex-col rounded-lg left-0 top-12 bg-background text-foreground font-semibold object-cover overflow-hidden z-10 shadow-lg`}
        >
          {data.map((item: any, index: number) => {
            return (
              <div
                key={index}
                onClick={() => handleNumberStageChange(item)}
                className={`${item.text === textData ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} py-3 px-3 cursor-pointer transition-colors duration-200`}
              >
                {item.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SelectInput;
