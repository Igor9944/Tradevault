import { useState, useEffect, useCallback } from 'react';

/**
 * cacheUtils.ts - Utilitaires de cache côté client pour améliorer les performances
 * Implémente un cache simple avec TTL (Time To Live) et invalidation sélective
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Stocke une valeur dans le cache avec un TTL spécifié
   * @param key Clé de cache
   * @param value Valeur à mettre en cache
   * @param ttlMs Durée de vie en millisecondes (défaut: 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    this.store.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Récupère une valeur du cache si elle existe et n'est pas expirée
   * @param key Clé de cache
   * @returns La valeur cachée ou null si expirée/inexistante
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expiré, on le supprime
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Supprime une entrée du cache
   * @param key Clé de cache
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Retourne le nombre d'entrées dans le cache
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
      }
    }
  }
}

// Instance globale du cache
export const clientCache = new Cache();

/**
 * Hook personnalisé pour utiliser le cache avec les requêtes
 * @param key Clé de cache unique
 * @param fetchFunction Fonction qui retourne les données à mettre en cache
 * @param options Options de configuration
 */
export function useCachedQuery<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  options: {
    ttlMs?: number;           // Time to live (défaut: 5 minutes)
    staleWhileRevalidate?: boolean; // Servir les données périmées tout en rafraîchissant en arrière-plan
    enabled?: boolean;        // Activer/désactiver le cache
  } = {}
) {
  const { ttlMs = 5 * 60 * 1000, staleWhileRevalidate = true, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Si le cache est désactivé, on fetch directement
      loadData();
      return;
    }

    // Essayer de récupérer depuis le cache
    const cachedData = clientCache.get<T>(key);
    if (cachedData !== null) {
      setData(cachedData);
      setLoading(false);

      // Si on utilise stale-while-revalidate, on rafraîchit en arrière-plan
      if (staleWhileRevalidate) {
        loadData().catch(() => {}); // Ignorer les erreurs de rafraîchissement en arrière-plan
      }
      return;
    }

    // Pas de données en cache, on charge
    loadData();
  }, [key, fetchFunction, ttlMs, staleWhileRevalidate, enabled]);

  const loadData = async () => {
    if (!enabled) {
      setLoading(true);
    }

    try {
      const result = await fetchFunction();
      if (enabled) {
        clientCache.set(key, result, ttlMs);
      }
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (enabled) {
        setLoading(false);
      }
    }
  };

  // Fonction pour invalider manuellement le cache pour cette clé
  const invalidate = useCallback(() => {
    clientCache.delete(key);
    setData(null);
    setLoading(true);
  }, [key]);

  // Fonction pour rafraîchir les données
  const refetch = useCallback(async () => {
    await loadData();
  }, [fetchFunction, enabled]);

  return { data, loading, error, invalidate, refetch };
}

export default clientCache;