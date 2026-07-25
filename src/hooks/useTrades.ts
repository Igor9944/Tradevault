/**
 * useTrades.ts - Trades persistants par compte via Supabase
 * Optimized version with selective field fetching, pagination, and caching
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../utils/supabaseSync';

// Constants for pagination
const PAGE_SIZE = 50;

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
  hasMore: boolean;
  page: number;
  addTrade: (data: CreateTradeData) => Promise<Trade | null>;
  updateTrade: (id: string, data: Partial<Trade>) => Promise<boolean>;
  deleteTrade: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setPage: (page: number) => void;
}

/**
 * Optimized hook for fetching trades with pagination and selective field loading
 */
export function useTrades(accountId: string | null, userId: string | null): UseTrades {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const realtimeSub = useRef<any>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      realtimeSub.current?.unsubscribe();
    };
  }, []);

  /**
   * Fetch trades for a specific page with optimized field selection
   */
  const fetchTrades = useCallback(async (pageNum: number = 0) => {
    // Prevent state updates on unmounted component
    if (!isMounted.current) return;

    if (!userId || !accountId) {
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Select only necessary fields instead of '*'
      const query = sb
        .from('trades')
        .select(
          'id, user_id, account_id, symbol, pair, side, entry_price, exit_price, size_lots, profit_loss, fees, commission, execution_time_entry, execution_time_exit, trade_date, result, rr_ratio, risk_percent, session, setup, pattern, emotion, mindset, duration_minutes, notes, screenshot_urls, tags, created_at, updated_at'
        )
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error: err } = await query;

      if (err) throw err;

      // Only update state if component is still mounted
      if (isMounted.current) {
        const newTrades = (data || []) as Trade[];

        // For first page, replace; for subsequent pages, append
        if (pageNum === 0) {
          setTrades(newTrades);
        } else {
          setTrades(prev => [...prev, ...newTrades]);
        }

        setHasMore(newTrades.length === PAGE_SIZE);
        if (pageNum === 0) setPage(0); // Reset page on refresh
      }
    } catch (e: any) {
      if (isMounted.current) {
        setError(e.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [accountId, userId]);

  // Initial load and real-time subscription
  useEffect(() => {
    if (!userId || !accountId) return;

    // Initial fetch
    fetchTrades(0);

    // Realtime subscription for updates
    const sb = getSupabase();
    if (!sb) return;

    realtimeSub.current = sb
      .channel(`trades:${accountId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trades',
        filter: `account_id=eq.${accountId}`,
      }, async () => {
        // Instead of full refresh, we could optimize further by handling individual events
        // For now, refresh first page to maintain consistency
        await fetchTrades(0);
      })
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

    try {
      const { data: result, error: err } = await sb
        .from('trades')
        .insert(payload)
        .select(
          'id, user_id, account_id, symbol, pair, side, entry_price, exit_price, size_lots, profit_loss, fees, commission, execution_time_entry, execution_time_exit, trade_date, result, rr_ratio, risk_percent, session, setup, pattern, emotion, mindset, duration_minutes, notes, screenshot_urls, tags, created_at, updated_at'
        )
        .single();

      if (err) {
        setError(err.message);
        return null;
      }

      // Optimistic update - add to beginning of list
      setTrades(prev => [result as Trade, ...prev]);

      // Update account balance if Profit/Loss exists
      if (result.profit_loss != null) {
        try {
          await sb.from('trading_accounts')
            .update({
              current_balance: sb.rpc('get_account_balance', { p_account_id: data.account_id }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.account_id);
        } catch (balanceErr) {
          console.warn('Failed to update account balance:', balanceErr);
        }
      }

      return result as Trade;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, [userId]);

  const updateTrade = useCallback(async (id: string, data: Partial<Trade>): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;

    try {
      const { error: err } = await sb
        .from('trades')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId!);

      if (err) {
        setError(err.message);
        return false;
      }

      // Optimistic update
      setTrades(prev => prev.map(t =>
        t.id === id ? { ...t, ...data } : t
      ));

      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [userId]);

  const deleteTrade = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;

    try {
      const { error: err } = await sb
        .from('trades')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!);

      if (err) {
        setError(err.message);
        return false;
      }

      // Optimistic update
      setTrades(prev => prev.filter(t => t.id !== id));

      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    }
  }, [userId]);

  return {
    trades,
    loading,
    error,
    hasMore,
    page,
    refresh: () => Promise.resolve().then(() => fetchTrades(0)),
    loadMore: () => Promise.resolve().then(() => {
      if (hasMore && !loading) {
        setPage(prev => prev + 1);
      }
    }),
    setPage: (pageNum) => {
      if (pageNum >= 0) {
        setPage(pageNum);
        fetchTrades(pageNum);
      }
    },
    addTrade,
    updateTrade,
    deleteTrade
  };
}