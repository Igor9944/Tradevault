import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MessageSquare, Plus, Info } from 'lucide-react';
import { Trade } from '../types';

interface CalendarProps {
  trades: Trade[];
}

export default function Calendar({ trades }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // Start at May 2026 to fit system constraint
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDayString(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDayString(null);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Get first day of week offset (0: Sunday, 1: Monday, ...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Shift to start week at Monday: Monday is 0, Sunday is 6
  let firstDayOffset = firstDayIndex - 1;
  if (firstDayOffset < 0) firstDayOffset = 6;

  const dayCells = [];

  // Empty cells for shift offset
  for (let i = 0; i < firstDayOffset; i++) {
    dayCells.push({ dayNumber: null, dateString: '' });
  }

  // Active days cells
  for (let day = 1; day <= totalDays; day++) {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dayCells.push({ dayNumber: day, dateString: formattedDate });
  }

  // Trades on selected day
  const selectedDayTrades = selectedDayString 
    ? trades.filter(t => t.date.startsWith(selectedDayString))
    : [];

  const selectedDayNetPnl = selectedDayTrades.reduce((sum, t) => sum + t.pnl, 0);

  return (
    <div className="space-y-6">
      
      {/* Calendar Header Card */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-900/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="text-indigo-400" size={20} />
          <div>
            <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase">Calendrier des Performances</h3>
            <p className="text-[10px] text-slate-400">Cliquez sur un jour coloré pour auditer l'historique complet de vos sessions de trading.</p>
          </div>
        </div>

        {/* Date Month Selector Nav */}
        <div className="flex bg-slate-950 px-2 py-1 border border-slate-900 rounded-xl items-center gap-3">
          <button 
            type="button" 
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-extrabold text-white font-mono min-w-[120px] text-center">
            {monthNames[month]} {year}
          </span>
          <button 
            type="button" 
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid calendar */}
      <div className="glass-panel rounded-2xl border border-indigo-900/30 p-4 font-mono select-none">
        
        {/* Weekly Header row labels */}
        <div className="grid grid-cols-7 gap-1 border-b border-indigo-950/40 pb-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mer</span>
          <span>Jeu</span>
          <span>Ven</span>
          <span>Sam</span>
          <span>Dim</span>
        </div>

        {/* Calendar days cells */}
        <div className="grid grid-cols-7 gap-1.5 mt-3">
          {dayCells.map((cell, idx) => {
            if (!cell.dayNumber) {
              return <div key={`empty-${idx}`} className="aspect-square bg-slate-950/5 border border-slate-950/20 rounded-xl"></div>;
            }

            const dayTrades = trades.filter(t => t.date.startsWith(cell.dateString));
            const dayPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);

            // Determine cell background colors based on net values
            let bgClass = 'bg-slate-900/20 border-slate-900/40 hover:border-slate-700';
            let textClass = 'text-slate-400';
            let pnlColor = 'text-slate-400';

            if (dayTrades.length > 0) {
              if (dayPnl > 0) {
                bgClass = 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50';
                textClass = 'text-emerald-300 font-bold';
                pnlColor = 'text-emerald-400 font-bold';
              } else if (dayPnl < 0) {
                bgClass = 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50';
                textClass = 'text-rose-300 font-bold';
                pnlColor = 'text-rose-400 font-bold';
              } else {
                bgClass = 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50';
                textClass = 'text-amber-300 font-bold';
                pnlColor = 'text-amber-400 font-bold';
              }
            }

            const isSelected = selectedDayString === cell.dateString;

            return (
              <div 
                key={cell.dateString}
                onClick={() => { if (dayTrades.length > 0) setSelectedDayString(cell.dateString); }}
                className={`aspect-square rounded-xl border p-2 flex flex-col justify-between transition-all relative ${
                  dayTrades.length > 0 ? 'cursor-pointer' : 'cursor-default'
                } ${bgClass} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : ''}`}
              >
                <span className={`text-xs block ${textClass}`}>{cell.dayNumber}</span>
                
                {dayTrades.length > 0 && (
                  <div className="space-y-0.5 text-right">
                    <span className="text-[9px] block font-semibold truncate leading-none">
                      {dayTrades.length}T
                    </span>
                    <span className={`text-[8.5px] block font-mono truncate tracking-tighter leading-none ${pnlColor}`}>
                      {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(0)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* DETAILED DAILY BREAKDOWN PANEL ON CLICK */}
      {selectedDayString ? (
        <div className="glass-panel rounded-2xl border border-indigo-500/30 p-6 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between border-b border-indigo-900/20 pb-4">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black font-mono text-white tracking-widest uppercase">
                Analyse du {new Date(selectedDayString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </h4>
              <p className="text-[10px] text-slate-400">Récapitulatif de la session: {selectedDayTrades.length} positions exécutées.</p>
            </div>
            
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono border ${
              selectedDayNetPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              Bilan Net : {selectedDayNetPnl >= 0 ? '+' : ''}${selectedDayNetPnl.toFixed(2)}
            </div>
          </div>

          <div className="space-y-3">
            {selectedDayTrades.map((t) => {
              const dateObj = new Date(t.date);
              const formattedTime = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={t.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  
                  <div className="flex items-start md:items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center tracking-tighter shrink-0 ${
                      t.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {t.side}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white font-mono text-xs">{t.pair}</span>
                        <span className="font-mono text-[10px] text-slate-400">à {formattedTime}</span>
                      </div>
                      <span className="text-[10px] text-indigo-400 block font-semibold tracking-wider uppercase">🏷️ Setup: {t.setup}</span>
                    </div>
                  </div>

                  {/* Lot size block */}
                  <div className="grid grid-cols-3 gap-3 md:gap-5 text-left font-mono text-[10.5px]">
                    <div>
                      <span className="text-[9px] text-slate-500 block">Lots :</span>
                      <span className="text-slate-300 font-bold">{t.lots} lot</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Entrée :</span>
                      <span className="text-slate-300">{t.entry || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Sortie :</span>
                      <span className="text-slate-300">{t.exit || '—'}</span>
                    </div>
                  </div>

                  {/* Net Profit column */}
                  <div className="flex items-center md:items-end flex-row md:flex-col justify-between md:justify-center gap-1.5 border-t border-slate-900 md:border-none pt-2 md:pt-0 shrink-0">
                    <span className={`font-mono font-extrabold text-sm ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </span>
                    {t.notes && (
                      <span className="text-[10px] text-slate-500 italic max-w-[200px] truncate block text-right">
                        "{t.notes}"
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      ) : (
        <div className="p-4 rounded-xl border border-indigo-900/10 bg-indigo-500/5 text-indigo-400 flex gap-2 text-xs">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>Aide : Pour voir les détails, veuillez cliquer sur l'un des jours colorés du calendrier qui contient des transactions.</span>
        </div>
      )}

    </div>
  );
}
