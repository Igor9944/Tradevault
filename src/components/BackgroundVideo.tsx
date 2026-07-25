import React, { useRef, useEffect } from 'react';

export const BackgroundVideo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fallback / dynamic autoplay verification
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn("Background HTML5 video autoplay block resolved:", err);
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden pointer-events-none opacity-25 select-none bg-[#050505]">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        {/* Support several standard file paths from public directory */}
        <source src="/background.mp4" type="video/mp4" />
        <source src="/trading_background.mp4" type="video/mp4" />
        <source src="/video.mp4" type="video/mp4" />
        <source src="/trading_video.mp4" type="video/mp4" />
        
        {/* Premium direct cloud stream backups representing glowing neon green candlestick charts & tickers */}
        <source src="https://assets.mixkit.co/videos/preview/mixkit-bull-concept-with-stock-market-charts-34442-large.mp4" type="video/mp4" />
        <source src="https://assets.mixkit.co/videos/preview/mixkit-financial-ticker-stock-results-screen-34440-large.mp4" type="video/mp4" />
      </video>
      {/* Visual overlay gradient mapping to preserve text contrast with dark theme */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-neutral-950/80 pointer-events-none" />
    </div>
  );
};
