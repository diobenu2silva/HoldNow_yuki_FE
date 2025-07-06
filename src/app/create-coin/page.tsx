'use client';
import CreateToken from '@/components/createToken';

export default function Page() {
  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)]">
      <div className="container">
        <CreateToken />
      </div>
    </div>
  );
}
