import { AppNotification, NotificationPreference } from '../types';

const PREFS_KEY = 'tv_notification_preferences';
const LOGS_KEY = 'tv_notification_logs';

const DEFAULT_PREFS: NotificationPreference = {
  payments: true,
  tradingAlerts: true,
  updates: true,
  browserPush: false,
};

const INITIAL_LOGS: AppNotification[] = [
  {
    id: 'n_init',
    title: 'Bienvenue sur TradeVault !',
    message: 'Découvrez votre journal de bord intelligent de trading, créez des challenges Propfirm et observez vos statistiques avancées.',
    type: 'system',
    date: new Date().toISOString(),
    read: false,
  },
  {
    id: 'n_init_prop',
    title: 'Conseil de discipline',
    message: 'Configurez vos limites de perte quotidienne (Max Daily Loss) de challenge FTMO et MyForexFunds pour une gestion stricte.',
    type: 'trading',
    date: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  }
];

export function getPreferences(): NotificationPreference {
  const saved = localStorage.getItem(PREFS_KEY);
  if (!saved) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(prefs: NotificationPreference) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function getNotifications(): AppNotification[] {
  const saved = localStorage.getItem(LOGS_KEY);
  if (!saved) return INITIAL_LOGS;
  try {
    return JSON.parse(saved);
  } catch {
    return INITIAL_LOGS;
  }
}

export function saveNotifications(logs: AppNotification[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

// Push notification sender
export async function sendPushNotification(
  title: string,
  message: string,
  type: 'payment' | 'trading' | 'update' | 'system'
): Promise<boolean> {
  const prefs = getPreferences();

  // Check feature preference active state
  if (type === 'payment' && !prefs.payments) return false;
  if (type === 'trading' && !prefs.tradingAlerts) return false;
  if (type === 'update' && !prefs.updates) return false;

  // Insert into local log list
  const currentLogs = getNotifications();
  const newLog: AppNotification = {
    id: 'notif_' + Date.now() + Math.random().toString(36).substr(2, 4),
    title,
    message,
    type,
    date: new Date().toISOString(),
    read: false
  };
  saveNotifications([newLog, ...currentLogs]);

  // If browser push is active and allowed
  if (prefs.browserPush && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico', // fallback
          badge: '/favicon.ico',
        });
        return true;
      } catch (e) {
        console.warn('Native push notification error, falling back to in-app.', e);
      }
    }
  }

  return false;
}

// Request permission
export async function requestBrowserPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn("Ce navigateur ne supporte pas les notifications de bureau.");
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
