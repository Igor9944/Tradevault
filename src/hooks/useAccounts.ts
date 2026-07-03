/**
 * useAccounts.ts — Gestion multi-comptes TradeVault
 * CRUD complet + stats par compte via Supabase
 */
import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../utils/supabaseSync';

export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  broker: string;
  type: 'personal' | 'funded' | 'challenge';
  starting_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  color: string;
  emoji: string;
  description?: string;
  prop_firm_name?: string;
  capital?: number;
  target?: number;
  daily_loss?: number;
  global_loss?: number;
  challenge_status?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountStats {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  best_trade: number;
  worst_trade: number;
  avg_rr: number;
}

interface UseAccounts {
  accounts: TradingAccount[];
  activeAccount: TradingAccount | null;
  loading: boolean;
  error: string | null;
  setActiveAccount: (account: TradingAccount) => void;
  createAccount: (data: CreateAccountData) => Promise<TradingAccount | null>;
  updateAccount: (id: string, data: Partial<TradingAccount>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
  getStats: (accountId: string) => Promise<AccountStats | null>;
  refresh: () => Promise<void>;
}

interface CreateAccountData {
  name: string;
  type: 'personal' | 'funded' | 'challenge';
  broker?: string;
  starting_balance: number;
  currency?: string;
  color?: string;
  emoji?: string;
  prop_firm_name?: string;
  description?: string;
  capital?: number;
  target?: number;
  daily_loss?: number;
  global_loss?: number;
}

const ACTIVE_KEY = 'tv_active_account';

export function useAccounts(userId: string | null): UseAccounts {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [activeAccount, setActiveAccountState] = useState<TradingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }

    try {
      const { data, error: err } = await sb
        .from('trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (err) throw err;

      const accs = (data || []) as TradingAccount[];
      setAccounts(accs);

      // Restaurer le compte actif depuis localStorage
      const savedId = localStorage.getItem(ACTIVE_KEY);
      const saved = accs.find(a => a.id === savedId);
      const defaultAcc = accs.find(a => a.is_default) || accs[0];
      setActiveAccountState(saved || defaultAcc || null);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const setActiveAccount = useCallback((account: TradingAccount) => {
    setActiveAccountState(account);
    localStorage.setItem(ACTIVE_KEY, account.id);
  }, []);

  const createAccount = useCallback(async (data: CreateAccountData): Promise<TradingAccount | null> => {
    if (!userId) return null;
    const sb = getSupabase();
    if (!sb) return null;

    const { data: result, error: err } = await sb
      .from('trading_accounts')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        broker: data.broker || data.prop_firm_name || 'Manual',
        type: data.type,
        starting_balance: data.starting_balance,
        current_balance: data.starting_balance,
        currency: data.currency || 'USD',
        color: data.color || '#00FF9C',
        emoji: data.emoji || (data.type === 'personal' ? '💼' : '🏆'),
        prop_firm_name: data.prop_firm_name,
        description: data.description,
        capital: data.capital,
        target: data.target,
        daily_loss: data.daily_loss,
        global_loss: data.global_loss,
        is_active: true,
        is_default: false,
        challenge_status: 'not_started',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (err || !result) return null;
    await fetchAccounts();
    return result as TradingAccount;
  }, [userId, fetchAccounts]);

  const updateAccount = useCallback(async (id: string, data: Partial<TradingAccount>): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error: err } = await sb
      .from('trading_accounts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId!);
    if (err) return false;
    await fetchAccounts();
    return true;
  }, [userId, fetchAccounts]);

  const deleteAccount = useCallback(async (id: string): Promise<boolean> => {
    if (accounts.length <= 1) {
      setError('Impossible de supprimer le dernier compte.');
      return false;
    }
    const sb = getSupabase();
    if (!sb) return false;
    // Soft delete
    const { error: err } = await sb
      .from('trading_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId!);
    if (err) return false;
    // Changer de compte actif si nécessaire
    if (activeAccount?.id === id) {
      const next = accounts.find(a => a.id !== id);
      if (next) setActiveAccount(next);
    }
    await fetchAccounts();
    return true;
  }, [accounts, activeAccount, userId, fetchAccounts, setActiveAccount]);

  const getStats = useCallback(async (accountId: string): Promise<AccountStats | null> => {
    const sb = getSupabase();
    if (!sb) return null;
    const { data, error: err } = await sb
      .rpc('get_account_stats', { p_account_id: accountId });
    if (err || !data) return null;
    return data as AccountStats;
  }, []);

  return {
    accounts, activeAccount, loading, error,
    setActiveAccount, createAccount, updateAccount,
    deleteAccount, getStats, refresh: fetchAccounts,
  };
}
