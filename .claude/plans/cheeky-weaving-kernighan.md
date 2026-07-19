# Plan d'optimisation des performances et de la sécurité - TradeVault

## Contexte
Le projet TradeVault est une application SaaS de journal de trading avec un stack React/TypeScript/Express/Supabase. Après analyse du codebase, plusieurs opportunités d'optimisation ont été identifiées pour améliorer les performances et la sécurité.

## Objectifs
1. Améliorer les performances grâce à une meilleure gestion des données et du caching
2. Renforcer la sécurité avec une meilleure validation, rate limiting et gestion des erreurs
3. Maintenir la compatibilité arrière et suivre les patterns établis du projet

## Analyse des points d'amélioration

### Performances
- **Problème** : Les hooks utilisent `select('*')` et récupèrent tous les enregistrements sans pagination
- **Impact** : Dégradation des performances avec l'augmentation du volume de données
- **Solution** : Sélection de champs spécifiques, pagination côté serveur

- **Problème** : Pas de mise en cache côté client pour réduire les requêtes redondantes
- **Impact** : Requêtes réseau inutiles, augmentation de la latence perçue
- **Solution** : Implémentation de cache léger avec useState/useRef ou adoption de react-query

- **Problème** : Re-fetch complet au lieu de mises à jour incrémentielles
- **Impact** : Utilisation inutile de bande passante et de ressources
- **Solution** : Utilisation des capacités temps réel de Supabase pour les mises à jour sélectives

### Sécurité
- **Problème** : Rate limiting en mémoire seulement, se réinitialise à chaque cold start
- **Impact** : Protection insuffisante contre les attaques par force brute ou DDoS léger
- **Solution** : Rate limiting persistant ou distribué

- **Problème** : Validation limitée des entrées utilisateur
- **Impact** : Vulnérabilité potentielle aux injections et données malformées
- **Solution** : Validation schema avec zod ou similaire

- **Problème** : Exposition potentielle de détails d'erreur internes
- **Impact** : Fuite d'informations pouvant aider un attaquant
- **Solution** : Gestion centralisée des erreurs avec masquage des détails en production

- **Problème** : Absence de headers de sécurité HTTP standards
- **Impact** : Exposition à diverses vulnérabilités web (XSS, clickjacking, etc.)
- **Solution** : Middleware de sécurité comme helmet.js

## Plan d'implémentation

### Phase 1: Optimisation du serveur Express (server.ts)

#### 1.1 Amélioration du rate limiting
- Remplacer le rate limiting en mémoire par une solution utilisant un store externe (Redis-like) ou au moins amélioré
- Ajouter des limites différentes selon les types d'endpoints
- Implémenter un système de blacklist temporaire pour les abus répétés

#### 1.2 Ajout de validation d'entrée
- Intégrer zod pour la validation des schémas de données
- Créer des schémas de validation pour chaque type d'action (signIn, signUp, saveTrade, etc.)
- Appliquer la validation avant traitement dans le handler proxy

#### 1.3 Renforcement de la sécurité
- Ajouter helmet.js pour les headers de sécurité standard
- Configurer CSP, HSTS, X-Frame-Options, etc.
- Masquer les détails d'erreur techniques en production

#### 1.4 Optimisation du logging
- Implémenter une rotation des logs pour éviter l'accumulation illimitée en mémoire
- Ajouter des niveaux de log (debug, info, warn, error)
- Envoyer les logs vers un système externe en production

### Phase 2: Optimisation du frontend (src/)

#### 2.1 Amélioration des hooks de données
- Modifier `useTrades.ts` pour implémenter la pagination
- Ajouter des paramètres de filtre et de tri
- Implémenter le cache des données fréquemment consultées

#### 2.2 Optimisation des requêtes Supabase
- Remplacer `select('*')` par la sélection de champs spécifiques nécessaires
- Utiliser les vues/materialized views de Supabase lorsque approprié
- Ajouter des index sur les colonnes fréquemment utilisées dans les WHERE/JOIN

#### 2.3 Gestion améliorée de l'état
- Évaluer l'adoption de react-query ou SWR pour la gestion du state serveur
- Implémenter le stale-while-revalidate pour améliorer la perception de performance
- Ajouter le retry automatique avec backoff exponentiel

### Phase 3: Sécurité avancée

#### 3.1 Protection contre les abus
- Implémenter la détection de comportement anormal (tentatives de connexion rapides, etc.)
- Ajouter des CAPTCHAs pour les opérations sensibles après plusieurs échecs
- Limiter la fréquence des actions critiques (suppression de compte, changement d'email, etc.)

#### 3.2 Validation côté client
- Ajouter la validation de forme avec react-hook-form + zod
- Créer des schémas de validation réutilisables pour les entités communes
- Fournir un retour utilisateur immédiat sur les erreurs de validation

## Implémentation détaillée

### Modifications du serveur.ts

#### Dépendances à ajouter:
```bash
npm add zod helmet rate-limiter-redis
npm add -D @types/helmet
```

#### Implémentation du rate limiting amélioré:
```typescript
// Dans server.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import helmet from 'helmet';

// Configuration Redis pour le rate limiting (fallback vers memory si pas de Redis)
const redisClient = process.env.REDIS_URL 
  ? createClient({ url: process.env.REDIS_URL })
  : null;

// Rate limiter par IP et par endpoint
const apiLimiter = rateLimit({
  store: redisClient ? new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) : undefined,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { success: false, error: 'Too many requests from this IP, please try again later.' }
});

// Limites spécifiques par action
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 login attempts per hour
  message: { success: false, error: 'Too many login attempts, please try again after an hour.' }
});

// Application du middleware
app.use(helmet());
app.use('/api/supabase/proxy/signIn', authLimiter);
app.use('/api/supabase/proxy/signUp', authLimiter);
app.use('/api/supabase/proxy', apiLimiter);
```

#### Validation avec zod:
```typescript
// src/validation/schemas.ts
import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' })
});

export const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  username: z.string().min(2, { message: 'Username must be at least 2 characters' }),
  country: z.string().length(2, { message: 'Country code must be 2 characters' })
});

// Dans server.ts, dans le handler proxy:
case "signIn": {
  const validationResult = signInSchema.safeParse(args);
  if (!validationResult.success) {
    return res.status(400).json({ 
      success: false, 
      error: validationResult.error.errors[0].message 
    });
  }
  // Continuer avec validationResult.data
  break;
}
```

#### Gestion sécurisée des erreurs:
```typescript
// Middleware de gestion des erreurs centralisé
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log détaillé côté serveur (jamais exposé au client)
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ip: req.ip,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Réponse client générique en production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ 
      success: false, 
      error: 'An internal error occurred. Please try again later.' 
    });
  }

  // En développement, montrer plus de détails
  res.status(500).json({ 
    success: false, 
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  );
});
```

### Optimisations du frontend

#### Amélioration de useTrades.ts:
```typescript
// src/hooks/useTrades.ts - Version paginée
export function useTrades(userId: string | null, accountId?: string): UseTrades {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  
  const fetchTrades = useCallback(async (pageNum: number = 0) => {
    if (!userId) { setLoading(false); return; }
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }

    try {
      setLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let query = sb
        .from('trades')
        .select('id, user_id, account_id, trade_date, entry_price, exit_price, position_size, profit_loss, fees, strategy, tags, created_at, updated_at') // Sélection spécifique
        .eq('user_id', userId)
        .order('trade_date', { ascending: false })
        .range(from, to);

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error: err } = await query;

      if (err) throw err;

      const newTrades = (data || []).map(trade => ({
        ...trade,
        // Transformation si nécessaire
      }));

      // Mise à jour optimiste ou remplacement selon si c'est la première page
      setTrades(prev => pageNum === 0 ? newTrades : [...prev, ...newTrades]);
      setHasMore(data?.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      if (pageNum === 0) setPage(0); // Reset page on refresh
    }
  }, [userId, accountId]);

  // Rechargement infini ou pagination manuelle
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  return { trades, loading, error, refresh: () => fetchTrades(0), loadMore, hasMore };
}
```

## Plan de test

### Tests de performance
1. Mesurer le temps de réponse des endpoints avant/après optimisation
2. Tester la charge avec différents volumes de données
3. Vérifier l'efficacité du cache (taux de hit/miss)
4. Benchmarker le rate injection sous charge

### Tests de sécurité
1. Tests de pénétration basiques (injection, XSS, CSRF)
2. Vérification du rate limiting (tentatives de dépassement de limite)
3. Audit des headers de sécurité avec des outils comme OWASP ZAP
4. Vérification que les détails d'erreur ne sont pas exposés en production

## Déploiement et suivi

### Déploiement progressif
1. Implémenter les changements en branches fonctionnelles
2. Tester en environnement de staging avec des jeux de données réalistes
3. Déployer en production avec feature flags si nécessaire
4. Monitorer les métriques clés (latence, taux d'erreur, usage CPU/mémoire)

### Métriques à surveiller
- Temps de réponse moyen des API
- Taux de réussite des requêtes
- Utilisation de la mémoire et du CPU du serveur
- Nombre d'erreurs 429 (rate limiting)
- Taux de cache hit (si implémenté)
- Temps de chargement initial de l'application

## Risques et atténuations

### Risque 1: Régression fonctionnelle
- Atténuation : Tests unitaires et d'intégration exhaustifs, déploiement avec capacité de rollback rapide

### Risque 2: Dégradation imprévue des performances
- Atténuation : Tests de charge préalables, monitoring en temps réel après déploiement

### Risque 3: Complexité accrue du code
- Atténuation : Documentation claire, respect des patterns existants, code review rigoureux

## Estimations de travail

- Phase 1 (Serveur) : 2-3 jours
- Phase 2 (Frontend) : 2-3 jours  
- Phase 3 (Sécurité avancée) : 1-2 jours
- Tests et validation : 1-2 jours

Total estimé : 6-11 jours de travail selon la profondeur d'implémentation souhaitée.