"use client"
import { coinInfo } from "@/utils/types";
import { FC, useContext, useState } from "react";
import { BiLineChart } from "react-icons/bi";
import { CiFilter } from "react-icons/ci";
import { BsFilterSquare } from "react-icons/bs";

const FilterListButton: FC = () => {
  const [data, setData] = useState<coinInfo[]>([]);
  const [dataSort, setDataSort] = useState<string>("creation time");
  const [order, setOrder] = useState("desc")
  const [isSort, setIsSort] = useState(0);
  const [currentFilterm, setCurrentFilter] = useState<string>("creation time")
  const FilterText = [
    { id: "last reply", text: "Last Reply" },
    { id: "creation time", text: "Creation Time" },
    { id: "market cap", text: "Market Cap" },
  ];

  const handleSortSelection = (option: any) => {
    setCurrentFilter(option)
    let sortOption: string = '';
    let orderOption: string = "";
    let sortedData = [...data]; // Create a new array to prevent direct state mutation
    if (option == "desc" || option == "asc") {
      setOrder(option);
      sortOption = dataSort;
      orderOption = option;
    }
    else {
      setDataSort(option)
      sortOption = option
      orderOption = order;
    }
    if (orderOption == "desc") {
      switch (sortOption) {
        case "last reply":
          sortedData.sort((a, b) => a.reserveOne - b.reserveOne);
          break;
        case "market cap":
          sortedData.sort((a, b) => a.reserveOne - b.reserveOne);
          break;
        case "creation time":
          sortedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          break;
        default:
          sortedData = data;
          break;
      }
    } else {
      switch (sortOption) {
        case "last reply":
          sortedData.sort((a, b) => b.reserveOne - a.reserveOne);
          break;
        case "market cap":
          sortedData.sort((a, b) => b.reserveOne - a.reserveOne);
          break;
        case "creation time":
          sortedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          break;
        default:
          sortedData = data;
          break;
      }
    }
    setData(sortedData);
    setIsSort(0); // Close the dropdown after selection
  };

  return (
    <>
      <div className="w-full flex flex-col xs:flex-row gap-3 items-center justify-between">
        {FilterText.map((item) => (
          <div
            key={item.id}
            onClick={() => handleSortSelection("creation time")}
            className="w-full gap-2 flex flex-row items-center bg-[#143F72] hover:bg-custom-gradient py-2 rounded-lg justify-center cursor-pointer text-lg"
          >
            <p className="text-sm">{item.text}</p>
            <CiFilter />
          </div>
        ))}
      </div>
    </>
  );
};

export default FilterListButton;
