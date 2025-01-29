"use client"
import { useEffect, useRef, useState } from "react";
import { FaSort } from "react-icons/fa";

interface SelectInputProps {
  header: string;
  setSelectData: (inputData: { id: number; text: string }) => void;
  data: { id: number; text: string }[];
  style: string;
  firstData: string;
}

const SelectInput: React.FC<SelectInputProps> = ({ header, setSelectData, data, style, firstData }) => {
  const menuDropdown = useRef<HTMLDivElement | null>(null);

  const [textData, setTextData] = useState<string>("");
  const [stageStateModal, setStageStateModal] = useState<boolean>(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuDropdown.current && !menuDropdown.current.contains(event.target as Node)) {
        setStageStateModal(false)
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
  }

  useEffect(() => {
    setStageStateModal(false)
  }, [textData])

  useEffect(() => {
    setTextData(firstData)
  }, [])

  return (
    <div className="">
      <label htmlFor="presale" className="text-lg font-semibold text-white">
        {header}
      </label>
      <div
        onClick={() => setStageStateModal(true)}
        className="w-full p-2.5 rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px] relative capitalize flex flex-row justify-between items-center cursor-pointer"
      >
        {textData}
        <FaSort className="text-2xl" />
        <div ref={menuDropdown} className={`${stageStateModal ? `${style} border-[1px] border-[#64ffda]` : "h-0"} w-full absolute flex flex-col rounded-lg left-0 top-11 bg-[#0D1524] text-white font-semibold object-cover overflow-hidden z-10`}>
          {data.map((item: any, index: number) => {
            return (
              <div key={index} onClick={() => handleNumberStageChange(item)} className={`${item.text === textData ? "bg-blue-500" : "hover:bg-gray-500"} py-2 px-2 cursor-pointer`}>{item.text}</div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default SelectInput;