import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Settings, 
  Trash2, 
  CheckCheck, 
  Sparkles, 
  ShieldAlert, 
  Info, 
  Sliders, 
  Smartphone, 
  TrendingUp, 
  DollarSign, 
  Volume2, 
  X,
  Radio,
  ExternalLink,
  Flame,
  UserCheck
} from 'lucide-react';
import { AppNotification, NotificationPreference } from '../types';
import { 
  getPreferences, 
  savePreferences, 
  getNotifications, 
  saveNotifications, 
  sendPushNotification, 
  requestBrowserPermission 
} from '../utils/notificationService';

interface NotificationCenterProps {
  onNotificationSent?: (title: string, message: string, type: 'payment' | 'trading' | 'update' | 'system') => void;
}

export default function NotificationCenter({ onNotificationSent }: NotificationCenterProps) {
  const [preferences, setPreferences] = useState<NotificationPreference>(getPreferences());
  const [notifications, setNotifications] = useState<AppNotification[]>(getNotifications());
  const [browserSupported, setBrowserSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserSupported(true);
      setPermissionState(Notification.permission);
    }
  }, []);

  // Update preferences state and local persistence
  const handleTogglePreference = (key: keyof NotificationPreference) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };

    // If enabling browser push, trigger validation request
    if (key === 'browserPush' && !preferences.browserPush) {
      requestBrowserPermission().then((granted) => {
        if (granted) {
          updated.browserPush = true;
          setPermissionState('granted');
          triggerTestNotification('system', 'Notifications autorisées !', 'Vous recevrez désormais des alertes push directement sur votre système d\'exploitation.');
        } else {
          updated.browserPush = false;
          setPermissionState('denied');
          alert('Autorisation refusée par le navigateur. Veuillez autoriser les notifications dans les paramètres du site.');
        }
        setPreferences(updated);
        savePreferences(updated);
      });
    } else {
      setPreferences(updated);
      savePreferences(updated);
    }
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    if (confirm('Voulez-vous vider tout l\'historique des alertes ?')) {
      setNotifications([]);
      saveNotifications([]);
    }
  };

  // Immediate test notification dispatcher with audio feedback & OS-level trigger
  const triggerTestNotification = async (
    type: 'payment' | 'trading' | 'update' | 'system',
    customTitle?: string,
    customMessage?: string
  ) => {
    const defaultData = {
      payment: {
        title: 'Paiement $10 validé ! 🎉',
        message: 'Félicitations, votre accès à vie "TRADING Lead Spirit" est actif.'
      },
      trading: {
        title: '[Alerte Arbitrage] BTC/USD 🚨',
        message: 'Breakout haussier détecté au-dessus de la Trendline journalière (69,500 USDT).'
      },
      update: {
        title: 'Mise à jour v1.2 disponible 🚀',
        message: 'Nouveau Tracker Propfirm ultra-précis et intégration du nouveau logo officiel !'
      },
      system: {
        title: 'Test de Notification',
        message: 'Ceci est une simulation de notification push en temps réel.'
      }
    };

    const targetTitle = customTitle || defaultData[type].title;
    const targetMessage = customMessage || defaultData[type].message;

    // Trigger local push action (saves to state queue and alerts via Browser Push if active)
    await sendPushNotification(targetTitle, targetMessage, type);

    // Refresh notifications list to update feed scroll
    const freshLogs = getNotifications();
    setNotifications(freshLogs);

    // Play simulated subtle success audio sound inside iframe safely
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 chord tip
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Audio context fails safely if user hasn't interacted, ignore
    }

    if (onNotificationSent) {
      onNotificationSent(targetTitle, targetMessage, type);
    }
  };

  return (
    <div className="animate-scale-in">
      
      {/* LEFT COLUMN: Preferences and testing switches */}
      <div className="space-y-6">
        
        {/* Preference Settings Panel Container */}
        <div className="glass-panel rounded-2xl p-6 border border-indigo-900/30">
          <div className="flex items-center gap-2 mb-4 border-b border-indigo-900/10 pb-3">
            <Settings className="text-indigo-400" size={18} />
            <h3 className="text-sm font-black font-mono tracking-widest text-white uppercase">
              Gestion des Préférences Push
            </h3>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Activez ou désactivez les canaux d'alertes instantanées de TradeVault. Vous pouvez simuler des messages système grâce au module de test.
          </p>

          <div className="space-y-4">
            
            {/* Preferences 1: Payments */}
            <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-[#1e293b]/50 rounded-xl hover:border-indigo-500/20 transition-all">
              <div className="space-y-1 pr-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase">
                  <DollarSign size={14} className="text-emerald-400" /> Confirmations d'Accès & Inscription
                </span>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Alertes instantanées après activation de votre paiement unique à $10.
                </p>
              </div>

              {/* Toggle Switch design */}
              <button
                type="button"
                onClick={() => handleTogglePreference('payments')}
                className={`w-11 h-6 rounded-full p-0.5 transition-all outline-none ${
                  preferences.payments ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all ${
                  preferences.payments ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Preferences 2: Trading Alerts */}
            <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-[#1e293b]/50 rounded-xl hover:border-indigo-500/20 transition-all">
              <div className="space-y-1 pr-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase">
                  <TrendingUp size={14} className="text-indigo-400" /> Alertes de Trading (Breakouts & Drawdowns)
                </span>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Rappels automatiques de dépassement d'objectif et limites de blocages Propfirm.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreference('tradingAlerts')}
                className={`w-11 h-6 rounded-full p-0.5 transition-all outline-none ${
                  preferences.tradingAlerts ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all ${
                  preferences.tradingAlerts ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Preferences 3: Updates */}
            <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-[#1e293b]/50 rounded-xl hover:border-indigo-500/20 transition-all">
              <div className="space-y-1 pr-4">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase">
                  <Sparkles size={14} className="text-purple-400" /> Mises à jour Importantes de l'App
                </span>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Soyez averti des évolutions de l'interface et du déploiement de nouvelles paires.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePreference('updates')}
                className={`w-11 h-6 rounded-full p-0.5 transition-all outline-none ${
                  preferences.updates ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-all ${
                  preferences.updates ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
