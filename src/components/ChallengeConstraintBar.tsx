import React from 'react';
import { motion } from 'motion/react';

interface ConstraintSegmentProps {
  label: string;
  current: number;
  limit: number;
  symbol: string;
  invertProgress?: boolean; // true for loss-type limits: getting closer to limit = worse
  isLossType?: boolean;
}

function ConstraintSegment({ label, current, limit, symbol, invertProgress, isLossType }: ConstraintSegmentProps) {
  const safeLimit = limit > 0 ? limit : 1;
  const ratio = Math.min(Math.abs(current) / safeLimit, 1);
  const breached = Math.abs(current) >= safeLimit && limit > 0;
  const nearLimit = !breached && ratio >= 0.7;

  let barColor = 'var(--accent-primary)';
  if (isLossType) {
    barColor = breached ? 'var(--danger)' : nearLimit ? 'var(--warning)' : 'var(--accent-secondary)';
  } else {
    barColor = breached ? 'var(--success)' : 'var(--accent-secondary)';
  }

  return (
    <div className="flex-1 min-w-[160px]">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{label}</span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: breached && isLossType ? 'var(--danger)' : 'var(--text-primary, #fff)' }}
        >
          {symbol}{Math.abs(current).toFixed(0)}
          <span className="text-neutral-500"> / {symbol}{limit.toFixed(0)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden relative">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={
            breached && isLossType
              ? { width: '100%', opacity: [1, 0.4, 1] }
              : { width: `${ratio * 100}%` }
          }
          transition={
            breached && isLossType
              ? { opacity: { duration: 0.5, repeat: 2 }, width: { duration: 0.4 } }
              : { duration: 0.5, ease: 'easeOut' }
          }
        />
      </div>
    </div>
  );
}

interface ChallengeConstraintBarProps {
  todayPnl: number;
  maxDrawdown: number;
  totalPnl: number;
  dailyLossLimit?: number;
  globalLossLimit?: number;
  profitTarget?: number;
  symbol: string;
}

export default function ChallengeConstraintBar({
  todayPnl,
  maxDrawdown,
  totalPnl,
  dailyLossLimit,
  globalLossLimit,
  profitTarget,
  symbol
}: ChallengeConstraintBarProps) {
  // Pas de règles de challenge configurées sur ce compte (ex: compte personnel) -> on n'affiche rien.
  if (!dailyLossLimit && !globalLossLimit && !profitTarget) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-white/[0.06] flex flex-col sm:flex-row gap-5 sm:gap-8">
      {dailyLossLimit ? (
        <ConstraintSegment
          label="Perte du jour"
          current={todayPnl < 0 ? todayPnl : 0}
          limit={dailyLossLimit}
          symbol={symbol}
          isLossType
        />
      ) : null}
      {globalLossLimit ? (
        <ConstraintSegment
          label="Drawdown max"
          current={maxDrawdown}
          limit={globalLossLimit}
          symbol={symbol}
          isLossType
        />
      ) : null}
      {profitTarget ? (
        <ConstraintSegment
          label="Objectif de profit"
          current={totalPnl > 0 ? totalPnl : 0}
          limit={profitTarget}
          symbol={symbol}
        />
      ) : null}
    </div>
  );
}
