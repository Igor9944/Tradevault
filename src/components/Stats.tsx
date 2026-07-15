import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Trade, Account } from '../types';
import { ShieldCheck, ArrowDownToLine, ArrowUpToLine, RotateCcw, SortAsc, SortDesc, Info, HelpCircle } from 'lucide-react';
import { customAlert, customConfirm } from '../utils/customDialog';
import ChartWrapper from './ChartWrapper';

interface StatsProps {
  trades: Trade[];
  onImportTrades: (trades: Trade[]) => void;
  onResetTrades: () => void;
  activeAccount: Account;
}

export default function Stats({ trades, onImportTrades, onResetTrades, activeAccount }: StatsProps) {
  // Sorting states
  const [sortField, setSortField] = useState<'date' | 'pair' | 'side' | 'pnl' | 'setup'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [allTimeSearch, setAllTimeSearch] = useState('');

  // 1. Math ratios
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);

  const totalWinsSum = wins.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossesSum = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

  const profitFactor = totalLossesSum > 0 ? (totalWinsSum / totalLossesSum).toFixed(2) : totalWinsSum > 0 ? '∞' : '0.00';
  const avgWin = wins.length > 0 ? totalWinsSum / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLossesSum / losses.length : 0;
  const maxWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

  // Streak calculations
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  // Sort chronologically for streaks
  const chronoTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  chronoTrades.forEach(t => {
    if (t.pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
    }
  });

  // 2. Weekday Bar Chart Data
  const weekdays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const weekdayTotals = weekdays.map((day, idx) => {
    // Day index in JS: 0 is Sun, 1 is Mon, 2 is Tue...
    const dayIndexTarget = idx === 6 ? 0 : idx + 1; // map index 0..5 (Mon..Sat) to 1..6, index 6 (Sun) to 0
    const matchingTrades = trades.filter(t => {
      const d = new Date(t.date);
      return d.getDay() === dayIndexTarget;
    });
    const cumulativePnl = matchingTrades.reduce((sum, t) => sum + t.pnl, 0);
    return {
      name: day,
      Pnl: parseFloat(cumulativePnl.toFixed(2)),
      count: matchingTrades.length
    };
  });

  // 3. Strategy Setup Bar Chart Data
  const setupsList = Array.from(new Set(trades.map(t => t.setup)));
  const setupChartData = setupsList.map(setupName => {
    const setupTrades = trades.filter(t => t.setup === setupName);
    const winCount = setupTrades.filter(t => t.pnl > 0).length;
    const lossCount = setupTrades.filter(t => t.pnl <= 0).length;
    return {
      name: setupName,
      Victoires: winCount,
      Défaites: lossCount
    };
  });

  // 4. Backup & Backup trigger actions
  const handleExport = () => {
    const exportString = JSON.stringify(trades, null, 2);
    const blob = new Blob([exportString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_trades_${activeAccount.id}_2026.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (trades.length === 0) {
      customAlert("Exportation", "Aucun trade à exporter.");
      return;
    }
    
    const headers = ["Date", "Paire", "Sens", "Lots", "Entrée", "Sortie", "P&L", "Setup", "Notes"];
    const csvRows = [headers.join(",")];
    
    trades.forEach(t => {
      const row = [
        t.date, 
        t.pair, 
        t.side, 
        t.lots, 
        t.entry || "", 
        t.exit || "", 
        t.pnl, 
        t.setup ? `"${t.setup.replace(/"/g, '""')}"` : "", 
        t.notes ? `"${t.notes.replace(/"/g, '""')}"` : ""
      ];
      csvRows.push(row.join(","));
    });
    
    const blob = new Blob([csvRows.join("\n")], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trades_${activeAccount.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      if (file.name.endsWith('.csv')) {
        reader.onload = (event) => {
          try {
            const text = event.target?.result as string;
            if (!text) return;
            const rows = text.split('\n').filter(r => r.trim().length > 0);
            if (rows.length < 2) throw new Error("Fichier vide ou sans données utiles");
            
            const importedTrades: Trade[] = [];
            for (let i = 1; i < rows.length; i++) {
              // Basic CSV split ignoring quotes for now for simplified import
              const cols = rows[i].split(',');
              if (cols.length >= 7) {
                importedTrades.push({
                  id: `csv-${Date.now()}-${i}`,
                  user_id: activeAccount.user_id,
                  account_id: activeAccount.id,
                  date: cols[0],
                  pair: cols[1],
                  side: cols[2].toUpperCase().includes('SELL') ? 'SELL' : 'BUY',
                  lots: parseFloat(cols[3]) || 0.01,
                  entry: parseFloat(cols[4]) || 0,
                  exit: parseFloat(cols[5]) || 0,
                  pnl: parseFloat(cols[6]) || 0,
                  setup: cols[7] ? cols[7].replace(/""/g, '"').replace(/^"|"$/g, '') : '',
                  mindset: '',
                  notes: cols[8] ? cols[8].replace(/""/g, '"').replace(/^"|"$/g, '') : '',
                  fees: 0,
                  created_at: new Date().toISOString()
                });
              }
            }
            if (importedTrades.length > 0) {
              onImportTrades(importedTrades);
              customAlert('Importation CSV', `${importedTrades.length} trades importés avec succès !`);
            } else {
              customAlert('Importation CSV', 'Aucun format de trade valide trouvé.');
            }
          } catch (err: any) {
            customAlert('Erreur', 'Impossible de décoder le fichier CSV.');
          }
        };
        reader.readAsText(file);
        return;
      }

      reader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string) as Trade[];
            if (Array.isArray(parsed)) {
              // Standard validation check
              const valid = parsed.every(t => t.pair && t.lots !== undefined && t.pnl !== undefined);
              if (valid) {
                onImportTrades(parsed);
                customAlert('Importation', 'Données importées avec succès !');
              } else {
                customAlert('Importation', 'Fichier JSON invalide. Structure non reconnue.');
              }
            } else {
              customAlert('Importation', 'Fichier JSON invalide. Doit être un tableau de trades.');
            }
          }
        } catch {
          customAlert('Importation', 'Impossible de décoder le fichier JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Sorting Handler
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter & Sorted trades list
  const filteredAllTime = trades.filter(t => {
    const term = allTimeSearch.toLowerCase();
    return t.pair.toLowerCase().includes(term) || t.setup.toLowerCase().includes(term) || t.notes.toLowerCase().includes(term);
  });

  const sortedAllTime = [...filteredAllTime].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (sortField === 'date') {
      valA = new Date(a.date).getTime();
      valB = new Date(b.date).getTime();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 text-slate-200">

      {/* METRICS BREAKDOWN CARD MATRIX */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/[0.06]">
        <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase mb-4 border-b border-white/[0.06] pb-3">
          Statistiques Avancées
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-center">
          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-neutral-300 block uppercase mb-1">PROFIT FACTOR</span>
            <span className="text-xl font-black text-white">{profitFactor}</span>
          </div>

          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Gain Moyen</span>
            <span className="text-xl font-black text-[#52D17C]">+${avgWin.toFixed(2)}</span>
          </div>

          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Perte Moyenne</span>
            <span className="text-xl font-black text-rose-400">-${avgLoss.toFixed(2)}</span>
          </div>

          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Gains Totaux</span>
            <span className="text-xl font-black text-[#52D17C]">+${totalWinsSum.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-center mt-4">
          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Meilleur Gain</span>
            <span className="text-xl font-bold text-[#52D17C]">+${maxWin.toFixed(2)}</span>
          </div>

          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Pire Perte</span>
            <span className="text-xl font-bold text-rose-400">-${Math.abs(maxLoss).toFixed(2)}</span>
          </div>

          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Série Victorieuse Max</span>
            <span className="text-xl font-bold text-white">{longestWinStreak} Trades</span>
          </div>

          <div className="bg-[#050505] p-4 border border-white/[0.06] rounded-xl">
            <span className="text-[10px] text-slate-500 block uppercase mb-1">Série Perdante Max</span>
            <span className="text-xl font-bold text-white">{longestLossStreak} Trades</span>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* WEAKDAY NET BAR CHART */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/[0.06] shadow-md">
          <h4 className="text-xs font-black font-mono text-white tracking-widest uppercase mb-4">
            📈 P&L Net Cumulé par Jour de la Semaine
          </h4>
          <div className="h-60 w-full">
            <ChartWrapper height={240} minHeight={200}>
              <BarChart data={weekdayTotals} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52D17C" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#2BB87E" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8544F" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#D8433E" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="white/10" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: 'white/10', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                />
                <Bar dataKey="Pnl" radius={[4, 4, 0, 0]}>
                  {weekdayTotals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.Pnl >= 0 ? 'url(#colorProfit)' : 'url(#colorLoss)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
          </div>
        </div>

        {/* SETUP WIN vs LOSS RATIOS */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/[0.06] shadow-md">
          <h4 className="text-xs font-black font-mono text-white tracking-widest uppercase mb-4">
            🏷️ Taux de Succès par Concept de Stratégie Setup
          </h4>
          <div className="h-60 w-full">
            <ChartWrapper height={240} minHeight={200}>
              <BarChart data={setupChartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorVictoires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#52D17C" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#2BB87E" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="colorDefaites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8544F" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#D8433E" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                  cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Victoires" fill="url(#colorVictoires)" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="Défaites" fill="url(#colorDefaites)" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ChartWrapper>
          </div>
        </div>

      </div>

      {/* GLOBAL ARCHIVE DATA TABLE WITH TRI AND DATABASE RESET / BACKUPS */}
      <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/[0.06] space-y-4 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-black font-mono text-white tracking-widest uppercase">
              Archives Globales (All Time History)
            </h4>
            <p className="text-[10px] text-slate-400">Consultez l'ensemble de votre base de données avec des fonctions de tri interactives.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            <input
              type="text"
              value={allTimeSearch}
              onChange={(e) => setAllTimeSearch(e.target.value)}
              placeholder="Filtre rapide..."
              className="px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
            />

            <button
              type="button"
              onClick={handleExport}
              className="py-1.5 px-3 rounded-xl border border-white/5 text-slate-300 hover:bg-white/5 text-xs font-bold font-sans flex items-center gap-1 shrink-0"
            >
              <ArrowDownToLine size={13} /> Export JSON
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="py-1.5 px-3 rounded-xl border border-white/5 text-[#52D17C] hover:bg-[#52D17C]/10 text-xs font-bold font-sans flex items-center gap-1 shrink-0"
            >
              <ArrowDownToLine size={13} /> Export CSV
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <button
                type="button"
                className="py-1.5 px-3 rounded-xl border border-white/5 text-slate-300 hover:bg-white/5 text-xs font-bold font-sans flex items-center gap-1 shrink-0"
              >
                <ArrowUpToLine size={13} /> Import JSON
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                customConfirm('Réinitialisation', '⚠️ ÊTES-VOUS ABSOLUMENT SÛR DE VOULOIR SUPPRIMER TOUS LES TRADES DE CE COMPTE ?', () => {
                  onResetTrades();
                });
              }}
              className="py-1.5 px-3 rounded-xl border border-red-900/30 text-[#E8544F] hover:bg-[#E8544F]/10 text-xs font-bold font-sans flex items-center gap-1 shrink-0"
            >
              <RotateCcw size={13} /> Réinitialiser
            </button>
          </div>
        </div>

        {/* Dense Table markup with sorts */}
        <div className="overflow-x-auto border border-white/[0.06] rounded-xl bg-slate-950/30">
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="bg-slate-950 border-b border-white/[0.06] text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th onClick={() => toggleSort('date')} className="p-3 cursor-pointer hover:text-[#3DDC97]">
                  <div className="flex items-center gap-1">Date {sortField === 'date' && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}</div>
                </th>
                <th onClick={() => toggleSort('pair')} className="p-3 cursor-pointer hover:text-[#3DDC97]">
                  <div className="flex items-center gap-1">Paire {sortField === 'pair' && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}</div>
                </th>
                <th onClick={() => toggleSort('side')} className="p-3 cursor-pointer hover:text-[#3DDC97]">
                  <div className="flex items-center gap-1">Sens {sortField === 'side' && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}</div>
                </th>
                <th className="p-3">Entrée</th>
                <th className="p-3">Sortie</th>
                <th className="p-3">Lots</th>
                <th onClick={() => toggleSort('pnl')} className="p-3 cursor-pointer hover:text-[#3DDC97]">
                  <div className="flex items-center gap-1">P&L Net {sortField === 'pnl' && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}</div>
                </th>
                <th onClick={() => toggleSort('setup')} className="p-3 cursor-pointer hover:text-[#3DDC97]">
                  <div className="flex items-center gap-1">Setup / Strat {sortField === 'setup' && (sortDirection === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />)}</div>
                </th>
                <th className="p-3">Observations notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sortedAllTime.length > 0 ? (
                sortedAllTime.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 text-slate-300">
                    <td className="p-3 whitespace-nowrap text-slate-400">{t.date}</td>
                    <td className="p-3 font-bold text-white whitespace-nowrap">{t.pair}</td>
                    <td className={`p-3 whitespace-nowrap font-bold ${t.side === 'BUY' ? 'text-[#52D17C]' : 'text-[#E8544F]'}`}>
                      {t.side}
                    </td>
                    <td className="p-3 whitespace-nowrap">{t.entry || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{t.exit || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{t.lots}</td>
                    <td className={`p-3 font-extrabold whitespace-nowrap ${t.pnl >= 0 ? 'text-[#52D17C]' : 'text-[#E8544F]'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-[#3DDC97]">{t.setup}</td>
                    <td className="p-3 text-slate-400 max-w-[200px] truncate italic" title={t.notes}>
                      {t.notes || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Aucun enregistrement ne correspond à vos critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
