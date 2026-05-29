import React, { useState, useEffect } from 'react';
import { Mail, Phone, Lock, User as UserIcon, Globe, Upload, Eye, EyeOff, ArrowRight, ShieldAlert, Sparkles, Check, ChevronDown, Camera } from 'lucide-react';
import { User } from '../types';
import Logo, { DefaultLogoAvatar } from './Logo';


export const COUNTRY_INFO: Record<string, { name: string; prefix: string; placeholder: string; flag: string }> = {
  FR: { name: 'France', prefix: '+33', placeholder: 'Ex: trader.fr@gmail.com', flag: '🇫🇷' },
  DE: { name: 'Allemagne', prefix: '+49', placeholder: 'Ex: trader.de@gmail.com', flag: '🇩🇪' },
  DZ: { name: 'Algérie', prefix: '+213', placeholder: 'Ex: trader.dz@gmail.com', flag: '🇩🇿' },
  SA: { name: 'Arabie Saoudite', prefix: '+966', placeholder: 'Ex: trader.sa@gmail.com', flag: '🇸🇦' },
  AR: { name: 'Argentine', prefix: '+54', placeholder: 'Ex: trader.ar@gmail.com', flag: '🇦🇷' },
  AU: { name: 'Australie', prefix: '+61', placeholder: 'Ex: trader.au@gmail.com', flag: '🇦🇺' },
  AT: { name: 'Autriche', prefix: '+43', placeholder: 'Ex: trader.at@gmail.com', flag: '🇦🇹' },
  BE: { name: 'Belgique', prefix: '+32', placeholder: 'Ex: trader.be@gmail.com', flag: '🇧🇪' },
  BJ: { name: 'Bénin', prefix: '+229', placeholder: 'Ex: trader.bj@gmail.com', flag: '🇧🇯' },
  BR: { name: 'Brésil', prefix: '+55', placeholder: 'Ex: trader.br@gmail.com', flag: '🇧🇷' },
  BF: { name: 'Burkina Faso', prefix: '+226', placeholder: 'Ex: trader.bf@gmail.com', flag: '🇧🇫' },
  CM: { name: 'Cameroun', prefix: '+237', placeholder: 'Ex: trader.cm@gmail.com', flag: '🇨🇲' },
  CA: { name: 'Canada', prefix: '+1', placeholder: 'Ex: trader.ca@gmail.com', flag: '🇨🇦' },
  CG: { name: 'Congo', prefix: '+242', placeholder: 'Ex: trader.cg@gmail.com', flag: '🇨🇬' },
  CI: { name: 'Côte d\'Ivoire', prefix: '+225', placeholder: 'Ex: trader.ci@gmail.com', flag: '🇨🇮' },
  DK: { name: 'Danemark', prefix: '+45', placeholder: 'Ex: trader.dk@gmail.com', flag: '🇩🇰' },
  DJ: { name: 'Djibouti', prefix: '+253', placeholder: 'Ex: trader.dj@gmail.com', flag: '🇩🇯' },
  EG: { name: 'Égypte', prefix: '+20', placeholder: 'Ex: trader.eg@gmail.com', flag: '🇪🇬' },
  AE: { name: 'Émirats Arabes Unis', prefix: '+971', placeholder: 'Ex: trader.ae@gmail.com', flag: '🇦🇪' },
  ES: { name: 'Espagne', prefix: '+34', placeholder: 'Ex: trader.es@gmail.com', flag: '🇪🇸' },
  US: { name: 'États-Unis', prefix: '+1', placeholder: 'Ex: trader.us@gmail.com', flag: '🇺🇸' },
  GA: { name: 'Gabon', prefix: '+241', placeholder: 'Ex: trader.ga@gmail.com', flag: '🇬🇦' },
  GP: { name: 'Guadeloupe', prefix: '+590', placeholder: 'Ex: trader.gp@gmail.com', flag: '🇬🇵' },
  GN: { name: 'Guinée', prefix: '+224', placeholder: 'Ex: trader.gn@gmail.com', flag: '🇬🇳' },
  GF: { name: 'Guyane', prefix: '+594', placeholder: 'Ex: trader.gf@gmail.com', flag: '🇬🇫' },
  HT: { name: 'Haïti', prefix: '+509', placeholder: 'Ex: trader.ht@gmail.com', flag: '🇭🇹' },
  IT: { name: 'Italie', prefix: '+39', placeholder: 'Ex: trader.it@gmail.com', flag: '🇮🇹' },
  JP: { name: 'Japon', prefix: '+81', placeholder: 'Ex: trader.jp@gmail.com', flag: '🇯🇵' },
  LU: { name: 'Luxembourg', prefix: '+352', placeholder: 'Ex: trader.lu@gmail.com', flag: '🇱🇺' },
  MG: { name: 'Madagascar', prefix: '+261', placeholder: 'Ex: trader.mg@gmail.com', flag: '🇲🇬' },
  ML: { name: 'Mali', prefix: '+223', placeholder: 'Ex: trader.ml@gmail.com', flag: '🇲🇱' },
  MA: { name: 'Maroc', prefix: '+212', placeholder: 'Ex: trader.ma@gmail.com', flag: '🇲🇦' },
  MQ: { name: 'Martinique', prefix: '+596', placeholder: 'Ex: trader.mq@gmail.com', flag: '🇲🇶' },
  MU: { name: 'Maurice', prefix: '+230', placeholder: 'Ex: trader.mu@gmail.com', flag: '🇲🇺' },
  MX: { name: 'Mexique', prefix: '+52', placeholder: 'Ex: trader.mx@gmail.com', flag: '🇲🇽' },
  MC: { name: 'Monaco', prefix: '+377', placeholder: 'Ex: trader.mc@gmail.com', flag: '🇲🇨' },
  NE: { name: 'Niger', prefix: '+227', placeholder: 'Ex: trader.ne@gmail.com', flag: '🇳🇪' },
  NO: { name: 'Norvège', prefix: '+47', placeholder: 'Ex: trader.no@gmail.com', flag: '🇳🇴' },
  NL: { name: 'Pays-Bas', prefix: '+31', placeholder: 'Ex: trader.nl@gmail.com', flag: '🇳🇱' },
  PT: { name: 'Portugal', prefix: '+351', placeholder: 'Ex: trader.pt@gmail.com', flag: '🇵🇹' },
  QA: { name: 'Qatar', prefix: '+974', placeholder: 'Ex: trader.qa@gmail.com', flag: '🇶🇦' },
  CD: { name: 'République Démocratique du Congo', prefix: '+243', placeholder: 'Ex: trader.cd@gmail.com', flag: '🇨🇩' },
  GB: { name: 'Royaume-Uni', prefix: '+44', placeholder: 'Ex: trader.gb@gmail.com', flag: '🇬🇧' },
  SN: { name: 'Sénégal', prefix: '+221', placeholder: 'Ex: trader.sn@gmail.com', flag: '🇸🇳' },
  CH: { name: 'Suisse', prefix: '+41', placeholder: 'Ex: trader.ch@gmail.com', flag: '🇨🇭' },
  SE: { name: 'Suède', prefix: '+46', placeholder: 'Ex: trader.se@gmail.com', flag: '🇸🇪' },
  TD: { name: 'Tchad', prefix: '+235', placeholder: 'Ex: trader.td@gmail.com', flag: '🇹🇩' },
  TG: { name: 'Togo', prefix: '+228', placeholder: 'Ex: trader.tg@gmail.com', flag: '🇹🇬' },
  TN: { name: 'Tunisie', prefix: '+216', placeholder: 'Ex: trader.tn@gmail.com', flag: '🇹🇳' },
  TR: { name: 'Turquie', prefix: '+90', placeholder: 'Ex: trader.tr@gmail.com', flag: '🇹🇷' },
  VN: { name: 'Viêt Nam', prefix: '+84', placeholder: 'Ex: trader.vn@gmail.com', flag: '🇻🇳' },
  OTHER: { name: 'Autre / International', prefix: '', placeholder: 'Ex: trader.global@gmail.com', flag: '🌐' }
};

interface Candle {
  high: number;
  low: number;
  open: number;
  close: number;
  type: 'up' | 'down';
}

function TradingDevicesSimulator() {
  const [candles, setCandles] = useState<Candle[]>([
    { high: 85, low: 15, open: 30, close: 70, type: 'up' },
    { high: 90, low: 30, open: 70, close: 40, type: 'down' },
    { high: 65, low: 10, open: 40, close: 20, type: 'down' },
    { high: 80, low: 20, open: 20, close: 60, type: 'up' },
    { high: 95, low: 45, open: 60, close: 85, type: 'up' },
    { high: 75, low: 15, open: 85, close: 35, type: 'down' },
    { high: 60, low: 25, open: 35, close: 55, type: 'up' },
    { high: 85, low: 40, open: 55, close: 75, type: 'up' },
    { high: 70, low: 20, open: 75, close: 30, type: 'down' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        return prev.map(candle => {
          const change = (Math.random() * 12 - 6);
          let newClose = Math.max(15, Math.min(85, candle.close + change));
          let newOpen = candle.close;
          return {
            high: Math.max(newOpen, newClose, Math.min(95, candle.high + (Math.random() * 4 - 2))),
            low: Math.min(newOpen, newClose, Math.max(5, candle.low + (Math.random() * 4 - 2))),
            open: newOpen,
            close: newClose,
            type: newClose >= newOpen ? 'up' : 'down'
          };
        });
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full py-16 px-4 flex flex-col items-center justify-center overflow-hidden min-h-[380px] bg-slate-950/40 rounded-2xl border border-indigo-950/50 mt-4">
      {/* Absolute high-tech connectivity world map coordinates pattern from Image 1 */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none overflow-hidden select-none">
        <svg className="w-full h-full text-indigo-400" viewBox="0 0 800 400" fill="currentColor">
          <pattern id="dot-grid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
          
          {/* Faint connecting lines */}
          <path d="M 50,150 Q 200,80 350,150 T 650,150" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" />
          <path d="M 120,280 Q 280,200 440,280 T 760,200" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3,3" />
        </svg>
      </div>

      {/* Floating abstract decorative graphics */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded-full px-2.5 py-0.5 text-[9px] text-green-400 font-bold uppercase tracking-wider animate-pulse font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 block animate-ping shrink-0"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 block absolute left-2.5 shrink-0"></span>
        <span className="ml-[6px]">Flux Live • Connecté</span>
      </div>

      {/* Devices stack mimicking Image 1 */}
      <div className="relative w-full max-w-[420px] h-[240px] flex items-center justify-center scale-95 sm:scale-100 transition-all select-none">
        
        {/* DEVICE 1: Central Large Monitor Screen representing master laptop/desktop */}
        <div className="relative w-[190px] xs:w-[220px] sm:w-[250px] aspect-[16/10] bg-[#0c0f1d] rounded-t-xl border-t-[3.5px] border-x-[3.5px] border-slate-700/80 shadow-2xl overflow-hidden flex flex-col p-1 z-10 transition-transform duration-500">
          {/* Blue reflection gloss bar */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#3b82f6]/40 z-20"></div>
          {/* Grid panel screen */}
          <div className="w-full h-full bg-[#050711] rounded border border-slate-900/40 relative flex flex-col justify-end p-2 overflow-hidden">
            {/* Grid line overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
            
            {/* Chart candlesticks screen live */}
            <div className="w-full h-[65%] flex items-end justify-between px-1 relative z-10">
              {candles.map((candle, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  {/* Candlestick High/Low Wick */}
                  <div 
                    className={`absolute w-[1.5px] ${candle.type === 'up' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}
                    style={{
                      height: `${candle.high - candle.low}%`,
                      bottom: `${candle.low}%`,
                    }}
                  />
                  {/* Candlestick Real Body */}
                  <div 
                    className={`w-[4px] sm:w-[5px] rounded-[1px] relative shadow-lg ${
                      candle.type === 'up' ? 'bg-[#10b981] shadow-[#10b981]/20' : 'bg-[#ef4444] shadow-[#ef4444]/20'
                    }`}
                    style={{
                      height: `${Math.max(4, Math.abs(candle.close - candle.open))}%`,
                      bottom: `${Math.min(candle.open, candle.close)}%`,
                    }}
                  />

                  {/* Red SELL / Green BUY flags exactly as in Image 1 */}
                  {idx === 2 && (
                    <div 
                      className="absolute z-35 animate-bounce"
                      style={{ bottom: `${Math.max(candle.high + 6, 68)}%` }}
                    >
                      <div className="bg-[#ef4444] text-[6px] xs:text-[7px] font-black text-white px-1 py-0.5 rounded flex items-center gap-0.5 shadow-md shadow-red-950/40 font-mono tracking-wider border border-red-500/20">
                        SELL⬇
                      </div>
                      <div className="w-1 h-1 bg-[#ef4444] rotate-45 mx-auto -mt-0.5 shadow" />
                    </div>
                  )}

                  {idx === 6 && (
                    <div 
                      className="absolute z-35 animate-bounce"
                      style={{ bottom: `${Math.max(candle.high + 6, 75)}%` }}
                    >
                      <div className="bg-[#10b981] text-[6px] xs:text-[7px] font-black text-white px-1 py-0.5 rounded flex items-center gap-0.5 shadow-md shadow-green-950/40 font-mono tracking-wider border border-green-500/20">
                        BUY⬆
                      </div>
                      <div className="w-1 h-1 bg-[#10b981] rotate-45 mx-auto -mt-0.5 shadow" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Glowing Logo Watermark in screen */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 z-0">
               <span className="text-xl font-black tracking-widest text-[#3b82f6] font-mono">T R A D E V A U L T</span>
            </div>
          </div>
        </div>
        {/* Monitor Base Pedestal */}
        <div className="absolute bottom-[23px] left-1/2 transform -translate-x-1/2 w-10 h-6 bg-gradient-to-b from-[#1e293b] to-[#0a0f1d] z-0 shadow-lg rounded-b border-b border-slate-800"></div>
        <div className="absolute bottom-[16px] left-1/2 transform -translate-x-1/2 w-16 h-1.5 bg-[#1e293b] z-0 shadow-xl rounded-sm"></div>

        {/* DEVICE 2: Laptop representation placed to the left (Image 1 style) */}
        <div className="absolute left-[3px] xs:left-[10px] sm:left-[20px] bottom-[26px] w-[85px] sm:w-[105px] aspect-[1.3] bg-[#0c0f20] rounded-lg border-[1.5px] border-slate-700/90 p-0.5 shadow-2xl z-20 overflow-hidden group hover:scale-[1.03] transition-transform duration-300 ring-1 ring-sky-500/20">
          <div className="w-full h-full bg-[#030612] rounded relative flex flex-col justify-end p-1 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:5px_5px]" />
            {/* Live Chart Mini Candlesticks */}
            <div className="w-full h-[60%] flex items-end justify-between px-0.5 relative z-10">
              {candles.slice(1, 7).map((candle, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative">
                  <div 
                    className={`absolute w-[1px] ${candle.type === 'up' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}
                    style={{
                      height: `${candle.high * 0.85 - candle.low * 0.85}%`,
                      bottom: `${candle.low * 0.85}%`,
                    }}
                  />
                  <div 
                    className={`w-[2.5px] rounded-[0.5px] ${candle.type === 'up' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}
                    style={{
                      height: `${Math.max(3, Math.abs(candle.close - candle.open) * 0.85)}%`,
                      bottom: `${Math.min(candle.open, candle.close) * 0.85}%`,
                    }}
                  />
                  
                  {idx === 3 && (
                    <div 
                      className="absolute z-30 animate-bounce cursor-default"
                      style={{ bottom: `${Math.max(candle.high * 0.85 + 5, 55)}%` }}
                    >
                      <div className="bg-[#ef4444] text-[5px] font-black text-white px-0.5 py-0.5 rounded shadow flex items-center gap-0.5 leading-none font-mono">
                        SELL⬇
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Base line for Laptop keyboard section */}
        <div className="absolute left-[-5px] xs:left-[2px] sm:left-[12px] bottom-[20px] w-[110px] sm:w-[130px] h-1.5 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 z-20 rounded-b shadow-md border-b border-slate-950"></div>

        {/* DEVICE 3: Smartphone vertically positioned on the Right (Image 1 style) */}
        <div className="absolute right-[5px] xs:right-[12px] sm:right-[22px] bottom-[20px] w-[45px] sm:w-[50px] aspect-[9/16] bg-[#0b0e1b] rounded-lg border-[1.5px] border-slate-700/90 p-0.5 shadow-2xl z-30 overflow-hidden hover:scale-[1.05] transition-transform duration-300 ring-1 ring-emerald-500/20">
          {/* Top Speaker / Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-5 h-1.5 bg-slate-950 rounded-b z-40 flex items-center justify-center">
            <span className="w-1 h-[1px] bg-slate-800 block"></span>
          </div>
          
          <div className="w-full h-full bg-[#040610] rounded-md relative flex flex-col justify-end p-0.5 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:4px_4px]" />
            {/* Live Chart Micro vertical */}
            <div className="w-full h-[65%] flex items-end justify-between px-[1px] relative z-10">
              {candles.slice(3, 9).map((candle, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative">
                  <div 
                    className={`absolute w-[0.8px] ${candle.type === 'up' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}
                    style={{
                      height: `${candle.high * 0.8 - candle.low * 0.8}%`,
                      bottom: `${candle.low * 0.8}%`,
                    }}
                  />
                  <div 
                    className={`w-[1.8px] rounded-[0.2px] ${candle.type === 'up' ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}
                    style={{
                      height: `${Math.max(2.5, Math.abs(candle.close - candle.open) * 0.8)}%`,
                      bottom: `${Math.min(candle.open, candle.close) * 0.8}%`,
                    }}
                  />

                  {idx === 2 && (
                    <div 
                      className="absolute z-30 animate-bounce cursor-default"
                      style={{ bottom: `${Math.max(candle.high * 0.8 + 5, 50)}%` }}
                    >
                      <div className="bg-[#10b981] text-[5px] font-black text-white px-0.5 py-0.5 rounded shadow flex items-center gap-0.5 leading-none font-mono">
                        BUY⬆
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Caption footer detail for multi screens */}
      <div className="text-center mt-3 z-10 max-w-[280px]">
        <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1">Station de Trading Synchrone</h4>
        <p className="text-[9px] text-blue-400 font-extrabold uppercase tracking-[0.16em]">Multi-Supports • Cloud • Latence Zéro</p>
      </div>
    </div>
  );
}

// High-fidelity Tether USDT TRC20 and BEP20 styled SVG Icons matching user-uploaded references
export const UsdtTrc20Icon = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 select-none shrink-0" referrerPolicy="no-referrer">
    {/* Green circle base */}
    <circle cx="50" cy="50" r="45" fill="#26a17b" stroke="#ffffff" strokeWidth="2.5" />
    {/* Outer bevel ring for coin style */}
    <circle cx="50" cy="50" r="39" fill="none" stroke="#2ebb8d" strokeWidth="2" />
    {/* Tether T logo */}
    <path d="M 32,32 H 68 V 40 H 56 V 72 H 44 V 40 H 32 Z" fill="#ffffff" />
    <ellipse cx="50" cy="48" rx="27" ry="7.5" fill="none" stroke="#ffffff" strokeWidth="4" />
    {/* Red TRON badge overlay at bottom right */}
    <circle cx="78" cy="78" r="18" fill="#e81313" stroke="#ffffff" strokeWidth="2.5" />
    {/* TRON triangle symbol */}
    <path d="M 78,66 L 89,83 H 67 Z M 78,71 L 84,81 H 72 Z" fill="#ffffff" />
  </svg>
);

export const UsdtBep20Icon = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 select-none shrink-0" referrerPolicy="no-referrer">
    {/* Green circle base with tilted coin style */}
    <circle cx="50" cy="50" r="45" fill="#26a17b" stroke="#ffffff" strokeWidth="2.5" />
    {/* Outer bevel ring for coin style */}
    <circle cx="50" cy="50" r="39" fill="none" stroke="#2ebb8d" strokeWidth="2" />
    {/* Tether T logo */}
    <path d="M 32,32 H 68 V 40 H 56 V 72 H 44 V 40 H 32 Z" fill="#ffffff" />
    <ellipse cx="50" cy="48" rx="27" ry="7.5" fill="none" stroke="#ffffff" strokeWidth="4" />
    {/* Yellow BSC badge overlay */}
    <circle cx="78" cy="78" r="18" fill="#f3ba2f" stroke="#ffffff" strokeWidth="2.5" />
    {/* BNB Logo style */}
    {/* Center diamond */}
    <path d="M 78,71.5 L 81.5,75 L 78,78.5 L 74.5,75 Z" fill="#181a20" />
    {/* Surrounding blocks */}
    <path d="M 78,66 L 85,73 L 81.5,76.5 L 78,73 L 74.5,76.5 L 71,73 Z" fill="#ffffff" />
    <path d="M 78,84 L 85,77 L 81.5,73.5 L 78,77 L 74.5,73.5 L 71,77 Z" fill="#ffffff" />
  </svg>
);

interface PortalProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  onRegisterPending: (user: User) => void;
  adminWalletTRC20?: string;
  adminWalletBEP20?: string;
  subscriptionPrice?: number;
  subscriptionPeriod?: number;
}

export default function Portal({ 
  onLoginSuccess, 
  users, 
  onRegisterPending,
  adminWalletTRC20 = 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV',
  adminWalletBEP20 = '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0',
  subscriptionPrice = 30,
  subscriptionPeriod = 3
}: PortalProps) {
  const [activeTab, setActiveTab ] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCountry, setRegCountry] = useState('FR');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [regAvatar, setRegAvatar] = useState<string | null>(null);

  // Reset password states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<string | null>(null);

  // Left/Right selection Network
  const [selectedNetwork, setSelectedNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');

  const WALLETS = {
    TRC20: adminWalletTRC20,
    BEP20: adminWalletBEP20
  };

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const displayToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        displayToast('Fichier image uniquement (.png, .jpg)', 'error');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        displayToast('Fichier trop lourd (max 3Mo)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRegAvatar(event.target.result as string);
          displayToast('Photo de profil chargée avec succès !', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        displayToast('Fichier image uniquement (.png, .jpg)', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        displayToast('Fichier trop lourd (max 5Mo)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPaymentScreenshot(event.target.result as string);
          displayToast('Capture d\'écran chargée avec succès !', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginEmail.trim().toLowerCase();
    if (!identifier || !loginPassword) {
      displayToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    const matchedUser = users.find(u => 
      u.email.toLowerCase() === identifier || 
      (u.username && u.username.toLowerCase() === identifier)
    );

    if (!matchedUser) {
      displayToast('Compte introuvable ou e-mail incorrect', 'error');
      return;
    }

    if (matchedUser.password !== loginPassword) {
      displayToast('Mot de passe incorrect', 'error');
      return;
    }

    if (matchedUser.status === 'pending') {
      displayToast('Votre inscription est en attente de vérification par un admin.', 'info');
      return;
    }

    if (matchedUser.status === 'rejected') {
      displayToast('Votre inscription a été rejetée. Veuillez recréer un compte.', 'error');
      return;
    }

    onLoginSuccess(matchedUser);
    displayToast('Connexion réussie ! Bienvenue.', 'success');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      displayToast('Veuillez remplir tous les champs obligatoires.', 'error');
      return;
    }
    if (regPassword.length < 8) {
      displayToast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
      return;
    }
    if (regPassword !== regConfirm) {
      displayToast('Les mots de passe ne correspondent pas.', 'error');
      return;
    }
    if (!paymentScreenshot) {
      displayToast('La capture d\'écran du paiement d\'inscription est obligatoire.', 'error');
      return;
    }

    const exist = users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (exist) {
      displayToast('Cette adresse e-mail est déjà utilisée.', 'error');
      return;
    }

    const newUser: User = {
      id: 'usr_' + Date.now(),
      username: regUsername.trim(),
      email: regEmail.trim(),
      password: regPassword,
      country: regCountry,
      paid: false,
      paidUntil: null,
      createdAt: new Date().toISOString(),
      paymentScreenshot: paymentScreenshot,
      status: 'pending', // Admin must validate
      avatar: regAvatar || undefined
    };

    onRegisterPending(newUser);
    displayToast('Compte créé ! Votre inscription est en cours de validation par l\'Admin.', 'success');
    
    // Switch to login tab after success
    setActiveTab('login');
    setLoginEmail(regEmail);
    setLoginPassword('');
    setRegAvatar(null);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = users.find(u => u.email.toLowerCase() === forgotEmail.trim().toLowerCase());
    if (matched) {
      setForgotResult(`Le mot de passe de ce compte est : "${matched.password}". Veuillez le noter.`);
    } else {
      setForgotResult("Aucun compte n'a été trouvé avec cette adresse e-mail.");
    }
  };

  // Find dynamic matched user avatar during connection typing
  const matchedUserForAvatar = activeTab === 'login' && loginEmail
    ? users.find(u => 
        u.email.toLowerCase() === loginEmail.trim().toLowerCase() || 
        (u.username && u.username.toLowerCase() === loginEmail.trim().toLowerCase())
      )
    : null;

  return (
    <div className="min-height-screen py-10 px-4 md:px-10 flex items-center justify-center relative">
      <div className="grid-bg"></div>
      <div className="glow-orb-1"></div>
      <div className="glow-orb-2"></div>

      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg flex items-center gap-2 border shadow-lg ${
          toastMessage.type === 'success' ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]' : 
          toastMessage.type === 'error' ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]' :
          'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]'
        }`}>
          <span>{toastMessage.type === 'success' ? '✅' : toastMessage.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden glass-panel shadow-2xl">
        
        {/* LEFT COLUMN: Login and Registration */}
        <div className="col-span-1 lg:col-span-7 p-6 md:p-12 flex flex-col justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex flex-col items-start gap-1.5 mb-8">
              <Logo size="lg" variant="dark" />
              <p className="text-[9px] text-[#475569] tracking-[0.22em] font-mono font-bold uppercase pl-3">TRACK. ANALYZE. EVOLVE.</p>
            </div>

            <h2 className="text-2xl font-black text-white mb-2 leading-tight">
              Bienvenue sur <span className="bg-gradient-to-r from-blue-400 to-indigo-500 font-extrabold bg-clip-text text-transparent">TradeVault</span>
            </h2>
            <p className="text-slate-400 text-xs mb-6 font-sans">
              Connecte-toi ou crée ton compte pour accéder à ton journal de trading et ton Track Record.
            </p>

            {/* Inscription / Connexion Tabs */}
            <div className="flex bg-[#0f172a]/60 p-1.5 rounded-xl mb-6 border border-[#1e293b]/60">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setForgotResult(null); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'login' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setForgotResult(null); }}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                }`}
              >
                Inscription
              </button>
            </div>

            <div className="bg-[#0a0f24]/50 p-6 md:p-8 rounded-3xl border border-indigo-500/15 backdrop-blur-md shadow-2xl text-left">


            {/* TAB CONTENT: LOGIN */}
            {activeTab === 'login' && !forgotOpen && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Identifiant Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white font-bold tracking-wide">Identifiant (E-mail ou Nom d'utilisateur)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Entrez votre e-mail ou nom d'utilisateur"
                      className="w-full pl-11 pr-4 py-3 bg-[#0a0f1d]/90 border border-[#1e293b]/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-white font-bold tracking-wide">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Entrez votre mot de passe"
                      className="w-full pl-11 pr-12 py-3 bg-[#0a0f1d]/90 border border-[#1e293b]/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all mt-6"
                >
                  Se connecter <ArrowRight size={14} />
                </button>
              </form>
            )}

            {/* TAB CONTENT: PASSWORD RECOVERY */}
            {activeTab === 'login' && forgotOpen && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Récupération sécurisée</h3>
                <p className="text-slate-400 text-xs">Saisissez l'adresse e-mail associée à votre compte pour rechercher vos identifiants.</p>
                
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Votre adresse e-mail</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setForgotOpen(false); setForgotResult(null); }}
                      className="flex-1 py-2 border border-slate-800 rounded-xl text-xs text-slate-400 hover:bg-slate-900"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                    >
                      Rechercher
                    </button>
                  </div>
                </form>

                {forgotResult && (
                  <div className={`p-4 rounded-xl border text-xs font-mono break-words ${
                    forgotResult.includes('mot de passe') ? 'bg-indigo-950/30 border-indigo-800 text-indigo-200' : 'bg-red-950/30 border-red-900 text-red-200'
                  }`}>
                    {forgotResult}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: REGISTER */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium font-sans">Nom de trader *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <UserIcon size={18} />
                      </span>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Ex: Alexander_F"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium font-sans">Adresse Email *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Mail size={18} />
                      </span>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium">Mot de passe *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Lock size={18} />
                      </span>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 8 caractères"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300 font-medium font-sans">Confirmer mot de passe *</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                        <Lock size={18} />
                      </span>
                      <input
                        type="password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder="Vérification"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* REQUIREMENT 3: Mandate proof screenshot at registration */}
                <div className="space-y-1 bg-indigo-950/20 p-4 rounded-xl border border-indigo-900/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-400">📸 PREUVE DE PAIEMENT REQUISE</span>
                    <span className="text-[9px] bg-red-500/30 text-red-300 px-2 rounded-full font-bold uppercase">Obligatoire</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                    Pour finaliser votre inscription, veuillez uploader la capture d'écran du paiement de l'abonnement de <span className="text-indigo-300 font-bold">$30 USDT chaque 3 mois</span> vers l'adresse crypto de droite. Un administrateur activera votre espace sous peu.
                  </p>

                  <div className="border border-dashed border-indigo-800/60 bg-slate-950/30 rounded-lg p-3 text-center transition-all hover:border-indigo-500/50 relative cursor-pointer">
                    <input
                      type="file"
                      id="reg-screenshot-upload"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {!paymentScreenshot ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Upload size={24} className="text-indigo-400" />
                        <span className="text-xs text-slate-300 font-medium">Glissez ou parcourez pour charger l'image</span>
                        <span className="text-[10px] text-slate-500 font-mono">PNG, JGP / max 5MB</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img src={paymentScreenshot} alt="Preuve" className="w-10 h-10 object-cover rounded border border-indigo-500" />
                          <span className="text-xs text-indigo-300 font-mono font-medium">capture_chargee.jpg</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setPaymentScreenshot(null); }}
                          className="text-[10px] bg-red-600/30 text-rose-300 px-2 py-1 rounded hover:bg-red-600/50"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 z-10"
                >
                  S'inscrire (Attente Validation)
                </button>
              </form>
            )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-900/60 text-center">
            <p className="text-[10px] text-slate-500">
              © 2026 TradeVault. Tous droits réservés. L'investissement financier comporte des risques élevés.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Devices Simulator (on Login) or Subscription + payment instructions (on Register) */}
        <div className="col-span-1 lg:col-span-5 p-6 md:p-10 bg-gradient-to-b from-[#0e1726]/60 to-[#030712]/90 border-l border-[#1e293b]/50 flex flex-col justify-between overflow-hidden">
          {activeTab === 'login' ? (
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 text-[10px] text-indigo-400 font-bold tracking-wider uppercase mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 block animate-pulse"></span> STATION LIVE
                </div>
                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Espace TradeVault</h3>
                <p className="text-slate-400 text-xs mb-6 font-sans leading-relaxed">
                  Pratiquez une gestion rigoureuse de vos positions, surveillez vos statistiques de performance, et validez vos challenges prop-firms avec latence zéro.
                </p>
              </div>

              {/* High-fidelity Trading Screens Simulator with dynamic chart rendering */}
              <TradingDevicesSimulator />

              <div className="mt-6 pt-5 border-t border-slate-900/60">
                <p className="text-[10px] text-slate-500 text-center font-sans font-medium">
                  Connexion hautement sécurisée chiffrée de bout en bout.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between py-2">
              <div className="space-y-8">
                {/* 1. ABONNEMENT PREMIUM TITLE - EXTREME NEON GLOW STYLE MATCH */}
                <div className="text-center pt-4">
                  <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-[0.18em] font-sans drop-shadow-[0_0_15px_rgba(139,92,246,0.65)] bg-clip-text text-transparent bg-gradient-to-b from-white via-indigo-100 to-indigo-300">
                    Abonnement Premium
                  </h3>
                </div>

                {/* 2. SLICK FLOATING NEON PILL BOX MATCHING SCREENSHOT */}
                <div className="relative flex justify-center py-2">
                  {/* Outer fluid aura */}
                  <div className="absolute inset-0 max-w-[340px] mx-auto bg-gradient-to-r from-blue-500/20 via-purple-500/25 to-pink-500/20 rounded-[2rem] blur-xl opacity-80"></div>
                  
                  {/* The Glass Capsule container */}
                  <div className="relative w-full max-w-[325px] h-[75px] rounded-[1.8rem] bg-[#1a0b36]/60 border border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-md flex items-center justify-center p-[2px] overflow-hidden">
                    {/* Glowing wavy ambient effect inside the pill */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#3b82f6]/10 via-[#a855f7]/15 to-transparent animate-pulse"></div>
                    
                    {/* Centered Large White Text */}
                    <div className="z-10 text-2xl md:text-3xl font-bold text-white tracking-wide font-sans drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">
                      ${subscriptionPrice} / {subscriptionPeriod} mois
                    </div>
                  </div>
                </div>

                {/* 3. DUAL CRYPTO NETWORKS SIDE-BY-SIDE WITH NEON GLOW CIRCLES */}
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-500 block text-center tracking-widest uppercase font-mono">
                    Sélectionnez votre réseau de transfert
                  </span>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* USDT TRC20 OPTION */}
                    <div
                      onClick={() => setSelectedNetwork('TRC20')}
                      className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center group ${
                        selectedNetwork === 'TRC20'
                          ? 'border-indigo-500/60 bg-[#160e35]/60 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                          : 'border-[#1e293b]/60 bg-[#060a13]/70 hover:border-slate-800'
                      }`}
                    >
                      {/* Violet Glow circle indicator */}
                      <div className="flex items-center justify-center relative">
                        {/* High Fidelity USDT TRC20 custom icon backing */}
                        <div className={`transition-all ${
                          selectedNetwork === 'TRC20' ? 'shadow-[0_0_15px_rgba(38,161,123,0.5)] scale-105' : 'opacity-80'
                        }`}>
                          <UsdtTrc20Icon />
                        </div>
                        {selectedNetwork === 'TRC20' && (
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 flex items-center justify-center text-white scale-90 border border-slate-950">
                            <Check size={8} className="stroke-[3.5]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-black text-white font-sans tracking-wide">USDT TRC20</h4>
                        <p className="text-[8px] text-slate-500 font-medium uppercase font-mono tracking-wider">Réseau Tron</p>
                      </div>
                    </div>

                    {/* USDT BEP20 OPTION */}
                    <div
                      onClick={() => setSelectedNetwork('BEP20')}
                      className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center group ${
                        selectedNetwork === 'BEP20'
                          ? 'border-cyan-500/60 bg-[#0a1f2c]/65 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                          : 'border-[#1e293b]/60 bg-[#060a13]/70 hover:border-slate-800'
                      }`}
                    >
                      {/* Cyan Glow circle indicator */}
                      <div className="flex items-center justify-center relative">
                        {/* High Fidelity USDT BEP20 custom icon backing */}
                        <div className={`transition-all ${
                          selectedNetwork === 'BEP20' ? 'shadow-[0_0_15px_rgba(38,161,123,0.5)] scale-105' : 'opacity-80'
                        }`}>
                          <UsdtBep20Icon />
                        </div>
                        {selectedNetwork === 'BEP20' && (
                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 flex items-center justify-center text-white scale-90 border border-slate-950">
                            <Check size={8} className="stroke-[3.5]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-black text-white font-sans tracking-wide">USDT BEP20</h4>
                        <p className="text-[8px] text-slate-500 font-medium uppercase font-mono tracking-wider">BSC BNB Chain</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. SLEEK COPY WALLET BAR INSIDE CAPSULE PILL CONTAINER (EXACT MATCH) */}
              <div className="mt-8 space-y-4 pt-4 border-t border-slate-900/45">
                
                {/* Simulated address container */}
                <div className="relative">
                  <span className="text-[9px] font-bold text-slate-500 block mb-2 tracking-wider font-mono uppercase">
                    Adresse de réception unique ({selectedNetwork})
                  </span>

                  {/* Elegant Horizontal Capsule copy bar */}
                  <div className="flex items-center justify-between bg-[#040816]/95 rounded-[1.5rem] border border-indigo-505/20 pl-4 pr-1.5 py-1.5 shadow-xl">
                    
                    {/* Truncated representation "Tf...z9" matching style exactly */}
                    <div className="flex flex-col">
                      <code className="text-[12px] font-mono text-[#38bdf8] font-bold tracking-wide select-all">
                        {WALLETS[selectedNetwork].substring(0, 4)}...{WALLETS[selectedNetwork].substring(WALLETS[selectedNetwork].length - 4)}
                      </code>
                      <span className="text-[7.5px] font-mono font-medium text-slate-600 block leading-tight">
                        Cliquez sur copier pour l'adresse complète
                      </span>
                    </div>

                    {/* Capsule-styled "COPY ↗" button with glowing border */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(WALLETS[selectedNetwork]);
                        displayToast('Adresse crypto complète copiée avec succès !', 'success');
                      }}
                      className="bg-indigo-950/80 hover:bg-indigo-600 hover:text-white border border-indigo-500/40 text-indigo-300 px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
                    >
                      COPY <span className="text-[12px] leading-none shrink-0">↗</span>
                    </button>
                  </div>
                </div>

                {/* Instructions helper */}
                <div className="bg-slate-950/30 rounded-xl p-3 border border-slate-900/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                    <span className="text-[8.5px] font-black tracking-widest text-[#10b981] uppercase font-mono">Consignes d'accès rapide</span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 font-sans leading-relaxed">
                    Envoyez l'équivalent de <strong className="text-white">${subscriptionPrice} USDT</strong>, puis joignez la capture à gauche. L'Admin recevra une alerte et validera instantanément votre compte.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
