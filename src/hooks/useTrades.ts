/**
 * useTrades.ts — Trades persistants par compte via Supabase
 * Sync temps réel + cache local pour performance
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../utils/supabaseSync';

export interface Trade {
  id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  pair?: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price?: number;
  size_lots: number;
  profit_loss?: number;
  fees: number;
  commission?: number;
  execution_time_entry: string;
  execution_time_exit?: string;
  trade_date?: string;
  result?: string;
  rr_ratio?: number;
  risk_percent?: number;
  session?: string;
  setup?: string;
  pattern?: string;
  emotion?: string;
  mindset?: string;
  duration_minutes?: number;
  notes?: string;
  screenshot_urls?: string[];
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export type CreateTradeData = Omit<Trade, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

interface UseTrades {
  trades: Trade[];
  loading: boolean;
  error: string | null;
  addTrade: (data: CreateTradeData) => Promise<Trade | null>;
  updateTrade: (id: string, data: Partial<Trade>) => Promise<boolean>;
  deleteTrade: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useTrades(accountId: string | null, userId: string | null): UseTrades {
  const [trades, setTrades]   = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const realtimeSub = useRef<any>(null);

  const fetchTrades = useCallback(async () => {
    if (!accountId || !userId) return;
    const sb = getSupabase();
    if (!sb) return;

    setLoading(true);
    try {
      const { data, error: err } = await sb
        .from('trades')
        .select('*')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (err) throw err;
      setTrades((data || []) as Trade[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [accountId, userId]);

  // Realtime subscription
  useEffect(() => {
    if (!accountId || !userId) return;
    fetchTrades();

    const sb = getSupabase();
    if (!sb) return;

    realtimeSub.current = sb
      .channel(`trades:${accountId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `account_id=eq.${accountId}`,
      }, () => fetchTrades())
      .subscribe();

    return () => {
      realtimeSub.current?.unsubscribe();
    };
  }, [accountId, userId, fetchTrades]);

  const addTrade = useCallback(async (data: CreateTradeData): Promise<Trade | null> => {
    if (!userId) return null;
    const sb = getSupabase();
    if (!sb) return null;

    const payload = {
      ...data,
      user_id: userId,
      trade_date: data.trade_date || data.execution_time_entry?.split('T')[0],
      fees: data.fees || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error: err } = await sb
      .from('trades')
      .insert(payload)
      .select()
      .single();

    if (err) { setError(err.message); return null; }

    // Optimistic update
    setTrades(prev => [result as Trade, ...prev]);

    // Update account current_balance
    if (result.profit_loss != null) {
      await sb.from('trading_accounts')
        .update({
          current_balance: sb.rpc('get_account_balance', { p_account_id: data.account_id }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.account_id);
    }

    return result as Trade;
  }, [userId]);

  const updateTrade = useCallback(async (id: string, data: Partial<Trade>): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error: err } = await sb
      .from('trades')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId!);
    if (err) { setError(err.message); return false; }
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    return true;
  }, [userId]);

  const deleteTrade = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error: err } = await sb
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', userId!);
    if (err) { setError(err.message); return false; }
    setTrades(prev => prev.filter(t => t.id !== id));
    return true;
  }, [userId]);

  return { trades, loading, error, addTrade, updateTrade, deleteTrade, refresh: fetchTrades };
}
