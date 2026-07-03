/**
 * useNotifications.ts — Gestion des notifications en temps réel
 * Lit et écrit dans Supabase table 'notifications' si connecté, sinon fallback local
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../utils/supabaseSync';
import {
  getNotifications as getLocalNotifications,
  saveNotifications as saveLocalNotifications,
  sendPushNotification as sendLocalPush,
} from '../utils/notificationService';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'payment' | 'trading' | 'update' | 'system';
  date: string;
  read: boolean;
  user_id?: string;
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const realtimeSub = useRef<any>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications(getLocalNotifications() as AppNotification[]);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setNotifications(getLocalNotifications() as AppNotification[]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          date: n.created_at || n.date,
          read: n.read || false,
          user_id: n.user_id,
        }));
        setNotifications(mapped);
      } else {
        setNotifications(getLocalNotifications() as AppNotification[]);
      }
    } catch {
      setNotifications(getLocalNotifications() as AppNotification[]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;

    realtimeSub.current = sb
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      realtimeSub.current?.unsubscribe();
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );

    const sb = getSupabase();
    if (sb && userId && !id.startsWith('n_')) {
      try {
        await sb.from('notifications').update({ read: true }).eq('id', id);
      } catch (e) {
        console.warn('Failed to mark read in DB, fallback:', e);
      }
    } else {
      // Local fallback
      const local = (getLocalNotifications() as AppNotification[]).map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      saveLocalNotifications(local);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const sb = getSupabase();
    if (sb && userId) {
      try {
        await sb
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false);
      } catch (e) {
        console.warn('Failed to mark all read in DB, fallback:', e);
      }
    } else {
      const local = (getLocalNotifications() as AppNotification[]).map(n => ({ ...n, read: true }));
      saveLocalNotifications(local);
    }
  }, [userId]);

  const addNotification = useCallback(async (title: string, message: string, type: AppNotification['type']) => {
    const sb = getSupabase();
    if (sb && userId) {
      try {
        await sb.from('notifications').insert({
          user_id: userId,
          title,
          message,
          type,
          read: false,
          created_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed to add DB notification, fallback:', e);
        await sendLocalPush(title, message, type);
        fetchNotifications();
      }
    } else {
      await sendLocalPush(title, message, type);
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    addNotification,
    refresh: fetchNotifications,
  };
}
export default useNotifications;
