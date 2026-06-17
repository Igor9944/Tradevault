export interface Profile {
  id: string; // references auth.users
  username: string | null;
  full_name?: string | null;
  email: string;
  password?: string; // local only
  country?: string | null;
  paid: boolean;
  paid_until: string | null;
  created_at: string;
  updated_at: string;
  payment_proof?: string | null; 
  payment_method?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  avatar_url?: string | null; 
  last_seen_at?: string | null;
  premium_expires_at?: string | null;
  activated_at?: string | null;
  google_linked?: boolean;
  google_email?: string;
  currency?: 'USD' | 'EUR' | 'GBP';
  wallet_trc20?: string;
  wallet_bep20?: string;
  subscription_price?: number;
  subscription_duration_days?: number;
  subscription_status?: 'pending' | 'premium_active' | 'blocked';
}

export type User = Profile;

export interface Trade {
  id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  pair?: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price: number | null;
  size_lots: number;
  profit_loss: number | null;
  fees: number;
  execution_time_entry: string;
  execution_time_exit: string | null;
  notes: string | null;
  screenshot_urls: string[];
  result: 'WIN' | 'LOSS' | 'BE' | null;
  rr_ratio: number | null;
  risk_percent: number | null;
  session: 'London' | 'New York' | 'Asia' | 'London/NY' | 'Pre-market' | null;
  setup: string | null;
  pattern: string | null;
  emotion: 'Neutre' | 'Confiant' | 'Anxieux' | 'FOMO' | 'Revanche' | 'Discipliné' | null;
  duration_minutes: number | null;
  mindset: string | null;
  trade_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  account_id: string;
  user_id: string;
  name: string;
  firm_name: string | null;
  phase: 'Phase 1' | 'Phase 2' | 'Funded';
  capital: number;
  profit_target: number | null;
  profit_target_pct: number | null;
  daily_drawdown_limit: number | null;
  daily_dd_pct: number | null;
  total_drawdown_limit: number | null;
  total_dd_pct: number | null;
  min_trading_days: number;
  current_pnl: number;
  current_daily_dd: number;
  current_total_dd: number;
  status: 'active' | 'passed' | 'failed' | 'expired';
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  broker: string;
  name: string | null;
  type: 'prop_firm' | 'personal' | 'demo';
  starting_balance: number;
  current_balance: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type Account = TradingAccount;

export interface PaymentRequest {
  id: string;
  user_id: string;
  type: 'registration' | 'renewal';
  amount: number;
  network: 'TRC20' | 'BEP20';
  screenshot_url: string | null; 
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
}
