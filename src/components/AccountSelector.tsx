/**
 * AccountSelector.tsx — Sélecteur multi-comptes TradeVault
 * Design cyber neon, modal création/édition, confirmation suppression
 * Supporte le mode standalone (hook useAccounts) ET le mode contrôlé (props de App.tsx) pour rétrocompatibilité
 */
import { useState, useRef, useEffect } from 'react';
import { useAccounts } from '../hooks/useAccounts';

const COLORS = ['#00FF9C','#00D4FF','#FF6B6B','#FFB347','#C39BD3','#85C1E9','#82E0AA','#F8C471'];
const EMOJIS_PERSONAL  = ['💼','📈','📊','💰','🎯','⚡','🔥','💎'];
const EMOJIS_PROPFIRM  = ['🏆','🚀','💪','🎖️','⭐','🦅','🔱','👑'];
const PROP_FIRMS = ['FTMO','FundedNext','FundingPips','Alpha Capital','The 5%ers','E8 Funding','Topstep','True Forex Funds','Autre'];

interface Props {
  // Mode standalone
  userId?: string;
  onAccountChange?: (account: any) => void;

  // Mode contrôlé (rétrocompatibilité App.tsx)
  accounts?: any[];
  selectedAccountId?: string | null;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

type ModalType = 'create' | 'edit' | 'delete' | null;

export default function AccountSelector({
  userId,
  onAccountChange,
  accounts: propAccounts,
  selectedAccountId,
  onSelect,
  onDelete
}: Props) {
  // Si on est en mode contrôlé, on n'utilise pas le hook useAccounts
  const isControlled = !!propAccounts;

  const hookData = useAccounts(isControlled ? null : (userId || null));
  
  const accountsList = isControlled ? propAccounts : hookData.accounts;
  const activeAccount = isControlled 
    ? (propAccounts.find(a => a.id === selectedAccountId) || null)
    : hookData.activeAccount;

  const [open, setOpen]           = useState(false);
  const [modal, setModal]         = useState<ModalType>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [saving, setSaving]       = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', type: 'personal' as 'personal' | 'funded' | 'challenge' | 'prop_firm' | 'demo',
    starting_balance: 1000, currency: 'USD',
    color: '#00FF9C', emoji: '💼',
    prop_firm_name: '', description: '',
    capital: 100000, target: 10, daily_loss: 5, global_loss: 10,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function handleSelect(acc: any) {
    if (isControlled) {
      if (onSelect) onSelect(acc.id);
    } else {
      hookData.setActiveAccount(acc);
      if (onAccountChange) onAccountChange(acc);
    }
    setOpen(false);
  }

  function openCreate() {
    setForm({ 
      name: '', 
      type: 'personal', 
      starting_balance: 1000, 
      currency: 'USD', 
      color: '#00FF9C', 
      emoji: '💼', 
      prop_firm_name: '', 
      description: '', 
      capital: 100000, 
      target: 10, 
      daily_loss: 5, 
      global_loss: 10 
    });
    setModal('create'); 
    setOpen(false);
  }

  function openEdit(acc: any) {
    setEditTarget(acc);
    const accType = acc.account_type || acc.type || 'personal';
    setForm({
      name: acc.name, 
      type: accType,
      starting_balance: acc.starting_balance || acc.capital || 1000, 
      currency: acc.currency || 'USD',
      color: acc.color || '#00FF9C', 
      emoji: acc.emoji || '💼',
      prop_firm_name: acc.prop_firm_name || '', 
      description: acc.description || '',
      capital: acc.capital || 100000, 
      target: acc.target || 10,
      daily_loss: acc.daily_loss || 5, 
      global_loss: acc.global_loss || 10,
    });
    setModal('edit'); 
    setOpen(false);
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (isControlled) {
      // Dans le mode contrôlé, la création de compte est gérée par le bouton natif de App.tsx
      // S'il est cliqué, on simule l'ajout ou on affiche une alerte
      (window as any).showCustomAlert?.('Info', 'Veuillez utiliser l\'interface principale pour ajouter un compte.');
    } else {
      const acc = await hookData.createAccount({
        name: form.name, 
        type: form.type === 'personal' ? 'personal' : 'funded',
        starting_balance: form.starting_balance, 
        currency: form.currency,
        color: form.color, 
        emoji: form.emoji,
        prop_firm_name: form.type !== 'personal' ? form.prop_firm_name : undefined,
        description: form.description,
        capital: form.type !== 'personal' ? form.capital : undefined,
        target: form.type !== 'personal' ? form.target : undefined,
        daily_loss: form.type !== 'personal' ? form.daily_loss : undefined,
        global_loss: form.type !== 'personal' ? form.global_loss : undefined,
      });
      if (acc) {
        if (onAccountChange) onAccountChange(acc);
        hookData.setActiveAccount(acc);
      }
    }
    setSaving(false);
    setModal(null);
  }

  async function handleEdit() {
    if (!editTarget || !form.name.trim()) return;
    setSaving(true);
    if (!isControlled) {
      await hookData.updateAccount(editTarget.id, {
        name: form.name, 
        color: form.color, 
        emoji: form.emoji,
        description: form.description,
        prop_firm_name: form.prop_firm_name || undefined,
      });
    }
    setSaving(false); 
    setModal(null);
  }

  async function handleDelete() {
    if (!editTarget) return;
    setSaving(true);
    if (isControlled) {
      if (onDelete) onDelete(editTarget.id);
    } else {
      await hookData.deleteAccount(editTarget.id);
    }
    setSaving(false); 
    setModal(null); 
    setEditTarget(null);
  }

  if (!isControlled && hookData.loading) {
    return <div className="h-10 w-48 bg-white/5 animate-pulse rounded-xl" />;
  }

  const defaultEmoji = (activeAccount?.account_type || activeAccount?.type) === 'prop_firm' ? '🏆' : '💼';

  return (
    <>
      {/* ── Dropdown trigger ── */}
      <div ref={dropRef} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-colors min-w-[180px] max-w-[260px]"
        >
          <span className="text-lg">{activeAccount?.emoji || defaultEmoji}</span>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-sm font-medium truncate">{activeAccount?.name || 'Aucun compte'}</p>
            <p className="text-zinc-500 text-xs capitalize">
              {(activeAccount?.account_type || activeAccount?.type) === 'prop_firm' ? 'Prop Firm' : 'Personnel'}
            </p>
          </div>
          <svg className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute top-full mt-2 left-0 w-72 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="p-2 max-h-80 overflow-y-auto">
              {accountsList.map(acc => {
                const accType = acc.account_type || acc.type || 'personal';
                const emoji = acc.emoji || (accType === 'prop_firm' ? '🏆' : '💼');
                const isSelected = acc.id === activeAccount?.id;
                
                return (
                  <div
                    key={acc.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group ${
                      isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div onClick={() => handleSelect(acc)} className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">{emoji}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{acc.name}</p>
                        <p className="text-zinc-500 text-xs">
                          {accType === 'prop_firm' ? `🏆 ${acc.prop_firm_name || 'Prop Firm'}` : '💼 Personnel'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full ml-auto shrink-0" style={{ background: acc.color || '#00FF9C' }} />
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(acc); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 p-1 transition-all"
                    >✏️</button>
                  </div>
                );
              })}
            </div>
            {!isControlled && (
              <div className="border-t border-white/5 p-2">
                <button
                  onClick={openCreate}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-[#00FF9C] hover:bg-[#00FF9C]/10 rounded-xl transition-colors text-sm font-medium"
                >
                  <span>＋</span> Ajouter un compte
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Create / Edit ── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-lg">
                  {modal === 'create' ? '＋ Nouveau compte' : '✏️ Modifier le compte'}
                </h2>
                <button onClick={() => setModal(null)} className="text-zinc-600 hover:text-white">✕</button>
              </div>

              {/* Type selector (create only) */}
              {modal === 'create' && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    { value: 'personal', label: 'Personnel', icon: '💼' },
                    { value: 'funded',   label: 'Prop Firm', icon: '🏆' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => {
                        setForm(f => ({ ...f, type: t.value as any, emoji: t.value === 'personal' ? '💼' : '🏆' }));
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                        form.type === t.value
                          ? 'border-[#00FF9C] bg-[#00FF9C]/10 text-[#00FF9C]'
                          : 'border-white/10 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="font-medium text-sm">{t.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Prop firm selector */}
              {form.type !== 'personal' && modal === 'create' && (
                <div className="mb-4">
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Prop Firm</label>
                  <select
                    value={form.prop_firm_name}
                    onChange={e => setForm(f => ({ ...f, prop_firm_name: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF9C]/50"
                  >
                    <option value="">Choisir une prop firm</option>
                    {PROP_FIRMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}

              {/* Nom */}
              <div className="mb-4">
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Nom du compte</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={form.type === 'personal' ? 'Ex: Scalping EUR/USD' : 'Ex: FTMO 100K Challenge'}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF9C]/50 placeholder:text-zinc-600"
                />
              </div>

              {/* Balance (create only) */}
              {modal === 'create' && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Capital</label>
                    <input
                      type="number"
                      value={form.starting_balance}
                      onChange={e => setForm(f => ({ ...f, starting_balance: Number(e.target.value) }))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF9C]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Devise</label>
                    <select
                      value={form.currency}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00FF9C]/50"
                    >
                      {['USD','EUR','GBP','CHF'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Emoji + Color */}
              <div className="mb-4">
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Icône</label>
                <div className="flex gap-2 flex-wrap">
                  {((form.type === 'personal' || form.type === 'demo') ? EMOJIS_PERSONAL : EMOJIS_PROPFIRM).map(e => (
                    <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      className={`text-2xl p-1.5 rounded-lg transition-colors ${form.emoji === e ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Couleur</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d0d0d] scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setModal('delete')} className="px-4 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                  🗑 Supprimer
                </button>
                <button onClick={() => setModal(null)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white text-sm transition-colors">
                  Annuler
                </button>
                <button
                  onClick={modal === 'create' ? handleCreate : handleEdit}
                  disabled={saving || !form.name.trim()}
                  className="flex-1 bg-[#00FF9C] hover:bg-[#00e5a0] disabled:opacity-40 text-black font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {saving ? '...' : modal === 'create' ? 'Créer' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation Suppression ── */}
      {modal === 'delete' && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0d0d0d] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-white font-bold mb-2">Supprimer ce compte ?</h3>
              <p className="text-zinc-500 text-sm">
                <span className="text-white">{editTarget.emoji || '💼'} {editTarget.name}</span> sera désactivé.
                Vos trades seront conservés.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal('edit')} className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 text-sm">
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
              >
                {saving ? '...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
