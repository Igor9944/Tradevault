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
      className={`overflow-hidden shrink-0 flex items-center justify-center bg-slate-950/40 border border-slate-800/80 rounded-xl select-none shadow-[0_0_20px_rgba(27,98,255,0.1)] ${className}`} 
      style={style}
    >
      {/* Precision 3D Ascending Stair Steps matching the user's logo */}
      <svg className="w-full h-full p-1.5" fill="none" viewBox="0 0 100 100" stroke="none">
        {/* Render Column 3 (Tallest, Backmost) */}
        <polygon 
          points="65,63 80,55 80,20 65,28" 
          fill="#10254c" 
          stroke="#090d16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon 
          points="80,55 95,63 95,28 80,20" 
          fill="#1b62ff" 
          stroke="#090d16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Render Column 2 (Medium) */}
        <polygon 
          points="40,78 55,70 55,40 40,48" 
          fill="#10254c" 
          stroke="#090d16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon 
          points="55,70 70,78 70,48 55,40" 
          fill="#1b62ff" 
          stroke="#090d16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Render Column 1 (Shortest, Frontmost) */}
        <polygon 
          points="15,93 30,85 30,60 15,68" 
          fill="#10254c" 
          stroke="#090d16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon 
          points="30,85 45,93 45,68 30,60" 
          fill="#1b62ff" 
          stroke="#090d16"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function Logo({ className = '', showText = true, size = 'md', variant = 'dark' }: LogoProps) {
  // Size metrics
  const sizes = {
    sm: { height: 28, textClass: "text-sm", subTextClass: "text-[9px]", gap: "gap-1.5" },
    md: { height: 40, textClass: "text-lg", subTextClass: "text-[10px]", gap: "gap-2.5" },
    lg: { height: 56, textClass: "text-2xl", subTextClass: "text-xs", gap: "gap-3" },
    xl: { height: 80, textClass: "text-4xl", subTextClass: "text-sm", gap: "gap-4" },
  };

  const currentSize = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center select-none ${currentSize.gap} ${className}`}>
      <DefaultLogoAvatar className="" style={{ width: currentSize.height, height: currentSize.height }} />

      {/* LOGO TEXT - "TRADING. Lead Spirit" */}
      {showText && (
        <div className="flex flex-col justify-center">
          <h2 className={`${currentSize.textClass} font-black font-sans tracking-wide uppercase leading-none ${variant === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            TRADING<span className="text-indigo-400">.</span>
          </h2>
          <span className={`${currentSize.subTextClass} text-slate-500 block tracking-wider uppercase font-extrabold mt-1 font-sans`}>
            Lead Spirit
          </span>
        </div>
      )}
    </div>
  );
}
