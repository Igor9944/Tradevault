import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trade, Account } from '../types';
import { DollarSign, Percent, TrendingUp, ShieldAlert, BadgeInfo, Calendar, Zap, Award } from 'lucide-react';
import { useThemeLang } from '../utils/themeLanguageContext';

interface DashboardProps {
  trades: Trade[];
  activeAccount: Account;
  currency?: 'USD' | 'EUR' | 'GBP';
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£'
};

const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78
};

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

export default function Dashboard({ trades, activeAccount, currency = 'USD' }: DashboardProps) {
  const { t, lang } = useThemeLang();
  
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const rate = CURRENCY_RATES[currency] || 1.0;

  const formatWithCurrency = (amount: number, forcePlusSign = false) => {
    const convertedVal = amount * rate;
    const sign = convertedVal >= 0 ? (forcePlusSign ? '+' : '') : '-';
    return `${sign}${symbol}${Math.abs(convertedVal).toFixed(2)}`;
  };

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Accumulate P&L for Equity chart
  let currentBalance = 0;
  const equityData = sortedTrades.map((t, idx) => {
    currentBalance += t.pnl;
    const dateObj = new Date(t.date);
    return {
      name: `Trade #${idx + 1}`,
      shortDate: dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      Pnl: parseFloat((currentBalance * rate).toFixed(2)),
      tradePnl: parseFloat((t.pnl * rate).toFixed(2)),
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
    { name: 'Gains', value: wins.length || 0.1, color: '#00FF9C' },
    { name: 'Pertes', value: losses.length || 0.1, color: '#FF4D4D' }
  ];

  return (
    <div className="space-y-6 text-slate-200">
      
      {/* 4 PRIMARY KPIS */}
      <motion.div 
        id="tour-dashboard-panel"
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        
        {/* Total P&L Card */}
        <motion.div variants={cardVariants} className="bg-[#080808] rounded-2xl p-6 flex items-center justify-between border border-zinc-900 shadow-md">
          <div className="space-y-1">
            <span className="text-xs text-neutral-300 font-bold uppercase tracking-wider block">{t('net_total_pnl')}</span>
            <div className={`text-2xl font-extrabold font-mono ${totalPnl >= 0 ? 'text-[#00FF9C]' : 'text-red-400'}`}>
              {formatWithCurrency(totalPnl, true)}
            </div>
            <span className="text-[10px] text-neutral-300 block font-mono">{t('total_trades')}: {trades.length}</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${totalPnl >= 0 ? 'bg-[#00FF9C]/10 text-[#00FF9C]' : 'bg-red-500/10 text-red-400'}`}>
            <span className="text-lg font-black font-mono">{symbol}</span>
          </div>
        </motion.div>

        {/* Winrate Card */}
        <motion.div variants={cardVariants} className="bg-[#080808] rounded-2xl p-6 flex items-center justify-between border border-zinc-900">
          <div className="space-y-1">
            <span className="text-xs text-neutral-300 font-bold uppercase tracking-wider block">{t('winrate')}</span>
            <div className="text-2xl font-extrabold font-mono text-[#00FF9C]">
              {winrate.toFixed(1)}%
            </div>
            <span className="text-[10px] text-neutral-400 block font-mono">
              {wins.length} W - {losses.length} L
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#00FF9C]/10 text-[#00FF9C] flex items-center justify-center">
            <Percent size={20} />
          </div>
        </motion.div>

        {/* Average Risk/Reward Card */}
        <motion.div variants={cardVariants} className="bg-[#080808] rounded-2xl p-6 flex items-center justify-between border border-zinc-900">
          <div className="space-y-1">
            <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block">{t('avg_risk_reward')}</span>
            <div className="text-2xl font-extrabold font-mono text-amber-500">
              {avgRRObj}
            </div>
            <span className="text-[10px] text-slate-500 block">{t('avg_gain_loss_legend')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </motion.div>

        {/* Max Drawdown Card */}
        <motion.div variants={cardVariants} className="bg-[#080808] rounded-2xl p-6 flex items-center justify-between border border-zinc-900">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">{t('max_drawdown')}</span>
            <div className="text-2xl font-extrabold font-mono text-rose-500">
              {formatWithCurrency(maxDrawdown, false)}
            </div>
            <span className="text-[10px] text-slate-500 block">{t('max_cumulative_drawdown_legend')}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </motion.div>

      </motion.div>


      {/* TODAY RECAP PANELS */}
      <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800/30 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#00FF9C]" size={18} />
            <h3 className="text-sm font-black text-white font-mono uppercase tracking-widest">{t('today_perf')}</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">Live Tick Engine</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#050505]/60 p-4 rounded-xl border border-zinc-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">{t('daily_pnl')}</span>
            <div className={`text-base font-bold font-mono ${todayPnl >= 0 ? 'text-[#00FF9C]' : 'text-red-400'}`}>
              {formatWithCurrency(todayPnl, true)}
            </div>
          </div>

          <div className="bg-[#050505]/60 p-4 rounded-xl border border-zinc-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">{t('today_trades')}</span>
            <div className="text-base font-bold font-mono text-[#00FF9C]">
              {todayTrades.length}
            </div>
          </div>

          <div className="bg-[#050505]/60 p-4 rounded-xl border border-zinc-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">{t('winrate')}</span>
            <div className="text-base font-bold font-mono text-[#00FF9C]">
              {todayWinrate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-[#050505]/60 p-4 rounded-xl border border-zinc-900 text-center">
            <span className="text-[10px] text-slate-500 uppercase block tracking-wider mb-1">{t('best_trade')}</span>
            <div className="text-base font-bold font-mono text-[#00FF9C]">
              {todayBest > 0 ? formatWithCurrency(todayBest, true) : `${symbol}0.00`}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS GRAPH PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cumulative Equity curve (Recharts Areas) */}
        <div className="lg:col-span-2 bg-[#080808] rounded-2xl p-6 border border-zinc-900">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black font-mono text-white tracking-wider uppercase">{t('equity_curve_title')}</h4>
              <p className="text-[10px] text-slate-400">{t('equity_curve_desc')}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#00FF9C]/10 rounded-full px-2.5 py-1 text-[9px] text-[#00FF9C] font-bold uppercase tracking-wider">
              <Zap size={10} /> Equity Curve
            </div>
          </div>

          {equityData.length > 0 ? (
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: "100%" }} 
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-72 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00FF9C" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00FF9C" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="shortDate" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Pnl" 
                    name={t('cum_balance_legend')} 
                    stroke="#00FF9C" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorPnl)"
                    animationDuration={2000}
                    animationEasing="ease-in-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <div className="h-72 w-full flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-[#080808]/20 rounded-xl gap-2">
              <BadgeInfo size={32} className="text-slate-600 animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">{t('no_trades_equity')}</span>
            </div>
          )}
        </div>

        {/* Win / Loss Split Pie Chart */}
        <div className="bg-[#080808] rounded-2xl p-6 border border-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black font-mono text-white tracking-wider uppercase">{t('win_loss_split_title')}</h4>
              <Award size={16} className="text-[#00FF9C]" />
            </div>
            <p className="text-[10px] text-slate-400 mb-6">{t('win_loss_split_desc')}</p>
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
                <div className="p-2 border border-[#00FF9C]/20 bg-[#00FF9C]/5 rounded-xl">
                  <span className="text-[#00FF9C] font-bold block">{wins.length} {t('wins')}</span>
                  <span className="text-[10px] text-slate-500">{(trades.length > 0 ? (wins.length / trades.length) * 100 : 0).toFixed(0)}% {t('wins_losses_of_total_legend')}</span>
                </div>
                <div className="p-2 border border-red-500/20 bg-red-500/5 rounded-xl">
                  <span className="text-red-400 font-bold block">{losses.length} {t('losses')}</span>
                  <span className="text-[10px] text-slate-500">{(trades.length > 0 ? (losses.length / trades.length) * 100 : 0).toFixed(0)}% {t('wins_losses_of_total_legend')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 bg-[#080808]/20 rounded-xl gap-2 p-6">
              <BadgeInfo size={28} className="text-slate-600" />
              <span className="text-xs text-slate-500 text-center">{t('no_trades_distribution')}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
