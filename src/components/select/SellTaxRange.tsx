'use client';
import * as React from 'react';
import { Range } from 'react-range';
import { BiSolidUpArrow } from 'react-icons/bi';

interface SellTaxRangeProps {
  header: string;
  setSelectRange: (tokenNumber: number[]) => void;
  hasCsvUpload?: boolean; // New prop to detect CSV upload
}

const SellTaxRange: React.FC<SellTaxRangeProps> = ({
  header,
  setSelectRange,
  hasCsvUpload = false,
}) => {
  const [values, setValues] = React.useState<number[]>([0, 100]); // min, max

  // Effect to handle CSV upload - automatically adjust if current max is below 50%
  React.useEffect(() => {
    if (hasCsvUpload && values[1] < 50) {
      const newValues = [values[0], 50]; // Keep min, set max to 50%
      setValues(newValues);
      setSelectRange(newValues);
    }
  }, [hasCsvUpload, values, setSelectRange]);

  const handleChangeRange = (e: number[]) => {
    const [min, max] = e;
    
    // If CSV is uploaded, prevent setting max below 50%
    if (hasCsvUpload && max < 50) {
      // Don't update the values - keep the previous valid state
      return;
    }
    
    setValues(e);
    setSelectRange(e);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <label className="text-lg font-semibold text-white">{header}</label>
      {hasCsvUpload && (
        <p className="text-sm text-yellow-400">
          Minimum upper limit is 50% when CSV is uploaded
        </p>
      )}
      <Range
        step={1}
        min={0}
        max={100} // Always 100%
        values={values}
        onChange={(values) => handleChangeRange(values)}
        renderTrack={({ props, children }) => {
          const [min, max] = values;

          return (
            <div {...props} className="relative h-1 w-full bg-white rounded">
              <div
                style={{
                  position: 'absolute',
                  left: `${min}%`,
                  right: `${100 - max}%`,
                  backgroundColor: '#64ffda',
                }}
                className="h-1 rounded"
              />
              {children}
            </div>
          );
        }}
        renderThumb={({ props, index }) => {
          const { key, ...restProps } = props;
          return (
            <div
              key={key}
              {...restProps}
              className="flex flex-col items-center justify-center text-[#64ffda] font-semibold gap-1 outline-none"
            >
              <div className="text-sm">
                {index === 0 ? `${values[0]}%` : `${values[1]}%`}
              </div>
              <BiSolidUpArrow className="text-2xl" style={{ color: '#64ffda' }} />
            </div>
          );
        }}
      />
    </div>
  );
};

export default SellTaxRange;
