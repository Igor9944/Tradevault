import { Trade, Account, Challenge, User } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'personal', user_id: 'admin', name: 'Compte Personnel', account_type: 'personal', created_at: new Date().toISOString() }
];

export const DEFAULT_TRADES: Trade[] = [];

export const DEFAULT_CHALLENGES: Challenge[] = [];

export const DEFAULT_USERS: User[] = [];
