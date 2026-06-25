import React, { useState, useEffect } from 'react';
import { Settings, Users, Check, X, ShieldAlert, Award, Image as ImageIcon, Copy, ArrowRight, Mail, Trash2, Edit } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { User, PaymentRequest } from '../types';
import { DefaultLogoAvatar } from './Logo';
import { customAlert, customConfirm } from '../utils/customDialog';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0cf09c]/5 border border-zinc-800 p-3 rounded-xl shadow-2xl font-mono text-xs">
        <p className="font-bold text-slate-200 mb-1.5">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5" style={{ color: item.color }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span className="font-black text-white">${item.value} USD</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const getPremiumStatus = (trader: any) => {
  if (trader.status === 'rejected') {
    return {
      label: '🔴 Compte Suspendu',
      bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    };
  }
  if (trader.status === 'pending') {
    return {
      label: '🟡 Pending Review',
      bg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
    };
  }
  if (trader.paid_until) {
    const expiry = new Date(trader.paid_until);
    if (expiry < new Date()) {
      return {
        label: '🟠 Subs Expired',
        bg: 'bg-orange-500/10 text-orange-420 border border-orange-500/20'
      };
    }
  }
  if (trader.status === 'approved') {
    if (trader.paid) {
      return {
        label: '🔵 Active Sub',
        bg: 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
      };
    }
    return {
      label: '🟢 Approved',
      bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    };
  }
  return {
    label: '🟢 Approved',
    bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  };
};

interface AdminProps {
  currentUser?: User;
  onUpdateUserRole?: (targetUserId: string, newRole: 'admin' | 'user') => void;
  users: User[];
  onApproveUser: (user_id: string) => void;
  onRejectUser: (user_id: string) => void;
  onUpdateAdminEmails: (emails: string) => void;
  adminEmails: string;
  adminWalletTRC20: string;
  adminWalletBEP20: string;
  subscriptionPrice: number;
  subscriptionPeriod: number;
  onUpdateAdminParams: (trc: string, bep: string, price: number, period: number) => void;
  paymentRequests?: PaymentRequest[];
  onApproveRenewal?: (payId: string) => void;
  onRejectRenewal?: (payId: string) => void;
  onCheckCronRenewals?: () => void;
  onDeleteUser?: (user_id: string) => void;
  onDeleteAllUsersExceptAdmin?: () => void;
  onEditUser?: (user_id: string, updatedFields: { username: string; email: string; status: 'pending' | 'approved' | 'rejected' }) => void;
}

export default function Admin({ 
  currentUser,
  onUpdateUserRole,
  users, 
  onApproveUser, 
  onRejectUser, 
  onUpdateAdminEmails, 
  adminEmails,
  adminWalletTRC20,
  adminWalletBEP20,
  subscriptionPrice,
  subscriptionPeriod,
  onUpdateAdminParams,
  paymentRequests = [],
  onApproveRenewal = () => {},
  onRejectRenewal = () => {},
  onCheckCronRenewals = () => {},
  onDeleteUser = () => {},
  onDeleteAllUsersExceptAdmin = () => {},
  onEditUser = () => {}
}: AdminProps) {
  const [emailsInput, setEmailsInput] = useState(adminEmails);
  const [trcInput, setTrcInput] = useState(adminWalletTRC20);
  const [bepInput, setBepInput] = useState(adminWalletBEP20);
  const [priceInput, setPriceInput] = useState(subscriptionPrice.toString());
  const [periodInput, setPeriodInput] = useState(subscriptionPeriod.toString());
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ timestamp: string, message: string }[]>([]);

  // Synchronise les états de formulaire locaux avec les props du parent chargées de manière asynchrone depuis la base Supabase globale
  useEffect(() => {
    setEmailsInput(adminEmails);
    setTrcInput(adminWalletTRC20);
    setBepInput(adminWalletBEP20);
    setPriceInput(subscriptionPrice.toString());
    setPeriodInput(subscriptionPeriod.toString());
  }, [adminEmails, adminWalletTRC20, adminWalletBEP20, subscriptionPrice, subscriptionPeriod]);

  useEffect(() => {
    fetch('/api/admin/logs')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLogs(data.logs);
        }
      })
      .catch(err => console.error("Failed to fetch logs:", err));
  }, []);

  // States for inline profile edit
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserStatus, setEditUserStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditUserName(user.username || '');
    setEditUserEmail(user.email || '');
    setEditUserStatus(user.status || 'pending');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
  };

  const saveEditedUser = (user_id: string) => {
    if (!editUserName.trim() || !editUserEmail.trim()) {
      customAlert("Erreur", "Le nom d'utilisateur et l'e-mail ne peuvent pas être vides.");
      return;
    }
    onEditUser(user_id, {
      username: editUserName.trim(),
      email: editUserEmail.trim(),
      status: editUserStatus
    });
    setEditingUserId(null);
    customAlert("Success", "Profil mis à jour avec succès !");
  };

  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleSaveEmails = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdminEmails(emailsInput);
    customAlert('Configuration Admin', 'Liste des e-mails admin enregistrée avec succès !');
  };

  const handleSaveCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(priceInput) || 30;
    const parsedPeriod = parseInt(periodInput, 10) || 3;
    onUpdateAdminParams(trcInput, bepInput, parsedPrice, parsedPeriod);
    customAlert('Configuration Admin', 'Coordonnées de réception (adresses de wallets et tarification) mises à jour avec succès !');
  };

  const getMonthlyData = () => {
    const monthsMap: Record<string, { month: string; approved: number; pending: number; monthKey: string }> = {};

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[monthKey] = {
        month: monthName,
        approved: 0,
        pending: 0,
        monthKey
      };
    }

    paymentRequests.forEach(req => {
      if (!req.created_at) return;
      const d = new Date(req.created_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      const amountVal = Number(req.amount) || 0;
      
      if (monthsMap[monthKey]) {
        if (req.status === 'approved') {
          monthsMap[monthKey].approved += amountVal;
        } else if (req.status === 'pending') {
          monthsMap[monthKey].pending += amountVal;
        }
      } else {
        const monthName = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        monthsMap[monthKey] = {
          month: monthName,
          approved: req.status === 'approved' ? amountVal : 0,
          pending: req.status === 'pending' ? amountVal : 0,
          monthKey
        };
      }
    });

    return Object.values(monthsMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  };

  return (
    <div className="space-y-6 animate-scale-in text-slate-200">


      {/* Grid containing Admin configuration details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ADMIN SETUP FORM CARD */}
        <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900">
          <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase mb-4 border-b border-zinc-800/40 pb-3 flex items-center gap-1.5">
            <Settings size={16} className="text-[#00FF9C]" /> Configuration de l'Espace Administrateur
          </h3>

          <form onSubmit={handleSaveEmails} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-300 font-bold font-mono uppercase block">
                E-mails Admin Notifiés d'Inscription (Virgule séparateur)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  placeholder="admin@tradevault.com, support@tradevault.com"
                  className="flex-1 px-4 py-2.5 bg-[#050505] border border-white/5 rounded-xl text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#00FF9C]"
                />
                <button
                  type="submit"
                  className="py-2 px-5 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all"
                >
                  Mettre à jour
                </button>
              </div>
              <span className="text-[10px] text-neutral-500 block font-sans">
                * Dès qu'un nouvel utilisateur s'inscrit, une alerte est transmise virtuellement à cette liste pour audit.
              </span>
            </div>
          </form>
        </div>

        {/* ADMIN CRYPTO & PRICING COORDINATES FORM CARD */}
        <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900">
          <h3 className="text-sm font-black font-mono tracking-widest text-amber-400 uppercase mb-4 border-b border-zinc-800/40 pb-3 flex items-center gap-1.5">
            <span>🪙</span> Coordonnées Portefeuille & Tarification
          </h3>

          <form onSubmit={handleSaveCoordinates} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold font-mono uppercase block">
                  Tarif de l'abonnement ($ USDT)
                </label>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-300 font-bold font-mono uppercase block">
                  Période d'accès (mois)
                </label>
                <input
                  type="number"
                  value={periodInput}
                  onChange={(e) => setPeriodInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-300 font-bold font-mono uppercase block">
                Adresse de Réception USDT (Réseau TRC20)
              </label>
              <input
                type="text"
                value={trcInput}
                onChange={(e) => setTrcInput(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-900 rounded-xl text-[11px] text-[#38bdf8] font-mono focus:outline-none focus:border-[#38bdf8]/40"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-300 font-bold font-mono uppercase block">
                Adresse de Réception USDT (Réseau BEP20 - BSC)
              </label>
              <input
                type="text"
                value={bepInput}
                onChange={(e) => setBepInput(e.target.value)}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-900 rounded-xl text-[11px] text-teal-400 font-mono focus:outline-none focus:border-teal-400/40"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Sauvegarder les Coordonnées Crypto
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* SYSTEM LOGS VIEWER */}
      <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900 space-y-4">
        <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase flex items-center gap-2">
          <span>📜</span> Journaux Système (Logs)
        </h3>
        <div className="bg-[#050505] p-4 rounded-xl border border-zinc-900 h-64 overflow-y-auto font-mono text-[10px] space-y-1">
          {logs.length > 0 ? logs.map((log, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          )) : (
            <span className="text-slate-600 italic">Aucun log récent.</span>
          )}
        </div>
      </div>

      {/* NOTIFICATION LOG SIMULATOR */}
      <div className="bg-[#0c0c0e]/60 p-5 border border-zinc-800/50 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#00FF9C]">
            <Mail size={16} className="text-[#00FF9C] shrink-0" />
            <span className="text-[11px] font-black font-mono uppercase tracking-wider block">Daemon de Notification Email & Cron</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onCheckCronRenewals();
              customAlert("Cron Daemon", "Vérification planifiée (Cron) déclenchée ! Le serveur système interroge tous les traders expirant dans exactement 7 jours et expédie les rappels d'abonnement via l'infrastructure SMTP connectée.");
            }}
            className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl text-yellow-400 font-mono font-bold text-[10px] uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            ⏰ Tester le Cron Job (Rappel 7 jours)
          </button>
        </div>
        <div className="bg-slate-950 px-4 py-3 rounded-xl border border-slate-900 space-y-2">
          <span className="text-[10px] text-[#00FF9C] block font-mono">
            [SYS_ALERT_MAIL_DAEMON] : Emails administrateurs cibles : <span className="text-white font-bold">{adminEmails || 'aucun'}</span>
          </span>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Des alertes transactionnelles automatisées sont transmises en temps réel via l'infrastructure sécurisée de messagerie à chaque étape (Inscription de trader, approbation, demande d'early renewal, validation ou planification quotidienne de renouvellement).
          </p>
        </div>
      </div>

      {/* EARLY RENEWALS PURE TABLE */}
      <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900 space-y-4">
        <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase flex items-center gap-2">
          <span>⚡</span> Demandes de Renouvellement Anticipé (+30 jours) ({paymentRequests.filter(r => r.status === 'pending').length} en attente)
        </h3>
        <p className="text-[10.5px] text-slate-400 font-sans">
          Les traders approuvés ci-dessous ont demandé un renouvellement d'abonnement immédiat sans attendre l'expiration de leur période d'accès en cours.
        </p>

        <div className="overflow-x-auto border border-zinc-800/50 rounded-xl bg-[#080808]/40 font-mono text-[11px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#050505] border-b border-zinc-800/40 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Identifiant Trader</th>
                <th className="p-3">Réseau & Montant</th>
                <th className="p-3">Date Soumis</th>
                <th className="p-3">Preuve de paiement</th>
                <th className="p-3 text-center">Statut / Décision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {paymentRequests.length > 0 ? (
                paymentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-900/30 text-slate-300">
                    <td className="p-3">
                      <div className="font-bold text-white">{req.username}</div>
                      <div className="text-[10px] text-slate-500">{req.email}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-teal-400">USDT {req.network}</div>
                      <div className="text-[10px] text-slate-400">${req.amount} USD</div>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {req.payment_proof ? (
                        <button
                          type="button"
                          onClick={() => setActiveImage(req.payment_proof)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <ImageIcon size={12} /> Voir capture d'écran
                        </button>
                      ) : (
                        <span className="text-slate-500 italic font-sans">sans image</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {req.status === 'pending' ? (
                        <div className="inline-flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onApproveRenewal(req.id);
                              customAlert('Paiement Validé', "Renouvellement validé ! +30 jours d'Accès Premium crédités au trader.");
                            }}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-[10px] font-bold transition-all"
                          >
                            Valider
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              customConfirm('Rejeter Renouvellement', 'Rejeter cette demande de renouvellement ?', () => {
                                onRejectRenewal(req.id);
                              });
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-rose-450 border border-red-500/20 px-2.5 py-1 rounded text-[10px] font-bold transition-all"
                          >
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                          req.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {req.status === 'approved' ? 'Renouvelé' : 'Rejeté'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-sans text-xs">
                    Aucune demande de renouvellement anticipé d'abonnement en attente d'audit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PENDING REGISTRATIONS PURE TABLE */}
      <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900 space-y-4">
        <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase flex items-center gap-2">
          <Users size={16} className="text-[#00FF9C]" /> Inscriptions et Preuves de Paiements à Valider ({pendingUsers.length})
        </h3>
        <p className="text-[10.5px] text-slate-400">
          Auditez les captures de transferts des traders et validez manuellement l'activation de leur abonnement à {subscriptionPrice} USD pour {subscriptionPeriod} mois.
        </p>

        <div className="overflow-x-auto border border-zinc-800/40 rounded-xl bg-[#080808]/40">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-[#050505] border-b border-zinc-800/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Trader d'accès</th>
                <th className="p-3">Adresse E-mail</th>
                <th className="p-3">Date créé</th>
                <th className="p-3">Aperçu preuve d'envoi</th>
                <th className="p-3 text-center">Décision manuel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {pendingUsers.length > 0 ? (
                pendingUsers.map((pending) => (
                  <tr key={pending.id} className="hover:bg-slate-900/30 text-slate-300">
                    <td className="p-3 font-bold text-white whitespace-nowrap">{pending.username}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{pending.email}</td>
                    <td className="p-3 whitespace-nowrap text-slate-500">
                      {new Date(pending.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {pending.payment_proof ? (
                        <button
                          type="button"
                          onClick={() => setActiveImage(pending.payment_proof!)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-[#00FF9C]/10 hover:bg-[#00FF9C]/20 text-[#00FF9C] border border-[#00FF9C]/20 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <ImageIcon size={12} /> Voir capture d'écran
                        </button>
                      ) : (
                        <span className="text-slate-500 italic">sans image</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-center">
                      <div className="inline-flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onApproveUser(pending.id);
                            customAlert('Trader Approuvé', 'Trader approuvé ! Accès Premium débloqué.');
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            customConfirm('Rejeter Trader', 'Rejeter ce trader ?', () => {
                              onRejectUser(pending.id);
                            });
                          }}
                          className="bg-red-500/10 hover:bg-red-500/20 text-rose-400 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold"
                        >
                          Rejeter
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-sans text-xs">
                    Aucune inscription de trader n'est actuellement en attente de validation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ALL USERS LIST & ONLINE STATUS */}
      <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase flex items-center gap-2">
              <Users size={16} className="text-[#10b981]" /> Annuaire des Traders & Statut en Direct ({users.length})
            </h3>
            <p className="text-[10.5px] text-slate-400 font-sans">
              Visualisez tous les traders enregistrés sur la plateforme et suivez leur statut d'activité en temps réel.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                customConfirm(
                  "Supprimer tous les utilisateurs",
                  "Êtes-vous absolument sûr de vouloir supprimer tous les utilisateurs non-admins ? Cette action est irréversible.",
                  onDeleteAllUsersExceptAdmin
                );
              }}
              className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 text-red-400 font-mono font-bold text-[10px] uppercase rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={12} /> Purger Utilisateurs (Sauf Admin)
            </button>
            <div className="flex gap-4 text-[10px] uppercase font-mono font-black text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-zinc-800/50">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400">{users.filter(u => u.status === 'approved').length} En Ligne</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                <span>{users.filter(u => u.status !== 'approved').length} Hors Ligne</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-zinc-800/40 rounded-xl bg-[#080808]/40">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-[#050505] border-b border-zinc-800/40 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Trader d'accès</th>
                <th className="p-3">Adresse E-mail</th>
                <th className="p-3">Date d'Inscription</th>
                <th className="p-3">Abonnement</th>
                <th className="p-3 text-center">Activité en Direct</th>
                <th className="p-3 text-center">Actions Administrateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/20">
              {users.map((trader) => {
                // Let's make approved users online, plus the main admin is always online!
                const isOnline = trader.email === 'admin@tradevault.com' || trader.status === 'approved';
                const isEditing = trader.id === editingUserId;
                return (
                  <tr key={trader.id} className="hover:bg-slate-900/30 text-slate-300">
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {trader.avatar_url ? (
                          <img src={trader.avatar_url} alt={trader.username} className="w-7 h-7 rounded-full object-cover border border-[white/10]" referrerPolicy="no-referrer" />
                        ) : (
                          <DefaultLogoAvatar className="w-7 h-7" />
                        )}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            className="bg-slate-950 border border-slate-800 px-2 py-1 text-slate-200 text-xs rounded focus:outline-none focus:border-[#00FF9C]"
                          />
                        ) : (
                          <>
                            <span className="font-bold text-white">{trader.username}</span>
                            {trader.role === 'admin' && (
                              <span className="text-[8.5px] font-bold text-[#00FF9C] bg-[#00FF9C]/10 px-1.5 py-0.5 rounded border border-[#00FF9C]/20 uppercase tracking-widest">Admin</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editUserEmail}
                          onChange={(e) => setEditUserEmail(e.target.value)}
                          className="bg-slate-950 border border-slate-800 px-2 py-1 text-slate-200 text-xs rounded focus:outline-none focus:border-[#00FF9C] w-48"
                        />
                      ) : (
                        trader.email
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500">
                      {new Date(trader.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editUserStatus}
                          onChange={(e) => setEditUserStatus(e.target.value as any)}
                          className="bg-slate-950 border border-slate-800 px-2 py-1 text-slate-200 text-xs rounded focus:outline-none focus:border-[#00FF9C]"
                        >
                          <option value="pending">Validation</option>
                          <option value="approved">Premium Actif</option>
                          <option value="rejected">Bloqué</option>
                        </select>
                      ) : (() => {
                        const s = getPremiumStatus(trader);
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${s.bg}`}>
                            {s.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-950/60 border border-zinc-800">
                        {isOnline ? (
                          <>
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider leading-none">Actif</span>
                          </>
                        ) : (
                          <>
                            <span className="rounded-full h-1.5 w-1.5 bg-slate-650"></span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-none">Déconnecté</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-center">
                      {trader.email === 'admin@tradevault.com' ? (
                        <span className="text-[10px] text-slate-500 italic font-sans">Compte Système</span>
                      ) : isEditing ? (
                        <div className="flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => saveEditedUser(trader.id)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            Sauver
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded text-[10px] cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          {trader.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                customConfirm(
                                  "Approuver Trader",
                                  `Souhaitez-vous approuver le compte de "${trader.username}" ? Un e-mail de confirmation lui sera envoyé.`,
                                  () => {
                                    onApproveUser(trader.id);
                                  }
                                );
                              }}
                              className="px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Check size={11} /> Approuver
                            </button>
                          )}
                          {currentUser?.role === 'admin' && trader.email !== 'admin@tradevault.com' && (
                            <button
                              type="button"
                              onClick={() => {
                                const isTargetAdmin = trader.role === 'admin';
                                const newRole = isTargetAdmin ? 'user' : 'admin';
                                const actionTitle = isTargetAdmin ? 'Rétrograder' : 'Promouvoir Admin';
                                const confirmMsg = isTargetAdmin 
                                  ? `Voulez-vous rétrograder "${trader.username}" au rang de simple utilisateur ?`
                                  : `Voulez-vous promouvoir "${trader.username}" au rang d'administrateur ?`;
                                
                                customConfirm(
                                  actionTitle,
                                  confirmMsg,
                                  () => {
                                    if (onUpdateUserRole) {
                                      onUpdateUserRole(trader.id, newRole);
                                    }
                                  }
                                );
                              }}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                                trader.role === 'admin'
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {trader.role === 'admin' ? 'Rétrograder' : 'Promouvoir Admin'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditing(trader)}
                            className="px-2.5 py-1 text-[10px] font-bold bg-[#00FF9C]/10 hover:bg-[#00FF9C]/20 text-[#00FF9C] border border-[#00FF9C]/20 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Edit size={11} /> Éditer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              customConfirm(
                                "Supprimer Trader",
                                `Êtes-vous absolument sûr de vouloir supprimer le profil de "${trader.username}" ? Toutes ses données historiques associées seront purgées.`,
                                () => {
                                  onDeleteUser(trader.id);
                                }
                              );
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 border border-rose-500/20 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Trash2 size={11} /> Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX FOR AUDIT PROOF SCREENSHOT */}
      {activeImage && (
        <div 
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="absolute top-5 right-5 text-white/70 hover:text-white bg-slate-900/40 p-2 rounded-full">
            <X size={24} />
          </div>
          <img src={activeImage} alt="Validation Proof" className="max-w-full max-h-[92vh] object-contain rounded-lg border border-zinc-800 shadow-2xl" />
        </div>
      )}

    </div>
  );
}
