import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Trash2
} from 'lucide-react';
import { User, Trade, Challenge, Account } from './types';
import { 
  DEFAULT_USERS, 
  DEFAULT_TRADES, 
  DEFAULT_CHALLENGES, 
  DEFAULT_ACCOUNTS 
} from './utils/mockData';

// Subcomponents
import Portal from './components/Portal';
import Checkout from './components/Checkout';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import Calendar from './components/Calendar';
import Stats from './components/Stats';
import Challenges from './components/Challenges';
import Admin from './components/Admin';
import Logo, { DefaultLogoAvatar } from './components/Logo';


export default function App() {
  // Load initial persistent lists or fallback to seeded mock data
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('tv_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem('tv_trades');
    return saved ? JSON.parse(saved) : DEFAULT_TRADES;
  });

  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem('tv_challenges');
    return saved ? JSON.parse(saved) : DEFAULT_CHALLENGES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('tv_accounts');
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });

  const [adminEmails, setAdminEmails] = useState<string>(() => {
    return localStorage.getItem('tv_admin_emails') || 'admin@tradevault.com';
  });

  const [adminWalletTRC20, setAdminWalletTRC20] = useState<string>(() => {
    return localStorage.getItem('tv_admin_wallet_trc20') || 'TN2YxKp9vR3mHqL7bF8cD2eA5wJ6sT4uV';
  });

  const [adminWalletBEP20, setAdminWalletBEP20] = useState<string>(() => {
    return localStorage.getItem('tv_admin_wallet_bep20') || '0x7a3B5c9D2eF1a4B6c8D0e2F4a6B8c0D2e4F6a8B0';
  });

  const [subscriptionPrice, setSubscriptionPrice] = useState<number>(() => {
    const saved = localStorage.getItem('tv_subscription_price');
    return saved ? parseFloat(saved) : 30;
  });

  const [subscriptionPeriod, setSubscriptionPeriod] = useState<number>(() => {
    const saved = localStorage.getItem('tv_subscription_period');
    return saved ? parseInt(saved, 10) : 3;
  });

  // Current session navigation states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('tv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentScreen, setCurrentScreen] = useState<'login_portal' | 'checkout' | 'app'>(() => {
    const userSaved = sessionStorage.getItem('tv_current_user');
    if (!userSaved) return 'login_portal';
    const user: User = JSON.parse(userSaved);
    return user.paid ? 'app' : 'checkout';
  });

  const [activeTab, setActiveTab ] = useState<'dashboard' | 'journal' | 'calendar' | 'stats' | 'challenges' | 'admin'>('dashboard');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const saved = localStorage.getItem('tv_selected_account_id');
    return saved || 'personal';
  });

  const [addAccountOpen, setAddAccountOpen] = useState(false);

  // User Profile customized states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileCountry, setProfileCountry] = useState('FR');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profilePassword, setProfilePassword] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const openProfileModal = () => {
    if (!currentUser) return;
    setProfileUsername(currentUser.username || '');
    setProfileCountry(currentUser.country || 'FR');
    setProfileAvatar(currentUser.avatar || null);
    setProfilePassword(currentUser.password || '');
    setShowProfilePassword(false);
    setProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!profileUsername.trim()) return;

    const updatedUser: User = {
      ...currentUser,
      username: profileUsername.trim(),
      country: profileCountry,
      avatar: profileAvatar || undefined,
      password: profilePassword.trim() || currentUser.password
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
        alert('Fichier image uniquement (.png, .jpg)');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        alert('Fichier trop lourd (max 3Mo)');
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

  // Trigger LocalStorage sync on change
  useEffect(() => {
    localStorage.setItem('tv_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('tv_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('tv_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('tv_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('tv_admin_emails', adminEmails);
  }, [adminEmails]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('tv_current_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('tv_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('tv_selected_account_id', selectedAccountId);
  }, [selectedAccountId]);

  // Session handler actions
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.paid) {
      setCurrentScreen('app');
      if (user.email === 'admin@tradevault.com' || user.username === 'admin') {
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
    console.log(`%c[SYS_DAEMON_ALERT_MAIL] : E-mail d'alerte envoyé avec succès à la liste d'Admin : "${adminEmails}"`, "color: #ff9f1c; font-weight: bold;");
    console.log(`%c[SYS_RECORD_NEW_TRADER] : Détails Trader : ${newUser.username} (${newUser.email}) - En attente de validation manuelle.`, "color: #6366f1;");
  };

  const handleCheckoutSuccess = (proofBase64: string, network: 'TRC20' | 'BEP20') => {
    if (!currentUser) return;
    
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 90); // 3 Month renewal cycle

    const updatedUser: User = {
      ...currentUser,
      paid: true,
      paidUntil: expiry.toISOString(),
      status: 'approved'
    };

    // Update inside stored list
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    setCurrentScreen('app');
    setActiveTab('dashboard');
    setShowWelcomeModal(true);

    // Trigger checkout success push notification
    import('./utils/notificationService').then(({ sendPushNotification }) => {
      sendPushNotification(
        `Abonnement Validé ! 💎`,
        `Félicitations ! Votre abonnement de $30 USDT est validé. Votre accès trimestriel (3 mois) est désormais actif.`,
        'payment'
      );
    });
  };

  const handleCheckoutCancel = () => {
    setCurrentUser(null);
    setCurrentScreen('login_portal');
  };

  // Switch accounts list
  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0] || { id: 'personal', name: 'Compte Personnel', type: 'personal' };
  
  // Filter trades correspond with currently selected active account
  const activeAccountTrades = trades.filter(t => t.accountId === selectedAccountId);

  // Stats calculation
  const totalAccountPnl = activeAccountTrades.reduce((sum, t) => sum + t.pnl, 0);

  // Trade CRUD
  const handleAddTrade = (newTrade: Trade) => {
    setTrades(prev => [...prev, newTrade]);
  };

  const handleEditTrade = (id: string, updated: Partial<Trade>) => {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
  };

  const handleDeleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  // Persist accounts and challenges to localStorage
  useEffect(() => {
    localStorage.setItem('tv_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('tv_challenges', JSON.stringify(challenges));
  }, [challenges]);

  // Prop firm challenge CRUD
  const handleAddChallenge = (newCh: Challenge) => {
    setChallenges(prev => [...prev, newCh]);
  };

  const handleDeleteAccount = (id: string) => {
    console.log("Deleting account with ID:", id);
    if (id === 'personal' || id === 'ftmo-100k') {
      alert("La suppression du compte personnel et du compte FTMO par défaut n'est pas autorisée.");
      return;
    }

    // Filter accounts
    const updatedAccounts = accounts.filter(a => a.id !== id);
    if (updatedAccounts.length === 0) return;

    setAccounts(updatedAccounts);
    setChallenges(prev => prev.filter(c => c.accountId !== id));

    // Re-select another account if deleting active
    if (selectedAccountId === id) {
      const nextId = updatedAccounts[0].id;
      setSelectedAccountId(nextId);
      localStorage.setItem('tv_selected_account_id', nextId);
    }
  };

  const handleDeleteChallenge = (id: string) => {
    if (id === 'ftmo-100k-challenge') {
      alert("La suppression du challenge FTMO par défaut n'est pas autorisée.");
      return;
    }
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  // Admin CRUD
  const handleApproveUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 90); // 3 mois d'accès

    const approved: User = {
      ...target,
      status: 'approved',
      paid: true,
      paidUntil: expiry.toISOString()
    };
    setUsers(prev => prev.map(u => u.id === userId ? approved : u));

    // Trigger success notification via background service
    import('./utils/notificationService').then(({ sendPushNotification }) => {
      sendPushNotification(
        `Membre Approuvé ! 🎉`,
        `L’accès TradeVault de ${target.username} (${target.email}) est validé avec succès ! Abonnement trimestriel activé.`,
        'payment'
      );
    });
  };

  const handleRejectUser = (userId: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'rejected' } : u));
  };

  // Add account helper
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const accId = 'acc_' + Date.now();
    const newAcc: Account = {
      id: accId,
      name: newAccName.trim(),
      type: newAccType,
      capital: newAccType === 'propfirm' ? parseFloat(newAccCapital) : undefined,
      target: newAccType === 'propfirm' ? parseFloat(newAccTarget) : undefined,
      dailyLoss: newAccType === 'propfirm' ? parseFloat(newAccDailyLoss) : undefined,
      globalLoss: newAccType === 'propfirm' ? parseFloat(newAccGlobalLoss) : undefined
    };

    setAccounts(prev => [...prev, newAcc]);

    // If type is prop firm challenge, automatically seed a corresponding Challenge object
    if (newAccType === 'propfirm') {
      const newCh: Challenge = {
        id: 'ch_' + Date.now(),
        accountId: accId,
        name: newAccName.trim(),
        capital: parseFloat(newAccCapital) || 100000,
        target: parseFloat(newAccTarget) || 8,
        dailyLoss: parseFloat(newAccDailyLoss) || 5,
        globalLoss: parseFloat(newAccGlobalLoss) || 10,
        createdAt: new Date().toISOString()
      };
      setChallenges(prev => [...prev, newCh]);
    }

    setSelectedAccountId(accId);
    setAddAccountOpen(false);
    setNewAccName('');
  };

  // Check if current user is of Admin role
  const isAdmin = currentUser && (
    adminEmails.toLowerCase().split(',').map(e => e.trim()).includes(currentUser.email.toLowerCase()) || 
    currentUser.email === 'admin@tradevault.com'
  );

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* 1. PORTAL PAGE SCREEN */}
      {currentScreen === 'login_portal' && (
        <Portal 
          onLoginSuccess={handleLoginSuccess} 
          users={users} 
          onRegisterPending={handleRegisterPending} 
          adminWalletTRC20={adminWalletTRC20}
          adminWalletBEP20={adminWalletBEP20}
          subscriptionPrice={subscriptionPrice}
          subscriptionPeriod={subscriptionPeriod}
        />
      )}

      {/* 2. CHECKOUT SCREEN */}
      {currentScreen === 'checkout' && currentUser && (
        <Checkout 
          user={currentUser} 
          onPaymentSuccess={handleCheckoutSuccess} 
          onCancel={handleCheckoutCancel} 
          adminWalletTRC20={adminWalletTRC20}
          adminWalletBEP20={adminWalletBEP20}
          subscriptionPrice={subscriptionPrice}
          subscriptionPeriod={subscriptionPeriod}
        />
      )}

      {/* 3. APPLICATION WORKSPACE SCREEN */}
      {currentScreen === 'app' && currentUser && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
          
          {/* Navigation Sidebar panel */}
          <aside className="w-full lg:w-64 bg-slate-950 border-r border-[#1e293b]/70 flex flex-col justify-between p-5 lg:sticky lg:top-0 lg:h-screen shrink-0 relative z-30">
            <div className="space-y-6">
              
              {/* Brand Logo and Name */}
              <div className="flex items-center gap-2.5 px-1 border-b border-indigo-950/40 pb-4">
                <DefaultLogoAvatar className="w-8 h-8 ring-2 ring-indigo-505/20 border border-indigo-500/30" />
                <div>
                  <h2 className="text-sm font-black font-mono tracking-widest text-white">TRADE<span className="text-indigo-400">VAULT</span></h2>
                  <span className="text-[9px] text-[#475569] block tracking-wider uppercase font-semibold">Track log PRO v1.2</span>
                </div>
              </div>

              {/* ACCOUNT SWITCHER SELECTOR */}
              {!isAdmin && (
                <div className="bg-slate-900/60 p-3 rounded-xl border border-indigo-950/40 space-y-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">PORTEFEUILLE ACTIF</span>
                  <div className="flex gap-1.5 items-center">
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="flex-1 bg-slate-950 border border-[#1e293b] min-w-0 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold truncate"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                    {/* Add account button removed as per user request */}
                    {accounts.length > 1 && selectedAccountId !== 'personal' && selectedAccountId !== 'ftmo-100k' && (
                      <button
                        type="button"
                        onClick={() => { if (confirm('Supprimer ce portefeuille et toutes ses données associées ?')) handleDeleteAccount(selectedAccountId); }}
                        className="w-7 h-7 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 flex items-center justify-center rounded-lg shadow shrink-0 text-xs font-bold"
                        title="Supprimer le portefeuille actif"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SUBSCRIPTION COUNTDOWN (90 DAYS) */}
              {!isAdmin && currentUser?.paidUntil && (
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block mb-0.5">Accès PRO</span>
                    <span className="text-[10px] text-slate-300 font-medium font-sans">
                      Jours restants : <strong className="text-white font-mono text-xs ml-1">
                        {Math.max(0, Math.ceil((new Date(currentUser.paidUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))}
                      </strong> / 90
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 shadow-inner overflow-hidden shrink-0">
                     <span className="text-[10px] font-black text-indigo-300 font-mono">
                      {Math.max(0, Math.ceil((new Date(currentUser.paidUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24)))}
                     </span>
                  </div>
                </div>
              )}

              {/* Main sidebar menus */}
              <nav className="space-y-1 font-mono text-xs">
                
                {!isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-slate-900 transition-all font-semibold ${
                        activeTab === 'dashboard' ? 'bg-indigo-600 text-white hover:bg-indigo-600 shadow' : ''
                      }`}
                    >
                      <Grid size={15} /> Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('journal')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-slate-900 transition-all font-semibold ${
                        activeTab === 'journal' ? 'bg-indigo-600 text-white hover:bg-indigo-600 shadow' : ''
                      }`}
                    >
                      <FileText size={15} /> Journal Trading
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('calendar')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-slate-900 transition-all font-semibold ${
                        activeTab === 'calendar' ? 'bg-indigo-600 text-white hover:bg-indigo-600 shadow' : ''
                      }`}
                    >
                      <CalendarIcon size={15} /> Calendrier Mensuel
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('stats')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-slate-900 transition-all font-semibold ${
                        activeTab === 'stats' ? 'bg-indigo-600 text-white hover:bg-indigo-600 shadow' : ''
                      }`}
                    >
                      <TrendingUp size={15} /> Statistiques
                    </button>
                    {accounts.some(acc => acc.type === 'propfirm') && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('challenges')}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-slate-900 transition-all font-semibold ${
                          activeTab === 'challenges' ? 'bg-indigo-600 text-white hover:bg-indigo-600 shadow' : ''
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-slate-900 transition-all font-semibold border border-indigo-900/40 mt-6 ${
                      activeTab === 'admin' ? 'bg-indigo-600 text-white hover:bg-indigo-600 shadow' : 'bg-indigo-950/20'
                    }`}
                  >
                    🛡️ Espace Admin
                  </button>
                )}

              </nav>
            </div>

            <div className="pt-6 border-t border-slate-900 mt-6 md:mt-0 space-y-4">
              
              {/* Active user tag detail */}
              <div 
                onClick={openProfileModal}
                className="flex gap-2.5 items-center px-2 py-1.5 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-indigo-950/20 active:scale-[0.98] transition-all cursor-pointer group"
                title="Modifier mon profil"
              >
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.username} 
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 transition-all shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <DefaultLogoAvatar className="w-8 h-8 ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 transition-all" />
                )}
                <div className="overflow-hidden flex-1">
                  <span className="text-xs font-bold text-white block leading-none truncate mb-1 group-hover:text-indigo-400 transition-colors">
                    {currentUser.username || 'Utilisateur'}
                  </span>
                  <span className="text-[9px] text-[#475569] block font-mono truncate leading-none">
                    {currentUser.email}
                  </span>
                </div>
                {/* Visual click-to-edit indicator */}
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  setCurrentScreen('login_portal');
                  sessionStorage.removeItem('tv_current_user');
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
                  {activeTab === 'stats' ? 'Statistiques de Trading' : 
                   activeTab === 'challenges' ? 'Tracker Propfirm Challenge' : 
                   activeTab === 'admin' ? 'Administration TradeVault' : 
                   activeTab === 'calendar' ? 'Calendrier Mensuel' : 
                   activeTab === 'journal' ? 'Journal de Trading' : 'Tableau de bord'}
                </h1>
                {!isAdmin && <p className="text-xs text-slate-400 mt-1">Données filtrées pour : <span className="text-indigo-400 font-bold font-mono">{activeAccount.name}</span></p>}
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
              <Journal 
                trades={activeAccountTrades} 
                onAddTrade={handleAddTrade} 
                onEditTrade={handleEditTrade} 
                onDeleteTrade={handleDeleteTrade} 
                activeAccount={activeAccount} 
              />
            )}

            {activeTab === 'calendar' && (
              <Calendar trades={activeAccountTrades} />
            )}

            {activeTab === 'stats' && (
              <Stats 
                trades={activeAccountTrades} 
                onImportTrades={(imported) => setTrades(imported)} 
                onResetTrades={() => setTrades(prev => prev.filter(t => t.accountId !== selectedAccountId))} 
                activeAccount={activeAccount} 
              />
            )}

            {activeTab === 'challenges' && (
              <Challenges 
                challenges={challenges} 
                trades={activeAccountTrades} 
                onAddChallenge={handleAddChallenge} 
                onDeleteChallenge={handleDeleteChallenge} 
                activeAccount={activeAccount} 
              />
            )}

            {activeTab === 'admin' && isAdmin && (
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
                  localStorage.setItem('tv_admin_wallet_trc20', trc);
                  setAdminWalletBEP20(bep);
                  localStorage.setItem('tv_admin_wallet_bep20', bep);
                  setSubscriptionPrice(price);
                  localStorage.setItem('tv_subscription_price', price.toString());
                  setSubscriptionPeriod(period);
                  localStorage.setItem('tv_subscription_period', period.toString());
                }}
              />
            )}

          </main>

        </div>
      )}

      {/* POPUP MODAL: ADD PORTFOLIO ACCOUNT */}
      {addAccountOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-950 rounded-2xl border border-indigo-500/30 p-6 space-y-4">
            
            <div className="flex justify-between items-center border-b border-indigo-900/10 pb-3">
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
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold font-sans">Type de tracker</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="personal">Compte Personnel Standard</option>
                  <option value="propfirm">Challenge Evaluation Propfirm</option>
                </select>
              </div>

              {newAccType === 'propfirm' && (
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
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
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
          <div className="max-w-md w-full bg-[#0a0f24] rounded-2xl border border-indigo-500/20 backdrop-blur-md p-6 space-y-6 shadow-2xl animate-fade-in">
            
            <div className="flex justify-between items-center border-b border-indigo-950/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-indigo-400">✨</span>
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
                  className="relative group cursor-pointer w-24 h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20"
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
                          <span className="text-[8px] font-bold uppercase tracking-widest text-indigo-300">Uploader</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Plus badge */}
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 rounded-full bg-indigo-600 items-center justify-center border-2 border-[#040611] text-white font-bold text-[9px]">
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
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wide block">Nom de trader *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <UserIcon size={14} />
                  </span>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-455 font-bold uppercase tracking-wide block">Pays / Devise région</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Globe size={14} />
                  </span>
                  <input
                    type="text"
                    value={profileCountry}
                    onChange={(e) => setProfileCountry(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="Ex: FR"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide block">Nouveau Mot de Passe *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfilePassword ? "text" : "password"}
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                    placeholder="Changer de mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowProfilePassword(!showProfilePassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white transition-colors"
                  >
                    {showProfilePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold transition-all"
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
          <div className="bg-slate-900 border border-[#1e293b] rounded-2xl p-6 w-full max-w-sm relative animate-scale-in flex flex-col items-center text-center">
            
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-5 shrink-0 border-4 border-slate-900 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <span className="text-2xl animate-bounce">🚀</span>
            </div>

            <h3 className="text-xl font-bold font-sans text-white mb-2 tracking-tight">Bienvenue sur TradeVault !</h3>
            
            <p className="text-xs text-slate-400 font-mono mb-6 leading-relaxed px-2">
              Votre accès est correctement configuré. Préparez-vous à tracker vos trades, analyser vos setups et gérer votre capital Propfirm de manière organisée.
            </p>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
            >
              🚀 Let's Go
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
