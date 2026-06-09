import { Trade, Account, Challenge, User } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'personal', name: 'Compte Personnel', type: 'personal' }
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
    paidUntil: '2026-12-31T23:59:59.000Z',
    createdAt: '2026-05-18T00:00:00.000Z',
    status: 'approved'
  }
];
