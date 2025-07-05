import React from 'react';

export default function HeroBanner() {
  return (
    <div className="w-full h-[260px] md:h-[400px] relative overflow-hidden flex items-center justify-center bg-black">
      <img
        src="/assets/banners/banner.jpg"
        alt="Banner"
        className="h-full max-h-full w-auto object-contain animate-hero-pan"
        style={{ margin: '0 auto' }}
      />
      {/* Optional: Overlay for darkening or text */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-20" />
    </div>
  );
} 