import React, { useState, useEffect } from 'react';
import AccountSelector from './components/AccountSelector';
import { motion } from 'motion/react';
import { useThemeLang } from './utils/themeLanguageContext';
import { 
  Grid, 
  FileText, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Award, 
  ShieldAlert, 
  LogOut, 
  Plus, 
  X, 
  DollarSign, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  Mail,
  User as UserIcon,
  Globe,
  Bell,
  Camera,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Sun,
  Moon
} from 'lucide-react';
import { User, Trade, Challenge, Account, PaymentRequest } from './types';
import { safeLocalStorage, safeSessionStorage } from './utils/safeStorage';
import { 
  DEFAULT_USERS, 
  DEFAULT_TRADES, 
  DEFAULT_CHALLENGES, 
  DEFAULT_ACCOUNTS 
} from './utils/mockData';

import { customAlert, customConfirm } from './utils/customDialog';

import { 
  syncUserProfile, 
  saveAccountToSupabase, 
  deleteAccountFromSupabase, 
  saveTradeToSupabase, 
  deleteTradeFromSupabase, 
  saveChallengeToSupabase, 
  deleteChallengeFromSupabase, 
  savePaymentToSupabase,
  adminLoadAllUsersFromSupabase,
  adminLoadAllPaymentsFromSupabase,
  adminDeleteUserFromSupabase,
  adminUpdateUserFromSupabase,
  ensureUUID,
  generateUUID,
  handleSupabaseSession,
  signInWithGoogle
} from './utils/supabaseSync';
import { supabase } from './lib/supabase';

import { ErrorBoundary } from './components/ErrorBoundary';

// Subcomponents
import CustomEffects from './components/CustomEffects';
import Dashboard from './components/Dashboard';
import { BackgroundVideo } from './components/BackgroundVideo';
import Logo, { DefaultLogoAvatar } from './components/Logo';

// Lazy loaded components for maximum initial page speed and optimized bundle chunk splitting
const Portal = React.lazy(() => import('./components/Portal'));
const Checkout = React.lazy(() => import('./components/Checkout'));
const Journal = React.lazy(() => import('./components/Journal'));
const Calendar = React.lazy(() => import('./components/Calendar'));
const Stats = React.lazy(() => import('./components/Stats'));
const Challenges = React.lazy(() => import('./components/Challenges'));
const Admin = React.lazy(() => import('./components/Admin'));
const ResetPassword = React.lazy(() => import('./components/ResetPassword'));

// Sleek loading fallback for major screens or portals with TradeVault aesthetic
function SleekNeonLoader() {
  return (
    <div className="min-h-[100vh] min-h-[100dvh] bg-black flex flex-col justify-center items-center py-20 px-4 text-center font-sans space-y-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#00FF9C]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00FF9C]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="relative z-10 flex flex-col items-center space-y-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-[#00FF9C]/10 animate-ping absolute inset-0"></div>
          <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-b border-[#00FF9C]/30 border-t-[#00FF9C] border-r-[#00FF9C] animate-spin"></div>
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-black font-display tracking-tight text-white uppercase">TRADE<span className="text-[#00FF9C]">VAULT</span></h2>
          <div className="text-[10px] uppercase tracking-widest text-[#00FF9C] font-mono animate-pulse">
            Chiffrement sécurisé en cours...
          </div>
        </div>
      </div>
    </div>
  );
}

// Sleek loading skeleton for active main pane tabs inside Workspace
function TabLoaderSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4">
      <div className="flex justify-between items-center bg-[#080808] border border-zinc-900 rounded-2xl p-6">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-zinc-900 rounded"></div>
          <div className="h-3 w-56 bg-zinc-900/60 rounded"></div>
        </div>
        <div className="h-8 w-24 bg-zinc-900 rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-3">
          <div className="h-3 w-16 bg-zinc-900 rounded flex items-center justify-center"></div>
          <div className="h-6 w-28 bg-zinc-900 rounded"></div>
        </div>
        <div className="h-32 bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-3">
          <div className="h-3 w-16 bg-zinc-900 rounded"></div>
          <div className="h-6 w-28 bg-zinc-900 rounded"></div>
        </div>
        <div className="h-32 bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-3">
          <div className="h-3 w-16 bg-zinc-900 rounded"></div>
          <div className="h-6 w-28 bg-zinc-900 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Specific skeleton for the Admin tab loader
function AdminLoaderSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4">
      {/* Admin Header */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-zinc-900 rounded"></div>
          <div className="h-3 w-72 bg-zinc-900/60 rounded"></div>
        </div>
        <div className="h-8 w-32 bg-zinc-900 rounded-xl"></div>
      </div>
      {/* Admin Status metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#080808] border border-zinc-900 rounded-2xl p-4 space-y-3">
            <div className="h-3 w-16 bg-zinc-900 rounded"></div>
            <div className="h-6 w-24 bg-zinc-900 rounded"></div>
          </div>
        ))}
      </div>
      {/* Users / Subscriptions list table */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-4">
        <div className="h-4 w-32 bg-zinc-900 rounded mb-2"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-900"></div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-zinc-900 rounded"></div>
                  <div className="h-2.5 w-32 bg-zinc-900/60 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-zinc-900 rounded"></div>
                <div className="h-6 w-8 bg-zinc-900 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Specific skeleton for the Stats tab loader
function StatsLoaderSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4">
      {/* Header */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-zinc-900 rounded"></div>
          <div className="h-3 w-64 bg-zinc-900/60 rounded"></div>
        </div>
        <div className="h-8 w-24 bg-zinc-900 rounded-xl"></div>
      </div>
      {/* Stats Cards (4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#080808] border border-zinc-900 rounded-2xl p-4 space-y-3">
            <div className="h-3 w-16 bg-zinc-900 rounded"></div>
            <div className="h-6 w-20 bg-zinc-900 rounded"></div>
          </div>
        ))}
      </div>
      {/* Graph Area / advanced metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#080808] border border-zinc-900 rounded-2xl p-6 h-80 flex flex-col justify-between">
          <div className="h-4 w-32 bg-zinc-900 rounded"></div>
          {/* Mock Area Chart pulse effect */}
          <div className="flex-1 flex items-end gap-2 border-b border-l border-zinc-900/40 p-2 mt-4">
            {[35, 60, 45, 80, 55, 90, 70, 40, 85].map((height, index) => (
              <div 
                key={index} 
                className="flex-1 bg-gradient-to-t from-[#00FF9C]/10 to-[#00FF9C]/30 rounded-t"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>
        <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 h-80 space-y-4">
          <div className="h-4 w-28 bg-zinc-900 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="h-3 w-16 bg-zinc-900 rounded"></div>
                <div className="h-3 w-12 bg-zinc-900 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Specific skeleton for the Calendar tab loader
function CalendarLoaderSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4">
      {/* Calendar Header */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-52 bg-zinc-900 rounded"></div>
          <div className="h-3 w-80 bg-zinc-900/60 rounded"></div>
        </div>
      </div>
      {/* Calendar Grid wrapper */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-4">
        {/* Month Selector bar */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="h-6 w-32 bg-zinc-900 rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-zinc-900 rounded-xl"></div>
            <div className="h-8 w-8 bg-zinc-900 rounded-xl"></div>
          </div>
        </div>
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center py-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
            <div key={idx} className="h-3 w-8 bg-zinc-900 rounded mx-auto"></div>
          ))}
        </div>
        {/* Days grid 7x5 */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[#0c0c0c]/40 border border-zinc-900/50 rounded-xl flex items-center justify-center p-1">
              <div className="h-3 w-3 bg-zinc-900 rounded mb-1"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Specific skeleton for the Challenges tab loader
function ChallengesLoaderSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4">
      {/* Challenges Header */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-zinc-900 rounded"></div>
          <div className="h-3 w-72 bg-zinc-900/60 rounded"></div>
        </div>
        <div className="h-9 w-36 bg-[#00FF9C]/20 border border-[#00FF9C]/10 rounded-xl"></div>
      </div>
      {/* Active Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-40 bg-zinc-900 rounded"></div>
                <div className="h-3 w-24 bg-zinc-900/60 rounded"></div>
              </div>
              <div className="h-5 w-20 bg-zinc-900 rounded-full"></div>
            </div>
            {/* Grid metrics details */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2">
                <div className="h-2.5 w-12 bg-zinc-900 rounded"></div>
                <div className="h-4 w-16 bg-zinc-900 rounded"></div>
              </div>
              <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2">
                <div className="h-2.5 w-12 bg-zinc-900 rounded"></div>
                <div className="h-4 w-16 bg-zinc-900 rounded"></div>
              </div>
            </div>
            {/* Target Slider indicator and rules list */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px]">
                <div className="h-3 w-28 bg-zinc-900 rounded"></div>
                <div className="h-3 w-12 bg-zinc-900 rounded"></div>
              </div>
              <div className="h-2 bg-zinc-950 border border-zinc-900 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Specific skeleton for the Journal tab loader
function JournalLoaderSkeleton() {
  return (
    <div className="w-full space-y-6 animate-pulse p-4">
      {/* Journal Header */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-zinc-900 rounded"></div>
          <div className="h-3 w-80 bg-zinc-900/60 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-zinc-900 rounded-xl"></div>
          <div className="h-9 w-32 bg-[#00FF9C]/20 border border-[#00FF9C]/10 rounded-xl"></div>
        </div>
      </div>
      {/* Journal entries placeholder */}
      <div className="bg-[#080808] border border-zinc-900 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="h-4 w-28 bg-zinc-900 rounded"></div>
          <div className="h-6 w-36 bg-zinc-900 rounded-lg"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-[#0c0c0c]/40 border border-[#080808]/50 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-16 bg-zinc-900 rounded flex items-center justify-center"></div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-16 bg-zinc-900 rounded"></div>
                  <div className="h-2.5 w-24 bg-zinc-900/60 rounded"></div>
                </div>
              </div>
              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="space-y-1.5 text-right flex-1 select-none">
                  <div className="h-3 w-12 bg-zinc-900 rounded ms-auto"></div>
                  <div className="h-2.5 w-16 bg-zinc-900/60 rounded ms-auto"></div>
                </div>
                <div className="h-6 w-12 bg-zinc-900 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const { lang, toggleLang, t, theme, toggleTheme } = useThemeLang();
  // Load initial persistent lists or fallback to seeded mock data
  const [users, setUsers] = useState<User[]>(() => {
    // One-time hard reset to give the user a completely brand-new slate with only the admin account
    if (!safeLocalStorage.getItem('tv_reset_to_zero_v3')) {
      safeLocalStorage.setItem('tv_users', JSON.stringify(DEFAULT_USERS));
      safeLocalStorage.setItem('tv_trades', JSON.stringify(DEFAULT_TRADES));
      safeLocalStorage.setItem('tv_challenges', JSON.stringify(DEFAULT_CHALLENGES));
      safeLocalStorage.setItem('tv_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      safeLocalStorage.setItem('tv_payment_requests', JSON.stringify([]));
      safeLocalStorage.setItem('tv_selected_account_id', 'personal');
      safeSessionStorage.removeItem('tv_current_user');
      safeLocalStorage.removeItem('tv_current_user');
      safeLocalStorage.setItem('tv_reset_to_zero_v3', 'true');
      return DEFAULT_USERS;
    }
    const saved = safeLocalStorage.getItem('tv_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isConfirm: false
  });

  // Current session navigation states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Expose global showCustomAlert and showCustomConfirm for window-level actions
  useEffect(() => {
    (window as any).showCustomAlert = (title: string, message: string) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        isConfirm: false
      });
    };

    (window as any).showCustomConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        isConfirm: true,
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          onConfirm();
        },
        onCancel: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          if (onCancel) onCancel();
        }
      });
    };

    return () => {
      delete (window as any).showCustomAlert;
      delete (window as any).showCustomConfirm;
    };
  }, []);

  const [trades, setTrades] = useState<Trade[]>(() => {
    const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const isAdmin = u.email === 'tradonyx@vault.com' || u.username === 'tradonyx';
      const saved = safeLocalStorage.getItem(`tv_trades_${u.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Trade[];
        if (!isAdmin && parsed.some(t => t.id === 't1' || t.id === 't2' || t.id === 't3')) {
          return [];
        }
        return parsed;
      }
      return [];
    }
    const saved = safeLocalStorage.getItem('tv_trades');
    return saved ? JSON.parse(saved) : DEFAULT_TRADES;
  });

  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const saved = safeLocalStorage.getItem(`tv_challenges_${u.id}`);
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'ftmo-100k-challenge',
          account_id: 'ftmo-100k',
    user_id: 'admin',
          name: 'Compte FTMO 100k',
          capital: 100000,
          target: 8,
          daily_loss: 5,
          global_loss: 10,
          created_at: new Date().toISOString()
        }
      ];
    }
    const saved = safeLocalStorage.getItem('tv_challenges');
    return saved ? JSON.parse(saved) : DEFAULT_CHALLENGES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const saved = safeLocalStorage.getItem(`tv_accounts_${u.id}`);
      if (saved) {
        return JSON.parse(saved);
      }
      // Fallback: both accounts by default for newly created / registered user
      const freshAccounts: Account[] = [
        { id: 'personal', user_id: u?.id || 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() },
        { id: 'ftmo-100k', user_id: u?.id || 'admin', name: 'Compte FTMO 100k', account_type: 'prop_firm', capital: 100000, target: 8, daily_loss: 5, global_loss: 10, created_at: new Date().toISOString() }
      ];
      safeLocalStorage.setItem(`tv_accounts_${u.id}`, JSON.stringify(freshAccounts));
      return freshAccounts;
    }
    const saved = safeLocalStorage.getItem('tv_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 'personal', user_id: 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() },
      { id: 'ftmo-100k', user_id: 'admin', name: 'Compte FTMO 100k', account_type: 'prop_firm', capital: 100000, target: 8, daily_loss: 5, global_loss: 10, created_at: new Date().toISOString() }
    ];
  });

  const [adminEmails, setAdminEmails] = useState<string>(() => {
    return safeLocalStorage.getItem('tv_admin_emails') || 'tradonyx@vault.com';
  });

  const [adminWalletTRC20, setAdminWalletTRC20] = useState<string>(() => {
    return safeLocalStorage.getItem('tv_admin_wallet_trc20') || 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV';
  });

  const [adminWalletBEP20, setAdminWalletBEP20] = useState<string>(() => {
    return safeLocalStorage.getItem('tv_admin_wallet_bep20') || '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0';
  });

  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('tv_subscription_price');
    return saved ? parseFloat(saved) : 30;
  });

  const [subscriptionPeriod, setSubscriptionPeriod] = useState<number>(() => {
    const saved = safeLocalStorage.getItem('tv_subscription_period');
    return saved ? parseInt(saved, 10) : 3;
  });

  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    const saved = safeLocalStorage.getItem('tv_payment_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentScreen, setCurrentScreen] = useState<'login_portal' | 'checkout' | 'app' | 'reset-password'>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery') || window.location.href.includes('reset-password'))) {
      return 'reset-password';
    }
    const userSaved = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (!userSaved) return 'login_portal';
    const user: User = JSON.parse(userSaved);
    return user.paid ? 'app' : 'checkout';
  });

  const [activeTab, setActiveTab ] = useState<'dashboard' | 'journal' | 'calendar' | 'stats' | 'challenges' | 'admin'>('dashboard');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const isAdmin = u.email === 'admin@tradevault.com' || u.username === 'admin';
      const saved = safeLocalStorage.getItem(`tv_selected_account_id_${u.id}`);
      if (saved) {
        if (!isAdmin && saved === 'ftmo-100k') return 'personal';
        return saved;
      }
      return 'personal';
    }
    const saved = safeLocalStorage.getItem('tv_selected_account_id');
    return saved || 'personal';
  });

  const [addAccountOpen, setAddAccountOpen] = useState(false);

  // User Profile customized states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileCountry, setProfileCountry] = useState('FR');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  
  const [profileOldPassword, setProfileOldPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  
  const [showProfileOldPassword, setShowProfileOldPassword] = useState(false);
  const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
  const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const openProfileModal = () => {
    if (!currentUser) return;
    setProfileUsername(currentUser.username || '');
    setProfileCountry(currentUser.country || 'FR');
    setProfileAvatar(currentUser.avatar_url || null);
    
    setProfileOldPassword('');
    setProfileNewPassword('');
    setProfileConfirmPassword('');
    
    setShowProfileOldPassword(false);
    setShowProfileNewPassword(false);
    setShowProfileConfirmPassword(false);
    
    setProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileUsername.trim()) return;
    
    let finalPassword = currentUser.password;

    if (profileOldPassword || profileNewPassword || profileConfirmPassword) {
      if (profileOldPassword !== currentUser.password) {
        customAlert('Erreur', 'L\'ancien mot de passe est incorrect.');
        return;
      }
      if (profileNewPassword !== profileConfirmPassword) {
        customAlert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
        return;
      }
      if (profileNewPassword.length < 6) {
        customAlert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      finalPassword = profileNewPassword;
    }

    const updatedUser: User = {
      ...currentUser,
      username: profileUsername.trim(),
      country: profileCountry,
      avatar_url: profileAvatar || undefined,
      password: finalPassword
    };

    // Update session
    setCurrentUser(updatedUser);
    // Update local database list
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setProfileModalOpen(false);
  };

  const handleProfileAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        customAlert('Format incorrect', 'Fichier image uniquement (.png, .jpg)');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        customAlert('Fichier trop lourd', 'Fichier trop lourd (max 3Mo)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // New account form fields
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'personal' | 'propfirm'>('personal');
  const [newAccCapital, setNewAccCapital] = useState('100000');
  const [newAccTarget, setNewAccTarget] = useState('8');
  const [newAccDailyLoss, setNewAccDailyLoss] = useState('5');
  const [newAccGlobalLoss, setNewAccGlobalLoss] = useState('10');

  // Google OAuth Popup handler & Event Listener for cross-window communication
  useEffect(() => {
    // 1. If this window is a popup we just opened, we check if it is redirected from Google / Supabase
    if (typeof window !== 'undefined' && window.opener) {
      if (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token') || window.location.search.includes('code=')) {
        setTimeout(async () => {
          try {
            let sessionObj = null;
            try {
              const { data: { session } } = await supabase.auth.getSession();
              sessionObj = session;
            } catch (e) {
              console.error("Popup: error getSession:", e);
            }

            const hash = window.location.hash;
            if (!sessionObj && hash) {
              const params = new URLSearchParams(hash.replace('#', '?'));
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              const expiresIn = params.get('expires_in');
              if (accessToken && refreshToken) {
                sessionObj = {
                  access_token: accessToken,
                  refresh_token: refreshToken,
                  expires_in: expiresIn ? parseInt(expiresIn) : 3600
                };
              }
            }

            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', session: sessionObj }, '*');
            window.close();
          } catch (err) {
            console.error("Popup communication error:", err);
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
            window.close();
          }
        }, 800);
      }
    }

    // 2. Opener listener to receive credentials and log the user in
    const handleOAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      // Allow relative transitions and sandbox.run.app Origins
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        try {
          // Delay session lookup slightly to ensure token writing wraps up
          setTimeout(async () => {
            const passedSession = event.data?.session;
            let finalSession = null;
            if (passedSession) {
              try {
                const { data, error } = await supabase.auth.setSession({
                  access_token: passedSession.access_token,
                  refresh_token: passedSession.refresh_token
                });
                if (!error && data?.session) {
                  finalSession = data.session;
                }
              } catch (e) {
                console.error("Error setting session dynamically:", e);
              }
            }
            if (!finalSession) {
              const { data: { session } } = await supabase.auth.getSession();
              finalSession = session;
            }

            if (finalSession) {
              const res = await handleSupabaseSession(finalSession);
              if (res.success && res.user) {
                const google_email = res.user.email;

                if (currentUser) {
                  // SCENARIO A: Already Logged In -> Link current account to Google!
                  const updatedUser: User = {
                    ...currentUser,
                    google_linked: true,
                    google_email: google_email
                  };

                  setCurrentUser(updatedUser);
                  setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
                  
                  // Also sync to Supabase database if connected
                  try {
                    await syncUserProfile(updatedUser);
                  } catch (syncErr) {
                    console.warn("Could not sync linked Google status to remote DB, using local persistence:", syncErr);
                  }

                  (window as any).showCustomAlert?.('Succès', `Liaison réussie ! Votre compte est associé à l'adresse Google : ${google_email}`);
                  setProfileModalOpen(false); // Close modal
                } else {
                  // SCENARIO B: Login Flow -> Look for existing user with matched email or google_email
                  const matchedUser = (users || []).find(u => 
                    u.id === res.user?.id ||
                    u.email.toLowerCase() === google_email.toLowerCase() ||
                    (u.google_email && u.google_email.toLowerCase() === google_email.toLowerCase())
                  );

                  let activeUserToLog = res.user;

                  if (matchedUser) {
                    activeUserToLog = {
                      ...matchedUser,
                      avatar_url: matchedUser.avatar_url || res.user.avatar_url,
                      google_linked: true,
                      google_email: google_email
                    };
                  } else {
                    // Update field on first-time login
                    activeUserToLog.google_linked = true;
                    activeUserToLog.google_email = google_email;
                  }

                  // Register/Update user locally
                  setUsers(prev => {
                    if (!prev.some(u => u.id === activeUserToLog.id)) {
                      return [...prev, activeUserToLog];
                    }
                    return prev.map(u => u.id === activeUserToLog.id ? activeUserToLog : u);
                  });
                  
                  // Activate session
                  setCurrentUser(activeUserToLog);
                  
                  // Navigate screen
                  const canAccessApp = activeUserToLog.paid && activeUserToLog.status === 'approved';
                  setCurrentScreen(canAccessApp ? 'app' : 'checkout');
                  
                  (window as any).showCustomAlert?.('Succès', 'Connexion Google réussie !');
                }
              } else {
                (window as any).showCustomAlert?.('Erreur', res.error || 'Impossible de charger votre session Google.');
              }
            } else {
              (window as any).showCustomAlert?.('Erreur', 'Session de connexion introuvable.');
            }
          }, 100);
        } catch (err: any) {
          console.error("Popup handler runtime error:", err);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [currentUser, users]);

  // Trigger LocalStorage sync on change
  useEffect(() => {
    safeLocalStorage.setItem('tv_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      safeLocalStorage.setItem(`tv_trades_${currentUser.id}`, JSON.stringify(trades));
    }
    safeLocalStorage.setItem('tv_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    if (currentUser) {
      safeLocalStorage.setItem(`tv_challenges_${currentUser.id}`, JSON.stringify(challenges));
    }
    safeLocalStorage.setItem('tv_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    if (currentUser) {
      safeLocalStorage.setItem(`tv_accounts_${currentUser.id}`, JSON.stringify(accounts));
    }
    safeLocalStorage.setItem('tv_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    safeLocalStorage.setItem('tv_admin_emails', adminEmails);
  }, [adminEmails]);

  useEffect(() => {
    safeLocalStorage.setItem('tv_payment_requests', JSON.stringify(paymentRequests));
  }, [paymentRequests]);

  useEffect(() => {
    if (currentUser) {
      safeSessionStorage.setItem('tv_current_user', JSON.stringify(currentUser));
      safeLocalStorage.setItem('tv_current_user', JSON.stringify(currentUser));
    } else {
      safeSessionStorage.removeItem('tv_current_user');
      safeLocalStorage.removeItem('tv_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      safeLocalStorage.setItem(`tv_selected_account_id_${currentUser.id}`, selectedAccountId);
    }
    safeLocalStorage.setItem('tv_selected_account_id', selectedAccountId);
  }, [selectedAccountId]);

  // Sync workspace dynamically when user logs in & load data from Supabase
  useEffect(() => {
    if (currentUser) {
      const uId = currentUser.id;
      const isAdmin = currentUser.email === 'tradonyx@vault.com' || currentUser.username === 'tradonyx';

      if (isAdmin) {
        // Administrative view: Load users & payments from remote database
        adminLoadAllUsersFromSupabase()
          .then(dbUsers => {
            if (dbUsers && dbUsers.length > 0) {
              setUsers(dbUsers);
            }
          })
          .catch(err => console.error("Error fetching administrative users:", err));

        adminLoadAllPaymentsFromSupabase()
          .then(dbPayments => {
            if (dbPayments) {
              setPaymentRequests(dbPayments);
            }
          })
          .catch(err => console.error("Error fetching administrative payments:", err));
      } else {
        // Standard trader workspace: Real-time query from Supabase
        import('./utils/supabaseSync').then(({ loadUserDataFromSupabase }) => {
          loadUserDataFromSupabase(uId)
            .then(dbData => {
              setAccounts(dbData.accounts);
              setTrades(dbData.trades);
              setChallenges(dbData.challenges);
              
              const savedSelAcc = safeLocalStorage.getItem(`tv_selected_account_id_${uId}`);
              // If the current saved ID is a default name like "personal", map it to our standardized UUID
              const mappedSelAcc = (savedSelAcc === 'personal' || !savedSelAcc) 
                ? ensureUUID('personal') 
                : ensureUUID(savedSelAcc);
              
              setSelectedAccountId(mappedSelAcc);
            })
            .catch(err => {
              console.error("Supabase user data load failed. Falling back to local cache:", err);
              // Local storage fallback for maximum resilience
              let savedTradesRaw = safeLocalStorage.getItem(`tv_trades_${uId}`);
              let savedChallengesRaw = safeLocalStorage.getItem(`tv_challenges_${uId}`);
              let savedAccsRaw = safeLocalStorage.getItem(`tv_accounts_${uId}`);
              let savedSelAcc = safeLocalStorage.getItem(`tv_selected_account_id_${uId}`);

              let initialTrades = savedTradesRaw ? JSON.parse(savedTradesRaw) : [];
              let initialChallenges = savedChallengesRaw ? JSON.parse(savedChallengesRaw) : [
                {
                  id: ensureUUID('ftmo-100k-challenge'),
                  account_id: ensureUUID('ftmo-100k'),
          user_id: 'admin',
                  name: 'Compte FTMO 100k',
                  capital: 100000,
                  target: 8,
                  daily_loss: 5,
                  global_loss: 10,
                  created_at: new Date().toISOString()
                }
              ];
              let initialAccounts = savedAccsRaw ? JSON.parse(savedAccsRaw) : [
                { id: ensureUUID('personal'), user_id: 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() },
                { id: ensureUUID('ftmo-100k'), user_id: 'admin', name: 'Compte FTMO 100k', account_type: 'prop_firm', capital: 100000, target: 8, daily_loss: 5, global_loss: 10, created_at: new Date().toISOString() }
              ];

              setTrades(initialTrades);
              setChallenges(initialChallenges);
              setAccounts(initialAccounts);
              setSelectedAccountId(savedSelAcc || ensureUUID('personal'));
            });
        });
      }
    }
  }, [currentUser?.id]);

  // Verify and notify in-app if subscription is within 7 days of expiration (re-evaluated on login)
  useEffect(() => {
    if (currentUser && currentUser.paid_until && currentUser.status === 'approved') {
      const expirationDate = new Date(currentUser.paid_until);
      const now = new Date();
      const diffTime = expirationDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

      // Trigger warning if remaining days <= 7 (one week) and greater than 0
      if (diffDays > 0 && diffDays <= 7) {
        const warnedSessionKey = `tv_warning_notified_${currentUser.id}_${Math.floor(expirationDate.getTime() / 86400000)}`;
        if (!safeSessionStorage.getItem(warnedSessionKey)) {
          safeSessionStorage.setItem(warnedSessionKey, 'true');
          
          // Send notification via notification service (which logs in user's notification list/inbox)
          import('./utils/notificationService').then(({ sendPushNotification }) => {
            sendPushNotification(
              `⚠️ Expiration d'abonnement proche !`,
              `Votre accès professionnel TradeVault Premium expirera dans ${diffDays} jour${diffDays > 1 ? 's' : ''}. Veuillez s'il vous plaît procéder au renouvellement anticipé pour conserver votre historique.`,
              'system'
            );
          });
        }
      }
    }
  }, [currentUser?.id, currentUser?.paid_until]);

  // Session handler actions
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.paid) {
      setCurrentScreen('app');
      if (user.email === 'tradonyx@vault.com' || user.username === 'tradonyx') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
        setShowWelcomeModal(true);
      }
    } else {
      setCurrentScreen('checkout');
    }
  };

  const handleRegisterPending = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);

    // REQUIREMENT 2: Simulating sending triggered alert emails to Admin

  };

  const handleResetPasswordSuccess = (email: string, newPass: string) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, password: newPass };
        }
        return u;
      });
      safeLocalStorage.setItem('tv_users', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCheckoutSuccess = (proofBase64: string, network: 'TRC20' | 'BEP20') => {
    if (!currentUser) return;
    

    
    const paymentId = 'pay_' + Date.now();
    const newRequest: PaymentRequest = {
      id: paymentId,
      user_id: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      amount: subscriptionPrice,
      network: network,
      payment_proof: proofBase64,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setPaymentRequests(prev => [...prev, newRequest]);
    
    // We update the user status to pending so the checkout component handlePending logic takes over
    setCurrentUser(prev => prev ? { ...prev, status: 'pending' } : null);
    setCurrentScreen('checkout');
    
    customAlert("Paiement Transmis", `Preuve de versement USDT transmise avec succès !\n\nVos accès Premium seront mis à jour (prolongation de 30 jours) dès validation manuelle.`);

    import('./utils/notificationService').then(({ sendPushNotification }) => {
      sendPushNotification(
        `Renouvellement en attente ⏳`,
        `Preuve transmise avec succès pour validation. L'administrateur valide votre compte sous peu.`,
        'payment'
      );
    });
  };

  const handleCheckoutCancel = () => {
    safeSessionStorage.removeItem('tv_current_user');
    safeLocalStorage.removeItem('tv_current_user');
    setCurrentUser(null);
    setCurrentScreen('login_portal');
  };

  // Switch accounts list
  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0] || { id: 'personal', user_id: currentUser?.id || 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() };
  
  // Filter trades correspond with currently selected active account
  const activeAccountTrades = trades.filter(t => t.account_id === selectedAccountId);

  // Stats calculation
  const totalAccountPnl = activeAccountTrades.reduce((sum, t) => sum + t.pnl, 0);

  // Trade CRUD
  const handleAddTrade = (newTrade: Trade) => {
    setTrades(prev => [...prev, newTrade]);
    if (currentUser) {
      saveTradeToSupabase(currentUser.id, newTrade);
    }
  };

  const handleEditTrade = (id: string, updated: Partial<Trade>) => {
    setTrades(prev => {
      const mapped = prev.map(t => t.id === id ? { ...t, ...updated } : t);
      const updatedTrade = mapped.find(t => t.id === id);
      if (currentUser && updatedTrade) {
        saveTradeToSupabase(currentUser.id, updatedTrade);
      }
      return mapped;
    });
  };

  const handleDeleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
    if (currentUser) {
      deleteTradeFromSupabase(id);
    }
  };

  // Prop firm challenge CRUD
  const handleAddChallenge = (newCh: Challenge) => {
    setChallenges(prev => [...prev, newCh]);
    if (currentUser) {
      saveChallengeToSupabase(currentUser.id, newCh);
    }
  };

  const handleDeleteAccount = (id: string) => {

    
    // Check if account can be deleted
    const accountToDelete = accounts.find(a => a.id === id);
    if (accountToDelete && (accountToDelete.account_type === 'personal' || accountToDelete.name.toLowerCase().includes('challenge'))) {
      customAlert("Action Non Autorisée", "Ce type de compte (personnel ou challenge) ne peut pas être supprimé.");
      return;
    }

    if (id === ensureUUID('personal') || id === ensureUUID('ftmo-100k') || id === 'personal' || id === 'ftmo-100k') {
      customAlert("Action Non Autorisée", "La suppression du compte personnel et du compte FTMO par défaut n'est pas autorisée.");
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    setChallenges(prev => prev.filter(c => c.account_id !== id));
    if (currentUser) {
      deleteAccountFromSupabase(id);
    }
    if (selectedAccountId === id) {
      setSelectedAccountId(ensureUUID('personal'));
    }
  };

  const handleDeleteChallenge = (id: string) => {
    if (id === 'ftmo-100k-challenge') {
      customAlert("Action Non Autorisée", "La suppression du challenge FTMO par défaut n'est pas autorisée.");
      return;
    }
    setChallenges(prev => prev.filter(c => c.id !== id));
    if (currentUser) {
      deleteChallengeFromSupabase(id);
    }
  };

  // Admin CRUD
  const handleApproveUser = (user_id: string) => {
    const target = users.find(u => u.id === user_id);
    if (!target) return;
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 90); // 3 mois d'accès
    const expiryStr = expiry.toISOString();

    const approved: User = {
      ...target,
      status: 'approved',
      paid: true,
      paid_until: expiryStr
    };
    setUsers(prev => prev.map(u => u.id === user_id ? approved : u));

    // Update profile in Supabase
    syncUserProfile(approved);

    // Trigger success notification via background service
    import('./utils/notificationService').then(({ sendPushNotification }) => {
      sendPushNotification(
        `Membre Approuvé ! 🎉`,
        `L’accès TradeVault de ${target.username} (${target.email}) est validé avec succès ! Abonnement trimestriel activé.`,
        'payment'
      );
    });
  };

  const handleRejectUser = (user_id: string) => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === user_id ? { ...u, status: 'rejected' as const } : u);
      const target = updated.find(u => u.id === user_id);
      if (target) {
        syncUserProfile(target);
      }
      return updated;
    });
  };

  const handleApproveRenewal = (payId: string) => {
    const req = paymentRequests.find(r => r.id === payId);
    if (!req) return;

    // Get the target user to renew
    const targetUser = users.find(u => u.id === req.user_id);
    if (!targetUser) return;

    let baseDate = new Date();
    if (targetUser.paid && targetUser.paid_until) {
      const currExpiry = new Date(targetUser.paid_until);
      if (currExpiry > baseDate) {
        baseDate = currExpiry;
      }
    }

    const newExpiry = new Date(baseDate);
    // User stated that their account has been renewed for 30 days
    newExpiry.setDate(baseDate.getDate() + 30);
    const expiryStr = newExpiry.toISOString();

    const renewedUser: User = {
      ...targetUser,
      paid: true,
      paid_until: expiryStr
    };

    // Update state lists
    setUsers(prev => prev.map(u => u.id === targetUser.id ? renewedUser : u));
    if (currentUser && currentUser.id === targetUser.id) {
      setCurrentUser(renewedUser);
    }

    // Sync Approved profile and approved payment to Supabase
    syncUserProfile(renewedUser);
    savePaymentToSupabase(targetUser.id, {
      ...req,
      status: 'approved'
    });

    setPaymentRequests(prev => prev.map(r => r.id === payId ? { ...r, status: 'approved' as const } : r));
  };

  const handleRejectRenewal = (payId: string) => {
    setPaymentRequests(prev => {
      const updated = prev.map(r => r.id === payId ? { ...r, status: 'rejected' as const } : r);
      const req = updated.find(r => r.id === payId);
      if (req) {
        savePaymentToSupabase(req.user_id, req);
      }
      return updated;
    });
  };

  const handleCheckCronRenewals = () => {
    fetch('/api/cron/check-renewals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        usersList: users,
        adminEmail: adminEmails
      })
    })
    .then(res => res.json())
    .then(data => {

    })
    .catch(err => {
      console.error('Failed to execute simulated cron check:', err);
    });
  };

  const handleDeleteUser = async (user_id: string) => {
    const success = await adminDeleteUserFromSupabase(user_id);
    if (success) {
      setUsers(prev => prev.filter(u => u.id !== user_id));
      setPaymentRequests(prev => prev.filter(p => p.user_id !== user_id));
    } else {
      customAlert("Erreur", "La suppression de l'utilisateur a échoué.");
    }
  };

  const handleDeleteAllUsersExceptAdmin = async () => {
    const adminUser = users.find(u => u.email === 'tradonyx@vault.com' || u.username === 'tradonyx');
    if (!adminUser) {
      customAlert("Erreur", "Administrateur non trouvé.");
      return;
    }
    const otherUsers = users.filter(u => u.id !== adminUser.id);
    
    for (const u of otherUsers) {
      await adminDeleteUserFromSupabase(u.id);
    }
    setUsers([adminUser]);
    setPaymentRequests([]);
    customAlert("Success", `Tous les autres utilisateurs supprimés (${otherUsers.length}).`);
  };

  const handleEditUser = async (
    user_id: string, 
    updatedFields: { username: string; email: string; status: 'pending' | 'approved' | 'rejected' }
  ) => {
    const success = await adminUpdateUserFromSupabase(user_id, updatedFields);
    if (success) {
      setUsers(prev => prev.map(u => u.id === user_id ? { ...u, ...updatedFields } : u));
    } else {
      customAlert("Erreur", "La modification du profil a échoué.");
    }
  };

  // Add account helper
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const accId = generateUUID();
    const newAcc: Account = {
      id: accId,
      user_id: currentUser?.id || 'admin',
      name: newAccName.trim(),
      account_type: newAccType as 'personal' | 'prop_firm' | 'demo',
      capital: newAccType === 'prop_firm' ? parseFloat(newAccCapital) : undefined,
      target: newAccType === 'prop_firm' ? parseFloat(newAccTarget) : undefined,
      daily_loss: newAccType === 'prop_firm' ? parseFloat(newAccDailyLoss) : undefined,
      global_loss: newAccType === 'prop_firm' ? parseFloat(newAccGlobalLoss) : undefined,
      created_at: new Date().toISOString()
    };

    setAccounts(prev => [...prev, newAcc]);
    if (currentUser) {
      saveAccountToSupabase(currentUser.id, newAcc);
    }

    // If type is prop firm challenge, automatically seed a corresponding Challenge object
    if (newAccType === 'prop_firm') {
      const newCh: Challenge = {
        id: generateUUID(),
        user_id: currentUser?.id || 'admin',
        account_id: accId,
        name: newAccName.trim(),
        capital: parseFloat(newAccCapital) || 100000,
        target: parseFloat(newAccTarget) || 8,
        daily_loss: parseFloat(newAccDailyLoss) || 5,
        global_loss: parseFloat(newAccGlobalLoss) || 10,
        created_at: new Date().toISOString()
      };
      setChallenges(prev => [...prev, newCh]);
      if (currentUser) {
        saveChallengeToSupabase(currentUser.id, newCh);
      }
    }

    setSelectedAccountId(accId);
    setAddAccountOpen(false);
    setNewAccName('');
  };

  // Check if current user is of Admin role
  const isAdmin = currentUser && (
    (adminEmails || '').toLowerCase().split(',').map(e => e.trim()).includes(currentUser.email?.toLowerCase() || '') || 
    currentUser.email === 'tradonyx@vault.com' ||
    currentUser.username === 'tradonyx'
  );

  return (
    <ErrorBoundary>
      <div className="min-h-[100vh] min-h-[100dvh] bg-white dark:bg-black text-neutral-900 dark:text-neutral-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* 1. PORTAL PAGE SCREEN */}
      {currentScreen === 'login_portal' && (
        <React.Suspense fallback={<SleekNeonLoader />}>
          <Portal 
            onLoginSuccess={handleLoginSuccess} 
            users={users} 
            onRegisterPending={handleRegisterPending} 
            adminWalletTRC20={adminWalletTRC20}
            adminWalletBEP20={adminWalletBEP20}
            subscriptionPrice={subscriptionPrice}
            subscriptionPeriod={subscriptionPeriod}
            adminEmails={adminEmails}
            onResetPasswordSuccess={handleResetPasswordSuccess}
          />
        </React.Suspense>
      )}

      {/* 1.5. RESET PASSWORD SCREEN */}
      {currentScreen === 'reset-password' && (
        <React.Suspense fallback={<SleekNeonLoader />}>
          <ResetPassword 
            onBackToLogin={() => {
              setCurrentScreen('login_portal');
              if (typeof window !== 'undefined') {
                window.history.pushState('', document.title, '/');
              }
            }}
          />
        </React.Suspense>
      )}

      {/* 2. CHECKOUT SCREEN */}
      {currentScreen === 'checkout' && currentUser && (
        <React.Suspense fallback={<SleekNeonLoader />}>
          <Checkout 
            user={currentUser} 
            onPaymentSuccess={handleCheckoutSuccess} 
            onCancel={handleCheckoutCancel} 
            adminWalletTRC20={adminWalletTRC20}
            adminWalletBEP20={adminWalletBEP20}
            subscriptionPrice={subscriptionPrice}
            subscriptionPeriod={subscriptionPeriod}
          />
        </React.Suspense>
      )}

      {/* 3. APPLICATION WORKSPACE SCREEN */}
      {currentScreen === 'app' && currentUser && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-[100vh] min-h-[100dvh] relative z-0">
          
          {/* YOUTUBE BACKGROUND LOOP */}
          <BackgroundVideo />
          
          {/* Navigation Sidebar panel */}
          <aside className="w-full lg:w-64 bg-white dark:bg-[#050505]/80 backdrop-blur-xl border-r border-neutral-200 dark:border-zinc-800 flex flex-col justify-between p-5 lg:sticky lg:top-0 h-[100vh] lg:h-[100dvh] shrink-0 relative z-30">
            <div className="space-y-6">
              
              {/* Brand Logo and Name */}
              <div className="flex items-center px-1 border-b border-neutral-200 dark:border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl font-black font-display tracking-tight text-neutral-900 dark:text-white drop-shadow-[0_0_15px_rgba(0,168,107,0.4)]">TRADE<span className="text-[#00FF9C]">VAULT</span></h2>
                  <span className="text-[9px] text-neutral-500 dark:text-[#475569] block tracking-wider uppercase font-semibold">Track log PRO v1.2</span>
                </div>
              </div>

              {/* ACCOUNT SWITCHER SELECTOR */}
              {!isAdmin && (
                <div className="bg-[#0a0a0a]/60 p-3 rounded-xl border border-zinc-900 space-y-2">
                  <span className="text-[9px] text-neutral-300 font-bold uppercase tracking-wider block">PORTEFEUILLE ACTIF</span>
                  <div className="flex gap-1.5 items-center">
                    <AccountSelector 
                      accounts={accounts}
                      selectedAccountId={selectedAccountId}
                      onSelect={setSelectedAccountId}
                      onDelete={handleDeleteAccount}
                    />
                    {/* Add account button removed as per user request */}
                  </div>
                </div>
              )}

              {/* SUBSCRIPTION COUNTDOWN (90 DAYS) */}
              {!isAdmin && currentUser?.paid_until && (() => {
                const daysLeft = Math.max(0, Math.ceil((new Date(currentUser.paid_until).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
                const isNearingExpiry = daysLeft <= 7;
                return (
                  <div className={`${isNearingExpiry ? 'bg-rose-900/20 border-rose-500/40 text-rose-300' : 'bg-[#00FF9C]/5 border-[#00FF9C]/20 text-[#00FF9C]'} border p-3 rounded-xl flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${isNearingExpiry ? 'text-rose-400' : 'text-[#00FF9C]'}`}>
                          Accès PRO {isNearingExpiry && '⚠️'}
                        </span>
                        <span className="text-[10px] text-neutral-300 font-medium font-sans">
                          Jours restants : <strong className={`font-mono text-xs ml-1 ${isNearingExpiry ? 'text-rose-400' : 'text-white'}`}>
                            {daysLeft}
                          </strong> / 90
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-inner overflow-hidden shrink-0 ${isNearingExpiry ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-[#00FF9C]/10 border-[#00FF9C]/30 text-[#00FF9C]'}`}>
                         <span className="text-[10px] font-black font-mono">
                          {daysLeft}
                         </span>
                      </div>
                    </div>
                    {isNearingExpiry && (
                      <p className="text-[9px] text-rose-300/80 leading-tight">
                        Votre abonnement expire bientôt ! Renouvelez vite pour éviter toute coupure.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('checkout')}
                      className={`w-full py-1.5 mt-1 border rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors ${
                        isNearingExpiry 
                          ? 'bg-rose-600/30 hover:bg-rose-600/50 border-rose-500/30 text-rose-300'
                          : 'bg-[#00FF9C]/10 hover:bg-[#00FF9C]/20 border-[#00FF9C]/30 text-[#00FF9C]'
                      }`}
                    >
                      Renouvellement Anticipé
                    </button>
                  </div>
                );
              })()}

              {/* Main sidebar menus */}
              <nav className="space-y-1 font-mono text-xs">
                
                {!isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'dashboard' ? 'bg-[#00FF9C]/10 border-[#00FF9C]/20 text-[#00FF9C] shadow' : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-neutral-900'
                      }`}
                    >
                      <Grid size={15} /> Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('journal')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'journal' ? 'bg-[#00FF9C]/10 border-[#00FF9C]/20 text-[#00FF9C] shadow' : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-neutral-900'
                      }`}
                    >
                      <FileText size={15} /> Journal Trading
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('calendar')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'calendar' ? 'bg-[#00FF9C]/10 border-[#00FF9C]/20 text-[#00FF9C] shadow' : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <CalendarIcon size={15} /> Calendrier Mensuel
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('stats')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'stats' ? 'bg-[#00FF9C]/10 border-[#00FF9C]/20 text-[#00FF9C] shadow' : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <TrendingUp size={15} /> Statistiques
                    </button>
                    {accounts.some(acc => acc.account_type === 'prop_firm') && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('challenges')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                          activeTab === 'challenges' ? 'bg-[#00FF9C]/10 border-[#00FF9C]/20 text-[#00FF9C] shadow' : 'border-transparent text-[#94a3b8] hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <Award size={15} /> Tracker Propfirm
                      </button>
                    )}
                  </>
                )}

                {/* ONLY Admin trigger link visible only for Admin accounts */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border font-semibold mt-6 ${
                      activeTab === 'admin' ? 'bg-[#00FF9C]/10 border-[#00FF9C]/20 text-[#00FF9C] shadow' : 'border-transparent text-[#94a3b8] bg-zinc-950/20'
                    }`}
                  >
                    🛡️ Espace Admin
                  </button>
                )}

              </nav>
            </div>

            <div className="pt-6 border-t border-slate-900 mt-6 md:mt-0 space-y-4">
              
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900 text-neutral-300 hover:text-white transition-all text-xs font-semibold"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                {theme === 'dark' ? 'Mode Lumineux' : 'Mode Sombre'}
              </button>

              {/* Active user tag detail */}
              <div 
                onClick={openProfileModal}
                className="flex gap-2.5 items-center px-2 py-1.5 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-[#00FF9C]/10 active:scale-[0.98] transition-all cursor-pointer group"
                title="Modifier mon profil"
              >
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.username} 
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[#00FF9C]/25 group-hover:ring-[#00FF9C]/50 transition-all shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <DefaultLogoAvatar className="w-8 h-8 ring-2 ring-[#00FF9C]/25 group-hover:ring-[#00FF9C]/50 transition-all" />
                )}
                <div className="overflow-hidden flex-1">
                  <span className="text-xs font-bold text-white block leading-none truncate mb-1 group-hover:text-[#00FF9C] transition-colors">
                    {currentUser.username || 'Utilisateur'}
                  </span>
                  <span className="text-[9px] text-[#475569] block font-mono truncate leading-none">
                    {currentUser.email}
                  </span>
                </div>
                {/* Visual click-to-edit indicator */}
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </div>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2 bg-[#00FF9C]/10 hover:bg-[#00FF9C]/20 border border-[#00FF9C]/30 rounded-xl text-[#00FF9C] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles size={14} /> INSTALLER L'APPLICATION
                </button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  setCurrentScreen('login_portal');
                  safeSessionStorage.removeItem('tv_current_user');
                  safeLocalStorage.removeItem('tv_current_user');
                }}
                className="w-full py-2 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/20 rounded-xl text-rose-400 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut size={13} /> Se Déconnecter
              </motion.button>
            </div>

          </aside>

          {/* Core Content View Area */}
          <main className="flex-1 p-6 md:p-10 space-y-6">
            
            {/* Header top strip bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-indigo-950/40 gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-white">
                  {activeTab === 'stats' ? t('statistics') : 
                   activeTab === 'challenges' ? t('propfirm_tracker') : 
                   activeTab === 'admin' ? t('admin_space') : 
                   activeTab === 'calendar' ? t('monthly_calendar') : 
                   activeTab === 'journal' ? t('trading_journal') : t('dashboard')}
                </h1>
                {!isAdmin && <p className="text-xs text-slate-400 mt-1">{t('filtered_for')} <span className="text-indigo-400 font-bold font-mono">{activeAccount.name}</span></p>}
              </div>

              {/* Quick totals chips */}
              {!isAdmin && (
                <div className="flex items-center gap-2.5 font-mono text-[11px]">
                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 ${
                    totalAccountPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    P&L : {totalAccountPnl >= 0 ? '+' : ''}${totalAccountPnl.toFixed(2)}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl border border-slate-900 bg-slate-950 text-slate-400">
                    {activeAccountTrades.length} Trades
                  </div>
                </div>
              )}
            </div>

            {/* Active page renderer routing depending on states */}
            {activeTab === 'dashboard' && (
              <Dashboard trades={activeAccountTrades} activeAccount={activeAccount} />
            )}

            {activeTab === 'journal' && (
              <React.Suspense fallback={<JournalLoaderSkeleton />}>
                <Journal 
                  trades={activeAccountTrades} 
                  onAddTrade={handleAddTrade} 
                  onEditTrade={handleEditTrade} 
                  onDeleteTrade={handleDeleteTrade} 
                  activeAccount={activeAccount} 
                />
              </React.Suspense>
            )}

            {activeTab === 'calendar' && (
              <React.Suspense fallback={<CalendarLoaderSkeleton />}>
                <Calendar trades={activeAccountTrades} />
              </React.Suspense>
            )}

            {activeTab === 'stats' && (
              <React.Suspense fallback={<StatsLoaderSkeleton />}>
                <Stats 
                  trades={activeAccountTrades} 
                  onImportTrades={(imported) => setTrades(imported)} 
                  onResetTrades={() => setTrades(prev => prev.filter(t => t.account_id !== selectedAccountId))} 
                  activeAccount={activeAccount} 
                />
              </React.Suspense>
            )}

            {activeTab === 'challenges' && (
              <React.Suspense fallback={<ChallengesLoaderSkeleton />}>
                <Challenges 
                  challenges={challenges} 
                  trades={activeAccountTrades} 
                  onAddChallenge={handleAddChallenge} 
                  onDeleteChallenge={handleDeleteChallenge} 
                  activeAccount={activeAccount} 
                />
              </React.Suspense>
            )}

            {activeTab === 'admin' && isAdmin && (
              <React.Suspense fallback={<AdminLoaderSkeleton />}>
                <Admin 
                  users={users} 
                  onApproveUser={handleApproveUser} 
                  onRejectUser={handleRejectUser} 
                  onUpdateAdminEmails={setAdminEmails} 
                  adminEmails={adminEmails} 
                  adminWalletTRC20={adminWalletTRC20}
                  adminWalletBEP20={adminWalletBEP20}
                  subscriptionPrice={subscriptionPrice}
                  subscriptionPeriod={subscriptionPeriod}
                  onUpdateAdminParams={(trc, bep, price, period) => {
                    setAdminWalletTRC20(trc);
                    safeLocalStorage.setItem('tv_admin_wallet_trc20', trc);
                    setAdminWalletBEP20(bep);
                    safeLocalStorage.setItem('tv_admin_wallet_bep20', bep);
                    setSubscriptionPrice(price);
                    safeLocalStorage.setItem('tv_subscription_price', price.toString());
                    setSubscriptionPeriod(period);
                    safeLocalStorage.setItem('tv_subscription_period', period.toString());
                  }}
                  paymentRequests={paymentRequests}
                  onApproveRenewal={handleApproveRenewal}
                  onRejectRenewal={handleRejectRenewal}
                  onCheckCronRenewals={handleCheckCronRenewals}
                  onDeleteUser={handleDeleteUser}
                  onDeleteAllUsersExceptAdmin={handleDeleteAllUsersExceptAdmin}
                  onEditUser={handleEditUser}
                />
              </React.Suspense>
            )}

          </main>

        </div>
      )}

      {/* POPUP MODAL: ADD PORTFOLIO ACCOUNT */}
      {addAccountOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#080808] rounded-2xl border border-[#00FF9C]/20 p-6 space-y-4">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-black font-mono text-white uppercase tracking-widest">Nouveau Portefeuille</h3>
              <button 
                type="button" 
                onClick={() => setAddAccountOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold font-sans">Nom du compte / challenge *</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Ex: FTMO Challenge 50k"
                  className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold font-sans">Type de tracker</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40"
                >
                  <option value="personal">Compte Personnel Standard</option>
                  <option value="propfirm">Challenge Evaluation Propfirm</option>
                </select>
              </div>

              {newAccType === 'prop_firm' && (
                <div className="space-y-3 p-4 bg-slate-900 border border-slate-800 rounded-xl animate-fade-in font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Capital initial ($) :</label>
                      <input
                        type="number"
                        value={newAccCapital}
                        onChange={(e) => setNewAccCapital(e.target.value)}
                        placeholder="100000"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Objectif profit (%) :</label>
                      <input
                        type="number"
                        value={newAccTarget}
                        onChange={(e) => setNewAccTarget(e.target.value)}
                        placeholder="8"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Max Daily Loss (%) :</label>
                      <input
                        type="number"
                        value={newAccDailyLoss}
                        onChange={(e) => setNewAccDailyLoss(e.target.value)}
                        placeholder="5"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Max Global Loss (%) :</label>
                      <input
                        type="number"
                        value={newAccGlobalLoss}
                        onChange={(e) => setNewAccGlobalLoss(e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setAddAccountOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs hover:bg-slate-900 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold transition-colors font-mono tracking-wide"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: PROFILE EDITION */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#080808] rounded-2xl border border-[#00FF9C]/20 backdrop-blur-md p-6 space-y-6 shadow-2xl animate-fade-in">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[#00FF9C]">✨</span>
                <h3 className="text-sm font-black font-mono text-white uppercase tracking-widest">Édition du Profil</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* INTERACTIVE PROFILE AVATAR ENHANCEMENT */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Photo de Profil</span>
                <div 
                  className="relative group cursor-pointer w-24 h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-500 via-[#00FF9C] to-emerald-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#00FF9C]/20"
                  onClick={() => document.getElementById('profile-avatar-upload-input')?.click()}
                  title="Modifier votre photo de profil"
                >
                  <div className="w-full h-full rounded-full bg-[#040611] flex items-center justify-center relative overflow-hidden">
                    {profileAvatar ? (
                      <>
                        <img 
                          src={profileAvatar} 
                          alt="Avatar" 
                          className="w-full h-full object-cover rounded-full"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                           <Camera size={18} className="text-white mb-0.5" />
                           <span className="text-[8px] font-bold uppercase tracking-wider">Modifier</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <DefaultLogoAvatar className="w-full h-full" />
                        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                          <Camera size={18} className="text-white mb-0.5" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#00FF9C]">Uploader</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Plus badge */}
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 rounded-full bg-[#00FF9C] items-center justify-center border-2 border-[#040611] text-black font-bold text-[9px]">
                    +
                  </span>
                </div>

                <input 
                  type="file" 
                  id="profile-avatar-upload-input"
                  accept="image/*"
                  onChange={handleProfileAvatarUpload}
                  className="hidden"
                />

                {profileAvatar && (
                  <button
                    type="button"
                    onClick={() => setProfileAvatar(null)}
                    className="text-[9px] text-rose-450 hover:text-rose-400 font-bold uppercase transition-colors"
                  >
                    Retirer la photo
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-300 font-bold uppercase tracking-wide block">Nom de trader *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <UserIcon size={14} />
                  </span>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Pays / Devise région</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Globe size={14} />
                  </span>
                  <input
                    type="text"
                    value={profileCountry}
                    onChange={(e) => setProfileCountry(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                    placeholder="Ex: FR"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wide block">Ancien Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileOldPassword ? "text" : "password"}
                    value={profileOldPassword}
                    onChange={(e) => setProfileOldPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                    placeholder="Saisissez votre ancien mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileOldPassword(!showProfileOldPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white transition-colors"
                  >
                    {showProfileOldPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#00FF9C] font-bold uppercase tracking-wide block">Nouveau Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileNewPassword ? "text" : "password"}
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                    placeholder="Nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileNewPassword(!showProfileNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white transition-colors"
                  >
                    {showProfileNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Confirmer Nouveau Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileConfirmPassword ? "text" : "password"}
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                    placeholder="Confirmez"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileConfirmPassword(!showProfileConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white transition-colors"
                  >
                    {showProfileConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* GOOGLE INTEGRATION SECTION */}
              {currentUser && (
                <div className="pt-4 border-t border-white/5 space-y-2.5">
                  <span className="text-[10px] text-[#00FF9C] font-bold uppercase tracking-wider block">Liaison Google</span>
                  
                  {currentUser.google_linked ? (
                    <div className="p-3 bg-[#00FF9C]/5 border border-[#00FF9C]/20 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9C] animate-pulse"></span>
                          <span className="text-[10px] font-bold text-[#00FF9C] uppercase tracking-wider font-mono">Compte Lié à Google</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          E-mail : <span className="font-mono text-zinc-350 font-semibold">{currentUser.google_email || currentUser.email}</span>
                        </p>
                      </div>
                      <span className="text-[#00FF9C] text-sm">✅</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#080808] border border-[#00FF9C]/10 rounded-xl space-y-2">
                      <p className="text-[10px] text-slate-455 leading-relaxed font-sans">
                        Associez votre compte à Google pour pouvoir vous connecter de manière interchangeable avec votre e-mail ou via Google d'un simple clic.
                      </p>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await signInWithGoogle();
                            if (res.success && res.url) {
                              const width = 500;
                              const height = 600;
                              const left = window.screenX + (window.innerWidth - width) / 2;
                              const top = window.screenY + (window.innerHeight - height) / 2;
                              
                              window.open(
                                res.url,
                                'google_oauth_popup',
                                `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
                              );
                            } else {
                              customAlert("Erreur", "Impossible d'initier la liaison Google.");
                            }
                          } catch (e: any) {
                            console.error("Google link trigger error:", e);
                            customAlert("Erreur", "Échec d'ouverture du popup d'authentification.");
                          }
                        }}
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        ASSOCIER UN COMPTE GOOGLE
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs hover:bg-slate-900/60 font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold transition-all font-mono tracking-wide"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* WELCOME POPUP MODAL */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-[white/10] rounded-2xl p-6 w-full max-w-sm relative animate-scale-in flex flex-col items-center text-center">
            
            <div className="w-16 h-16 rounded-full bg-[#00FF9C]/10 flex items-center justify-center mb-5 shrink-0 border-4 border-slate-900 shadow-[0_0_20px_rgba(0,255,156,0.1)]">
              <span className="text-2xl animate-bounce">🚀</span>
            </div>

            <h3 className="text-xl font-bold font-sans text-white mb-2 tracking-tight">Bienvenue sur TradeVault !</h3>
            
            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed px-2">
              Votre accès est correctement configuré. Préparez-vous à tracker vos trades, analyser vos setups et gérer votre capital Propfirm de manière organisée.
            </p>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full py-3 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-[#00FF9C]/10 active:scale-[0.98]"
            >
              🚀 Let's Go
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM DIALOG MODAL (REPLACING native window.alert/window.confirm) */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#080808] border border-[#00FF9C]/20 rounded-2xl p-6 w-full max-w-sm relative animate-scale-in flex flex-col space-y-4 shadow-2xl">
            
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="text-xl">
                {dialogState.isConfirm ? '❓' : '🚨'}
              </span>
              <h3 className="text-sm font-black font-sans text-[#00FF9C] uppercase tracking-wider">
                {dialogState.title}
              </h3>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-line py-2">
              {dialogState.message}
            </p>

            <div className="flex gap-2.5 pt-2">
              {dialogState.isConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialogState.onCancel) dialogState.onCancel();
                      setDialogState(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs hover:bg-slate-900/60 font-semibold transition-all hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialogState.onConfirm) dialogState.onConfirm();
                      setDialogState(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-2.5 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-[#00FF9C]/10 active:scale-[0.98]"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold transition-all text-center shadow-md hover:shadow-[#00FF9C]/10 active:scale-[0.98]"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render PREMIUM trailing custom cursor, interactive 3D card tilts, scroll reveals and count stats */}
      <CustomEffects />

      </div>
    </ErrorBoundary>
  );
}
