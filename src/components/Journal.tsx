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
    // Format date local (Trade.date is YYYY-MM-DD format)
    const dateStr = `${trade.date}T00:00`; // Set to midnight for the time input
    setDate(dateStr);
    setPair(trade.pair);
    setSide(trade.side.toUpperCase() as 'BUY' | 'SELL');
    setEntry(trade.entry.toString());
    setExit(trade.exit.toString());
    setLots(trade.lots.toString());
    setFees(trade.fees.toString());
    setPnl(trade.pnl.toString());
    setSetup(trade.setup);
    setMindset(trade.mindset);
    // Map emotion from English (database) to French (form state)
    const emotionMapReverse: { [key: string]: string } = {
      'fomo': 'FOMO',
      'revenge': 'Revanche',
      'boredom': 'Anxieux',
      'fear': 'Anxieux',
      'greed': 'FOMO',
      'patience': 'Disciplined',
      'discipline': 'Disciplined',
      'tilt': 'FOMO',
      'confident': 'Confident',
      'hesitant': 'Anxieux'
    };
    const frenchEmotion = emotionMapReverse[trade.emotion || ''] || 'Disciplined';
    // Find the matching mindset value from our predefined list
    const matchingMindset = MINDSETS.find(m => m === frenchEmotion) || 'Disciplined';
    setMindset(matchingMindset);
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
        if (hour >= 0 && hour < 8) calculatedSession = 'asian';
        else if (hour >= 8 && hour < 16) calculatedSession = 'london';
        else if (hour >= 16 && hour < 24) calculatedSession = 'new_york';
        // Note: This is a simplification - proper session detection would need exchange times and timezone
      }

      // Map mindset to emotion (English values for Trade interface)
      const emotionMap: { [key: string]: 'fomo' | 'revenge' | 'boredom' | 'fear' | 'greed' | 'patience' | 'discipline' | 'tilt' | 'confident' | 'hesitant' } = {
        'Disciplined': 'discipline',
        'FOMO': 'fomo',
        'Impatient': 'boredom', // Closest match
        'Confident': 'confident',
        'Revenge': 'revenge'
      };
      const emotion = emotionMap[mindset] || 'hesitant'; // Default to hesitant if not found

      // Prepare trade object with DB schema field names
      const tradeData = {
        account_id: activeAccount.id,
        user_id: activeAccount.user_id,
        pair: pair.trim().toUpperCase(),
        side: side.toLowerCase() as 'buy' | 'sell',
        entry: parseFloat(entry) || 0,
        exit: parseFloat(exit) || 0,
        lots: parseFloat(lots) || 0.01,
        fees: parseFloat(fees) || 0,
        pnl: parseFloat(pnl) || 0,
        date: date.split('T')[0], // YYYY-MM-DD part
        setup: setup,
        mindset: mindset,
        notes: notes.trim(),
        screenshot_url: screenshot || undefined,
        emotion: emotion as 'fomo' | 'revenge' | 'boredom' | 'fear' | 'greed' | 'patience' | 'discipline' | 'tilt' | 'confident' | 'hesitant',
        session: (calculatedSession ?? undefined) as 'london' | 'new_york' | 'tokyo' | 'sydney' | 'asian' | undefined,
        rr_ratio: rrRatio ?? undefined,
        risk_percent: riskPercent ?? undefined,
        grade: grade ?? undefined,
        tags: tags || undefined,
        // created_at will be set by the addTrade/updateTrade functions
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
      t.pair.toLowerCase().includes(term) ||
      t.setup.toLowerCase().includes(term) ||
      t.notes.toLowerCase().includes(term) ||
      (t.emotion && t.emotion.toLowerCase().includes(term));

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
    const wins = sortedFiltered.filter(t => t.pnl > 0).length;
    const losses = sortedFiltered.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? ((wins / (wins + losses || 1)) * 100).toFixed(1) : '0.0';
    const totalPnl = sortedFiltered.reduce((sum, t) => sum + t.pnl, 0);
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
      const netTrade = t.pnl - t.fees;
      return [
        t.date,
        t.pair,
        t.side.toUpperCase(),
        t.lots.toString(),
        t.entry ? t.entry.toString() : '—',
        t.exit ? t.exit.toString() : '—',
        `$${t.fees.toFixed(2)}`,
        `$${t.pnl.toFixed(2)}`,
        `$${netTrade.toFixed(2)}`,
        `${t.setup}\n[${t.emotion || '—'}]`,
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
          if (dataCell.cell.raw === 'buy') {
            dataCell.cell.styles.textColor = [16, 124, 65];
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (dataCell.cell.raw === 'sell') {
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold font-mono tracking-wider text-white">{t(
            'trade_journal'
          )}</h1>
          <p className="text-[13px] text-slate-400">{t('journal_subtitle')}</p>
        </div>
        <div className="flex sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleOpenNew}
            disabled={isSaving}
            className="flex-1 min-w-[120px] px-4 py-3 bg-[var(--accent)]/20 rounded-xl border border-[var(--accent)]/30 text-[var(--accent)] font-mono text-[13px] hover:bg-[var(--accent)]/30 transition-all"
          >
            {t('new_trade')}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isSaving || sortedFiltered.length === 0}
            className="flex-1 min-w-[120px] px-4 py-3 bg-[var(--secondary)]/20 rounded-xl border border-[var(--secondary)]/30 text-[var(--secondary)] font-mono text-[13px] hover:bg-[var(--secondary)]/30 transition-all"
          >
            {t('export_pdf')}
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[var(--bg-secondary)]/50 rounded-xl p-4 border border-white/[0.03] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_trades')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 w-[200px] sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={setupFilter}
              onChange={(e) => setSetupFilter(e.target.value)}
              className="bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              <option value="">{t('all_setups')}</option>
              {SETUPS.map((setup) => (
                <option key={setup} value={setup}>
                  {setup}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={pnlFilter}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all' || value === 'win' || value === 'loss') {
                  setPnlFilter(value);
                }
              }}
              className="bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            >
              <option value="all">{t('all')}</option>
              <option value="win">{t('profit')}</option>
              <option value="loss">{t('loss')}</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end text-[11px] text-slate-500">
          {t('showing')} {sortedFiltered.length} {t('of')} {trades.length} {t('trades')}
        </div>
      </motion.div>

      {/* Trades List or Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="min-h-[200px]"
      >
        {sortedFiltered.length > 0 ? (
          <div className="space-y-3">
            {sortedFiltered.map((trade) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + trade.id.length * 0.01 }}
                className="bg-[var(--bg-secondary)]/50 rounded-xl p-4 border border-white/[0.03] cursor-pointer hover:bg-[var(--bg-secondary)]/70 transition-all"
                onClick={() => handleOpenEdit(trade)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono ${
                            trade.side.toUpperCase() === 'BUY'
                              ? 'bg-[#52D17C]/20 text-[#52D17C]'
                              : 'bg-[#E8544F]/20 text-[#E8544F]'
                          }`}
                        >
                          {trade.side.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-mono text-white">
                            {trade.pair}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {trade.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-mono">
                        {trade.pnl >= 0 ? (
                          <span className="text-[#52D17C]">+${trade.pnl.toFixed(
                            2
                          )}</span>
                        ) : (
                          <span className="text-[#E8544F]">${trade.pnl.toFixed(
                            2
                          )}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {trade.setup} • {trade.emotion?.toUpperCase() || '—'}
                  </div>
                </div>
                {trade.notes && (
                  <p className="mt-2 text-[12px] text-slate-300 line-clamp-2">
                    {trade.notes}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-[14px] text-slate-400">{t('no_trades_found')}</p>
            <p className="text-[12px] text-slate-500">
              {t('no_trades_filterHint')}
            </p>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-secondary)]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/[0.08] w-full max-w-2xl mx-4"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-mono text-white">
                  {editingId ? t('edit_trade') : t('add_trade')}
                </h2>
                <button
                  onClick={() => {
                    setModalOpen(false);
                    setIsSaving(false);
                  }}
                  className="text-[12px] text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date & Pair */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('date')}
                    </label>
                    <input
                      type="datetime-local"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('pair')}
                    </label>
                    <input
                      type="text"
                      value={pair}
                      onChange={(e) => setPair(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Side & Lots */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('side')}
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="BUY"
                          checked={side === 'BUY'}
                          onChange={(e) => setSide(e.target.value as 'BUY')}
                          className="h-3 w-3 text-[var(--accent)]"
                        />
                        <span className="text-[12px] text-slate-200">BUY</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="SELL"
                          checked={side === 'SELL'}
                          onChange={(e) => setSide(e.target.value as 'SELL')}
                          className="h-3 w-3 text-[var(--accent)]"
                        />
                        <span className="text-[12px] text-slate-200">SELL</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('lots')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={lots}
                      onChange={(e) => setLots(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Entry & Exit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('entry_price')}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={entry}
                      onChange={(e) => setEntry(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('exit_price')}
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={exit}
                      onChange={(e) => setExit(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Fees & P&L */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('fees')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fees}
                      onChange={(e) => setFees(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('pnl')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pnl}
                      onChange={(e) => setPnl(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Setup & Mindset */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('setup')}
                    </label>
                    <select
                      value={setup}
                      onChange={(e) => setSetup(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    >
                      {SETUPS.map((setupName) => (
                        <option key={setupName} value={setupName}>
                          {setupName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('mindset')}
                    </label>
                    <select
                      value={mindset}
                      onChange={(e) => setMindset(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    >
                      {MINDSETS.map((mindsetName) => (
                        <option key={mindsetName} value={mindsetName}>
                          {mindsetName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Session, RR Ratio, Risk % */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('session')}
                    </label>
                    <select
                      value={session || ''}
                      onChange={(e) => setSession(e.target.value || null)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    >
                      <option value="">{t('auto_detect')}</option>
                      <option value="asian">{t('asian_session')}</option>
                      <option value="london">{t('london_session')}</option>
                      <option value="new_york">{t('new_york_session')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('rr_ratio')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rrRatio ?? ''}
                      onChange={(e) => setRrRatio(e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Risk % & Grade */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('risk_percent')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={riskPercent ?? ''}
                      onChange={(e) => setRiskPercent(e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                      {t('grade')}
                    </label>
                    <input
                      type="text"
                      value={grade ?? ''}
                      onChange={(e) => setGrade(e.target.value || null)}
                      className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                    {t('tags')}
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-[var(--accent)]/20 text-[var(--accent)] text-[11px] px-2 py-1 rounded-full font-mono"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const newTags = [...tags];
                            newTags.splice(index, 1);
                            setTags(newTags);
                          }}
                          className="ml-1 text-[10px] text-slate-400 hover:text-slate-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder={t('add_tag')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value.trim()) {
                            e.preventDefault();
                            setTags([...tags, input.value.trim()]);
                            input.value = '';
                          }
                        }
                      }}
                      className="mt-2 w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                    {t('notes')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      const textarea = e.target as HTMLTextAreaElement;
                      setNotes(textarea.value);
                    }}
                    className="w-full bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 h-20"
                  />
                </div>

                {/* Screenshot */}
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block font-mono">
                    {t('screenshot')}
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('screenshot-upload')?.click();
                      }}
                      className="px-4 py-2 bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg text-sm text-slate-200 hover:bg-[var(--bg-secondary)]/70 transition-colors font-mono"
                    >
                      {t('upload_screenshot')}
                    </button>
                    {screenshot && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveLightboxImage(screenshot)}
                          className="ml-3 h-8 w-8 rounded-xl overflow-hidden border border-white/[0.1]"
                        >
                          <img
                            src={screenshot}
                            alt="screenshot"
                            className="object-cover w-full h-full"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreenshot(null)}
                          className="ml-2 text-[10px] text-slate-400 hover:text-slate-200"
                        >
                          {t('remove')}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Lightbox */}
                {activeLightboxImage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setActiveLightboxImage(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.5 }}
                      className="relative z-10 max-h-[80vh] max-w-[80vw]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={activeLightboxImage}
                                        alt="screenshot"
                          className="rounded-xl max-w-full max-h-full"
                        />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxImage(null);
                        }}
                        className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-black/30 rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false);
                      setIsSaving(false);
                    }}
                    disabled={isSaving}
                    className="px-5 py-3 bg-[var(--bg-secondary)]/50 border border-white/[0.05] rounded-lg text-sm text-slate-200 hover:bg-[var(--bg-secondary)]/70 transition-colors font-mono"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !pair.trim() || !pnl}
                    className="px-5 py-3 bg-[var(--accent)]/20 border border-[var(--accent)]/30 text-[var(--accent)] font-mono text-sm hover:bg-[var(--accent)]/30 transition-colors"
                  >
                    {isSaving ? t('saving') : editingId ? t('update') : t('add_trade')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}