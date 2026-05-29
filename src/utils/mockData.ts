import { Trade, Account, Challenge, User } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'personal', name: 'Compte Personnel', type: 'personal' },
  { id: 'ftmo-100k', name: 'FTMO Challenge 100k', type: 'propfirm', capital: 100000, target: 8, dailyLoss: 5, globalLoss: 10 }
];

export const DEFAULT_TRADES: Trade[] = [
  {
    id: 't1',
    accountId: 'personal',
    date: '2026-05-20T10:15:00',
    pair: 'EUR/USD',
    side: 'BUY',
    entry: 1.08200,
    exit: 1.08520,
    lots: 1.5,
    fees: 7.5,
    pnl: 480.00,
    setup: 'Order Block',
    mindset: 'Disciplined',
    notes: 'Entrée parfaite sur le bas de la zone H4. Retrait de liquidités OK.',
    createdAt: '2026-05-20T10:15:00'
  },
  {
    id: 't2',
    accountId: 'personal',
    date: '2026-05-22T14:30:00',
    pair: 'BTC/USDT',
    side: 'SELL',
    entry: 67200,
    exit: 67650,
    lots: 0.1,
    fees: 12.0,
    pnl: -45.00,
    setup: 'FVG',
    mindset: 'FOMO',
    notes: 'Entrée trop précoce avant la clôture de la bougie. Erreur psychologique.',
    createdAt: '2026-05-22T14:30:00'
  },
  {
    id: 't3',
    accountId: 'personal',
    date: '2026-05-24T09:00:00',
    pair: 'XAU/USD',
    side: 'BUY',
    entry: 2315.50,
    exit: 2328.00,
    lots: 0.5,
    fees: 15.0,
    pnl: 625.00,
    setup: 'Liquidity Sweep',
    mindset: 'Confident',
    notes: 'Prise de liquidité asiatique, impulsion haussière violente confirmée.',
    createdAt: '2026-05-24T09:00:00'
  },
  {
    id: 't4',
    accountId: 'personal',
    date: '2026-05-26T16:00:00',
    pair: 'GBP/USD',
    side: 'BUY',
    entry: 1.26800,
    exit: 1.27150,
    lots: 1.0,
    fees: 5.0,
    pnl: 350.00,
    setup: 'Breaker',
    mindset: 'Disciplined',
    notes: 'Test réussi du breaker H1. Bon ratio R:R de 1:3.',
    createdAt: '2026-05-26T16:00:00'
  },
  {
    id: 't5',
    accountId: 'personal',
    date: '2026-05-28T11:00:00',
    pair: 'USD/JPY',
    side: 'SELL',
    entry: 155.800,
    exit: 156.100,
    lots: 2.0,
    fees: 8.0,
    pnl: -380.00,
    setup: 'Supply/Demand',
    mindset: 'Impatient',
    notes: 'Sortie sur Stop Loss suite à l\'annonce FOMC. Risque respecté néanmoins.',
    createdAt: '2026-05-28T11:00:00'
  },
  // Trades for Challenge FTMO 100k
  {
    id: 'tc1',
    accountId: 'ftmo-100k',
    date: '2026-05-22T08:30:00',
    pair: 'EUR/USD',
    side: 'BUY',
    entry: 1.08250,
    exit: 1.08850,
    lots: 5.0,
    fees: 25.0,
    pnl: 3000.00,
    setup: 'Order Block',
    mindset: 'Disciplined',
    notes: 'Premier trade FTMO. Entrée snipe sur l\'Order Block.',
    createdAt: '2026-05-22T08:30:00'
  },
  {
    id: 'tc2',
    accountId: 'ftmo-100k',
    date: '2026-05-25T13:45:00',
    pair: 'XAU/USD',
    side: 'SELL',
    entry: 2330.00,
    exit: 2345.00,
    lots: 2.0,
    fees: 30.0,
    pnl: -3000.00,
    setup: 'Trendline',
    mindset: 'FOMO',
    notes: 'Violation de la règle d\'entrée. Perte de 3% du compte.',
    createdAt: '2026-05-25T13:45:00'
  },
  {
    id: 'tc3',
    accountId: 'ftmo-100k',
    date: '2026-05-27T15:20:00',
    pair: 'GBP/USD',
    side: 'BUY',
    entry: 1.27000,
    exit: 1.27800,
    lots: 5.0,
    fees: 25.0,
    pnl: 4000.00,
    setup: 'Liquidity Sweep',
    mindset: 'Confident',
    notes: 'Magnifique retournement, objectif de profit désormais très proche.',
    createdAt: '2026-05-27T15:20:00'
  }
];

export const DEFAULT_CHALLENGES: Challenge[] = [
  {
    id: 'ftmo-100k-challenge',
    accountId: 'ftmo-100k',
    name: 'FTMO Challenge 100k',
    capital: 100000,
    target: 8,
    dailyLoss: 5,
    globalLoss: 10,
    createdAt: '2026-05-21T08:00:00'
  }
];

export const DEFAULT_USERS: User[] = [
  {
    id: 'u1',
    username: 'Demo Trader',
    email: 'trader@tradevault.com',
    password: 'password123',
    country: 'FR',
    paid: true,
    paidUntil: '2026-08-28T00:00:00.000Z',
    createdAt: '2026-05-20T00:00:00.000Z',
    status: 'approved'
  },
  {
    id: 'u2',
    username: 'Demo Admin',
    email: 'admin@tradevault.com',
    password: 'adminpassword',
    country: 'FR',
    paid: true,
    paidUntil: '2026-12-31T23:59:59.000Z',
    createdAt: '2026-05-18T00:00:00.000Z',
    status: 'approved'
  }
];
