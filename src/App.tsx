import React, { useState, useEffect } from 'react';
import AccountSelector from './components/AccountSelector';
import InteractiveTour from './components/InteractiveTour';
import { motion } from 'motion/react';
import { useThemeLang } from './utils/themeLanguageContext';
import { SpeedInsights } from "@vercel/speed-insights/react";
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
  patchUserProfile,
  fetchUserProfile,
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
const Dashboard = safeLazy(() => import('./components/Dashboard'));
import { BackgroundVideo } from './components/BackgroundVideo';
import Logo, { DefaultLogoAvatar } from './components/Logo';

// Safe lazy loading wrapper to prevent "Failed to fetch dynamically imported module" errors when deploying hotfixes
function safeLazy<T extends React.ComponentType<any>>(importFunc: () => Promise<{ default: T }>): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await importFunc();
    } catch (error) {
      console.error("Chunk/Module load failed, attempting automated page refresh:", error);
      const lastReload = safeSessionStorage.getItem("tv_last_chunk_reload") || "0";
      const now = Date.now();
      if (now - parseInt(lastReload, 10) > 12000) {
        safeSessionStorage.setItem("tv_last_chunk_reload", now.toString());
        window.location.reload();
      }
      throw error;
    }
  });
}

// Lazy loaded components for maximum initial page speed and optimized bundle chunk splitting
const Portal = safeLazy(() => import('./components/Portal'));
const Checkout = safeLazy(() => import('./components/Checkout'));
const Journal = safeLazy(() => import('./components/Journal'));
const Calendar = safeLazy(() => import('./components/Calendar'));
const Stats = safeLazy(() => import('./components/Stats'));
const Challenges = safeLazy(() => import('./components/Challenges'));
const Admin = safeLazy(() => import('./components/AdminEnhanced'));
const ResetPassword = safeLazy(() => import('./components/ResetPassword'));

// Define ActiveTab type for InteractiveTour prop typing
type ActiveTab = 'dashboard' | 'journal' | 'calendar' | 'stats' | 'challenges' | 'admin';

export function getAdminEmailsList(): string[] {
  const envEmails = import.meta.env.VITE_ADMIN_EMAILS;
  const localStorageEmails = safeLocalStorage.getItem('tv_admin_emails');
  const emailsString = envEmails || localStorageEmails || 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com';
  return emailsString.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
}

// Admin est désormais déterminé strictement par profiles.role côté DB (voir user.role === 'admin').

// Sleek loading fallback for major screens or portals with TradeVault aesthetic
function SleekNeonLoader() {
  return (
    <div className="min-h-[100vh] min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col justify-center items-center py-20 px-4 text-center font-sans space-y-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[var(--accent-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="relative z-10 flex flex-col items-center space-y-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-[var(--accent-primary)]/10 animate-ping absolute inset-0"></div>
          <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-b border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] border-r-[var(--accent-primary)] animate-spin"></div>
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-black font-display tracking-tight text-[var(--text-primary)] uppercase">TRADE<span className="text-[var(--accent-primary)]">VAULT</span></h2>
          <div className="text-[10px] uppercase tracking-widest text-[var(--accent-primary)] font-mono animate-pulse">
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
      <div className="flex justify-between items-center bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6">
        <div className="space-y-2">
          <div className="h-4 w-36 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-3 w-56 bg-[var(--bg-tertiary)]/60 rounded"></div>
        </div>
        <div className="h-8 w-24 bg-[var(--bg-tertiary)] rounded-xl"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-3">
          <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded flex items-center justify-center"></div>
          <div className="h-6 w-28 bg-[var(--bg-tertiary)] rounded"></div>
        </div>
        <div className="h-32 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-3">
          <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-6 w-28 bg-[var(--bg-tertiary)] rounded"></div>
        </div>
        <div className="h-32 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-3">
          <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-6 w-28 bg-[var(--bg-tertiary)] rounded"></div>
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
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-3 w-72 bg-[var(--bg-tertiary)]/60 rounded"></div>
        </div>
        <div className="h-8 w-32 bg-[var(--bg-tertiary)] rounded-xl"></div>
      </div>
      {/* Admin Status metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-6 w-24 bg-[var(--bg-tertiary)] rounded"></div>
          </div>
        ))}
      </div>
      {/* Users / Subscriptions list table */}
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded mb-2"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)]"></div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-[var(--bg-tertiary)] rounded"></div>
                  <div className="h-2.5 w-32 bg-[var(--bg-tertiary)]/60 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-[var(--bg-tertiary)] rounded"></div>
                <div className="h-6 w-8 bg-[var(--bg-tertiary)] rounded"></div>
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
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-3 w-64 bg-[var(--bg-tertiary)]/60 rounded"></div>
        </div>
        <div className="h-8 w-24 bg-[var(--bg-tertiary)] rounded-xl"></div>
      </div>
      {/* Stats Cards (4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded"></div>
            <div className="h-6 w-20 bg-[var(--bg-tertiary)] rounded"></div>
          </div>
        ))}
      </div>
      {/* Graph Area / advanced metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 h-80 flex flex-col justify-between">
          <div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded"></div>
          {/* Mock Area Chart pulse effect */}
          <div className="flex-1 flex items-end gap-2 border-b border-l border-white/[0.06] p-2 mt-4">
            {[35, 60, 45, 80, 55, 90, 70, 40, 85].map((height, index) => (
              <div 
                key={index} 
                className="flex-1 bg-gradient-to-t from-[var(--accent-primary)]/10 to-[var(--accent-primary)]/30 rounded-t"
                style={{ height: `${height}%` }}
              ></div>
            ))}
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 h-80 space-y-4">
          <div className="h-4 w-28 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded"></div>
                <div className="h-3 w-12 bg-[var(--bg-tertiary)] rounded"></div>
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
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-52 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-3 w-80 bg-[var(--bg-tertiary)]/60 rounded"></div>
        </div>
      </div>
      {/* Calendar Grid wrapper */}
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-4">
        {/* Month Selector bar */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="h-6 w-32 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-[var(--bg-tertiary)] rounded-xl"></div>
            <div className="h-8 w-8 bg-[var(--bg-tertiary)] rounded-xl"></div>
          </div>
        </div>
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center py-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
            <div key={idx} className="h-3 w-8 bg-[var(--bg-tertiary)] rounded mx-auto"></div>
          ))}
        </div>
        {/* Days grid 7x5 */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-[var(--bg-tertiary)]/40 border border-white/[0.06] rounded-xl flex items-center justify-center p-1">
              <div className="h-3 w-3 bg-[var(--bg-tertiary)] rounded mb-1"></div>
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
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-3 w-72 bg-[var(--bg-tertiary)]/60 rounded"></div>
        </div>
        <div className="h-9 w-36 bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/10 rounded-xl"></div>
      </div>
      {/* Active Challenge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-4 w-40 bg-[var(--bg-tertiary)] rounded"></div>
                <div className="h-3 w-24 bg-[var(--bg-tertiary)]/60 rounded"></div>
              </div>
              <div className="h-5 w-20 bg-[var(--bg-tertiary)] rounded-full"></div>
            </div>
            {/* Grid metrics details */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-zinc-950/60 border border-white/[0.06] rounded-xl space-y-2">
                <div className="h-2.5 w-12 bg-[var(--bg-tertiary)] rounded"></div>
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded"></div>
              </div>
              <div className="p-3 bg-zinc-950/60 border border-white/[0.06] rounded-xl space-y-2">
                <div className="h-2.5 w-12 bg-[var(--bg-tertiary)] rounded"></div>
                <div className="h-4 w-16 bg-[var(--bg-tertiary)] rounded"></div>
              </div>
            </div>
            {/* Target Slider indicator and rules list */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[10px]">
                <div className="h-3 w-28 bg-[var(--bg-tertiary)] rounded"></div>
                <div className="h-3 w-12 bg-[var(--bg-tertiary)] rounded"></div>
              </div>
              <div className="h-2 bg-zinc-950 border border-white/[0.06] rounded-full"></div>
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
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-3 w-80 bg-[var(--bg-tertiary)]/60 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-[var(--bg-tertiary)] rounded-xl"></div>
          <div className="h-9 w-32 bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/10 rounded-xl"></div>
        </div>
      </div>
      {/* Journal entries placeholder */}
      <div className="bg-[var(--bg-secondary)] border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <div className="h-4 w-28 bg-[var(--bg-tertiary)] rounded"></div>
          <div className="h-6 w-36 bg-[var(--bg-tertiary)] rounded-lg"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-[var(--bg-tertiary)]/40 border border-[var(--bg-primary)]/50 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-16 bg-[var(--bg-tertiary)] rounded flex items-center justify-center"></div>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-16 bg-[var(--bg-tertiary)] rounded"></div>
                  <div className="h-2.5 w-24 bg-[var(--bg-tertiary)]/60 rounded"></div>
                </div>
              </div>
              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                <div className="space-y-1.5 text-right flex-1 select-none">
                  <div className="h-3 w-12 bg-[var(--bg-tertiary)] rounded ms-auto"></div>
                  <div className="h-2.5 w-16 bg-[var(--bg-tertiary)]/60 rounded ms-auto"></div>
                </div>
                <div className="h-6 w-12 bg-[var(--bg-tertiary)] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function canAccessApp(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.status === 'approved' && user.subscription_status === 'premium_active';
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

  // Synchroniser la configuration de l'espace administration (et pricing / portefeuilles) depuis la base de données globale
  useEffect(() => {
    import('./utils/supabaseSync').then(({ loadAdminSettings }) => {
      loadAdminSettings().then(settings => {
        if (settings) {
          setAdminEmails(settings.adminEmails);
          setAdminWalletTRC20(settings.adminWalletTRC20);
          setAdminWalletBEP20(settings.adminWalletBEP20);
          setSubscriptionPrice(settings.subscriptionPrice);
          setSubscriptionPeriod(settings.subscriptionPeriod);
          
          safeLocalStorage.setItem('tv_admin_emails', settings.adminEmails);
          safeLocalStorage.setItem('tv_admin_wallet_trc20', settings.adminWalletTRC20);
          safeLocalStorage.setItem('tv_admin_wallet_bep20', settings.adminWalletBEP20);
          safeLocalStorage.setItem('tv_subscription_price', settings.subscriptionPrice.toString());
          safeLocalStorage.setItem('tv_subscription_period', settings.subscriptionPeriod.toString());
        }
      }).catch(err => console.warn("Failed to load global admin settings:", err));
    });
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
    const saved = safeLocalStorage.getItem('tv_trades');
    const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const isAdmin = u.role === 'admin';
      if (saved) {
        const parsed = JSON.parse(saved) as Trade[];
        if (!isAdmin && parsed.some(t => t.id === 't1' || t.id === 't2' || t.id === 't3')) {
          return [];
        }
        return parsed;
      }
      return [];
    }
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
      const userId = u?.id || 'admin';
      const freshAccounts: Account[] = [
        {
          id: `personal-${userId}`,
          user_id: userId,
          name: 'Compte Personnel',
          account_type: 'personal',
          type: 'personal',
          color: 'var(--success)',
          emoji: '💼',
          created_at: new Date().toISOString()
        },
        {
          id: `propfirm-${userId}`,
          user_id: userId,
          name: 'FTMO 100K Challenge',
          account_type: 'prop_firm',
          type: 'prop_firm',
          prop_firm_name: 'FTMO',
          capital: 100000,
          target: 8,
          daily_loss: 5,
          global_loss: 10,
          color: 'var(--warning)',
          emoji: '🏆',
          created_at: new Date().toISOString()
        }
      ];
      safeLocalStorage.setItem(`tv_accounts_${u.id}`, JSON.stringify(freshAccounts));
      return freshAccounts;
    }
    const saved = safeLocalStorage.getItem('tv_accounts');
    if (saved) return JSON.parse(saved);

    const defaultUserId = 'admin';
    return [
      {
        id: `personal-${defaultUserId}`,
        user_id: defaultUserId,
        name: 'Compte Personnel',
        account_type: 'personal',
        type: 'personal',
        color: 'var(--success)',
        emoji: '💼',
        created_at: new Date().toISOString()
      },
      {
        id: `propfirm-${defaultUserId}`,
        user_id: defaultUserId,
        name: 'FTMO 100K Challenge',
        account_type: 'prop_firm',
        type: 'prop_firm',
        prop_firm_name: 'FTMO',
        capital: 100000,
        target: 8,
        daily_loss: 5,
        global_loss: 10,
        color: 'var(--warning)',
        emoji: '🏆',
        created_at: new Date().toISOString()
      }
    ];
  });


  const [adminEmails, setAdminEmails] = useState<string>(() => {
    return import.meta.env.VITE_ADMIN_EMAILS || safeLocalStorage.getItem('tv_admin_emails') || 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com';
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
    return canAccessApp(user) ? 'app' : 'checkout';
  });

  const [activeTab, setActiveTab ] = useState<'dashboard' | 'journal' | 'calendar' | 'stats' | 'challenges' | 'admin'>('dashboard');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const saved = safeLocalStorage.getItem('tv_selected_account_id');
    const savedUser = safeSessionStorage.getItem('tv_current_user') || safeLocalStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const isAdmin = u.role === 'admin';
      if (saved) {
        if (!isAdmin && saved === 'ftmo-100k') return 'personal';
        return saved;
      }
      return 'personal';
    }
    return saved || 'personal';
  });

  const [addAccountOpen, setAddAccountOpen] = useState(false);

  // User Profile customized states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileCountry, setProfileCountry] = useState('FR');
  const [profileCurrency, setProfileCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  
  const [profileOldPassword, setProfileOldPassword] = useState('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  const [showProfileOldPassword, setShowProfileOldPassword] = useState(false);
  const [showProfileNewPassword, setShowProfileNewPassword] = useState(false);
  const [showProfileConfirmPassword, setShowProfileConfirmPassword] = useState(false);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const openProfileModal = () => {
    if (!currentUser) return;
    setProfileUsername(currentUser.username || '');
    setProfileCountry(currentUser.country || 'FR');
    setProfileCurrency(currentUser.currency || 'USD');
    setProfileAvatar(currentUser.avatar_url || null);
    
    setProfileOldPassword('');
    setProfileNewPassword('');
    setProfileConfirmPassword('');
    
    setShowProfileOldPassword(false);
    setShowProfileNewPassword(false);
    setShowProfileConfirmPassword(false);
    
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileUsername.trim()) return;

    if (profileOldPassword || profileNewPassword || profileConfirmPassword) {
      if (profileNewPassword !== profileConfirmPassword) {
        customAlert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
        return;
      }
      if (profileNewPassword.length < 6) {
        customAlert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      // Vérifie l'ancien mot de passe via une vraie tentative de connexion
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: profileOldPassword,
      });
      if (reauthError) {
        customAlert('Erreur', "L'ancien mot de passe est incorrect.");
        return;
      }
      // Applique le nouveau mot de passe via Supabase Auth (pas via profiles)
      const { error: pwError } = await supabase.auth.updateUser({ password: profileNewPassword });
      if (pwError) {
        customAlert('Erreur', 'Échec de la mise à jour du mot de passe : ' + pwError.message);
        return;
      }
    }

    const updates: Partial<User> = {
      username: profileUsername.trim(),
      country: profileCountry,
      currency: (profileCurrency as any),
      avatar_url: profileAvatar || undefined
    };

    try {
      setIsSavingProfile(true);
      // Sync with remote database using dedicated patch
      await patchUserProfile(currentUser.id, updates);
      
      // Re-fetch to confirm exactly what's in the DB
      const dbUser = await fetchUserProfile(currentUser.id);
      
      const finalUser = dbUser || { ...currentUser, ...updates };
      setCurrentUser(finalUser);

      // Update local database list
      setUsers(prev => prev.map(u => u.id === currentUser.id ? finalUser : u));
      setProfileModalOpen(false);
      customAlert('Succès', 'Votre profil a été mis à jour avec succès.');
    } catch (err) {
      console.error("Profile save failed:", err);
      customAlert('Erreur', 'Une erreur est survenue lors de la sauvegarde.');
    } finally {
      setIsSavingProfile(false);
      // Clear password fields
      setProfileOldPassword('');
      setProfileNewPassword('');
      setProfileConfirmPassword('');
    }
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
  const [newAccType, setNewAccType] = useState<'personal' | 'prop_firm' | 'demo'>('personal');
  const [newAccCapital, setNewAccCapital] = useState('100000');
  const [newAccTarget, setNewAccTarget] = useState('8');
  const [newAccDailyLoss, setNewAccDailyLoss] = useState('5');
  const [newAccGlobalLoss, setNewAccGlobalLoss] = useState('10');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

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

            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', session: sessionObj }, window.location.origin);
            window.close();
          } catch (err) {
            console.error("Popup communication error:", err);
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, window.location.origin);
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
                  setCurrentScreen(canAccessApp(activeUserToLog) ? 'app' : 'checkout');
                  
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

  useEffect(() => {
    if (currentUser) {
      setCurrentScreen(canAccessApp(currentUser) ? 'app' : 'checkout');
    }
  }, [currentUser]);

  // Real-time automatic redirection when administrator approves user account or payment proof
  useEffect(() => {
    if (!currentUser || currentUser.status !== 'pending' || currentScreen !== 'checkout') {
      return;
    }

    const intervalId = setInterval(() => {
      import('./utils/supabaseSync').then(({ fetchUserProfile }) => {
        fetchUserProfile(currentUser.id)
          .then(updatedProfile => {
            if (updatedProfile && updatedProfile.status === 'approved' && updatedProfile.subscription_status === 'premium_active') {
              setCurrentUser(prev => prev ? { 
                ...prev, 
                paid: true, 
                status: 'approved',
                subscription_status: 'premium_active',
                premium_expires_at: updatedProfile.premium_expires_at,
                paid_until: updatedProfile.premium_expires_at 
              } : null);
              setCurrentScreen('app');
              (window as any).showCustomAlert?.("Accès Premium Activé ! 🎉", "Félicitations ! Votre compte TradeVault Premium a été approuvé et validé par l'administrateur. Bienvenue sur votre plateforme !");
            }
          })
          .catch(err => console.warn("Polling verify failed:", err));
      });
    }, 6000);

    return () => clearInterval(intervalId);
  }, [currentUser?.id, currentUser?.status, currentScreen]);

  // Synchronize currentUser with any changes in local users array (e.g., fallback local flow updates from Admin)
  useEffect(() => {
    if (currentUser) {
      const matched = users.find(u => u.id === currentUser.id || (currentUser.email && u.email?.toLowerCase() === currentUser.email?.toLowerCase()));
      if (matched && (matched.paid !== currentUser.paid || matched.status !== currentUser.status || matched.paid_until !== currentUser.paid_until)) {
        setCurrentUser(prev => prev ? { ...prev, paid: matched.paid, status: matched.status, paid_until: matched.paid_until } : null);
      }
    }
  }, [users, currentUser?.id, currentUser?.email]);

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
      const isAdmin = currentUser.role === 'admin';

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
        import('./utils/supabaseSync').then(({ loadUserDataFromSupabase, fetchUserProfile }) => {
          // Fetch and update latest profile status from DB to ensure local session isn't stale
          fetchUserProfile(uId)
            .then(updatedProfile => {
              if (updatedProfile) {
                setCurrentUser(prev => {
                  if (!prev) return updatedProfile;
                  return {
                    ...prev,
                    paid: updatedProfile.paid,
                    status: updatedProfile.status,
                    paid_until: updatedProfile.paid_until,
                    username: updatedProfile.username,
                    country: updatedProfile.country,
                    avatar_url: updatedProfile.avatar_url,
                    currency: updatedProfile.currency
                  };
                });
              }
            })
            .catch(err => console.warn("Could not load updated profile on startup:", err));

          loadUserDataFromSupabase(uId)
            .then(dbData => {
              setAccounts((dbData.accounts || []).map((a: any) => {
                const typeVal = a.type || a.account_type || 'personal';
                const normalizedType = (typeVal === 'funded' || typeVal === 'challenge' || typeVal === 'prop_firm') ? 'prop_firm' : typeVal;
                return {
                  ...a,
                  account_type: normalizedType,
                  type: normalizedType,
                  color: a.color || (normalizedType === 'prop_firm' ? 'var(--warning)' : 'var(--success)'),
                  emoji: a.emoji || (normalizedType === 'prop_firm' ? '🏆' : '💼'),
                };
              }));
              
              setTrades(prev => {
                // Merging strategy: deduplicate by ID, preferring DB data for existing records
                // but keeping local records that haven't reached DB yet
                const localTrades = prev || [];
                const mergedMap = new Map();
                
                // First process existing local items (might include unsaved ones)
                localTrades.forEach((t: Trade) => mergedMap.set(t.id, t));

                // Then overwrite/add with DB data (the truth of the cloud)
                if (dbData.trades && dbData.trades.length > 0) {
                  dbData.trades.forEach((t: Trade) => mergedMap.set(t.id, t));
                }
                
                return Array.from(mergedMap.values());
              });

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
    if (canAccessApp(user)) {
      setCurrentScreen('app');
      if (user.role === 'admin') {
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
    if (currentUser && currentUser.status !== 'approved') {
      supabase.auth.signOut().catch(err => console.warn("supabase.auth.signOut failed:", err));
      setCurrentUser(null);
      setCurrentScreen('login_portal');
      safeSessionStorage.removeItem('tv_current_user');
      safeLocalStorage.removeItem('tv_current_user');
    } else {
      setActiveTab('dashboard');
      setCurrentScreen('app');
    }
  };

  // Switch accounts list
  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0] || { id: 'personal', user_id: currentUser?.id || 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() };
  
  // Filter trades correspond with currently selected active account
  const activeAccountTrades = trades.filter(t => t.account_id === selectedAccountId);

  // Stats calculation
  const totalAccountPnl = activeAccountTrades.reduce((sum, t) => sum + t.pnl, 0);

  // Trade CRUD
  const handleAddTrade = async (newTrade: Trade) => {
    setTrades(prev => {
      const next = [...prev, newTrade];
      if (currentUser) {
        safeLocalStorage.setItem(`tv_trades_${currentUser.id}`, JSON.stringify(next));
      }
      return next;
    });
    if (currentUser) {
      // Call proxy directly instead of saveTradeToSupabase
      try {
        const response = await fetch('/api/supabase/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createTrade',
            arguments: newTrade // The Trade object already matches what the proxy expects
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        // Optionally update the trade with the ID returned from the server
        // if (result.trade) {
        //   setTrades(prev => prev.map(t => t.id === newTrade.id ? { ...t, ...result.trade } : t));
        // }
      } catch (err) {
        console.error('Failed to save trade:', err);
        // Optionally show error to user
      }
    }
  };

  const handleEditTrade = async (id: string, updated: Partial<Trade>) => {
    let updatedTrade: Trade | undefined;
    setTrades(prev => {
      const mapped = prev.map(t => t.id === id ? { ...t, ...updated } : t);
      updatedTrade = mapped.find(t => t.id === id);
      if (currentUser) {
        safeLocalStorage.setItem(`tv_trades_${currentUser.id}`, JSON.stringify(mapped));
      }
      return mapped;
    });
    if (currentUser && updatedTrade) {
      // Call proxy directly instead of saveTradeToSupabase
      try {
        const response = await fetch('/api/supabase/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateTrade',
            arguments: updatedTrade // The Trade object already has all needed fields including id
          })
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        // Optionally update the trade with the fresh data from the server
        // if (result.trade) {
        //   setTrades(prev => prev.map(t => t.id === updatedTrade.id ? { ...t, ...result.trade } : t));
        // }
      } catch (err) {
        console.error('Failed to update trade:', err);
        // Optionally show error to user
      }
    }
  };

  const handleDeleteTrade = (id: string) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== id);
      if (currentUser) {
        safeLocalStorage.setItem(`tv_trades_${currentUser.id}`, JSON.stringify(next));
      }
      return next;
    });
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
  const handleApproveUser = async (user_id: string) => {
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

    // Update current user if it is the one being approved
    if (currentUser?.id === user_id) {
      setCurrentUser(approved);
      setCurrentScreen('app'); // Navigate to app
    }

    // Update profile in Supabase
    await syncUserProfile(approved);

    // Also approve corresponding payment request if any
    const associatedPayments = paymentRequests.filter(p => p.user_id === user_id && p.status === 'pending');
    for (const p of associatedPayments) {
      await savePaymentToSupabase(user_id, { ...p, status: 'approved' });
    }
    setPaymentRequests(prev => prev.map(p => p.user_id === user_id && p.status === 'pending' ? { ...p, status: 'approved' as const } : p));

    // Call API to send approval confirmation email
    try {
      await fetch('/api/notify/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.email, username: target.username })
      });
    } catch (e) {
      console.error("Failed to trigger approval email notification:", e);
    }

    // Trigger success notification via background service
    import('./utils/notificationService').then(({ sendPushNotification }) => {
      sendPushNotification(
        `Membre Approuvé ! 🎉`,
        `L’accès TradeVault de ${target.username} (${target.email}) est validé avec succès ! Abonnement trimestriel activé.`,
        'payment'
      );
    });
  };

  const handleRejectUser = async (user_id: string) => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === user_id ? { ...u, status: 'rejected' as const } : u);
      const target = updated.find(u => u.id === user_id);
      if (target) {
        syncUserProfile(target);
      }
      return updated;
    });

    // Also reject corresponding payment requests in local state & database
    const associatedPayments = paymentRequests.filter(p => p.user_id === user_id && p.status === 'pending');
    for (const p of associatedPayments) {
      await savePaymentToSupabase(user_id, { ...p, status: 'rejected' });
    }
    setPaymentRequests(prev => prev.map(p => p.user_id === user_id && p.status === 'pending' ? { ...p, status: 'rejected' as const } : p));
  };

  const handleApproveRenewal = async (payId: string) => {
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
    await syncUserProfile(renewedUser);
    await savePaymentToSupabase(targetUser.id, {
      ...req,
      status: 'approved'
    });

    setPaymentRequests(prev => prev.map(r => r.id === payId ? { ...r, status: 'approved' as const } : r));

    // Call API to send renewal approval e-mail
    try {
      await fetch('/api/notify/renewal-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetUser.email, username: targetUser.username })
      });
    } catch (e) {
      console.error("Failed to trigger renewal approval email notification:", e);
    }
  };

  const handleRejectRenewal = async (payId: string) => {
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
    const adminUser = users.find(u => u.role === 'admin');
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
    const originalUser = users.find(u => u.id === user_id);
    const wasApprovedBefore = originalUser ? originalUser.status === 'approved' : false;

    // Build the updates specifically including 'paid' and 'paid_until' if we are changing to approved
    const updates: any = { ...updatedFields };
    if (updatedFields.status === 'approved' && !wasApprovedBefore) {
      updates.paid = true;
      if (!originalUser?.paid_until) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 90);
        updates.paid_until = expiry.toISOString();
      }
    }

    const success = await adminUpdateUserFromSupabase(user_id, updates);
    if (success) {
      setUsers(prev => prev.map(u => u.id === user_id ? { ...u, ...updates } : u));
      if (currentUser?.id === user_id) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }

      // If status changed to approved, trigger notification & email
      if (updatedFields.status === 'approved' && !wasApprovedBefore && originalUser) {
        try {
          await fetch('/api/notify/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: updatedFields.email, username: updatedFields.username })
          });
        } catch (e) {
          console.error("Failed to trigger approval email notification from edit:", e);
        }

        import('./utils/notificationService').then(({ sendPushNotification }) => {
          sendPushNotification(
            `Membre Approuvé ! 🎉`,
            `L’accès TradeVault de ${updatedFields.username} (${updatedFields.email}) est validé avec succès !`,
            'payment'
          );
        });
      }
    } else {
      customAlert("Erreur", "La modification du profil a échoué.");
    }
  };

  const handleUpdateUserRole = async (targetUserId: string, newRole: 'admin' | 'user') => {
    try {
      const { updateUserRole: updateRoleFn, adminLoadAllUsersFromSupabase } = await import('./utils/supabaseSync');
      const success = await updateRoleFn(targetUserId, newRole);
      if (success) {
        const updatedUsers = await adminLoadAllUsersFromSupabase();
        if (updatedUsers && updatedUsers.length > 0) {
          setUsers(updatedUsers);
          const updatedTarget = updatedUsers.find(u => u.id === targetUserId);
          if (updatedTarget && updatedTarget.role === newRole) {
            customAlert("Succès", `Le rôle de l'utilisateur a été mis à jour avec succès en "${newRole}".`);
            return;
          }
        }
      }
      customAlert("Erreur", "Le changement de rôle a échoué ou n'est pas autorisé.");
    } catch (err) {
      console.error("Failed to update user role:", err);
      customAlert("Erreur", "Impossible de mettre à jour le rôle.");
    }
  };

  // Add account helper
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    try {
      setIsSavingAccount(true);
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
        await saveAccountToSupabase(currentUser.id, newAcc);
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
          await saveChallengeToSupabase(currentUser.id, newCh);
        }
      }

      setSelectedAccountId(accId);
      setAddAccountOpen(false);
      setNewAccName('');
      customAlert('Succès', 'Nouveau portefeuille ajouté avec succès.');
    } catch (err) {
      console.error("Add account failed:", err);
      customAlert('Erreur', 'Impossible de sauvegarder le nouveau portefeuille.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Vérification stricte du rôle admin — source unique : profiles.role (DB)
  const isAdmin = currentUser?.role === 'admin';

  return (
    <ErrorBoundary>
      <div className="min-h-[100vh] min-h-[100dvh] bg-[var(--bg-primary)] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <SpeedInsights />
      
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
          
          {/* INTERACTIVE ONBOARDING TOUR */}
          <InteractiveTour
            userId={currentUser.id}
            activeTab={activeTab}
            setActiveTab={(tab: string) => setActiveTab(tab as typeof activeTab)}
          />
          
          {/* YOUTUBE BACKGROUND LOOP */}
          <BackgroundVideo />
          
          {/* Navigation Sidebar panel */}
          <aside className="w-full lg:w-64 bg-[var(--bg-secondary)] backdrop-blur-xl border-r border-white/[0.06] flex flex-col justify-between p-5 lg:sticky lg:top-0 h-[100vh] lg:h-[100dvh] shrink-0 relative z-30">
            <div className="space-y-6">
              
              {/* Brand Logo and Name */}
              <div className="flex items-center px-1 border-b border-white/[0.06] pb-4">
                <div>
                  <h2 className="text-xl font-black font-display tracking-tight text-[var(--text-primary)] drop-shadow-[0_0_15px_rgba(0,168,107,0.4)]">TRADE<span className="text-[var(--accent-primary)]">VAULT</span></h2>
                  <span className="text-[9px] text-[var(--text-muted)] block tracking-wider uppercase font-semibold">Track log PRO v1.2</span>
                </div>
              </div>

              {/* ACCOUNT SWITCHER SELECTOR */}
              {!isAdmin && (
                <div className="bg-[var(--bg-tertiary)]/60 p-3 rounded-xl border border-white/[0.06] space-y-2">
                  <span className="text-[9px] text-neutral-300 font-bold uppercase tracking-wider block">PORTEFEUILLE ACTIF</span>
                  <div className="flex gap-1.5 items-center">
                    <AccountSelector
                      accounts={accounts}
                      selectedAccountId={selectedAccountId}
                      onSelect={setSelectedAccountId}
                      onDelete={handleDeleteAccount}
                      onEdit={(id: string, updates: any) => {
                        setAccounts((prev: Account[]) =>
                          prev.map((a: Account) => {
                            if (a.id === id) {
                              const updated = { ...a, ...updates };
                              saveAccountToSupabase(currentUser?.id || '', updated);
                              return updated;
                            }
                            return a;
                          })
                        );
                      }}
                    />
                    {/* Add account button - restored functionality */}
                    <button
                      onClick={() => setAddAccountOpen(true)}
                      className="w-flex flex items-center gap-2 px-3 py-2.5 text-[var(--success)] hover:bg-[var(--success)]/10 rounded-xl transition-colors text-sm font-medium"
                    >
                      <span>＋</span> Ajouter un compte
                    </button>
                  </div>
                </div>
              )}

              {/* SUBSCRIPTION COUNTDOWN (90 DAYS) */}
              {!isAdmin && currentUser?.paid_until && (() => {
                const daysLeft = Math.max(0, Math.ceil((new Date(currentUser.paid_until).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
                const isNearingExpiry = daysLeft <= 7;
                return (
                  <div className={`${isNearingExpiry ? 'bg-rose-900/20 border-rose-500/40 text-rose-300' : 'bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20 text-[var(--accent-primary)]'} border p-3 rounded-xl flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${isNearingExpiry ? 'text-[var(--danger)]' : 'text-[var(--accent-primary)]'}`}>
                          Accès PRO {isNearingExpiry && '⚠️'}
                        </span>
                        <span className="text-[10px] text-neutral-300 font-medium font-sans">
                          Jours restants : <strong className={`font-mono text-xs ml-1 ${isNearingExpiry ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                            {daysLeft}
                          </strong> / 90
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-inner overflow-hidden shrink-0 ${isNearingExpiry ? 'bg-[var(--danger)]/20 border-[var(--danger)]/40 text-[var(--danger)]' : 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'}`}>
                         <span className="text-[10px] font-black font-mono">
                          {daysLeft}
                         </span>
                      </div>
                    </div>
                    {isNearingExpiry && (
                      <p className="text-[9px] text-[var(--danger)]/80 leading-tight">
                        Votre abonnement expire bientôt ! Renouvelez vite pour éviter toute coupure.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('checkout')}
                      className={`w-full py-1.5 mt-1 border rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors ${
                        isNearingExpiry 
                          ? 'bg-rose-600/30 hover:bg-rose-600/50 border-rose-500/30 text-rose-300'
                          : 'bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
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
                        activeTab === 'dashboard' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900'
                      }`}
                    >
                      <Grid size={15} /> Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('journal')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'journal' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900'
                      }`}
                    >
                      <FileText size={15} /> Journal Trading
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('calendar')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'calendar' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-900'
                      }`}
                    >
                      <CalendarIcon size={15} /> Calendrier Mensuel
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('stats')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                        activeTab === 'stats' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-900'
                      }`}
                    >
                      <TrendingUp size={15} /> Statistiques
                    </button>
                    {accounts.some(acc => acc.account_type === 'prop_firm' || acc.type === 'prop_firm') && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('challenges')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all font-semibold ${
                          activeTab === 'challenges' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-900'
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
                      activeTab === 'admin' ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/20 text-[var(--accent-primary)] shadow' : 'border-transparent text-[var(--text-secondary)] bg-zinc-950/20'
                    }`}
                  >
                    🛡️ Espace Admin
                  </button>
                )}

              </nav>
            </div>

            <div className="pt-6 border-t border-slate-900 mt-6 md:mt-0 space-y-4">
              
              {/* Theme switcher removed as requested */}
              
              {/* Active user tag detail */}
              <div 
                id="tour-profile-trigger"
                onClick={openProfileModal}
                className="flex gap-2.5 items-center px-2 py-1.5 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-[var(--accent-primary)]/10 active:scale-[0.98] transition-all cursor-pointer group"
                title="Modifier mon profil"
              >
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt={currentUser.username} 
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-[var(--accent-primary)]/25 group-hover:ring-[var(--accent-primary)]/50 transition-all shrink-0"
                   
                  />
                ) : (
                  <DefaultLogoAvatar className="w-8 h-8 ring-2 ring-[var(--accent-primary)]/25 group-hover:ring-[var(--accent-primary)]/50 transition-all" />
                )}
                <div className="overflow-hidden flex-1">
                  <span className="text-xs font-bold text-[var(--text-primary)] block leading-none truncate mb-1 group-hover:text-[var(--accent-primary)] transition-colors">
                    {currentUser.username || 'Utilisateur'}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block font-mono truncate leading-none">
                    {currentUser.email}
                  </span>
                </div>
                {/* Visual click-to-edit indicator */}
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </div>

              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full py-2 bg-[var(--accent-primary)]/10 hover:bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 rounded-xl text-[var(--accent-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles size={14} /> INSTALLER L'APPLICATION
                </button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch (err) {
                    console.warn("supabase.auth.signOut failed:", err);
                  }
                  setCurrentUser(null);
                  setCurrentScreen('login_portal');
                  setTrades([]);
                  setAccounts([]);
                  setChallenges([]);
                  setPaymentRequests([]);
                  setUsers([]);
                  setSelectedAccountId('personal');
                  safeSessionStorage.removeItem('tv_current_user');
                  safeLocalStorage.removeItem('tv_current_user');
                }}
                className="w-full py-2 bg-[var(--danger)]/10 hover:bg-[var(--danger)]/20 border border-[var(--danger)]/20 rounded-xl text-[var(--danger)] hover:text-[var(--danger)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
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
                <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">
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
                    totalAccountPnl >= 0 ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]' : 'bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]'
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
              <React.Suspense fallback={<SleekNeonLoader />}>
                <Dashboard trades={activeAccountTrades} activeAccount={activeAccount} currency={currentUser?.currency || 'USD'} />
              </React.Suspense>
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
                  currentUser={currentUser!}
                  onUpdateUserRole={handleUpdateUserRole}
                  users={users} 
                  onApproveUser={handleApproveUser} 
                  onRejectUser={handleRejectUser} 
                  onUpdateAdminEmails={(emails) => {
                    setAdminEmails(emails);
                    safeLocalStorage.setItem('tv_admin_emails', emails);
                    import('./utils/supabaseSync').then(({ saveAdminSettings }) => {
                      saveAdminSettings({
                        adminEmails: emails,
                        adminWalletTRC20,
                        adminWalletBEP20,
                        subscriptionPrice,
                        subscriptionPeriod
                      });
                    }).catch(e => console.error("Error saving admin emails:", e));
                  }}
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

                    import('./utils/supabaseSync').then(({ saveAdminSettings }) => {
                      saveAdminSettings({
                        adminEmails,
                        adminWalletTRC20: trc,
                        adminWalletBEP20: bep,
                        subscriptionPrice: price,
                        subscriptionPeriod: period
                      });
                    }).catch(e => console.error("Error saving admin params:", e));
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
        <div className="fixed inset-0 bg-[var(--bg-primary)]/85 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--bg-secondary)] rounded-2xl border border-[var(--accent-primary)]/20 p-6 space-y-4 custom-scrollbar responsive-form-container">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Nouveau Portefeuille</h3>
              <button 
                type="button" 
                onClick={() => setAddAccountOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 hover:text-[var(--text-primary)]"
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
                  className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-white/[0.06] rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold font-sans">Type de tracker</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-white/[0.06] rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40"
                >
                  <option value="personal">Personnel</option>
                  <option value="prop_firm">Prop Firm</option>
                  <option value="demo">Démo</option>
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
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Objectif profit (%) :</label>
                      <input
                        type="number"
                        value={newAccTarget}
                        onChange={(e) => setNewAccTarget(e.target.value)}
                        placeholder="8"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[var(--text-primary)]"
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
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Max Global Loss (%) :</label>
                      <input
                        type="number"
                        value={newAccGlobalLoss}
                        onChange={(e) => setNewAccGlobalLoss(e.target.value)}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[var(--text-primary)]"
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
                  disabled={isSavingAccount}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="flex-1 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:bg-slate-800 disabled:text-slate-500 text-black rounded-xl text-xs font-bold transition-all font-mono tracking-wide flex items-center justify-center gap-2"
                >
                  {isSavingAccount ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-900 border-t-black rounded-full animate-spin" />
                      Patientez...
                    </>
                  ) : "Enregistrer"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: PROFILE EDITION */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/85 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[var(--bg-secondary)] rounded-2xl border border-[var(--accent-primary)]/20 backdrop-blur-md p-6 space-y-6 shadow-2xl animate-fade-in custom-scrollbar responsive-form-container">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent-primary)]">✨</span>
                <h3 className="text-sm font-black font-mono text-[var(--text-primary)] uppercase tracking-widest">Édition du Profil</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setProfileModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              
              {/* INTERACTIVE PROFILE AVATAR ENHANCEMENT */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Photo de Profil</span>
                <div 
                  className="relative group cursor-pointer w-24 h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-500 via-[var(--accent-primary)] to-emerald-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[var(--accent-primary)]/20"
                  onClick={() => document.getElementById('profile-avatar-upload-input')?.click()}
                  title="Modifier votre photo de profil"
                >
                  <div className="w-full h-full rounded-full bg-[var(--bg-primary)] flex items-center justify-center relative overflow-hidden">
                    {profileAvatar ? (
                      <>
                        <img 
                          src={profileAvatar} 
                          alt="Avatar" 
                          className="w-full h-full object-cover rounded-full"
                         
                        />
                        <div className="absolute inset-0 bg-[var(--bg-primary)]/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[var(--text-primary)] transition-opacity duration-200">
                           <Camera size={18} className="text-[var(--text-primary)] mb-0.5" />
                           <span className="text-[8px] font-bold uppercase tracking-wider">Modifier</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <DefaultLogoAvatar className="w-full h-full" />
                        <div className="absolute inset-0 bg-[var(--bg-primary)]/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[var(--text-primary)] transition-opacity duration-200">
                          <Camera size={18} className="text-[var(--text-primary)] mb-0.5" />
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">Uploader</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Plus badge */}
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 rounded-full bg-[var(--accent-primary)] items-center justify-center border-2 border-[var(--bg-primary)] text-black font-bold text-[9px]">
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Pays / Devise région</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none font-sans">
                    <Globe size={14} />
                  </span>
                  <input
                    type="text"
                    value={profileCountry}
                    onChange={(e) => setProfileCountry(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40 font-mono"
                    placeholder="Ex: FR"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-wide block">Devise de la plateforme (P&L)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 pointer-events-none font-mono text-xs font-bold text-[var(--accent-primary)]">
                    {profileCurrency === 'EUR' ? '€' : profileCurrency === 'GBP' ? '£' : '$'}
                  </span>
                  <select
                    value={profileCurrency}
                    onChange={(e) => setProfileCurrency(e.target.value as 'USD' | 'EUR' | 'GBP')}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40 appearance-none cursor-pointer font-sans"
                  >
                    <option value="USD" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">USD ($ - Dollar Américain)</option>
                    <option value="EUR" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">EUR (€ - Euro)</option>
                    <option value="GBP" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">GBP (£ - Livre Sterling)</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 pointer-events-none text-[9px]">▼</span>
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40 font-mono"
                    placeholder="Saisissez votre ancien mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileOldPassword(!showProfileOldPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showProfileOldPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-wide block">Nouveau Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileNewPassword ? "text" : "password"}
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40 font-mono"
                    placeholder="Nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileNewPassword(!showProfileNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-[var(--text-primary)] transition-colors"
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-primary)]/40 font-mono"
                    placeholder="Confirmez"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfileConfirmPassword(!showProfileConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showProfileConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* GOOGLE INTEGRATION SECTION */}
              {currentUser && (
                <div className="pt-4 border-t border-white/5 space-y-2.5">
                  <span className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-wider block">Liaison Google</span>
                  
                  {currentUser.google_linked ? (
                    <div className="p-3 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse"></span>
                          <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider font-mono">Compte Lié à Google</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          E-mail : <span className="font-mono text-zinc-350 font-semibold">{currentUser.google_email || currentUser.email}</span>
                        </p>
                      </div>
                      <span className="text-[var(--accent-primary)] text-sm">✅</span>
                    </div>
                  ) : (
                    <div className="p-3 bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/10 rounded-xl space-y-2">
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
                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-[var(--text-primary)] border border-white/10 hover:border-white/20 rounded-lg text-[10px] font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                  disabled={isSavingProfile}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] disabled:bg-slate-800 disabled:text-slate-500 text-black rounded-xl text-xs font-bold transition-all font-mono tracking-wide flex items-center justify-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-900 border-t-black rounded-full animate-spin" />
                      Sauvegarde...
                    </>
                  ) : "Enregistrer"}
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
            
            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-5 shrink-0 border-4 border-slate-900 shadow-[0_0_20px_rgba(0,255,156,0.1)]">
              <span className="text-2xl animate-bounce">🚀</span>
            </div>

            <h3 className="text-xl font-bold font-sans text-[var(--text-primary)] mb-2 tracking-tight">Bienvenue sur TradeVault !</h3>
            
            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed px-2">
              Votre accès est correctement configuré. Préparez-vous à tracker vos trades, analyser vos setups et gérer votre capital Propfirm de manière organisée.
            </p>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-[var(--accent-primary)]/10 active:scale-[0.98]"
            >
              🚀 Let's Go
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM DIALOG MODAL (REPLACING native window.alert/window.confirm) */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--bg-secondary)] border border-[var(--accent-primary)]/20 rounded-2xl p-6 w-full max-w-sm relative animate-scale-in flex flex-col space-y-4 shadow-2xl">
            
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <span className="text-xl">
                {dialogState.isConfirm ? '❓' : '🚨'}
              </span>
              <h3 className="text-sm font-black font-sans text-[var(--accent-primary)] uppercase tracking-wider">
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
                    className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 text-xs hover:bg-slate-900/60 font-semibold transition-all hover:text-[var(--text-primary)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dialogState.onConfirm) dialogState.onConfirm();
                      setDialogState(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-[var(--accent-primary)]/10 active:scale-[0.98]"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black rounded-xl text-xs font-bold transition-all text-center shadow-md hover:shadow-[var(--accent-primary)]/10 active:scale-[0.98]"
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
