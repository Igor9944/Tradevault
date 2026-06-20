import { Trade, Account, Challenge, User } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'personal', user_id: 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() }
];

export const DEFAULT_TRADES: Trade[] = [];

export const DEFAULT_CHALLENGES: Challenge[] = [];

export const DEFAULT_USERS: User[] = [
  {
    id: 'u2',
    username: 'Demo Admin',
    email: 'admin@tradevault.com',
    password: 'otradnyx@2027',
    country: 'FR',
    paid: true,
    paid_until: '2026-12-31T23:59:59.000Z',
    created_at: '2026-05-18T00:00:00.000Z',
    status: 'approved',
    role: 'admin',
    subscription_status: 'premium_active',
    plan: 'pro',
    premium_expires_at: '2026-12-31T23:59:59.000Z'
  }
];
