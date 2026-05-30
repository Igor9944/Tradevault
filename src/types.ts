export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  country: string;
  paid: boolean;
  paidUntil: string | null;
  createdAt: string;
  paymentScreenshot?: string; // Base64 representation
  status: 'pending' | 'approved' | 'rejected';
  avatar?: string; // Base64 representation of profile photo
}

export interface Trade {
  id: string;
  accountId: string;
  date: string; // ISO datetime string
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
  screenshot?: string; // Base64
  createdAt: string;
}

export interface Challenge {
  id: string;
  accountId: string;
  name: string;
  capital: number;
  target: number; // profit target % e.g., 8
  dailyLoss: number; // max daily loss % e.g., 5
  globalLoss: number; // max global loss % e.g., 10
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'personal' | 'propfirm';
  capital?: number;
  target?: number;
  dailyLoss?: number;
  globalLoss?: number;
}

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
  userId: string;
  username: string;
  email: string;
  amount: number;
  network: 'TRC20' | 'BEP20';
  proofScreenshot: string; // Base64 representation
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}


