/**
 * AdminEnhanced.tsx — Wrapper Admin v2
 * Ajoute : Stats · Annonces · KYC · Audit
 * Conserve Admin.tsx existant intact
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, Users, CreditCard, Megaphone,
  ShieldCheck, ClipboardList, Settings, TrendingUp,
  AlertTriangle, CheckCircle, Clock, DollarSign,
  Plus, Send, Trash2, Eye, Check, X
} from 'lucide-react';
import Admin from './Admin';
import { getSupabase } from '../utils/supabaseSync';
import { User, PaymentRequest } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers:       number;
  activeUsers:      number;
  newThisMonth:     number;
  pendingPayments:  number;
  totalRevenue:     number;
  totalTrades:      number;
  totalAccounts:    number;
  propFirmAccounts: number;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  target_role: string;
  is_active: boolean;
  pinned: boolean;
  published_at: string;
}

interface KYCEntry {
  id: string;
  user_id: string;
  status: string;
  level: string;
  created_at: string;
  profiles?: { email: string; username: string };
}

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  profiles?: { email: string };
}

type Tab = 'stats' | 'main' | 'payments' | 'announcements' | 'kyc' | 'audit';

// ─── Props (reprend exactement les props d'Admin.tsx) ─────────────────────────
interface AdminEnhancedProps {
  currentUser?: User;
  onUpdateUserRole?: (id: string, role: 'admin' | 'user') => void;
  users: User[];
  onApproveUser: (id: string) => void;
  onRejectUser: (id: string) => void;
  onUpdateAdminEmails: (emails: string) => void;
  adminEmails: string;
  adminWalletTRC20: string;
  adminWalletBEP20: string;
  subscriptionPrice: number;
  subscriptionPeriod: number;
  onUpdateAdminParams: (trc: string, bep: string, price: number, period: number) => void;
  paymentRequests?: PaymentRequest[];
  onApproveRenewal?: (id: string) => void;
  onRejectRenewal?: (id: string) => void;
  onCheckCronRenewals?: () => void;
  onDeleteUser?: (id: string) => void;
  onDeleteAllUsersExceptAdmin?: () => void;
  onEditUser?: (id: string, fields: { username: string; email: string; status: 'pending' | 'approved' | 'rejected' }) => void;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminEnhanced(props: AdminEnhancedProps) {
  const [tab,           setTab]           = useState<Tab>('stats');
  const [stats,         setStats]         = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [kyc,           setKyc]           = useState<KYCEntry[]>([]);
  const [audit,         setAudit]         = useState<AuditEntry[]>([]);
  const [loading,       setLoading]       = useState(false);

  // Annonce form
  const [newTitle,   setNewTitle]   = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType,    setNewType]    = useState('info');
  const [newTarget,  setNewTarget]  = useState('all');

  const sb = getSupabase();

  const loadStats = useCallback(async () => {
    if (!sb) return;
    setLoading(true);
    try {
      const token = (await sb.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/supabase/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action: 'adminGetStats', arguments: {} })
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (e) { console.warn('[ADMIN] loadStats:', e); }
    finally { setLoading(false); }
  }, [sb]);

  const loadAnnouncements = useCallback(async () => {
    if (!sb) return;
    const { data } = await sb.from('announcements')
      .select('*').order('published_at', { ascending: false }).limit(30);
    setAnnouncements(data || []);
  }, [sb]);

  const loadKyc = useCallback(async () => {
    if (!sb) return;
    const { data } = await sb.from('kyc')
      .select('*, profiles(email,username)')
      .order('created_at', { ascending: false });
    setKyc(data || []);
  }, [sb]);

  const loadAudit = useCallback(async () => {
    if (!sb) return;
    const { data } = await sb.from('audit_logs')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(100);
    setAudit(data || []);
  }, [sb]);

  useEffect(() => {
    loadStats();
    if (tab === 'announcements') loadAnnouncements();
    if (tab === 'kyc')           loadKyc();
    if (tab === 'audit')         loadAudit();
  }, [tab]);

  const createAnnouncement = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    if (!sb) return;
    const session = (await sb.auth.getSession()).data.session;
    const res = await fetch('/api/supabase/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: 'adminCreateAnnouncement', arguments: { title: newTitle, content: newContent, type: newType, target_role: newTarget, pinned: false, createdBy: props.currentUser?.id } })
    });
    const data = await res.json();
    if (data.success) { setNewTitle(''); setNewContent(''); loadAnnouncements(); }
  };

  const toggleAnnouncement = async (id: string, is_active: boolean) => {
    if (!sb) return;
    await sb.from('announcements').update({ is_active: !is_active }).eq('id', id);
    loadAnnouncements();
  };

  const deleteAnnouncement = async (id: string) => {
    if (!sb) return;
    await sb.from('announcements').delete().eq('id', id);
    loadAnnouncements();
  };

  const updateKYC = async (id: string, status: string) => {
    if (!sb) return;
    await sb.from('kyc').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: props.currentUser?.id }).eq('id', id);
    loadKyc();
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'stats',         label: 'Stats',        icon: <BarChart2 size={15} /> },
    { id: 'main',          label: 'Utilisateurs', icon: <Users size={15} />,        badge: props.users.filter(u => u.status === 'pending').length },
    { id: 'payments',      label: 'Paiements',    icon: <CreditCard size={15} />,   badge: props.paymentRequests?.filter(p => p.status === 'pending').length },
    { id: 'announcements', label: 'Annonces',     icon: <Megaphone size={15} /> },
    { id: 'kyc',           label: 'KYC',          icon: <ShieldCheck size={15} />,  badge: kyc.filter(k => k.status === 'pending').length },
    { id: 'audit',         label: 'Audit',        icon: <ClipboardList size={15} /> },
  ];

  const STAT_CARDS = stats ? [
    { label: 'Total Users',       value: stats.totalUsers,        icon: <Users size={18} />,       color: '#00FF9C', sub: `+${stats.newThisMonth} ce mois` },
    { label: 'Users Actifs',      value: stats.activeUsers,       icon: <CheckCircle size={18} />, color: '#00D4FF', sub: `${Math.round(stats.activeUsers / Math.max(stats.totalUsers, 1) * 100)}% du total` },
    { label: 'Paiements Pending', value: stats.pendingPayments,   icon: <Clock size={18} />,       color: '#FFB347', sub: 'à valider', alert: stats.pendingPayments > 0 },
    { label: 'Revenue Total',     value: `$${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={18} />, color: '#82E0AA', sub: 'USDT approuvés' },
    { label: 'Total Trades',      value: stats.totalTrades,       icon: <TrendingUp size={18} />,  color: '#C39BD3', sub: 'journalisés' },
    { label: 'Comptes PropFirm',  value: stats.propFirmAccounts,  icon: <ShieldCheck size={18} />, color: '#F8C471', sub: `/ ${stats.totalAccounts} comptes totaux` },
  ] : [];

  return (
    <div className="space-y-4 animate-scale-in text-slate-200">

      {/* ── Navigation tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 bg-black/30 border border-white/[0.06] rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
              tab === t.id
                ? 'bg-[#00FF9C] text-black shadow'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            {t.icon} {t.label}
            {!!t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-black">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── STATS ─────────────────────────────────────────────────────── */}
      {tab === 'stats' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {STAT_CARDS.map(s => (
                <div key={s.label} className={`bg-[#0d0d0d] border rounded-2xl p-5 transition-all ${
                  (s as any).alert ? 'border-orange-500/30 shadow-orange-500/10 shadow-lg' : 'border-white/[0.06]'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl" style={{ background: `${s.color}15`, color: s.color }}>
                      {s.icon}
                    </div>
                    {(s as any).alert && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
                  </div>
                  <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-zinc-400 text-xs mt-1 font-bold">{s.label}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={loadStats} className="text-xs text-zinc-600 hover:text-[#00FF9C] transition-colors font-mono">
            ↻ Actualiser
          </button>
        </div>
      )}

      {/* ── UTILISATEURS + SETTINGS (Admin.tsx existant) ──────────────── */}
      {(tab === 'main' || tab === 'payments') && (
        <Admin {...props} />
      )}

      {/* ── ANNONCES ──────────────────────────────────────────────────── */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          {/* Form création */}
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5">
            <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white mb-4 flex items-center gap-2">
              <Plus size={14} className="text-[#00FF9C]" /> Nouvelle annonce
            </h3>
            <div className="space-y-3">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Titre de l'annonce..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF9C]/50" />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Contenu..." rows={3}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00FF9C]/50 resize-none" />
              <div className="flex gap-3">
                <select value={newType} onChange={e => setNewType(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  {['info','warning','success','maintenance','promo'].map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={newTarget} onChange={e => setNewTarget(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                  {['all','user','premium','admin'].map(t => <option key={t}>{t}</option>)}
                </select>
                <button onClick={createAnnouncement} disabled={!newTitle || !newContent}
                  className="ml-auto flex items-center gap-2 bg-[#00FF9C] text-black text-xs font-black uppercase px-4 py-2 rounded-xl disabled:opacity-40 hover:bg-[#00e5a0] transition-colors">
                  <Send size={12} /> Publier
                </button>
              </div>
            </div>
          </div>

          {/* Liste */}
          <div className="space-y-2">
            {announcements.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-8 font-mono">Aucune annonce.</p>
            )}
            {announcements.map(a => (
              <div key={a.id} className={`bg-[#0d0d0d] border rounded-2xl p-4 flex items-start gap-4 ${a.is_active ? 'border-white/[0.06]' : 'border-white/[0.03] opacity-50'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'warning' ? 'bg-yellow-400' : a.type === 'success' ? 'bg-green-400' : a.type === 'maintenance' ? 'bg-red-400' : a.type === 'promo' ? 'bg-purple-400' : 'bg-blue-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{a.title}</p>
                  <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{a.content}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[10px] text-zinc-600 font-mono">{new Date(a.published_at).toLocaleDateString('fr-FR')}</span>
                    <span className="text-[10px] text-zinc-700">· {a.target_role}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => toggleAnnouncement(a.id, a.is_active)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-mono transition-colors ${a.is_active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
                    {a.is_active ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => deleteAnnouncement(a.id)}
                    className="text-xs p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KYC ───────────────────────────────────────────────────────── */}
      {tab === 'kyc' && (
        <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#00FF9C]" /> Vérification KYC
            </h3>
            <span className="text-xs text-zinc-500 font-mono">{kyc.filter(k => k.status === 'pending').length} en attente</span>
          </div>
          {kyc.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8 font-mono">Aucune demande KYC.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-black/20">
                <tr className="text-zinc-500 uppercase tracking-wider text-[10px]">
                  <th className="text-left px-4 py-3">Utilisateur</th>
                  <th className="text-left px-4 py-3">Niveau</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {kyc.map(k => (
                  <tr key={k.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{k.profiles?.email || k.user_id.slice(0, 12)}</p>
                      <p className="text-zinc-600">{k.profiles?.username}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 capitalize">{k.level}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        k.status === 'approved'     ? 'bg-green-500/20 text-green-400' :
                        k.status === 'pending'      ? 'bg-yellow-500/20 text-yellow-400' :
                        k.status === 'under_review' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{k.status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{new Date(k.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      {k.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <button onClick={() => updateKYC(k.id, 'approved')}
                            className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"><Check size={11} /></button>
                          <button onClick={() => updateKYC(k.id, 'rejected')}
                            className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"><X size={11} /></button>
                          <button onClick={() => updateKYC(k.id, 'under_review')}
                            className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"><Eye size={11} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AUDIT LOGS ────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-black font-mono uppercase tracking-widest text-white flex items-center gap-2">
              <ClipboardList size={14} className="text-[#00FF9C]" /> Journal d'audit
            </h3>
            <button onClick={loadAudit} className="text-xs text-zinc-600 hover:text-[#00FF9C] font-mono">↻</button>
          </div>
          <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
            {audit.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8 font-mono">Aucun événement enregistré.</p>
            ) : audit.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9C]/60 shrink-0" />
                <code className="text-[#00FF9C] text-xs bg-[#00FF9C]/5 px-2 py-0.5 rounded font-mono shrink-0">
                  {a.action}
                </code>
                <span className="text-zinc-500 text-xs truncate flex-1">
                  {a.profiles?.email || a.user_id?.slice(0, 12) || 'system'}
                </span>
                <span className="text-zinc-600 text-[10px] font-mono shrink-0">
                  {new Date(a.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
