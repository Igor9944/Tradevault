import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

export function DefaultLogoAvatar({ className = 'w-10 h-10', style }: { className?: string, style?: React.CSSProperties }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-full select-none ${className}`} style={style}>
      {!imgError ? (
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="w-full h-full object-cover" 
          onError={() => setImgError(true)} 
        />
      ) : (
        <TrendingUp className="text-indigo-400 w-1/2 h-1/2" />
      )}
    </div>
  );
}

export default function Logo({ className = '', showText = true, size = 'md', variant = 'dark' }: LogoProps) {
  // Size metrics
  const sizes = {
    sm: { height: 28, textClass: "text-sm", subTextClass: "text-[9px]", gap: "gap-1.5" },
    md: { height: 40, textClass: "text-lg", subTextClass: "text-[10px]", gap: "gap-2" },
    lg: { height: 56, textClass: "text-2xl", subTextClass: "text-xs", gap: "gap-3" },
    xl: { height: 80, textClass: "text-4xl", subTextClass: "text-sm", gap: "gap-4" },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center select-none ${currentSize.gap} ${className}`}>
      <DefaultLogoAvatar className="" style={{ width: currentSize.height, height: currentSize.height }} />

      {/* LOGO TEXT - "TRADEVAULT" */}
      {showText && (
        <div className="flex flex-col justify-center">
          <h2 className={`${currentSize.textClass} font-black font-mono tracking-widest ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            TRADE<span className="text-indigo-400">VAULT</span>
          </h2>
          <span className={`${currentSize.subTextClass} ${variant === 'dark' ? 'text-slate-500' : 'text-slate-500'} block tracking-wider uppercase font-semibold`}>
            Track log PRO v1.2
          </span>
        </div>
      )}
    </div>
  );
}
