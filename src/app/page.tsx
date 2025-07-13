'use client';
import CreateTokenButton from '@/components/home/CreateTokenButton';
import HomePage from '@/components/home';

export default function Home() {
  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)] flex flex-col">
      <div className=" mx-auto w-full relative">
        <HomePage />
      </div>
    </div>
  );
}
