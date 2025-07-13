'use client';
import { FC } from 'react';

const TopToken: FC = () => {

  return (
    <div className="w-full h-full px-2">
      <div className="w-full flex flex-col items-center text-center gap-6">
        <div className="w-full max-w-[600px] flex flex-col gap-6 justify-center items-center">
          <div className="w-full text-2xl xs:text-4xl font-bold text-foreground">
            Start Launch Your Next 1000X Meme
          </div>
          <div className="w-full text-md xs:text-xl text-muted-foreground">
            Ready to Become a Crypto Millionaire?
            <br />
            Fairlaunch Now in 10 Seconds
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopToken;
