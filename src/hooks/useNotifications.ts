/**
 * useNotifications.ts — Gestion des notifications en temps réel
 * Optimized version with selective field fetching, caching, and improved performance
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../utils/supabaseSync';
import { clientCache, useCachedQuery } from '../utils/cacheUtils';
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

interface UseNotifications {
  notifications: AppNotification[];
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (title: string, message: string, type: AppNotification['type']) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Optimized hook for managing notifications with caching and real-time updates
 */
export function useNotifications(userId: string | null): UseNotifications {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const realtimeSub = useRef<any>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      realtimeSub.current?.unsubscribe();
    };
  }, []);

  // Fetch notifications with caching
  const fetchNotifications = useCallback(async () => {
    // Prevent state updates on unmounted component
    if (!isMounted.current) return;

    if (!userId) {
      // For guest users, use local storage only
      const localNotifications = getLocalNotifications() as AppNotification[];
      setNotifications(localNotifications);
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      // Fallback to local storage if Supabase unavailable
      const localNotifications = getLocalNotifications() as AppNotification[];
      setNotifications(localNotifications);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check cache first (cache for 30 seconds as notifications change frequently)
      const cacheKey = `notifications_${userId}`;
      const cachedNotifications = clientCache.get<AppNotification[]>(cacheKey);

      if (cachedNotifications !== null) {
        setNotifications(cachedNotifications);
        setLoading(false);
        // Still fetch fresh data in background for stale-while-revalidate
        fetchFreshNotifications().catch(() => {}); // Ignore background errors
        return;
      }

      // Fetch fresh data
      await fetchFreshNotifications();
    } catch (error: any) {
      if (isMounted.current) {
        console.error('[NOTIFICATIONS] Fetch error:', error);
        // Fallback to local storage on error
        const localNotifications = getLocalNotifications() as AppNotification[];
        setNotifications(localNotifications);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Helper to fetch fresh notifications from Supabase
  const fetchFreshNotifications = useCallback(async () => {
    if (!userId) {
      // For guest users, use local storage only
      const localNotifications = getLocalNotifications() as AppNotification[];
      if (isMounted.current) {
        setNotifications(localNotifications);
      }
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      // Fallback to local storage if Supabase unavailable
      const localNotifications = getLocalNotifications() as AppNotification[];
      if (isMounted.current) {
        setNotifications(localNotifications);
      }
      return;
    }

    try {
      const { data, error } = await sb
        .from('notifications')
        .select('id, title, message, type, created_at, read, user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && isMounted.current) {
        const mapped = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          date: n.created_at || n.date,
          read: n.read || false,
          user_id: n.user_id,
        }));

        // Cache for 30 seconds
        const cacheKey = `notifications_${userId}`;
        clientCache.set(cacheKey, mapped, 30 * 1000);

        setNotifications(mapped);
      }
    } catch (error) {
      if (isMounted.current) {
        console.error('[NOTIFICATIONS] Fresh fetch error:', error);
        // Fallback to local storage
        const localNotifications = getLocalNotifications() as AppNotification[];
        setNotifications(localNotifications);
      }
    }
  }, [userId]);

  // Initial setup and real-time subscription
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchNotifications();

    // Realtime subscription for updates
    const sb = getSupabase();
    if (!sb) return;

    realtimeSub.current = sb
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        // Instead of full refresh, we could handle individual events
        // For simplicity and consistency, we refresh but could be optimized
        await fetchNotifications();
      })
      .subscribe();

    return () => {
      realtimeSub.current?.unsubscribe();
    };
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );

    const sb = getSupabase();
    if (sb && userId && !id.startsWith('n_')) { // Skip local-only notifications
      try {
        await sb.from('notifications').update({ read: true }).eq('id', id);

        // Update cache if exists
        const cacheKey = `notifications_${userId}`;
        const cached = clientCache.get<AppNotification[]>(cacheKey);
        if (cached !== null) {
          const updated = cached.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          clientCache.set(cacheKey, updated, 30 * 1000); // Refresh cache
        }
      } catch (e) {
        console.warn('Failed to mark read in DB, fallback:', e);
        // Revert optimistic update on failure
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: false } : n))
        );

        // Local fallback
        const local = (getLocalNotifications() as AppNotification[]).map(n =>
          n.id === id ? { ...n, read: true } : n
        );
        saveLocalNotifications(local);
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
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const sb = getSupabase();
    if (sb && userId) {
      try {
        await sb
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('read', false);

        // Update cache
        const cacheKey = `notifications_${userId}`;
        const cached = clientCache.get<AppNotification[]>(cacheKey);
        if (cached !== null) {
          const updated = cached.map(n => ({ ...n, read: true }));
          clientCache.set(cacheKey, updated, 30 * 1000); // Refresh cache
        }
      } catch (e) {
        console.warn('Failed to mark all read in DB, fallback:', e);
        // Revert optimistic update on failure
        setNotifications(prev => prev.map(n => ({ ...n, read: false })));

        // Local fallback
        const local = (getLocalNotifications() as AppNotification[]).map(n => ({ ...n, read: true }));
        saveLocalNotifications(local);
      }
    } else {
      // Local fallback
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

        // Update cache
        const cacheKey = `notifications_${userId}`;
        const cached = clientCache.get<AppNotification[]>(cacheKey);
        if (cached !== null) {
          const newNotification: AppNotification = {
            id: 'temp_' + Date.now(), // Temporary ID until we get real one from DB
            title,
            message,
            type,
            date: new Date().toISOString(),
            read: false,
            user_id: userId,
          };
          const updated = [newNotification, ...cached];
          clientCache.set(cacheKey, updated, 30 * 1000); // Refresh cache

          // Trigger refresh to get real ID from DB
          await fetchNotifications();
        }
      } catch (e) {
        console.warn('Failed to add DB notification, fallback:', e);
        await sendLocalPush(title, message, type);
        await fetchNotifications();
      }
    } else {
      await sendLocalPush(title, message, type);
      await fetchNotifications();
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