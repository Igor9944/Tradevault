import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trade, Account } from '../types';
import { DollarSign, Percent, TrendingUp, ShieldAlert, BadgeInfo, Calendar, Zap, Award } from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
  activeAccount: Account;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100 } }
};

export default function Dashboard({ trades, activeAccount }: DashboardProps) {
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Accumulate P&L for Equity chart
  let currentBalance = 0;
  const equityData = sortedTrades.map((t, idx) => {
    currentBalance += t.pnl;
    const dateObj = new Date(t.date);
    return {
      name: `Trade #${idx + 1}`,
      shortDate: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      Pnl: parseFloat(currentBalance.toFixed(2)),
      tradePnl: t.pnl,
      pair: t.pair
    };
  });

  // Calculate KPIs
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const winrate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  // Average Risk Reward
  let avgRRObj = '—';
  if (wins.length > 0 && losses.length > 0) {
    const avgWin = wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length);
    avgRRObj = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—';
  }

  // Drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let runningPnl = 0;
  sortedTrades.forEach(t => {
    runningPnl += t.pnl;
    if (runningPnl > peak) {
      peak = runningPnl;
    }
    const dd = peak - runningPnl;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }
  });

  // Today indicators
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date.startsWith(todayStr));
  const todayPnl = todayTrades.reduce((sum, t) => sum + t.pnl, 0);
  const todayWins = todayTrades.filter(t => t.pnl > 0);
  const todayLosses = todayTrades.filter(t => t.pnl <= 0);
  const todayWinrate = todayTrades.length > 0 ? (todayWins.length / todayTrades.length) * 100 : 0;
  const todayBest = todayTrades.length > 0 ? Math.max(...todayTrades.map(t => t.pnl)) : 0;

  // Pie chart data
  const pieData = [
    { name: 'Gains', value: wins.length || 0.1, color: '#10b981' },
    { name: 'Pertes', value: losses.length || 0.1, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 4 PRIMARY KPIS */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        
        {/* Total P&L Card */}
        <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-6 flex items-center justify-between border border-indigo-900/30 shadow-md">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">P&L TOTAL NET</span>
            <div className={`text-2xl font-extrabold font-mono ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500 block font-mono">Nombre total: {trades.length} trades</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <DollarSign size={20} />
          </div>
        </motion.div>

        {/* Winrate Card */}
        <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-6 flex items-center justify-between border border-indigo-900/30">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">RATIO VICTOIRE (WINRATE)</span>
            <div className="text-2xl font-extrabold font-mono text-indigo-400">
              {winrate.toFixed(1)}%
            </div>
            <span className="text-[10px] ext-slate-500 text-slate-400 block font-mono">
              {wins.length} W - {losses.length} L
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Percent size={20} />
          </div>
        </motion.div>

        {/* Average Risk/Reward Card */}
        <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-6 flex items-center justify-between border border-indigo-900/30">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">R:R MOYEN</span>
            <div className="text-2xl font-extrabold font-mono text-amber-500">
              {avgRRObj}
            </div>
            <span className="text-[10px] text-slate-500 block">Gain moyen / Perte moyenne</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </motion.div>

        {/* Max Drawdown Card */}
        <motion.div variants={cardVariants} className="glass-panel rounded-2xl p-6 flex items-center justify-between border border-indigo-900/30">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">DRAWDOWN MAX</span>
            <div className="text-2xl font-extrabold font-mono text-rose-500">
              ${maxDrawdown.toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500 block">Série de perte maximale cumulée</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </motion.div>

      </motion.div>


      {/* TODAY RECAP PANELS */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-900/30">
        <div className="flex items-center justify-between mb-4 border-b border-indigo-900/20 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-indigo-400" size={18} />
            <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest">Performances d'Aujourd'hui</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">Live Tick Engine</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">P&L Journalier</span>
            <div className={`text-base font-bold font-mono ${todayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {todayPnl >= 0 ? '+' : ''}${todayPnl.toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">Trades du Jour</span>
            <div className="text-base font-bold font-mono text-indigo-300">
              {todayTrades.length}
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">Winrate Jour</span>
            <div className="text-base font-bold font-mono text-purple-400">
              {todayWinrate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">Meilleur Trade</span>
            <div className="text-base font-bold font-mono text-emerald-400">
              {todayBest > 0 ? `+$${todayBest.toFixed(2)}` : '$0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS GRAPH PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cumulative Equity curve (Recharts Areas) */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-indigo-900/30">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black font-mono text-white tracking-wider uppercase">Évolution du Master Capital</h4>
              <p className="text-[10px] text-slate-400">Suivi graphique cumulé des bénéfices de trading.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-indigo-500/10 rounded-full px-2.5 py-1 text-[9px] text-indigo-300 font-bold uppercase tracking-wider">
              <Zap size={10} /> Equity Curve
            </div>
          </div>

          {equityData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#16163e" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f1123', borderColor: '#312e81', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="Pnl" name="Solde cumulé ($)" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorPnl)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center border border-dashed border-slate-900 bg-slate-950/20 rounded-xl gap-2">
              <BadgeInfo size={32} className="text-slate-600 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">Aucun trade enregistré pour tracer l'équité</span>
            </div>
          )}
        </div>

        {/* Win / Loss Split Pie Chart */}
        <div className="glass-panel rounded-2xl p-6 border border-indigo-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black font-mono text-white tracking-wider uppercase">Visualisation Win/Loss</h4>
              <Award size={16} className="text-indigo-400" />
            </div>
            <p className="text-[10px] text-slate-400 mb-6">Répartition brute des gains par rapport aux pertes.</p>
          </div>

          {trades.length > 0 ? (
            <div className="space-y-6">
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends with detail ratio */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 border border-emerald-950/40 bg-emerald-500/5 rounded-xl">
                  <span className="text-emerald-400 font-bold block">{wins.length} Gagnés</span>
                  <span className="text-[10px] text-slate-500">{(trades.length > 0 ? (wins.length / trades.length) * 100 : 0).toFixed(0)}% du total</span>
                </div>
                <div className="p-2 border border-red-950/40 bg-red-500/5 rounded-xl">
                  <span className="text-red-400 font-bold block">{losses.length} Perdus</span>
                  <span className="text-[10px] text-slate-500">{(trades.length > 0 ? (losses.length / trades.length) * 100 : 0).toFixed(0)}% du total</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-900 bg-slate-950/20 rounded-xl gap-2 p-6">
              <BadgeInfo size={28} className="text-slate-600" />
              <span className="text-xs text-slate-500 text-center">Aucun trade pour tracer la répartition</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
