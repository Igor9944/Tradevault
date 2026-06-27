import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

export function DefaultLogoAvatar({ className = 'w-10 h-10', style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <div 
      className={`overflow-hidden shrink-0 flex items-center justify-center bg-black/40 border border-[#3DDC97]/20 rounded-xl select-none shadow-[0_0_15px_rgba(61,220,151,0.1)] ${className}`} 
      style={style}
    >
      <span className="font-display font-black text-[#2BB87E] tracking-tighter" style={{ fontSize: '1em' }}>
        T<span className="text-[#3DDC97]">V</span>
      </span>
    </div>
  );
}

export default function Logo({ className = '', showText = true, size = 'md', variant = 'dark' }: LogoProps) {
  // Size metrics
  const sizes = {
    sm: { height: 28, imgHeight: 28 },
    md: { height: 40, imgHeight: 48 },
    lg: { height: 56, imgHeight: 64 },
    xl: { height: 80, imgHeight: 88 },
  };

  const currentSize = sizes[size] || sizes.md;

  if (showText) {
    return (
      <div className={`flex items-center select-none ${className}`}>
        <img 
          src="/logo.png" 
          alt="TradeVault Logo"
          style={{ height: currentSize.imgHeight, width: 'auto' }}
          className="object-contain filter drop-shadow-[0_0_15px_rgba(0,168,107,0.15)] brightness-110"
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center select-none ${className}`}>
      <DefaultLogoAvatar className="" style={{ width: currentSize.height, height: currentSize.height }} />
    </div>
  );
}
