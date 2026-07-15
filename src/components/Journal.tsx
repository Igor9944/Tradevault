import React, { useState } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, Calendar, FileText, Settings, X, ChevronRight, Upload, Sparkles, Image as ImageIcon, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [session, setSession] = useState<string | null>(null); // Added session field
  const [rrRatio, setRrRatio] = useState<number | null>(null); // Added rr_ratio field
  const [riskPercent, setRiskPercent] = useState<number | null>(null); // Added risk_percent field
  const [grade, setGrade] = useState<string | null>(null); // Added grade field
  const [tags, setTags] = useState<string[]>([]); // Added tags field

  // Lightbox
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const SETUPS = ['Order Block', 'Breaker', 'FVG', 'Liquidity Sweep', 'Supply/Demand', 'Trendline'];
  const MINDSETS = ['Disciplined', 'FOMO', 'Impatient', 'Confident', 'Revenge'];

  // Mindset to emotion mapping
  const MINDSET_TO_EMOTION: { [key: string]: string } = {
    'Disciplined': 'Discipliné',
    'FOMO': 'FOMO',
    'Impatient': 'Anxieux', // Closest match
    'Confident': 'Confiant',
    'Revenge': 'Revanche'
  };

  const [isSaving, setIsSaving] = useState(false);

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
    setSession(null); // Reset session
    setRrRatio(null); // Reset rr_ratio
    setRiskPercent(null); // Reset risk_percent
    setGrade(null); // Reset grade
    setTags([]); // Reset tags

    // Auto-restore draft for new notes if exists
    const draft = localStorage.getItem('tv_journal_draft_notes_new');
    setNotes(draft || '');

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
    setNotes(notes !== null ? notes : trade.notes);
    setScreenshot(trade.screenshot_url || null);
    setSession(trade.session || null);
    setRrRatio(trade.rr_ratio ?? null);
    setRiskPercent(trade.risk_percent ?? null);
    setGrade(trade.grade ?? null);
    setTags(trade.tags || []);

    // Auto-restore draft for this trade or fall back to original note
    const draft = localStorage.getItem(`tv_journal_draft_notes_${trade.id}`);
    setNotes(draft !== null ? draft : trade.notes);

    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pair.trim() || !pnl) {
      customAlert('Données Requises', 'Veuillez remplir les informations obligatoires (Paire et profit)');
      return;
    }

    try {
      setIsSaving(true);

      // Calculate session based on time of day (simplified)
      // In a real app, you'd use proper timezone detection
      let calculatedSession = session;
      if (!calculatedSession) {
        const hour = new Date(date).getUTCHours(); // Using UTC for simplicity
        if (hour >= 0 && hour < 8) calculatedSession = 'Asian';
        else if (hour >= 8 && hour < 16) calculatedSession = 'London';
        else if (hour >= 16 && hour < 24) calculatedSession = 'New York';
        // Note: This is a simplification - proper session detection would need exchange times and timezone
      }

      // Map mindset to emotion
      const emotion = MINDSET_TO_EMOTION[mindset] || 'Neutre'; // Default to Neutre if not found

      // Prepare trade object with DB schema field names
      const tradeData = {
        accountId: activeAccount.id,
        userId: activeAccount.user_id,
        symbol: pair.trim().toUpperCase(),
        side: side.toLowerCase() as 'buy' | 'sell',
        entry_price: parseFloat(entry) || 0,
        exit_price: parseFloat(exit) || 0,
        size_lots: parseFloat(lots) || 0.01,
        profit_loss: parseFloat(pnl) || 0,
        trade_date: date.split('T')[0], // YYYY-MM-DD part
        execution_time_entry: date.replace(' ', 'T') + ':00Z', // ISO timestamp
        execution_time_exit: null, // Not available yet for open trades
        session: calculatedSession,
        emotion: emotion as 'Neutre' | 'Confiant' | 'Anxieux' | 'FOMO' | 'Revanche' | 'Discipliné',
        setup: setup,
        notes: notes.trim(),
        screenshot_urls: screenshot ? [screenshot] : [],
        rr_ratio: rrRatio,
        risk_percent: riskPercent,
        grade: grade,
        tags: tags,
        // result will be computed by the proxy based on profit_loss
      };

      if (editingId) {
        await onEditTrade(editingId, tradeData);
        localStorage.removeItem(`tv_journal_draft_notes_${editingId}`);
      } else {
        const generatedId = 'trd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const newFullTrade = {
          ...tradeData,
          id: generatedId,
          created_at: new Date().toISOString()
        };
        await onAddTrade(newFullTrade);
        localStorage.removeItem('tv_journal_draft_notes_new');
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Journal save error:", err);
      customAlert('Erreur', 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Trades
  const filteredTrades = trades.filter(t => {
    const term = search.toLowerCase();
    const matchSearch =
      t.symbol.toLowerCase().includes(term) ||
      t.setup.toLowerCase().includes(term) ||
      t.notes.toLowerCase().includes(term) ||
      t.emotion.toLowerCase().includes(term);

    const matchSetup = setupFilter === '' || t.setup === setupFilter;
    const matchPnl =
      pnlFilter === 'all' ? true :
      pnlFilter === 'win' ? t.pnl > 0 : t.pnl <= 0;

    return matchSearch && matchSetup && matchPnl;
  });

  // Sort descent date by default
  const sortedFiltered = [...filteredTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleExportPDF = () => {
    if (sortedFiltered.length === 0) {
      customAlert('Export impossible', 'Il n\'y a aucun trade à exporter avec les filtres actuels.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [15, 23, 42]; // Slate 900

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('TRADEVAULT — JOURNAL DE TRADING', 14, 20);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Compte actif : ${activeAccount.name} (${activeAccount.account_type === 'personal' ? 'Personnel' : 'Prop Firm'})`, 14, 26);
    doc.text(`Date de génération : ${new Date().toLocaleString('fr-FR')}`, 14, 31);

    // Separator
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.5);
    doc.line(14, 35, 283, 35);

    // Calculations
    const totalTrades = sortedFiltered.length;
    const wins = sortedFiltered.filter(t => t.profit_loss > 0).length;
    const losses = sortedFiltered.filter(t => t.profit_loss < 0).length;
    const winRate = totalTrades > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(1) : '0.0';
    const totalPnl = sortedFiltered.reduce((sum, t) => sum + t.profit_loss, 0);
    const totalFees = sortedFiltered.reduce((sum, t) => sum + t.fees, 0);
    const netProfit = totalPnl - totalFees;

    // Stats Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RÉSUMÉ DES STATISTIQUES (SÉLECTION ACTUELLE) :', 14, 43);

    // Stats Background Card
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(14, 46, 269, 18, 2, 2, 'F');

    // Stats Labels
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text('Trades Totaux', 20, 52);
    doc.text('Gains / Pertes', 75, 52);
    doc.text('Taux de Réussite', 135, 52);
    doc.text('Total Frais', 200, 52);
    doc.text('Profit Net (après frais)', 245, 52);

    // Stats Values
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(`${totalTrades}`, 20, 59);

    if (totalPnl >= 0) {
      doc.setTextColor(16, 124, 65); // Green
    } else {
      doc.setTextColor(180, 35, 24); // Red
    }
    doc.text(`$${totalPnl.toFixed(2)}`, 75, 59);

    doc.setTextColor(15, 23, 42);
    doc.text(`${winRate}%`, 135, 59);

    doc.text(`$${totalFees.toFixed(2)}`, 200, 59);

    if (netProfit >= 0) {
      doc.setTextColor(16, 124, 65); // Green
    } else {
      doc.setTextColor(180, 35, 24); // Red
    }
    doc.text(`$${netProfit.toFixed(2)}`, 245, 59);

    // Table headers
    const headers = [
      ['Date', 'Paire', 'Sens', 'Lots', 'Entrée', 'Sortie', 'Frais', 'P&L Brut', 'Net', 'Setup / Mindset', 'Notes / Observations']
    ];

    // Table data
    const data = sortedFiltered.map(t => {
      const netTrade = t.profit_loss - t.fees;
      return [
        t.date,
        t.symbol,
        t.side,
        t.lots.toString(),
        t.entry_price ? t.entry_price.toString() : '—',
        t.exit_price ? t.exit_price.toString() : '—',
        `$${t.fees.toFixed(2)}`,
        `$${t.profit_loss.toFixed(2)}`,
        `$${netTrade.toFixed(2)}`,
        `${t.setup}\n[${t.emotion}]`,
        t.notes || '—'
      ];
    });

    autoTable(doc, {
      startY: 70,
      head: headers,
      body: data,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 26, halign: 'center' }, // Date
        1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }, // Paire
        2: { cellWidth: 12, halign: 'center' }, // Sens
        3: { cellWidth: 12, halign: 'center' }, // Lots
        4: { cellWidth: 18, halign: 'right' }, // Entrée
        5: { cellWidth: 18, halign: 'right' }, // Sortie
        6: { cellWidth: 14, halign: 'right' }, // Frais
        7: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, // Brut
        8: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }, // Net
        9: { cellWidth: 26 }, // Setup & Mindset
        10: { cellWidth: 'auto' } // Notes
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      didParseCell: (dataCell) => {
        if (dataCell.section === 'body' && dataCell.column.index === 2) {
          if (dataCell.cell.raw === 'BUY') {
            dataCell.cell.styles.textColor = [16, 124, 65];
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (dataCell.cell.raw === 'SELL') {
            dataCell.cell.styles.textColor = [180, 35, 24];
            dataCell.cell.styles.fontStyle = 'bold';
          }
        }
        if (dataCell.section === 'body' && (dataCell.column.index === 7 || dataCell.column.index === 8)) {
          const valStr = dataCell.cell.raw ? dataCell.cell.raw.toString() : '';
          if (valStr.includes('-')) {
            dataCell.cell.styles.textColor = [180, 35, 24];
          } else if (valStr !== '$0.00' && valStr !== '—') {
            dataCell.cell.styles.textColor = [16, 124, 65];
          }
        }
      },
      margin: { left: 14, right: 14 },
      pageBreak: 'auto'
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`Page ${i} sur ${pageCount}`, 283 - 14, 210 - 10, { align: 'right' });
      doc.text('Généré de manière sécurisée par TradeVault', 14, 210 - 10);
    }

    const filename = `TradeVault_Journal_${activeAccount.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-6 text-slate-200">

      {/* Search and Filters Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[var(--bg-secondary)] p-4 rounded-2xl border border-white/[0.06] relative">
        <div className="md:col-span-3 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-300">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_pair_placeholder')}
            className="w-full pl-9 pr-4 py-2 bg-[#050505] border border-white/[0.06] rounded-xl text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <select
            value={setupFilter}
            onChange={(e) => setSetupFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#050505] border border-white/[0.06] rounded-xl text-white text-xs focus:outline-none focus:border-[#3DDC97]"
          >
            <option value="">{t('all_setups')}</option>
            {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="md:col-span-2">
          <select
            value={pnlFilter}
            onChange={(e) => setPnlFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#050505] border border-white/[0.06] rounded-xl text-white text-xs focus:outline-none focus:border-[#3DDC97]"
          >
            <option value="all">{t('all_results')}</option>
            <option value="win">{t('only_gains')}</option>
            <option value="loss">{t('only_losses')}</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={handleExportPDF}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <FileDown size={14} /> {t('export_pdf')}
          </button>
        </div>

        <div className="md:col-span-3">
          <button
            type="button"
            id="tour-add-trade"
            onClick={handleOpenNew}
            className="w-full py-2 bg-[#3DDC97] hover:bg-[#2BB87E] text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-lg shadow-[#3DDC97]/10"
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
                className="bg-[var(--bg-secondary)] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col justify-between hover:scale-[1.015] hover:shadow-xl hover:shadow-black/70 hover:border-[#3DDC97]/40 transition-all duration-300 p-4 space-y-4"
              >

                {/* Card top */}
                <div className="flex justify-between items-start border-b border-zinc-800/30 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-white font-mono">{t.pair}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                        t.side === 'BUY' ? 'bg-emerald-500/10 text-[#52D17C]' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {t.side}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar size={11} /> {t.date}
                    </span>
                  </span>

                  {/* Result Tag Badge */}
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                    t.profit_loss >= 0 ? 'bg-[#52D17C]/10 text-[#52D17C] border border-[#52D17C]/25' : 'bg-rose-500/10 text-[#E8544F] border border-rose-500/25'
                  }`}>
                    {t.profit_loss >= 0 ? '+' : ''}${t.profit_loss.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Screenshot thumbnail if available */}
              {t.screenshot_urls && t.screenshot_urls.length > 0 && (
                <div
                  onClick={() => setActiveLightboxImage(t.screenshot_urls[0]!)}
                  className="h-32 bg-[var(--bg-secondary)] border border-white/[0.06] rounded-xl overflow-hidden cursor-zoom-in group relative"
                >
                  <img src={t.screenshot_urls[0]} alt="Visual Screenshot" className="w-[102%] h-[102%] object-cover group-hover:scale-[1.03] transition-all" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-mono transition-all">
                    <ImageIcon size={16} className="mr-1.5" /> Agrandir
                  </div>
                </div>
              )}

              {/* Data grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 font-mono text-xs text-left bg-[var(--bg-secondary)]/40 p-2.5 rounded-xl border border-white/[0.06]">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Entrée :</span>
                  <span className="text-slate-200 font-bold">{t.entry_price || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Sortie :</span>
                  <span className="text-slate-200 font-bold">{t.exit_price || '—'}</span>
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
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#3DDC97]/10 text-[#3DDC97] border border-[#3DDC97]/15">
                  🏷️ {t.setup}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/10">
                  🧠 {t.emotion}
                </span>
              </div>

              {/* Observations notes */}
              {t.notes && (
                <p className="text-xs text-slate-400 bg-slate-950/15 p-2 rounded-lg italic leading-relaxed border-l-2 border-[#3DDC97]">
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
          <div className="max-w-xl w-full bg-[#0c0c0e] rounded-2xl border border-white/[0.06] p-6 md:p-8 space-y-5 animate-scale-in relative">

            <div className="flex justify-between items-center border-b border-zinc-800/40 pb-4">
              <h4 className="text-base font-black font-mono text-white tracking-widest uppercase">
                {editingId ? 'Modifier les spécifications d\'un Trade' : 'Ajouter un Enregistrement Trade'}
              </h4>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#0c0c0e] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
                    required
                  />
                </div>
              </div>

              {/* Action BUY/SELL Switcher */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono block">DIRECTION (*)</label>
                  <div className="flex bg-black p-1 border border-white/[0.06] rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSide('BUY')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        side === 'BUY' ? 'bg-[#52D17C]/20 text-[#52D17C] border border-[#52D17C]/20' : 'text-slate-500 hover:text-slate-300'
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] text-white placeholder-zinc-650 text-xs font-bold focus:outline-none focus:border-[#3DDC97] font-mono"
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
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white text-xs focus:outline-none focus:border-[#3DDC97]"
                  >
                    {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-semibold font-mono">PSYCHOLOGIE / MINDSET</label>
                  <select
                    value={mindset}
                    onChange={(e) => setMindset(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white text-xs focus:outline-none focus:border-[#3DDC97]"
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes(val);
                    if (editingId) {
                      onEditTrade(editingId, { notes: val });
                      localStorage.setItem(`tv_journal_draft_notes_${editingId}`, val);
                    } else {
                      localStorage.setItem('tv_journal_draft_notes_new', val);
                    }
                  }}
                  rows={2}
                  placeholder="Expliquez la structure du marché et la raison de votre entrée / sortie..."
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] leading-relaxed font-sans"
                />
              </div>

              {/* Session selector */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">SESSION DE TRADING</label>
                <select
                  value={session || ''}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white text-xs focus:outline-none focus:border-[#3DDC97]"
                >
                  <option value="">Sélectionner une session</option>
                  <option value="Asian">Asian (00:00-08:00 UTC)</option>
                  <option value="London">London (08:00-16:00 UTC)</option>
                  <option value="New York">New York (16:00-24:00 UTC)</option>
                </select>
              </div>

              {/* RR Ratio input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">RATIO RÉCOMPENSE/RISQUE</label>
                <input
                  type="number"
                  step="any"
                  value={rrRatio !== null ? rrRatio : ''}
                  onChange={(e) => setRrRatio(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="Ex: 2.0"
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
                />
              </div>

              {/* Risk Percent input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">PRISE DE RISQUE (%)</label>
                <input
                  type="number"
                  step="any"
                  value={riskPercent !== null ? riskPercent : ''}
                  onChange={(e) => setRiskPercent(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="Ex: 2.0"
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
                />
              </div>

              {/* Grade input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">NOTE DU TRADE (A+, A, B, etc.)</label>
                <input
                  type="text"
                  value={grade || ''}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Ex: A+"
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
                />
              </div>

              {/* Tags input */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">TAGS (séparés par des virgules)</label>
                <input
                  type="text"
                  value={tags.join(', ')}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setTags(val ? val.split(',').map(t => t.trim()).filter(t => t.length > 0) : []);
                  }}
                  placeholder="Ex: swing, breakout, news"
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] font-mono"
                />
              </div>

              {/* Description comments */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold font-mono">OBSERVATIONS / RECITS DU TRADING</label>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes(val);
                    if (editingId) {
                      onEditTrade(editingId, { notes: val });
                      localStorage.setItem(`tv_journal_draft_notes_${editingId}`, val);
                    } else {
                      localStorage.setItem('tv_journal_draft_notes_new', val);
                    }
                  }}
                  rows={2}
                  placeholder="Expliquez la structure du marché et la raison de votre entrée / sortie..."
                  className="w-full px-4 py-2.5 bg-black border border-white/[0.06] rounded-xl text-white placeholder-slate-650 text-xs focus:outline-none focus:border-[#3DDC97] leading-relaxed font-sans"
                />
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
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#3DDC97] hover:bg-[#2BB87E] disabled:bg-slate-800 disabled:text-slate-500 text-black rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-md shadow-[#3DDC97]/10 transition-all duration-300"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-900 border-t-black rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Enregistrer le Trade
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}