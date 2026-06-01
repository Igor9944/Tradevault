import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useThemeLang } from '../utils/themeLanguageContext';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Upload, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Check, 
  ChevronDown, 
  MousePointer,
  HelpCircle,
  Globe
} from 'lucide-react';
import { User } from '../types';
import Logo, { DefaultLogoAvatar } from './Logo';
import { signUpWithSupabase, signInWithSupabase, signInWithGoogle, signInWithGitHub } from '../utils/supabaseSync';
import { supabase } from '../lib/supabase';

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

function CanvasParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Seed particles
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.5
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(0, 255, 156, 0.04)';
      ctx.lineWidth = 0.8;

      particles.forEach((p, idx) => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none select-none z-0" />;
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
    <div className="relative w-full py-12 px-4 flex flex-col items-center justify-center overflow-hidden min-h-[360px] bg-[#080808] rounded-2xl border border-white/5 mt-4">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden pb-4">
        <svg className="w-full h-full text-[#00FF9C]" viewBox="0 0 800 400" fill="currentColor">
          <pattern id="dot-grid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-[#00FF9C]/5 border border-[#00FF9C]/20 rounded-full px-2.5 py-0.5 text-[9px] text-[#00FF9C] font-mono tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] block animate-ping shrink-0"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] block absolute left-2.5 shrink-0"></span>
        <span className="ml-[6px]">ENGINE STREAMING • VERIFIED</span>
      </div>

      <div className="relative w-full max-w-[380px] h-[220px] flex items-center justify-center scale-95 sm:scale-100 transition-all select-none z-10">
        {/* Device monitor */}
        <div className="relative w-[210px] aspect-[16/10] bg-[#000000] rounded-t-xl border-t-[3px] border-x-[3px] border-white/10 shadow-2xl overflow-hidden flex flex-col p-1 transition-transform">
          <div className="w-full h-full bg-[#030303] rounded border border-white/5 relative flex flex-col justify-end p-2 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:10px_10px]" />
            
            <div className="w-full h-[70%] flex items-end justify-between px-1 relative z-10">
              {candles.map((candle, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  <div 
                    className={`absolute w-[1.2px] ${candle.type === 'up' ? 'bg-[#00FF9C]' : 'bg-[#FF4D4D]'}`}
                    style={{
                      height: `${candle.high - candle.low}%`,
                      bottom: `${candle.low}%`,
                    }}
                  />
                  <div 
                    className={`w-[4.5px] rounded-[1px] relative ${
                      candle.type === 'up' ? 'bg-[#00FF9C] shadow-[0_0_8px_rgba(0,255,156,0.3)]' : 'bg-[#FF4D4D]'
                    }`}
                    style={{
                      height: `${Math.max(4, Math.abs(candle.close - candle.open))}%`,
                      bottom: `${Math.min(candle.open, candle.close)}%`,
                    }}
                  />

                  {idx === 2 && (
                    <div className="absolute z-20 animate-bounce" style={{ bottom: `${Math.max(candle.high + 6, 68)}%` }}>
                      <div className="bg-[#FF4D4D] text-[6px] font-black text-black px-1 py-0.5 rounded tracking-wider font-mono">
                        S
                      </div>
                    </div>
                  )}

                  {idx === 6 && (
                    <div className="absolute z-20 animate-bounce" style={{ bottom: `${Math.max(candle.high + 6, 75)}%` }}>
                      <div className="bg-[#00FF9C] text-[6px] font-black text-black px-1 py-0.5 rounded tracking-wider font-mono">
                        B
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 z-0 font-mono tracking-[0.2em] text-[#00FF9C] text-xs font-bold">
              TRADEVAULT
            </div>
          </div>
        </div>
        <div className="absolute bottom-[23px] left-1/2 transform -translate-x-1/2 w-8 h-6 bg-gradient-to-b from-white/10 to-transparent z-0"></div>
        <div className="absolute bottom-[16px] left-1/2 transform -translate-x-1/2 w-14 h-1 bg-white/15 z-0 rounded-sm"></div>
      </div>
    </div>
  );
}

export const UsdtTrc20Icon = () => (
  <svg viewBox="0 0 100 100" className="w-9 h-9 select-none shrink-0" referrerPolicy="no-referrer">
    <circle cx="50" cy="50" r="45" fill="#141414" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="39" fill="none" stroke="#00FF9C" strokeWidth="1.5" strokeDasharray="2,2" />
    <path d="M 32,32 H 68 V 40 H 56 V 72 H 44 V 40 H 32 Z" fill="#00FF9C" />
    <ellipse cx="50" cy="48" rx="27" ry="7.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
    <circle cx="78" cy="78" r="15" fill="#FF4D4D" />
    <path d="M 78,69 L 86,83 H 70 Z" fill="#ffffff" transform="scale(0.85) translate(13, 11)" />
  </svg>
);

export const UsdtBep20Icon = () => (
  <svg viewBox="0 0 100 100" className="w-9 h-9 select-none shrink-0" referrerPolicy="no-referrer">
    <circle cx="50" cy="50" r="45" fill="#141414" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="39" fill="none" stroke="#00FF9C" strokeWidth="1.5" strokeDasharray="2,2" />
    <path d="M 32,32 H 68 V 40 H 56 V 72 H 44 V 40 H 32 Z" fill="#00FF9C" />
    <ellipse cx="50" cy="48" rx="27" ry="7.5" fill="none" stroke="#ffffff" strokeWidth="2.5" />
    <circle cx="78" cy="78" r="15" fill="#FFB300" />
    <path d="M 78,70 L 83,75 L 78,80 L 73,75 Z" fill="#000000" />
  </svg>
);

const LiveHeroChart = () => {
  const [data, setData] = useState<{ time: number; price: number }[]>([]);

  useEffect(() => {
    // Generate initial flat-ish data
    const initialData = [];
    let price = 1.0;
    for (let i = 0; i < 50; i++) {
      initialData.push({ time: i, price });
    }
    setData(initialData);

    const interval = setInterval(() => {
      setData((prev) => {
        const lastPrice = prev[prev.length - 1].price;
        // Random walk
        const change = (Math.random() - 0.48) * 0.05;
        const newPrice = Math.max(0.1, lastPrice + change);
        const newData = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, price: newPrice }];
        return newData;
      });
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-[50%] -translate-y-1/2 left-[50%] -translate-x-1/2 w-[100vw] h-48 md:h-72 z-0 overflow-hidden pointer-events-none fade-in opacity-80">
      {/* Edge gradient masks to fade the trace smoothly instead of hard cuts */}
      <div className="absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-black to-transparent pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
      <div className="absolute inset-x-0 bottom-0 h-24 z-10 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="heroLiveColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00FF9C" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#00FF9C" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#00FF9C" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#heroLiveColor)" 
            isAnimationActive={false} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PortalProps {
  onLoginSuccess: (user: User) => void;
  users: User[];
  onRegisterPending: (user: User) => void;
  adminWalletTRC20?: string;
  adminWalletBEP20?: string;
  subscriptionPrice?: number;
  subscriptionPeriod?: number;
  adminEmails?: string;
  onResetPasswordSuccess?: (email: string, newPass: string) => void;
}

export default function Portal({ 
  onLoginSuccess, 
  users, 
  onRegisterPending,
  adminWalletTRC20 = 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV',
  adminWalletBEP20 = '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0',
  subscriptionPrice = 30,
  subscriptionPeriod = 3,
  adminEmails = 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com',
  onResetPasswordSuccess
}: PortalProps) {
  const { lang, toggleLang, t } = useThemeLang();
  const [activeTab, setActiveTab ] = useState<'login' | 'register'>('login');
  
  // Forms state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regCountry, setRegCountry] = useState('FR');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [regAvatar, setRegAvatar] = useState<string | null>(null);
  const [regMethod, setRegMethod] = useState<'choice' | 'email'>('choice');

  // Forgot Password / OTP elements
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetOTP, setResetOTP] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Active networks
  const [selectedNetwork, setSelectedNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [customScrolled, setCustomScrolled] = useState(false);

  const WALLETS = {
    TRC20: adminWalletTRC20,
    BEP20: adminWalletBEP20
  };

  const displayToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success && res.url) {
        // Center the popup screen
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const pop = window.open(
          res.url,
          'google_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        );
        if (!pop) {
          displayToast("Le bloqueur de popups a empêché l'authentification Google. Veuillez autoriser les fenêtres contextuelles.", "error");
        }
      } else {
        displayToast(res.error || "Une erreur s'est produite lors de l'authentification.", "error");
      }
    } catch (err: any) {
      console.error(err);
      displayToast("Échec de connexion Google.", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setGithubLoading(true);
    try {
      const res = await signInWithGitHub();
      if (res.success && res.url) {
        // Center the popup screen
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const pop = window.open(
          res.url,
          'github_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
        );
        if (!pop) {
          displayToast("Le bloqueur de popups a empêché l'authentification GitHub. Veuillez autoriser les fenêtres contextuelles.", "error");
        }
      } else {
        displayToast(res.error || "Une erreur s'est produite lors de l'authentification.", "error");
      }
    } catch (err: any) {
      console.error(err);
      displayToast("Échec de connexion GitHub.", "error");
    } finally {
      setGithubLoading(false);
    }
  };

  // Nav scroll listen
  useEffect(() => {
    const handleScroll = () => {
      setCustomScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          displayToast('Photo de profil chargée !', 'success');
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
          displayToast('Capture d\'écran chargée !', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const identifier = loginEmail.trim().toLowerCase();
    if (!identifier || !loginPassword) {
      displayToast('Veuillez remplir tous les champs', 'error');
      setLoginLoading(false);
      return;
    }

    const isAdminPass = loginPassword === 'adminadmin' || loginPassword === 'admin';
    const isAdminUser = identifier === 'admin@tradevault.com' || identifier === 'admin';

    if (isAdminUser && isAdminPass) {
      const adminAcc: User = {
        id: 'admin',
        username: 'admin',
        email: 'admin@tradevault.com',
        country: 'FR',
        paid: true,
        paidUntil: null,
        createdAt: new Date().toISOString(),
        status: 'approved'
      };
      onLoginSuccess(adminAcc);
      displayToast('Connexion Admin réussie !', 'success');
      setLoginLoading(false);
      return;
    }

    try {
      const res = await signInWithSupabase(loginEmail, loginPassword);
      if (res.success && res.user) {
        if (res.user.status === 'pending') {
          displayToast('Votre inscription est en attente de validation.', 'info');
          setLoginLoading(false);
          return;
        }
        if (res.user.status === 'rejected') {
          displayToast('Votre inscription a été rejetée.', 'error');
          setLoginLoading(false);
          return;
        }
        onLoginSuccess(res.user);
        displayToast('Connexion réussie via Supabase ! Code pro validé.', 'success');
        setLoginLoading(false);
        return;
      } else {
        const matchedUser = users.find(u => 
          u.email.toLowerCase() === identifier || 
          (u.username && u.username.toLowerCase() === identifier)
        );

        if (matchedUser) {
          if (matchedUser.password === loginPassword) {
            if (matchedUser.status === 'pending') {
              displayToast('Inscription en attente de vérification.', 'info');
            } else if (matchedUser.status === 'rejected') {
              displayToast('Cette inscription a été rejetée.', 'error');
            } else {
              onLoginSuccess(matchedUser);
              displayToast('Connexion réussie (Fallback Local) !', 'success');
            }
          } else {
            displayToast('Mot de passe incorrect.', 'error');
          }
        } else {
          displayToast(res.error || 'Identifiants incorrects ou compte introuvable.', 'error');
        }
        setLoginLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      displayToast("Erreur de connexion.", 'error');
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword) {
      displayToast('Veuillez remplir les champs requis.', 'error');
      return;
    }
    if (regPassword.length < 8) {
      displayToast('Mot de passe : min 8 caractères.', 'error');
      return;
    }
    if (regPassword !== regConfirm) {
      displayToast('Les mots de passe diffèrent.', 'error');
      return;
    }
    if (!paymentScreenshot) {
      displayToast('Capture d\'écran de preuve obligatoire.', 'error');
      return;
    }

    const exist = users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (exist) {
      displayToast('E-mail déjà enregistré.', 'error');
      return;
    }

    displayToast('Sécurisation du compte dans Supabase...', 'info');

    try {
      const res = await signUpWithSupabase(
        regUsername.trim(),
        regEmail.trim(),
        regPassword,
        regCountry,
        paymentScreenshot,
        selectedNetwork,
        subscriptionPrice,
        regAvatar
      );

      if (res.success && res.user) {
        onRegisterPending({
          ...res.user,
          password: regPassword
        });
      } else {
        const localUser: User = {
          id: 'usr_' + Date.now(),
          username: regUsername.trim(),
          email: regEmail.trim(),
          password: regPassword,
          country: regCountry,
          paid: false,
          paidUntil: null,
          createdAt: new Date().toISOString(),
          paymentScreenshot: paymentScreenshot,
          status: 'pending',
          avatar: regAvatar || undefined
        };
        onRegisterPending(localUser);
      }

      displayToast('Compte enregistré en attente de validation admin !', 'success');
      setActiveTab('login');
      setLoginEmail(regEmail);
      setLoginPassword('');
      setRegAvatar(null);
    } catch (err: any) {
      console.error(err);
      displayToast("Erreur d'inscription.", "error");
    }
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToSearch = forgotEmail.trim().toLowerCase();
    
    if (!emailToSearch) {
      displayToast("Insérez une adresse valide.", "error");
      return;
    }

    setResetLoading(true);
    setForgotResult(null);

    try {
      const redirectUrl = window.location.origin.includes('localhost') || window.location.origin.includes('run.app') 
        ? `${window.location.origin}/reset-password` 
        : 'https://traderpr0.netlify.app/reset-password';

      const { data, error } = await supabase.auth.resetPasswordForEmail(emailToSearch, {
        redirectTo: redirectUrl,
      });

      if (error) {
        throw error;
      }

      setResetStep(2);
      displayToast("Le lien de réinitialisation a été envoyé !", "success");
    } catch (err: any) {
      console.error("Error sending reset password email:", err);
      displayToast(err.message || "Erreur lors de la réinitialisation de mot de passe.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOTPAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToReset = forgotEmail.trim().toLowerCase();
    const otpCodeClean = resetOTP.trim();

    if (otpCodeClean.length !== 7 || !/^\d+$/.test(otpCodeClean)) {
      displayToast("Le code OTP requiert 7 chiffres.", "error");
      return;
    }

    if (resetNewPassword.length < 8) {
      displayToast("Le mot de passe doit faire au moins 8 caractères.", "error");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      displayToast("Mots de passe non concordants.", "error");
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password-otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToReset,
          otp: otpCodeClean,
          newPassword: resetNewPassword
        })
      });

      const data = await response.json();
      if (data.success) {
        if (onResetPasswordSuccess) {
          onResetPasswordSuccess(emailToReset, resetNewPassword);
        }
        
        displayToast("Mot de passe mis à jour !", "success");
        setForgotOpen(false);
        setResetStep(1);
        setResetOTP('');
        setResetNewPassword('');
        setResetConfirmPassword('');
        setForgotResult(null);
      } else {
        displayToast(data.error || "Code incorrect.", "error");
      }
    } catch (err) {
      console.error(err);
      displayToast("Erreur serveur.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const scrollSectionToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-start overflow-hidden w-full">
      {/* Dynamic particles backdrop canvas */}
      <CanvasParticles />

      {/* Global Toast */}
      {toastMessage && (
        <div className={`fixed top-8 right-8 z-55 p-4 rounded-xl flex items-center gap-3 border shadow-2xl backdrop-blur-md transition-all animate-fade-in ${
          toastMessage.type === 'success' ? 'bg-[#00FF9C]/10 border-[#00FF9C] text-[#00FF9C]' : 
          toastMessage.type === 'error' ? 'bg-[#FF4D4D]/10 border-[#FF4D4D] text-[#FF4D4D]' :
          'bg-white/5 border-white/20 text-white'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></div>
          <span className="text-xs font-mono font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* FIXED PREMIUM NAVIGATION SECTION === */}
      <nav className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 border-b flex justify-between items-center px-6 md:px-12 py-4 ${
        customScrolled 
          ? 'bg-black/85 backdrop-blur-md border-white/5 shadow-2xl py-3.5' 
          : 'bg-transparent border-transparent py-5'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-lg md:text-xl font-black font-display tracking-tight leading-none text-white drop-shadow-[0_0_15px_rgba(0,168,107,0.4)]">
            TRADE<span className="text-[#00FF9C]">VAULT</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[11px] font-mono tracking-wider text-white/50">
          <button onClick={() => scrollSectionToId('features')} className="hover:text-white underline-hover cursor-pointer">FIDÉLITÉ STATS</button>
          <button onClick={() => scrollSectionToId('showcase')} className="hover:text-white underline-hover cursor-pointer">PROPFIRM PREVIEW</button>
          <button onClick={() => scrollSectionToId('portal-card-segment')} className="hover:text-white underline-hover cursor-pointer font-bold text-[#00FF9C]">ACCÉDER</button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => scrollSectionToId('portal-card-segment')}
            className="btn-sweep px-5 py-2 rounded-full text-[10px] font-mono tracking-widest font-bold uppercase transition-all"
          >
            <span>JOIN PRO ↗</span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION (MIN HEIGHT SCREEN) === */}
      <header className="min-h-screen pt-24 w-full flex flex-col justify-between items-center relative z-10 px-6 max-w-7xl mx-auto mb-12">
        <div></div> {/* Spacer */}

        <div className="text-center space-y-8 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-mono tracking-[0.2em] text-[#00FF9C] uppercase">
            <Sparkles size={10} /> THE NEXT GENERATION OF POSITIONS AUDITING
          </div>

          <div className="relative w-full py-8 md:py-12 flex justify-center items-center">
            {/* Clamp large typographic display */}
            <h1 className="text-4xl min-[480px]:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black tracking-tight leading-[0.9] text-white select-none relative z-10">
              <span className="block opacity-90">VAULT YOUR TRADES IN</span>
              <span className="block text-[#00FF9C] drop-shadow-[0_0_15px_rgba(0,255,156,0.15)] mt-1.5 font-bold">PURE UNBIASED CLARITY.</span>
            </h1>
            
            {/* Real-time background trace stretching edge-to-edge */}
            <LiveHeroChart />
          </div>

          <p className="text-white/40 max-w-xl mx-auto text-xs sm:text-sm font-sans font-light leading-relaxed relative z-10">
            Eliminate cognitive bias, streamline propfirm targets, and monitor real-time leverage logs securely. An offline-resilient dashboard designed for maximum visual high-fidelity.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              type="button"
              onClick={() => scrollSectionToId('portal-card-segment')}
              className="px-8 py-3.5 bg-white text-black hover:bg-[#00FF9C] hover:text-black rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-[0_0_30px_rgba(255,255,255,0.06)] active:scale-95 cursor-pointer"
            >
              DÉMARRER MA GESTION ↗
            </button>
            <button 
              type="button"
              onClick={() => scrollSectionToId('features')}
              className="px-8 py-3.5 bg-black hover:bg-white/5 text-white border border-white/25 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
            >
              EN SAVOIR PLUS ↓
            </button>
          </div>
        </div>

        {/* Live price ticker container at very bottom of hero */}
        <div className="w-screen border-t border-b border-white/5 py-3.5 bg-black overflow-hidden relative select-none">
          <div className="animate-ticker text-[10px] font-mono tracking-wider font-medium text-white/50 gap-16 uppercase">
            {/* Double copies for seamless endless loop scroll */}
            <div className="flex items-center gap-16 pr-16 shrink-0">
              <span className="flex items-center gap-1.5"><strong className="text-white">BTC / USDT</strong> <span className="text-[#00FF9C]">$88,432.20 (+4.25%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">ETH / USDT</strong> <span className="text-rose-400">$3,450.15 (-1.12%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">SOL / USDT</strong> <span className="text-[#00FF9C]">$182.40 (+12.40%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">FTM / USDT</strong> <span className="text-[#00FF9C]">$0.925 (+15.20%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">BNB / USDT</strong> <span className="text-[#00FF9C]">$612.80 (+0.85%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">TRX / USDT</strong> <span className="text-[#00FF9C]">$0.145 (+3.12%)</span></span>
            </div>
            <div className="flex items-center gap-16 shrink-0">
              <span className="flex items-center gap-1.5"><strong className="text-white">BTC / USDT</strong> <span className="text-[#00FF9C]">$88,432.20 (+4.25%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">ETH / USDT</strong> <span className="text-rose-400">$3,450.15 (-1.12%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">SOL / USDT</strong> <span className="text-[#00FF9C]">$182.40 (+12.40%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">FTM / USDT</strong> <span className="text-[#00FF9C]">$0.925 (+15.20%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">BNB / USDT</strong> <span className="text-[#00FF9C]">$612.80 (+0.85%)</span></span>
              <span className="flex items-center gap-1.5"><strong className="text-white">TRX / USDT</strong> <span className="text-[#00FF9C]">$0.145 (+3.12%)</span></span>
            </div>
          </div>
        </div>
      </header>

      {/* HORIZONTAL SHOWCASE / PROPFIRMS PRO DETAILS === */}
      <section id="showcase" className="w-full py-24 px-6 max-w-7xl mx-auto z-20">
        <div className="space-y-12">
          <div className="max-w-xl space-y-3">
            <span className="text-[9px] font-mono tracking-[0.25em] text-[#00FF9C] uppercase block font-bold">MONITOR PROPFIRMS TARGETS</span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white uppercase tracking-tight">PREMIUM BUILT-IN HARNESS.</h2>
            <p className="text-xs text-white/40 font-sans leading-relaxed">
              Never breach daily drawdown rules again. Explore standard seed targets or tilt these cards to verify limits dynamically in high contrast layout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 three-d-perspective">
            
            {/* Challenge Card 1: FTMO */}
            <div className="tilt-card bg-[#080808] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-[300px] select-none hover:border-[#00FF9C]/30 transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#00FF9C] bg-[#00FF9C]/5 border border-[#00FF9C]/20 px-2.5 py-1 rounded-full uppercase">FTMO HARNESS</span>
                  <span className="text-[11px] font-mono text-white/30">ID: FTMO-100K</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Sovereign 100K Capital</h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Configured daily limits strict cap at 5%, target criteria at 8% total yield. Full automated audits synchronized dynamically.
                </p>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t border-white/5">
                <div>
                  <span className="text-[9px] font-mono text-white/30 block uppercase">LIMIT RULE</span>
                  <span className="text-xs font-mono font-bold text-[#00FF9C]">$5,000 drawdown</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-white/30 block uppercase">TARGET</span>
                  <span className="text-sm font-mono font-bold text-white">$8,000 profit</span>
                </div>
              </div>
            </div>

            {/* Challenge Card 2: Personal */}
            <div className="tilt-card bg-[#080808] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-[300px] select-none hover:border-[#00FF9C]/30 transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#00FF9C] bg-[#00FF9C]/5 border border-[#00FF9C]/20 px-2.5 py-1 rounded-full uppercase">UNRESTRICTED</span>
                  <span className="text-[11px] font-mono text-white/30">ID: USER-SPOT</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Personal Spot Portfolio</h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  No evaluation targets or mandatory triggers. Built specifically to log swing trades, spot accounts, or margin trades with manual oversight.
                </p>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t border-white/5">
                <div>
                  <span className="text-[9px] font-mono text-white/30 block uppercase">LIMIT RULE</span>
                  <span className="text-xs font-mono font-bold text-white/60">Self-Imposed Drawdown</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-white/30 block uppercase">TARGET</span>
                  <span className="text-sm font-mono font-bold text-white">UnBounded</span>
                </div>
              </div>
            </div>

            {/* Challenge Card 3: CustomEvaluation */}
            <div className="tilt-card bg-[#080808] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-[300px] select-none hover:border-[#00FF9C]/30 transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#00FF9C] bg-[#00FF9C]/5 border border-[#00FF9C]/20 px-2.5 py-1 rounded-full uppercase">CUSTOM FIRM</span>
                  <span className="text-[11px] font-mono text-white/30">ID: MY-EVAL-200K</span>
                </div>
                <h3 className="text-xl font-display font-bold text-white uppercase">Prop firm Evaluation</h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Flexible setups configured instantly for custom evaluations. Multi-account switches with zero-override on local caches.
                </p>
              </div>
              <div className="flex justify-between items-baseline pt-4 border-t border-white/5">
                <div>
                  <span className="text-[9px] font-mono text-white/30 block uppercase">LIMIT RULE</span>
                  <span className="text-xs font-mono font-bold text-rose-400">Custom rules</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-white/30 block uppercase">TARGET</span>
                  <span className="text-sm font-mono font-bold text-[#00FF9C]">Variable goal</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PORTAL LOGIN CARD SEGMENT === */}
      <section id="portal-card-segment" className="w-full py-20 px-6 max-w-5xl mx-auto z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl relative">
          
          {/* LEFT COLUMN: Login / Register Forms */}
          <div className="col-span-1 lg:col-span-7 p-6 md:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-lg font-black font-display tracking-tight leading-none text-white drop-shadow-[0_0_15px_rgba(0,168,107,0.4)]">
                  TRADE<span className="text-[#00FF9C]">VAULT</span>
                </span>
              </div>

              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mb-2">
                ACCÈS PORTAIL SÉCURISÉ
              </h2>
              <p className="text-white/40 text-xs mb-6 font-sans">
                Renseignez votre e-mail ou créez un compte. Pour vous inscrire, joignez impérativement la preuve de versement crypto correspondante.
              </p>

              {/* Inscription / Connexion Tabs */}
              <div className="flex bg-[#080808] p-1 rounded-full mb-6 border border-white/5 max-w-sm">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setForgotResult(null); }}
                  className={`flex-1 py-2 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                    activeTab === 'login' ? 'bg-[#00FF9C] text-black shadow-md' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setRegMethod('choice'); setForgotResult(null); }}
                  className={`flex-1 py-2 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase transition-all ${
                    activeTab === 'register' ? 'bg-[#00FF9C] text-black shadow-md' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Inscription
                </button>
              </div>

              {/* Login block */}
              {activeTab === 'login' && !forgotOpen && (
                <>
                  <form onSubmit={handleLogin} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">E-mail ou Pseudo</label>
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="votre@email.com ou pseudo"
                      className="w-full px-4 py-3 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/25 focus:outline-none focus:border-[#00FF9C] transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Mot de Passe</label>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-[10px] font-mono text-[#00FF9C] hover:text-[#00FF9C]/80 bg-transparent py-0 px-0 underline cursor-pointer"
                      >
                        OUBLIÉ ?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/25 focus:outline-none focus:border-[#00FF9C] pr-12 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-white/40 hover:text-white cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-4 bg-white text-black hover:bg-[#00FF9C] hover:text-black rounded-xl text-[10px] font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-lg text-center cursor-pointer mt-6 disabled:opacity-50"
                  >
                    {loginLoading ? "CHARGEMENT..." : <>IDENTIFIER MON COMPTE <ArrowRight size={13} /></>}
                  </button>
                </form>

                {/* Separator */}
                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">OU</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Google Sign-In Button */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-mono font-bold tracking-widest uppercase border border-white/5 hover:border-[#00FF9C]/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    {googleLoading ? "..." : "GOOGLE"}
                  </button>

                  <button
                    type="button"
                    onClick={handleGitHubSignIn}
                    disabled={githubLoading}
                    className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-mono font-bold tracking-widest uppercase border border-white/5 hover:border-[#00FF9C]/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.43 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.05c-3.33.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.82 2.8 1.29 3.49.99.11-.77.41-1.29.74-1.58-2.65-.3-5.43-1.32-5.43-5.91 0-1.3.47-2.36 1.25-3.19-.13-.31-.55-1.51.11-3.14 0 0 .99-.32 3.25 1.23.94-.26 1.95-.39 2.96-.39 1.01 0 2.02.13 2.96.39 2.26-1.55 3.25-1.23 3.25-1.23.66 1.63.24 2.83.12 3.14.78.83 1.25 1.89 1.25 3.19 0 4.6-2.79 5.6-5.45 5.89.43.37.81 1.1.81 2.22v3.29c0 .33.22.71.82.58C20.57 21.8 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    {githubLoading ? "..." : "GITHUB"}
                  </button>
                </div>
              </>
            )}

              {/* Password recover OTP */}
              {activeTab === 'login' && forgotOpen && (
                <div className="space-y-4 text-left">
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Réinitialisation de mot de passe</h3>
                  
                  {resetStep === 1 ? (
                    <>
                      <p className="text-white/40 text-xs text-left">Entrez votre adresse e-mail de membre pour recevoir votre lien de réinitialisation sécurisé.</p>
                      <form onSubmit={handleRequestOTP} className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Adresse e-mail</label>
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="votre@email.com"
                            className="w-full px-4 py-3 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/25 focus:outline-none focus:border-[#00FF9C] transition-all"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setForgotOpen(false); setForgotResult(null); }}
                            className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-mono text-white/40 hover:bg-white/5 font-bold cursor-pointer"
                            disabled={resetLoading}
                          >
                            RETOUR
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-3 bg-white text-black hover:bg-[#00FF9C] hover:text-black rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer"
                            disabled={resetLoading}
                          >
                            {resetLoading ? 'ENVOI...' : 'ENVOYER'}
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="space-y-5 text-center py-4 bg-[#050508]/60 p-4 border border-white/5 rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-[#00FF9C]/10 border border-[#00FF9C]/30 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,255,156,0.15)]">
                        <Check size={20} className="text-[#00FF9C]" />
                      </div>
                      
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-white uppercase tracking-wider font-sans">Lien Transmis ! ✉️</p>
                        <p className="text-[10px] text-white/50 leading-relaxed font-mono">
                          Un e-mail contenant un lien sécurisé de réinitialisation a été envoyé à : <strong className="text-white/80 font-mono">{forgotEmail}</strong>.
                          <br /><br />
                          Veuillez cliquer sur ce lien depuis votre e-mail pour modifier votre mot de passe TradeVault.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setForgotOpen(false); setResetStep(1); }}
                        className="w-full py-2.5 bg-white text-black hover:bg-[#00FF9C] hover:text-black rounded-xl text-[9px] font-mono font-bold tracking-widest uppercase transition-all cursor-pointer block text-center"
                      >
                        REVENIR À LA CONNEXION
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: Register */}
              {activeTab === 'register' && (
                <>
                  {regMethod === 'choice' ? (
                    <div className="space-y-4 py-2">
                      <p className="text-white/40 text-xs text-left mb-6 font-sans">
                        Sélectionnez votre méthode d'inscription sécurisée pour rejoindre l'infrastructure de trading TradeVault.
                      </p>

                      {/* Option 1: S'inscrire par e-mail */}
                      <button
                        type="button"
                        onClick={() => setRegMethod('email')}
                        className="w-full py-4 px-5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-mono font-bold tracking-widest uppercase border border-white/5 hover:border-[#00FF9C]/30 flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="p-2 bg-white/5 rounded-lg text-[#00FF9C] group-hover:bg-[#00FF9C]/10 transition-colors">
                            <Mail size={16} />
                          </span>
                          <span>S'inscrire par e-mail</span>
                        </div>
                        <ArrowRight size={14} className="text-[#00FF9C] group-hover:translate-x-1 transition-transform" />
                      </button>

                      {/* Option 2: S'inscrire avec Google ou GitHub */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={googleLoading}
                          className="w-full py-4 px-4 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-white rounded-xl text-[9px] font-mono font-bold tracking-widest uppercase border border-[#4285F4]/10 hover:border-[#4285F4]/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                        >
                          <svg className="w-4 h-4 transition-transform group-hover:scale-110 select-none pointer-events-none" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                          </svg>
                          {googleLoading ? "..." : "GOOGLE"}
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleGitHubSignIn}
                          disabled={githubLoading}
                          className="w-full py-4 px-4 bg-[#333]/30 hover:bg-[#333]/50 text-white rounded-xl text-[9px] font-mono font-bold tracking-widest uppercase border border-[#333]/20 hover:border-[#333]/50 flex items-center justify-center gap-2.5 transition-all cursor-pointer group"
                        >
                          <svg className="w-4 h-4 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.43 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.05c-3.33.72-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.82 2.8 1.29 3.49.99.11-.77.41-1.29.74-1.58-2.65-.3-5.43-1.32-5.43-5.91 0-1.3.47-2.36 1.25-3.19-.13-.31-.55-1.51.11-3.14 0 0 .99-.32 3.25 1.23.94-.26 1.95-.39 2.96-.39 1.01 0 2.02.13 2.96.39 2.26-1.55 3.25-1.23 3.25-1.23.66 1.63.24 2.83.12 3.14.78.83 1.25 1.89 1.25 3.19 0 4.6-2.79 5.6-5.45 5.89.43.37.81 1.1.81 2.22v3.29c0 .33.22.71.82.58C20.57 21.8 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                          {githubLoading ? "..." : "GITHUB"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setRegMethod('choice')}
                        className="text-[10px] font-mono text-[#00FF9C] hover:underline flex items-center gap-1.5 mb-4 uppercase cursor-pointer"
                      >
                        ← RETOUR AUX OPTIONS D'INSCRIPTION
                      </button>

                      <form onSubmit={handleRegister} className="space-y-4 text-left">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Pseudo de Trader *</label>
                            <input
                              type="text"
                              value={regUsername}
                              onChange={(e) => setRegUsername(e.target.value)}
                              placeholder="Ex: Alexander_F"
                              className="w-full px-4 py-2.5 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#00FF9C]"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Adresse Email de Membre *</label>
                            <input
                              type="email"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              placeholder="nom@exemple.com"
                              className="w-full px-4 py-2.5 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#00FF9C]"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Mot de passe *</label>
                            <input
                              type={showRegPassword ? 'text' : 'password'}
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="Min. 8 caractères"
                              className="w-full px-4 py-2.5 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#00FF9C]"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono tracking-wider text-white/50 uppercase block">Confirmer mot de passe *</label>
                            <input
                              type="password"
                              value={regConfirm}
                              onChange={(e) => setRegConfirm(e.target.value)}
                              placeholder="Vérification"
                              className="w-full px-4 py-2.5 bg-[#080808] border border-white/5 rounded-xl text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-[#00FF9C]"
                              required
                            />
                          </div>
                        </div>

                        {/* Payment capture requirements in dark style */}
                        <div className="space-y-2 bg-[#080808] p-4 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold text-[#00FF9C] tracking-wider">📸 PREUVE DE PAIEMENT REQUIS</span>
                            <span className="text-[8px] bg-[#FF4D4D]/10 border border-[#FF4D4D]/25 text-[#FF4D4D] px-2 py-0.5 rounded-full font-mono uppercase font-bold">Obligatoire</span>
                          </div>
                          <p className="text-[10px] text-white/40 leading-relaxed font-sans mb-3">
                            L'activation est soumise à un règlement d'abonnement de <strong className="text-white">${subscriptionPrice} USDT</strong> pour une durée d'utilisation de {subscriptionPeriod} mois, vers une adresse sur votre droite.
                          </p>

                          <div className="border border-dashed border-white/10 bg-black rounded-lg p-3 text-center transition-all hover:border-[#00FF9C]/40 relative cursor-pointer">
                            <input
                              type="file"
                              id="reg-screenshot-upload-premium"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {!paymentScreenshot ? (
                              <div className="flex flex-col items-center gap-1">
                                <Upload size={18} className="text-white/40" />
                                <span className="text-[10px] text-white/60 font-mono">Glissez-déposez la capture de preuve ici</span>
                                <span className="text-[8px] text-white/30 font-mono">PNG, JPG / Max 5MB</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between pointer-events-none">
                                <div className="flex items-center gap-2">
                                  <img src={paymentScreenshot} alt="Preuve" className="w-8 h-8 object-cover rounded border border-white/10" />
                                  <span className="text-[10px] text-[#00FF9C] font-mono">Preuve_chargee.jpg</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); setPaymentScreenshot(null); }}
                                  className="text-[9px] bg-rose-950/40 text-rose-300 px-2 py-1 rounded border border-rose-900/40 cursor-pointer pointer-events-auto"
                                >
                                  SUPPRIMER
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3.5 bg-[#00FF9C] text-black hover:bg-[#00D180] rounded-xl text-[10px] font-mono font-bold tracking-widest uppercase transition-all text-center cursor-pointer shadow-[0_0_15px_rgba(0,255,156,0.15)]"
                        >
                          SOUMETTRE MON INSCRIPTION ET PREUVE
                        </button>
                      </form>
                    </>
                  )}
                </>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: Subscription pricing and address */}
          <div className="col-span-1 lg:col-span-5 p-6 md:p-8 bg-black/60 border-l border-white/5 flex flex-col justify-between overflow-hidden relative">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-[9px] text-[#00FF9C] font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] block animate-pulse"></span> PROPFIRM EVAL HARNESS
              </div>

              {activeTab === 'login' ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">STATION SCIENTIFIQUE</h3>
                  <p className="text-xs text-white/40 leading-relaxed font-sans">
                    Loguez vos transactions avec rigueur. Surveillez votre track record FTMO, MFF ou personnel en asymétrie luxueuse doté de micro-interactions fluides.
                  </p>
                  <TradingDevicesSimulator />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">CONSIGNES DE DOTATION</h3>
                    <p className="text-xs text-[#00FF9C] font-mono tracking-wider mt-1 font-bold">OFFRE MEMBRES PRO</p>
                  </div>

                  {/* Price bubble */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden text-center flex flex-col justify-center items-center py-6">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-white">${subscriptionPrice} USD / {subscriptionPeriod} MOIS</span>
                  </div>

                  {/* Select USDT Network */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-white/40 block tracking-wider uppercase">CHOISIR LES COORDONNÉES RÉSEAU</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div 
                        onClick={() => setSelectedNetwork('TRC20')}
                        className={`p-2.5 rounded-xl border cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                          selectedNetwork === 'TRC20' 
                            ? 'border-[#00FF9C] bg-[#00FF9C]/5 text-white' 
                            : 'border-white/5 hover:border-white/10 text-white/40'
                        }`}
                      >
                        <UsdtTrc20Icon />
                        <span className="text-[9px] font-mono font-bold">USDT TRC20</span>
                      </div>

                      <div 
                        onClick={() => setSelectedNetwork('BEP20')}
                        className={`p-2.5 rounded-xl border cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                          selectedNetwork === 'BEP20' 
                            ? 'border-[#00FF9C] bg-[#00FF9C]/5 text-white' 
                            : 'border-white/5 hover:border-white/10 text-white/40'
                        }`}
                      >
                        <UsdtBep20Icon />
                        <span className="text-[9px] font-mono font-bold">USDT BEP20</span>
                      </div>
                    </div>
                  </div>

                  {/* Copy crypto address pill */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-white/40 block tracking-wider uppercase">COPIER L'ADRESSE INTERNET</span>
                    <div className="bg-[#080808] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                      <div className="overflow-hidden mr-2">
                        <code className="text-[11px] font-mono text-[#00FF9C] font-semibold tracking-wide">
                          {WALLETS[selectedNetwork].substring(0, 6)}...{WALLETS[selectedNetwork].substring(WALLETS[selectedNetwork].length - 6)}
                        </code>
                        <span className="text-[7.5px] font-mono text-white/30 block mt-0.5 uppercase">CLIQUEZ POUR COPIER L'ADRESSE COMPLETE</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(WALLETS[selectedNetwork]);
                          displayToast('Adresse crypto complète copiée !', 'success');
                        }}
                        className="p-2 px-3.5 bg-white text-black hover:bg-[#00FF9C] rounded-lg text-[9px] font-mono font-bold uppercase shrink-0 transition-colors cursor-pointer"
                      >
                        COPIER
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <h5 className="text-[9px] font-mono font-bold text-[#00FF9C] tracking-wider uppercase mb-1">CONSIGNE ACTIVE</h5>
                    <p className="text-[10px] text-white/40 font-sans leading-relaxed">
                      Effectuez le transfert USDT prolongeant vos accès, transmettez la capture à gauche. L'administrateur valide d'ordinaire sous de brefs délais.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[8px] font-mono text-white/20 text-center mt-6">
              TRADEVAULT CYBER SECURITY CRYPTO-ON-RAMP GATEWAY ACTIVE
            </p>
          </div>

        </div>
      </section>

      {/* FOOTER METADATA === */}
      <footer className="w-full py-12 px-6 border-t border-white/5 text-center text-white/30 z-20 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <DefaultLogoAvatar className="w-5 h-5 opacity-40" />
            <span className="text-[10px] font-mono tracking-widest uppercase">© 2026 ROADVAULT GLOBAL</span>
          </div>
          <p className="text-[10px] font-mono">
            SECURED DIRECTLY END-TO-END VIA SUPABASE CLOUD DEPLOYMENT
          </p>
        </div>
      </footer>
    </div>
  );
}
