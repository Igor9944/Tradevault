# Tradevault Agent Governance & Database Synchronization

This document establishes the strict rules for database schema governance, TypeScript synchronization, and secure system initialization for the Tradevault platform.

## 1. Database Schema Governance
All database modifications must be performed via explicit SQL migrations. Any agent or developer modifying the schema MUST ensure that the `src/types.ts` file is updated in the same commit to maintain 1:1 parity between the database and the application.

### Core Tables & Ownership
- **profiles**: Managed by Auth hooks and Admin dashboard. RLS must restrict SELECT to `auth.uid() = id` or `role = 'admin'`.
- **trades**: Owned by `user_id`. RLS enforced.
- **trading_accounts**: Linked to `user_id`.
- **system_settings**: Global configuration (pricing, wallets, admin emails). Restricted to Admin access.

## 2. Synchronization Guidelines
- **Snake Case**: The database uses `snake_case` for all column names.
- **Camel Case**: The frontend uses `camelCase` for application logic, but mapping must occur at the API/Supabase boundary.
- **Enums**: Side MUST be stored as `buy` or `sell` (lowercase) in the database to match application logic.

## 3. System Initialization (The System Row)
The UUID `00000000-0000-0000-0000-0000000000ff` is reserved for the System/Admin row.
- It MUST exist in the `profiles` table with `role = 'admin'`.
- It MUST exist in the `system_settings` table to store global state.
- This row is used for global notification routing and platform-wide defaults.

## 4. Security & RLS Policy
- **No Public Selects**: The `profiles` table MUST NOT have a `true` SELECT policy for the `public` role.
- **Service Role**: Sensitive backend operations in `server.ts` use the service role client only when necessary to bypass RLS for system-level triggers.

## 5. Build & Deployment
- The Vercel deployment must recognize the hybrid Vite/Express architecture.
- Ensure `vercel.json` and `package.json` are synced for correct build output pathing.
