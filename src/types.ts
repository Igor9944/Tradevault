export interface Profile {
  id: string; // references auth.users
  username: string;
  email: string;
  password?: string; // local only
  country: string;
  paid: boolean;
  paid_until: string | null;
  created_at: string;
  payment_proof?: string; 
  status: 'pending' | 'approved' | 'rejected';
  avatar_url?: string; 
  google_linked?: boolean;
  google_email?: string;
  currency?: 'USD' | 'EUR' | 'GBP';
  wallet_trc20?: string;
  wallet_bep20?: string;
  subscription_price?: number;
  subscription_duration_days?: number;
}

export type User = Profile; // keep User alias

export interface Trade {
  id: string;
  account_id: string;
  user_id: string;
  date: string;
  pair: string;
  side: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  lots: number;
  fees: number;
  pnl: number;
  setup: string;
  mindset: string;
  notes: string;
  screenshot_url?: string;
  emotion?: 'fomo' | 'revenge' | 'boredom' | 'fear' | 'greed' | 'patience' | 'discipline' | 'tilt' | 'confident' | 'hesitant';
  session?: 'london' | 'new_york' | 'tokyo' | 'sydney' | 'asian';
  rr_ratio?: number;
  risk_percent?: number;
  created_at: string;
}

export interface Challenge {
  id: string;
  account_id: string;
  user_id: string;
  name: string;
  capital: number;
  target: number;
  daily_loss: number;
  global_loss: number;
  created_at: string;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: 'personal' | 'prop_firm' | 'demo';
  capital?: number;
  target?: number;
  daily_loss?: number;
  global_loss?: number;
  challenge_status?: 'not_started' | 'passed' | 'failed' | 'in_progress';
  created_at: string;
}

export type Account = TradingAccount; // alias

export interface NotificationPreference {
  payments: boolean;
  tradingAlerts: boolean;
  updates: boolean;
  browserPush: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'payment' | 'trading' | 'update' | 'system';
  date: string;
  read: boolean;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  username?: string;
  email?: string;
  amount: number;
  network: 'TRC20' | 'BEP20';
  payment_proof: string; 
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}


