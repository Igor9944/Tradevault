/**
 * adminSettings.ts — Accès sécurisé aux settings admin
 * Fix : plus de toString() sur undefined
 */
import { getSupabase } from './supabaseSync';

export interface AdminSettings {
  price:                number;
  duration_months:      number;
  trc20:                string;
  bep20:                string;
  ftmo_profit_target:   number;
  ftmo_daily_loss:      number;
  ftmo_max_loss:        number;
  personal_unrestricted: boolean;
  platform_name:        string;
  support_email:        string;
  maintenance_mode:     boolean;
}

// Valeurs par défaut sûres — jamais undefined
const SAFE_DEFAULTS: AdminSettings = {
  price:                30,
  duration_months:      3,
  trc20:                '',
  bep20:                '',
  ftmo_profit_target:   8,
  ftmo_daily_loss:      5,
  ftmo_max_loss:        10,
  personal_unrestricted: true,
  platform_name:        'TradeVault',
  support_email:        'tradonyx@vault.com',
  maintenance_mode:     false,
};

let _cache: AdminSettings | null = null;

export async function getAdminSettings(): Promise<AdminSettings> {
  if (_cache) return _cache;

  try {
    const sb = getSupabase();
    if (!sb) return SAFE_DEFAULTS;

    const { data, error } = await sb
      .from('public_config')   // vue sécurisée
      .select('*')
      .single();

    if (error || !data) return SAFE_DEFAULTS;

    // Merge avec defaults pour éviter tout undefined
    _cache = {
      ...SAFE_DEFAULTS,
      ...Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
      ),
      // Conversion sécurisée des types
      price:              Number(data.price)              || SAFE_DEFAULTS.price,
      ftmo_profit_target: Number(data.ftmo_profit_target) || SAFE_DEFAULTS.ftmo_profit_target,
      ftmo_daily_loss:    Number(data.ftmo_daily_loss)    || SAFE_DEFAULTS.ftmo_daily_loss,
      ftmo_max_loss:      Number(data.ftmo_max_loss)      || SAFE_DEFAULTS.ftmo_max_loss,
      trc20:              String(data.trc20 || ''),
      bep20:              String(data.bep20 || ''),
      platform_name:      String(data.platform_name      || SAFE_DEFAULTS.platform_name),
      support_email:      String(data.support_email      || SAFE_DEFAULTS.support_email),
    };

    return _cache;
  } catch {
    return SAFE_DEFAULTS;
  }
}

export function clearSettingsCache() { _cache = null; }

// Hook React
export async function useAdminSettingsOnce(): Promise<AdminSettings> {
  return getAdminSettings();
}

// FTMO drawdown checker
export function checkFTMODrawdown(
  currentBalance: number,
  startBalance:   number,
  dailyPnL:       number,
  settings?:      AdminSettings
): { dailyViolation: boolean; maxViolation: boolean; targetReached: boolean } {
  const s = settings || SAFE_DEFAULTS;
  const totalPnL        = currentBalance - startBalance;
  const dailyLossLimit  = startBalance * (s.ftmo_daily_loss / 100);
  const maxLossLimit    = startBalance * (s.ftmo_max_loss   / 100);
  const profitTarget    = startBalance * (s.ftmo_profit_target / 100);

  return {
    dailyViolation: dailyPnL     <= -dailyLossLimit,
    maxViolation:   totalPnL     <= -maxLossLimit,
    targetReached:  totalPnL     >= profitTarget,
  };
}
