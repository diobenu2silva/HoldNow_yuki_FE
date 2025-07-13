'use client';
import CreateTokenButton from '@/components/home/CreateTokenButton';
import HomePage from '@/components/home';

export default function Home() {
  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)] flex flex-col">
      <div className="max-w-[1240px] mx-auto w-full relative">
        {/* Top right button inside container for alignment */}
        <div className="absolute top-4 right-0 z-30">
          <CreateTokenButton />
        </div>
        <HomePage />
      </div>
    </div>
  );
}
