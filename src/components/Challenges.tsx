import React, { useState } from 'react';
import { Target, Plus, Trash2, Award, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, X, Info } from 'lucide-react';
import { Challenge, Trade, Account } from '../types';
import { customAlert, customConfirm } from '../utils/customDialog';
import { useThemeLang } from '../utils/themeLanguageContext';

interface ChallengesProps {
  challenges: Challenge[];
  trades: Trade[];
  onAddChallenge: (ch: Challenge) => void;
  onDeleteChallenge: (id: string) => void;
  activeAccount: Account;
}

export default function Challenges({ challenges, trades, onAddChallenge, onDeleteChallenge, activeAccount }: ChallengesProps) {
  const { t } = useThemeLang();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Create challenge state fields
  const [name, setName] = useState('');
  const [capital, setCapital] = useState('');
  const [targetPercent, setTargetPercent] = useState('8'); // standard FTMO target is 8% or 10%
  const [daily_loss, setDailyLoss] = useState('5'); // standard is 5%
  const [global_loss, setGlobalLoss] = useState('10'); // standard is 10%

  const activeAccountChallenges = challenges.filter(c => c.account_id === activeAccount.id);

  // Filter trades of current mock session today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date.startsWith(todayStr));
  const todayPnl = todayTrades.reduce((sum, t) => sum + t.pnl, 0);

  const cumulativePnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !capital) {
      customAlert('Données Requises', 'Veuillez spécifier le nom du challenge et son capital');
      return;
    }

    const newChallenge: Challenge = {
      id: 'ch_' + Date.now(),
      user_id: activeAccount.user_id,
      account_id: activeAccount.id,
      name: name.trim(),
      capital: parseFloat(capital),
      target: parseFloat(targetPercent) || 8,
      daily_loss: parseFloat(daily_loss) || 5,
      global_loss: parseFloat(global_loss) || 10,
      created_at: new Date().toISOString()
    };

    onAddChallenge(newChallenge);
    setModalOpen(false);

    // reset fields
    setName('');
    setCapital('');
  };

  return (
    <div className="space-y-6 text-slate-200">

      {/* Challenges Tracker Header */}
      <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Award className="text-[#00FF9C] shrink-0" size={20} />
          <div>
            <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase">{t('propfirm_challenges_tracker')}</h3>
            <p className="text-[10px] text-neutral-300">{t('propfirm_challenges_tracker_desc')}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="py-2 px-4 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1 shrink-0 shadow-lg shadow-[#00FF9C]/20 transition-all font-mono tracking-wide"
        >
          <Plus size={14} /> {t('new_challenge')}
        </button>
      </div>

      {/* Challenge Cards Grid */}
      {activeAccountChallenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {activeAccountChallenges.map((ch) => {
            const targetAmount = ch.capital * (ch.target / 100);
            const maxDailyLossAmount = ch.capital * (ch.daily_loss / 100);
            const maxGlobalLossAmount = ch.capital * (ch.global_loss / 100);

            // Compute current metrics relative to this specific challenge parameter
            const profitProgress = targetAmount > 0 ? (cumulativePnl / targetAmount) * 100 : 0;
            const dailyCheckedPnl = todayPnl; // use active dashboard today P&L
            const dailyCheckedLossProgress = maxDailyLossAmount > 0 
              ? (Math.abs(Math.min(0, dailyCheckedPnl)) / maxDailyLossAmount) * 100 
              : 0;

            const globalLossCheckedProgress = maxGlobalLossAmount > 0
              ? (Math.abs(Math.min(0, cumulativePnl)) / maxGlobalLossAmount) * 100
              : 0;

            // Determine status
            let isFailed = (cumulativePnl <= -maxGlobalLossAmount) || (dailyCheckedPnl <= -maxDailyLossAmount);
            let isWon = cumulativePnl >= targetAmount;

            let statusText = 'CHALLENGE EN COURS';
            let statusColor = 'bg-[#00FF9C]/10 text-[#00FF9C] border-[#00FF9C]/20';
            
            if (isFailed) {
              statusText = 'ÉCHOUÉ (RÈGLE ENFREINTE)';
              statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20 ring-1 ring-rose-500';
            } else if (isWon) {
              statusText = 'FÉLICITATIONS, COMPTE VALIDÉ ! 🎉';
              statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold ring-1 ring-emerald-500';
            }

            return (
              <div key={ch.id} className="bg-[#080808] rounded-2xl border border-zinc-900 p-6 flex flex-col justify-between hover:border-[#00FF9C]/30 transition-all space-y-5 shadow-md">
                
                {/* Header card info */}
                <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black font-mono text-white capitalize">{ch.name}</h4>
                    <span className="text-[10px] text-neutral-300 block font-mono">Date d'initialisation : {new Date(ch.created_at).toLocaleDateString()}</span>
                  </div>

                  {ch.id !== 'ftmo-100k-challenge' && (
                    <button
                      type="button"
                      onClick={() => { customConfirm('Supprimer Challenge', 'Supprimer ce challenge ?', () => onDeleteChallenge(ch.id)); }}
                      className="text-neutral-400 hover:text-rose-400 p-1 rounded-lg hover:bg-[#0c0c0c] transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Account stats matrix block */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2 border border-zinc-900 bg-black/40 rounded-xl">
                    <span className="text-[9px] text-slate-500 block uppercase">CAPITAL</span>
                    <span className="font-bold text-white">${ch.capital.toLocaleString()}</span>
                  </div>
                  <div className="p-2 border border-zinc-900 bg-black/40 rounded-xl">
                    <span className="text-[9px] text-slate-500 block uppercase">BILIHE NET</span>
                    <span className={`font-bold ${cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {cumulativePnl >= 0 ? '+' : ''}${cumulativePnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 border border-slate-900 bg-slate-950/20 rounded-xl">
                    <span className="text-[9px] text-slate-500 block uppercase">OBJECTIF</span>
                    <span className="font-bold text-[#00FF9C]">+${targetAmount.toFixed(0)}</span>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-4 font-mono text-xs">
                  
                  {/* Profit Profit Target Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-semibold uppercase">Objectif de Gain ({ch.target}%)</span>
                      <span className={`font-bold ${cumulativePnl >= targetAmount ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {Math.max(0, parseFloat(profitProgress.toFixed(1)))}% / 100%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          cumulativePnl >= targetAmount ? 'bg-emerald-500' : 'bg-[#00FF9C]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, profitProgress))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Daily Max Drawdown limit bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-semibold uppercase">Perte Journalière Max ({ch.daily_loss}%)</span>
                      <span className={`font-bold ${dailyCheckedPnl <= -maxDailyLossAmount ? 'text-red-400 font-extrabold animate-pulse' : 'text-slate-400'}`}>
                        {Math.abs(dailyCheckedPnl) > 0 ? `$${Math.abs(dailyCheckedPnl).toFixed(0)}` : '$0'} / ${maxDailyLossAmount.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          dailyCheckedLossProgress >= 100 ? 'bg-red-500' : dailyCheckedLossProgress >= 80 ? 'bg-orange-500 animate-pulse' : 'bg-rose-500/80'
                        }`}
                        style={{ width: `${Math.min(100, dailyCheckedLossProgress)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Global loss Drawdown limit bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-semibold uppercase">Perte Globale Max ({ch.global_loss}%)</span>
                      <span className={`font-bold ${cumulativePnl <= -maxGlobalLossAmount ? 'text-red-400 font-extrabold animate-pulse' : 'text-slate-400'}`}>
                        {cumulativePnl < 0 ? `$${Math.abs(cumulativePnl).toFixed(0)}` : '$0'} / ${maxGlobalLossAmount.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          globalLossCheckedProgress >= 100 ? 'bg-red-500' : globalLossCheckedProgress >= 80 ? 'bg-orange-500' : 'bg-rose-500/80'
                        }`}
                        style={{ width: `${Math.min(100, globalLossCheckedProgress)}%` }}
                      ></div>
                    </div>
                  </div>

                </div>

                {/* Status indicator tag strip */}
                <div className={`p-2 rounded-xl text-center text-[10px] uppercase font-bold tracking-widest border ${statusColor}`}>
                  {statusText}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl space-y-2">
          <Award size={44} className="mx-auto text-slate-600 animate-pulse" />
          <h4 className="text-slate-200 font-bold text-sm">Aucun tracker de challenge créé</h4>
          <p className="text-xs text-slate-400">Pour garder la discipline, créez votre premier challenge d'évaluation.</p>
        </div>
      )}

      {/* CREATE MODAL DIALOG */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#080808] rounded-2xl border border-[#00FF9C]/20 p-6 space-y-5 animate-scale-in relative">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-black font-mono text-white tracking-widest uppercase">Nouveau Challenge Propfirm</h3>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-semibold font-sans">Nom du challenge</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Challenge FTMO 100k Phase 1"
                  className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-semibold font-sans font-mono">Capital ($)</label>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    placeholder="100000"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-semibold font-sans font-mono">Cible Profit (%)</label>
                  <input
                    type="number"
                    value={targetPercent}
                    onChange={(e) => setTargetPercent(e.target.value)}
                    placeholder="8"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-semibold font-sans font-mono">Max Daily Loss (%)</label>
                  <input
                    type="number"
                    value={daily_loss}
                    onChange={(e) => setDailyLoss(e.target.value)}
                    placeholder="5"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-semibold font-sans font-mono">Max Global Loss (%)</label>
                  <input
                    type="number"
                    value={global_loss}
                    onChange={(e) => setGlobalLoss(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]/40 font-mono"
                  />
                </div>
              </div>

              <div className="flex pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-800 text-slate-400 text-xs hover:bg-slate-900 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold transition-colors"
                >
                  Lancer le Challenge
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
