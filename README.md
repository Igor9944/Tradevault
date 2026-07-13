# TradeVault PRO

Journal de trading SaaS — React 18 + TypeScript + Supabase + Vercel

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS v4 |
| Backend | Express (server.ts) via Vercel Serverless |
| API | `api/supabase/proxy.js` (Vercel Function) |
| Base de données | Supabase PostgreSQL (ref: znursorrrchkrnkhllot) |
| Auth | Supabase Auth |
| Emails | Resend API |
| Hébergement | Vercel Hobby |
| CI/CD | GitHub Actions → Vercel auto-deploy |

## Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/Igor9944/Tradevault.git
cd Tradevault

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplis .env avec tes vraies valeurs

# 4. Démarrer le serveur de développement
npm run dev
```

## Variables d'environnement requises

```env
SUPABASE_URL=https://znursorrrchkrnkhllot.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
VITE_SUPABASE_URL=https://znursorrrchkrnkhllot.supabase.co
VITE_SUPABASE_ANON_KEY=...
RESEND_API_KEY=re_...
VITE_API_URL=http://localhost:3000
```

## Déploiement

Le déploiement sur Vercel est automatique via GitHub Actions sur push vers `main`.

**Prérequis Vercel Dashboard :**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

## Scripts

```bash
npm run dev        # Démarre le serveur Express + Vite HMR
npm run build      # Build de production (dist/)
npm run typecheck  # Vérifie les types TypeScript
npm run lint       # Alias de typecheck
npm run preview    # Preview du build de prod
```

## Architecture

```
src/
  App.tsx              # Router principal (2600+ lignes)
  components/          # Composants React
  hooks/               # Custom hooks (useAccounts, etc.)
  lib/supabase.ts      # Client Supabase
  utils/               # emailService, etc.
api/
  supabase/proxy.js    # Serverless function principale (v3.1)
supabase/
  migrations/          # Migrations SQL
```

## Compte admin

```
Email    : tradonyx@vault.com
Supabase : znursorrrchkrnkhllot
```