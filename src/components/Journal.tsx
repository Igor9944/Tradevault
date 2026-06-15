import React, { useState } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Calendar, FileText, Settings, X, ChevronRight, Upload, Sparkles, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, Account } from '../types';
import { customAlert, customConfirm } from '../utils/customDialog';
import { useThemeLang } from '../utils/themeLanguageContext';

interface JournalProps {
  trades: Trade[];
  onAddTrade: (trade: Trade) => void;
  onEditTrade: (id: string, updated: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  activeAccount: Account;
}

export default function Journal({ trades, onAddTrade, onEditTrade, onDeleteTrade, activeAccount }: JournalProps) {
  const { t } = useThemeLang();
  // Filter States
  const [search, setSearch] = useState('');
  const [setupFilter, setSetupFilter] = useState('');
  const [pnlFilter, setPnlFilter] = useState<'all' | 'win' | 'loss'>('all');

  // Modal Creation States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [pair, setPair] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [lots, setLots] = useState('');
  const [fees, setFees] = useState('');
  const [pnl, setPnl] = useState('');
  const [setup, setSetup] = useState('Order Block');
  const [mindset, setMindset] = useState('Disciplined');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);

  // Lightbox
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const SETUPS = ['Order Block', 'Breaker', 'FVG', 'Liquidity Sweep', 'Supply/Demand', 'Trendline'];
  const MINDSETS = ['Disciplined', 'FOMO', 'Impatient', 'Confident', 'Revenge'];

  // Handle upload thumbnail for trade screenshot
  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setScreenshot(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setDate(new Date().toISOString().slice(0, 16));
    setPair('');
    setSide('BUY');
    setEntry('');
    setExit('');
    setLots('');
    setFees('');
    setPnl('');
    setSetup('Order Block');
    setMindset('Disciplined');
    setNotes('');
    setScreenshot(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (trade: Trade) => {
    setEditingId(trade.id);
    // Format date local
    const dateStr = trade.date.replace(' ', 'T').substring(0, 16);
    setDate(dateStr);
    setPair(trade.pair);
    setSide(trade.side);
    setEntry(trade.entry.toString());
    setExit(trade.exit.toString());
    setLots(trade.lots.toString());
    setFees(trade.fees.toString());
    setPnl(trade.pnl.toString());
    setSetup(trade.setup);
    setMindset(trade.mindset);
    setNotes(trade.notes);
    setScreenshot(trade.screenshot_url || null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair.trim() || !pnl) {
      customAlert('Données Requises', 'Veuillez remplir les informations obligatoires (Paire et profit)');
      return;
    }

    const tradeData: Partial<Trade> = {
      date: date.replace('T', ' '),
      pair: pair.trim().toUpperCase(),
      side,
      entry: parseFloat(entry) || 0,
      exit: parseFloat(exit) || 0,
      lots: parseFloat(lots) || 0.01,
      fees: parseFloat(fees) || 0,
      pnl: parseFloat(pnl) || 0,
      setup,
      mindset,
      notes: notes.trim(),
      screenshot_url: screenshot || undefined
    };

    if (editingId) {
      onEditTrade(editingId, tradeData);
    } else {
      const newFullTrade: Trade = {
        id: 'trd_' + Date.now(),
        user_id: activeAccount.user_id,
        account_id: activeAccount.id,
        date: tradeData.date!,
        pair: tradeData.pair!,
        side: tradeData.side!,
        entry: tradeData.entry!,
        exit: tradeData.exit!,
        lots: tradeData.lots!,
        fees: tradeData.fees!,
        pnl: tradeData.pnl!,
        setup: tradeData.setup!,
        mindset: tradeData.mindset!,
        notes: tradeData.notes!,
        screenshot_url: tradeData.screenshot_url,
        created_at: new Date().toISOString()
      };
      onAddTrade(newFullTrade);
    }

    setModalOpen(false);
  };

  // Filter Trades
  const filteredTrades = trades.filter(t => {
    const term = search.toLowerCase();
    const matchSearch = 
      t.pair.toLowerCase().includes(term) ||
      t.setup.toLowerCase().includes(term) ||
      t.notes.toLowerCase().includes(term) ||
      t.mindset.toLowerCase().includes(term);

    const matchSetup = setupFilter === '' || t.setup === setupFilter;
    const matchPnl = 
      pnlFilter === 'all' ? true :
      pnlFilter === 'win' ? t.pnl > 0 : t.pnl <= 0;

    return matchSearch && matchSetup && matchPnl;
  });

  // Sort descent date by default
  const sortedFiltered = [...filteredTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 bg-black min-h-screen p-6 text-slate-200">
      
      {/* Search and Filters Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#080808] p-4 rounded-2xl border border-zinc-900 relative">
        <div className="md:col-span-4 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-300">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_pair_placeholder')}
            className="w-full pl-9 pr-4 py-2 bg-[#050505] border border-zinc-900 rounded-xl text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={setupFilter}
            onChange={(e) => setSetupFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#050505] border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]"
          >
            <option value="">{t('all_setups')}</option>
            {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={pnlFilter}
            onChange={(e) => setPnlFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#050505] border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]"
          >
            <option value="all">{t('all_results')}</option>
            <option value="win">{t('only_gains')}</option>
            <option value="loss">{t('only_losses')}</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            id="tour-add-trade"
            onClick={handleOpenNew}
            className="w-full py-2 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-lg shadow-[#00FF9C]/10"
          >
            <Plus size={14} /> {t('add_trade')}
          </button>
        </div>
      </div>

      {/* Trades Grid Container */}
      {sortedFiltered.length > 0 ? (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {sortedFiltered.map((t) => (
              <motion.div 
                key={t.id}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, y: -20 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 30,
                  layout: { type: "spring", stiffness: 350, damping: 30 }
                }}
                className="bg-[#080808] rounded-2xl border border-zinc-900 overflow-hidden flex flex-col justify-between hover:scale-[1.015] hover:shadow-xl hover:shadow-black/70 hover:border-[#00FF9C]/40 transition-all duration-300 p-4 space-y-4"
              >
                
                {/* Card top */}
                <div className="flex justify-between items-start border-b border-zinc-800/30 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-white font-mono">{t.pair}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                        t.side === 'BUY' ? 'bg-emerald-500/10 text-[#00FF9C]' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {t.side}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar size={11} /> {t.date}
                    </span>
                  </div>
                  
                  {/* Result Tag Badge */}
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                    t.pnl >= 0 ? 'bg-[#00FF9C]/10 text-[#00FF9C] border border-[#00FF9C]/25' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                  }`}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </div>
                </div>

                {/* Screenshot thumbnail if available */}
                {t.screenshot_url && (
                  <div 
                    onClick={() => setActiveLightboxImage(t.screenshot_url!)}
                    className="h-32 bg-[#080808] border border-zinc-900 rounded-xl overflow-hidden cursor-zoom-in group relative"
                  >
                    <img src={t.screenshot_url} alt="Visual Screenshot" className="w-[102%] h-[102%] object-cover group-hover:scale-[1.03] transition-all" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-mono transition-all">
                      <ImageIcon size={16} className="mr-1.5" /> Agrandir
                    </div>
                  </div>
                )}

                {/* Data grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-3 font-mono text-xs text-left bg-[#080808]/40 p-2.5 rounded-xl border border-zinc-800/40">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Entrée :</span>
                    <span className="text-slate-200 font-bold">{t.entry || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Sortie :</span>
                    <span className="text-slate-200 font-bold">{t.exit || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Lots :</span>
                    <span className="text-slate-200 font-bold">{t.lots} lot</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Frais :</span>
                    <span className="text-slate-400">${t.fees.toFixed(2)}</span>
                  </div>
                </div>

                {/* Setup and mindset tags */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#00FF9C]/10 text-[#00FF9C] border border-[#00FF9C]/15">
                    🏷️ {t.setup}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/10">
                    🧠 {t.mindset}
                  </span>
                </div>

                {/* Observations notes */}
                {t.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950/15 p-2 rounded-lg italic leading-relaxed border-l-2 border-[#00FF9C]">
                    "{t.notes}"
                  </p>
                )}

                {/* Action strips */}
                <div className="flex justify-end gap-1.5 pt-3 border-t border-zinc-800/30">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(t)}
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => { (window as any).showCustomConfirm('Confirmation de suppression', 'Êtes-vous sûr de vouloir supprimer définitivement ce trade ? Cette action est irréversible.', () => onDeleteTrade(t.id)); }}
                    className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl space-y-2">
          <FileText size={44} className="mx-auto text-slate-600 animate-bounce" />
          <h4 className="text-slate-200 font-bold text-sm">Aucun trade ne correspond à vos filtres</h4>
          <p className="text-xs text-slate-400">Ajoutez de nouveaux trades ou ajustez les critères de recherche.</p>
        </div>
      )}

      {/* STUNNING LIGHTBOX VIEWER */}
      {activeLightboxImage && (
        <div 
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="absolute top-5 right-5 text-white/70 hover:text-white cursor-pointer bg-slate-900/40 p-2 rounded-full">
            <X size={24} />
          </div>
          <img src={activeLightboxImage} alt="Fullscreen Graph" className="max-w-full max-h-[92vh] object-contain rounded-lg border border-slate-800 shadow-2xl" />
        </div>
      )}

      {/* PREMIUM MODAL: CREATION & EDITION FORM */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-xl w-full bg-[#0c0c0e] rounded-2xl border border-zinc-850 p-6 md:p-8 space-y-5 animate-scale-in relative">
            
            <div className="flex justify-between items-center border-b border-zinc-800/40 pb-4">
              <h4 className="text-base font-black font-mono text-white tracking-widest uppercase">
                {editingId ? 'Modifier les spécifications d\'un Trade' : 'Ajouter un Enregistrement Trade'}
              </h4>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#0c0c0e] border border-zinc-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">DATE ET HEURE</label>
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">ACTIF / PAIRE *</label>
                  <input
                    type="text"
                    value={pair}
                    onChange={(e) => setPair(e.target.value)}
                    placeholder="EUR/USD, BTC/USDT, GOLD"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Action BUY/SELL Switcher */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono block">DIRECTION (*)</label>
                  <div className="flex bg-black p-1 border border-zinc-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSide('BUY')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        side === 'BUY' ? 'bg-[#00FF9C]/20 text-[#00FF9C] border border-[#00FF9C]/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide('SELL')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        side === 'SELL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">PRIX D'ENTRÉE</label>
                  <input
                    type="number"
                    step="any"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    placeholder="1.08250"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">PRIX DE SORTIE</label>
                  <input
                    type="number"
                    step="any"
                    value={exit}
                    onChange={(e) => setExit(e.target.value)}
                    placeholder="1.08500"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
                  />
                </div>
              </div>

              {/* PnL Size metrics block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">LOTS / VOLUME</label>
                  <input
                    type="number"
                    step="any"
                    value={lots}
                    onChange={(e) => setLots(e.target.value)}
                    placeholder="1.00 lot"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">FRAIS / SPREAD ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="7.50"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#00FF9C] font-mono"
                  />
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">NET PROFIT / PERTE ($) *</label>
                  <input
                    type="number"
                    step="any"
                    value={pnl}
                    onChange={(e) => setPnl(e.target.value)}
                    placeholder="Ex: +150 ou -40"
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 text-white placeholder-zinc-650 text-xs font-bold focus:outline-none focus:border-[#00FF9C] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Setups Tag selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">CONCEPTS / SETUPS</label>
                  <select
                    value={setup}
                    onChange={(e) => setSetup(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]"
                  >
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">PSYCHOLOGIE / MINDSET</label>
                  <select
                    value={mindset}
                    onChange={(e) => setMindset(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white text-xs focus:outline-none focus:border-[#00FF9C]"
                  >
                    {MINDSETS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Description comments */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">OBSERVATIONS / RECITS DU TRADING</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Expliquez la structure du marché et la raison de votre entrée / sortie..."
                  className="w-full px-4 py-2.5 bg-black border border-zinc-900 rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#00FF9C] leading-relaxed font-sans"
                />
              </div>

              {/* Interactive screenshot drag are file */}
              <div className="space-y-1 bg-black p-4 border border-zinc-900 rounded-xl">
                <label className="text-[11px] text-slate-300 font-bold font-mono uppercase block mb-1">Capture d'écran de Graphique (Optionnel)</label>
                <div className="relative border border-dashed border-zinc-800 hover:border-[#00FF9C]/50 rounded-lg p-3 text-center transition-all cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {!screenshot ? (
                    <div className="flex flex-col items-center gap-1">
                      <Upload size={18} className="text-slate-500" />
                      <span className="text-[11px] text-slate-400 font-medium">Uploader le snapshot trading</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={screenshot} alt="Screenshot loading" className="w-10 h-10 object-cover rounded border border-[#00FF9C]/40" />
                        <span className="text-[11px] text-[#00FF9C] font-mono">trade_snapshot_saved.png</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setScreenshot(null)}
                        className="text-[10px] text-red-400 font-semibold underline"
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex pt-4 gap-2 border-t border-zinc-800/20">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-slate-400 text-xs hover:bg-slate-900 text-center font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#00FF9C] hover:bg-[#00D180] text-black rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 shadow-md shadow-[#00FF9C]/10 transition-all duration-300"
                >
                  <Sparkles size={14} /> Enregistrer le Trade
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
