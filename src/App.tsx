import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';
import { User, Trade, Challenge, Account, PaymentRequest } from './types';
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
  ensureUUID,
  generateUUID
} from './utils/supabaseSync';

// Subcomponents
import CustomEffects from './components/CustomEffects';
import Portal from './components/Portal';
import Checkout from './components/Checkout';
import Dashboard from './components/Dashboard';
import Journal from './components/Journal';
import Calendar from './components/Calendar';
import Stats from './components/Stats';
import { BackgroundVideo } from './components/BackgroundVideo';
import Challenges from './components/Challenges';
import Admin from './components/Admin';
import Logo, { DefaultLogoAvatar } from './components/Logo';
import { envoyerEmail } from './utils/emailService';


export default function App() {
  const { lang, toggleLang, t } = useThemeLang();
  // Load initial persistent lists or fallback to seeded mock data
  const [users, setUsers] = useState<User[]>(() => {
    // One-time hard reset to give the user a completely brand-new slate with only the admin account
    if (!localStorage.getItem('tv_reset_to_zero_v3')) {
      localStorage.setItem('tv_users', JSON.stringify(DEFAULT_USERS));
      localStorage.setItem('tv_trades', JSON.stringify(DEFAULT_TRADES));
      localStorage.setItem('tv_challenges', JSON.stringify(DEFAULT_CHALLENGES));
      localStorage.setItem('tv_accounts', JSON.stringify(DEFAULT_ACCOUNTS));
      localStorage.setItem('tv_payment_requests', JSON.stringify([]));
      localStorage.setItem('tv_selected_account_id', 'personal');
      sessionStorage.removeItem('tv_current_user');
      localStorage.setItem('tv_reset_to_zero_v3', 'true');
      return DEFAULT_USERS;
    }
    const saved = localStorage.getItem('tv_users');
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
    const saved = sessionStorage.getItem('tv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

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
    const savedUser = sessionStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const isAdmin = u.email === 'admin@tradevault.com' || u.username === 'admin';
      const saved = localStorage.getItem(`tv_trades_${u.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Trade[];
        if (!isAdmin && parsed.some(t => t.id === 't1' || t.id === 't2' || t.id === 't3')) {
          return [];
        }
        return parsed;
      }
      return [];
    }
    const saved = localStorage.getItem('tv_trades');
    return saved ? JSON.parse(saved) : DEFAULT_TRADES;
  });

  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const savedUser = sessionStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const saved = localStorage.getItem(`tv_challenges_${u.id}`);
      if (saved) return JSON.parse(saved);
      return [
        {
          id: 'ftmo-100k-challenge',
          accountId: 'ftmo-100k',
          name: 'Compte FTMO 100k',
          capital: 100000,
          target: 8,
          dailyLoss: 5,
          globalLoss: 10,
          createdAt: new Date().toISOString()
        }
      ];
    }
    const saved = localStorage.getItem('tv_challenges');
    return saved ? JSON.parse(saved) : DEFAULT_CHALLENGES;
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const savedUser = sessionStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const saved = localStorage.getItem(`tv_accounts_${u.id}`);
      if (saved) {
        return JSON.parse(saved);
      }
      // Fallback: both accounts by default for newly created / registered user
      const freshAccounts: Account[] = [
        { id: 'personal', name: 'Compte Personnel', type: 'personal' },
        { id: 'ftmo-100k', name: 'Compte FTMO 100k', type: 'propfirm', capital: 100000, target: 8, dailyLoss: 5, globalLoss: 10 }
      ];
      localStorage.setItem(`tv_accounts_${u.id}`, JSON.stringify(freshAccounts));
      return freshAccounts;
    }
    const saved = localStorage.getItem('tv_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 'personal', name: 'Compte Personnel', type: 'personal' },
      { id: 'ftmo-100k', name: 'Compte FTMO 100k', type: 'propfirm', capital: 100000, target: 8, dailyLoss: 5, globalLoss: 10 }
    ];
  });

  const [adminEmails, setAdminEmails] = useState<string>(() => {
    return localStorage.getItem('tv_admin_emails') || 'igorrose2003@gmail.com,toshirohitsugayaonyx@gmail.com';
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

  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => {
    const saved = localStorage.getItem('tv_payment_requests');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentScreen, setCurrentScreen] = useState<'login_portal' | 'checkout' | 'app'>(() => {
    const userSaved = sessionStorage.getItem('tv_current_user');
    if (!userSaved) return 'login_portal';
    const user: User = JSON.parse(userSaved);
    return user.paid ? 'app' : 'checkout';
  });

  const [activeTab, setActiveTab ] = useState<'dashboard' | 'journal' | 'calendar' | 'stats' | 'challenges' | 'admin'>('dashboard');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    const savedUser = sessionStorage.getItem('tv_current_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      const isAdmin = u.email === 'admin@tradevault.com' || u.username === 'admin';
      const saved = localStorage.getItem(`tv_selected_account_id_${u.id}`);
      if (saved) {
        if (!isAdmin && saved === 'ftmo-100k') return 'personal';
        return saved;
      }
      return 'personal';
    }
    const saved = localStorage.getItem('tv_selected_account_id');
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
    setProfileAvatar(currentUser.avatar || null);
    
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
      avatar: profileAvatar || undefined,
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

  // Trigger LocalStorage sync on change
  useEffect(() => {
    localStorage.setItem('tv_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`tv_trades_${currentUser.id}`, JSON.stringify(trades));
    }
    localStorage.setItem('tv_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`tv_challenges_${currentUser.id}`, JSON.stringify(challenges));
    }
    localStorage.setItem('tv_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`tv_accounts_${currentUser.id}`, JSON.stringify(accounts));
    }
    localStorage.setItem('tv_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('tv_admin_emails', adminEmails);
  }, [adminEmails]);

  useEffect(() => {
    localStorage.setItem('tv_payment_requests', JSON.stringify(paymentRequests));
  }, [paymentRequests]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('tv_current_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('tv_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`tv_selected_account_id_${currentUser.id}`, selectedAccountId);
    }
    localStorage.setItem('tv_selected_account_id', selectedAccountId);
  }, [selectedAccountId]);

  // Sync workspace dynamically when user logs in & load data from Supabase
  useEffect(() => {
    if (currentUser) {
      const uId = currentUser.id;
      const isAdmin = currentUser.email === 'admin@tradevault.com' || currentUser.username === 'admin';

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
              
              const savedSelAcc = localStorage.getItem(`tv_selected_account_id_${uId}`);
              // If the current saved ID is a default name like "personal", map it to our standardized UUID
              const mappedSelAcc = (savedSelAcc === 'personal' || !savedSelAcc) 
                ? ensureUUID('personal') 
                : ensureUUID(savedSelAcc);
              
              setSelectedAccountId(mappedSelAcc);
            })
            .catch(err => {
              console.error("Supabase user data load failed. Falling back to local cache:", err);
              // Local storage fallback for maximum resilience
              let savedTradesRaw = localStorage.getItem(`tv_trades_${uId}`);
              let savedChallengesRaw = localStorage.getItem(`tv_challenges_${uId}`);
              let savedAccsRaw = localStorage.getItem(`tv_accounts_${uId}`);
              let savedSelAcc = localStorage.getItem(`tv_selected_account_id_${uId}`);

              let initialTrades = savedTradesRaw ? JSON.parse(savedTradesRaw) : [];
              let initialChallenges = savedChallengesRaw ? JSON.parse(savedChallengesRaw) : [
                {
                  id: ensureUUID('ftmo-100k-challenge'),
                  accountId: ensureUUID('ftmo-100k'),
                  name: 'Compte FTMO 100k',
                  capital: 100000,
                  target: 8,
                  dailyLoss: 5,
                  globalLoss: 10,
                  createdAt: new Date().toISOString()
                }
              ];
              let initialAccounts = savedAccsRaw ? JSON.parse(savedAccsRaw) : [
                { id: ensureUUID('personal'), name: 'Compte Personnel', type: 'personal' },
                { id: ensureUUID('ftmo-100k'), name: 'Compte FTMO 100k', type: 'propfirm', capital: 100000, target: 8, dailyLoss: 5, globalLoss: 10 }
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

  const handleResetPasswordSuccess = (email: string, newPass: string) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { ...u, password: newPass };
        }
        return u;
      });
      localStorage.setItem('tv_users', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCheckoutSuccess = (proofBase64: string, network: 'TRC20' | 'BEP20') => {
    if (!currentUser) return;
    
    console.log(`%c[SYS_PAYMENT_PROOF_SENT] : Preuve de paiement de ${currentUser.username} envoyée à l'admin pour renouvellement anticipé.`, "color: #ff9f1c; font-weight: bold;");
    
    const paymentId = 'pay_' + Date.now();
    const newRequest: PaymentRequest = {
      id: paymentId,
      userId: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      amount: subscriptionPrice,
      network: network,
      proofScreenshot: proofBase64,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setPaymentRequests(prev => [...prev, newRequest]);
    
    // Asynchronously dispatch the email notification to admin via backend API
    envoyerEmail('withdrawal_request', { 
      email: currentUser.email, 
      username: currentUser.username, 
      amount: subscriptionPrice, 
      network: network 
    }, proofBase64);

    setCurrentScreen('app');
    setActiveTab('dashboard');
    customAlert("Paiement Transmis", `Preuve de versement USDT transmise avec succès !\n\nL'administrateur a été instantanément notifié de votre demande de renouvellement par e-mail. Vos accès Premium seront mis à jour (prolongation de 30 jours) dès validation manuelle.`);

    import('./utils/notificationService').then(({ sendPushNotification }) => {
      sendPushNotification(
        `Renouvellement en attente ⏳`,
        `Preuve transmise avec succès pour validation. L'administrateur valide votre compte sous peu.`,
        'payment'
      );
    });
  };

  const handleCheckoutCancel = () => {
    setCurrentScreen('app');
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
    console.log("Deleting account with ID:", id);
    if (id === ensureUUID('personal') || id === ensureUUID('ftmo-100k') || id === 'personal' || id === 'ftmo-100k') {
      customAlert("Action Non Autorisée", "La suppression du compte personnel et du compte FTMO par défaut n'est pas autorisée.");
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    setChallenges(prev => prev.filter(c => c.accountId !== id));
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
  const handleApproveUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    const now = new Date();
    const expiry = new Date();
    expiry.setDate(now.getDate() + 90); // 3 mois d'accès
    const expiryStr = expiry.toISOString();

    const approved: User = {
      ...target,
      status: 'approved',
      paid: true,
      paidUntil: expiryStr
    };
    setUsers(prev => prev.map(u => u.id === userId ? approved : u));

    // Update profile in Supabase
    syncUserProfile(approved);

    // Send triggered Welcome Email via Resend Client-Server flow
    envoyerEmail('approve_user', { email: target.email, username: target.username });

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
    setUsers(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, status: 'rejected' as const } : u);
      const target = updated.find(u => u.id === userId);
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
    const targetUser = users.find(u => u.id === req.userId);
    if (!targetUser) return;

    let baseDate = new Date();
    if (targetUser.paid && targetUser.paidUntil) {
      const currExpiry = new Date(targetUser.paidUntil);
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
      paidUntil: expiryStr
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

    // Send confirmation email via Resend
    envoyerEmail('renewal_confirm', { email: targetUser.email, username: targetUser.username });
  };

  const handleRejectRenewal = (payId: string) => {
    setPaymentRequests(prev => {
      const updated = prev.map(r => r.id === payId ? { ...r, status: 'rejected' as const } : r);
      const req = updated.find(r => r.id === payId);
      if (req) {
        savePaymentToSupabase(req.userId, req);
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
      console.log('Daily checker (Cron) trigger success:', data);
    })
    .catch(err => {
      console.error('Failed to execute simulated cron check:', err);
    });
  };

  // Add account helper
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    const accId = generateUUID();
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
    if (currentUser) {
      saveAccountToSupabase(currentUser.id, newAcc);
    }

    // If type is prop firm challenge, automatically seed a corresponding Challenge object
    if (newAccType === 'propfirm') {
      const newCh: Challenge = {
        id: generateUUID(),
        accountId: accId,
        name: newAccName.trim(),
        capital: parseFloat(newAccCapital) || 100000,
        target: parseFloat(newAccTarget) || 8,
        dailyLoss: parseFloat(newAccDailyLoss) || 5,
        globalLoss: parseFloat(newAccGlobalLoss) || 10,
        createdAt: new Date().toISOString()
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
          adminEmails={adminEmails}
          onResetPasswordSuccess={handleResetPasswordSuccess}
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
        <div className="flex-1 flex flex-col lg:flex-row min-h-screen relative z-0">
          
          {/* YOUTUBE BACKGROUND LOOP */}
          <BackgroundVideo />
          
          {/* Navigation Sidebar panel */}
          <aside className="w-full lg:w-64 bg-slate-950/80 backdrop-blur-xl border-r border-[#1e293b]/70 flex flex-col justify-between p-5 lg:sticky lg:top-0 lg:h-screen shrink-0 relative z-30">
            <div className="space-y-6">
              
              {/* Brand Logo and Name */}
              <div className="flex items-center px-1 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl font-black font-display tracking-tight text-white drop-shadow-[0_0_15px_rgba(0,168,107,0.4)]">TRADE<span className="text-[#00FF9C]">VAULT</span></h2>
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
                        onClick={() => { customConfirm('Supprimer Portefeuille', 'Supprimer ce portefeuille et toutes ses données associées ?', () => handleDeleteAccount(selectedAccountId)); }}
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
              {!isAdmin && currentUser?.paidUntil && (() => {
                const daysLeft = Math.max(0, Math.ceil((new Date(currentUser.paidUntil).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
                const isNearingExpiry = daysLeft <= 7;
                return (
                  <div className={`${isNearingExpiry ? 'bg-rose-900/20 border-rose-500/40 text-rose-300' : 'bg-indigo-900/20 border-indigo-500/20 text-indigo-300'} border p-3 rounded-xl flex flex-col gap-2`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${isNearingExpiry ? 'text-rose-400' : 'text-indigo-400'}`}>
                          Accès PRO {isNearingExpiry && '⚠️'}
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium font-sans">
                          Jours restants : <strong className={`font-mono text-xs ml-1 ${isNearingExpiry ? 'text-rose-400' : 'text-white'}`}>
                            {daysLeft}
                          </strong> / 90
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-inner overflow-hidden shrink-0 ${isNearingExpiry ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'}`}>
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
                          : 'bg-indigo-600/30 hover:bg-indigo-600/50 border-indigo-500/30 text-indigo-300'
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
                paymentRequests={paymentRequests}
                onApproveRenewal={handleApproveRenewal}
                onRejectRenewal={handleRejectRenewal}
                onCheckCronRenewals={handleCheckCronRenewals}
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
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wide block">Ancien Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileOldPassword ? "text" : "password"}
                    value={profileOldPassword}
                    onChange={(e) => setProfileOldPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
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
                <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide block">Nouveau Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileNewPassword ? "text" : "password"}
                    value={profileNewPassword}
                    onChange={(e) => setProfileNewPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
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
                <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wide block">Confirmer Nouveau Mot de Passe</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showProfileConfirmPassword ? "text" : "password"}
                    value={profileConfirmPassword}
                    onChange={(e) => setProfileConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
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

      {/* CUSTOM DIALOG MODAL (REPLACING native window.alert/window.confirm) */}
      {dialogState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0b1026] border border-indigo-500/20 rounded-2xl p-6 w-full max-w-sm relative animate-scale-in flex flex-col space-y-4 shadow-2xl">
            
            <div className="flex items-center gap-3 border-b border-indigo-950/40 pb-3">
              <span className="text-xl">
                {dialogState.isConfirm ? '❓' : '🚨'}
              </span>
              <h3 className="text-sm font-black font-sans text-white uppercase tracking-wider">
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
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/10 active:scale-[0.98]"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold transition-all text-center shadow-md hover:shadow-indigo-500/10 active:scale-[0.98]"
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
  );
}
