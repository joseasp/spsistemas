# Project assessment - Restaurante Silva

This document captures how the project works today, the main risks, and a
proposed roadmap to evolve the system into a multi-tenant, scalable product.

## Scope of review

- Frontend: Quasar (Vue 3), Pinia store, composables, pages, and services.
- Backend: Supabase (Postgres + Realtime).
- Current schema dump: `supabase/schema.sql`.

## What the system does today

The app is a single-page system for a restaurant:

- Caderno (orders): create sales, add items, mark paid/unpaid, mark ready.
- Produtos: CRUD products with active status.
- Clientes: CRUD customers, and employee contacts for each customer.
- Contas a receber: customer balance, payments, and sales reconciliation.
- Caixa: open/close cash register, expected vs counted totals, and cash ops.
- Realtime: live updates via Supabase realtime channels.

## Current architecture

Frontend uses direct Supabase calls (no API layer). The flows are:

- `useCaderno` -> `cadernoService` -> `transacoes` + `itens_transacao`.
- `useContasReceber` -> `contasService` -> `clientes`, `transacoes`, `pagamentos`.
- `useCaixa` -> `caixaService` -> `caixa_operacoes`, `pagamentos`, `transacoes`.
- `main-store` holds products/customers and listens to realtime changes.

## Current data model (public schema)

Tables (from `supabase/schema.sql`):

- `clientes`: customers, with status and contact info.
- `funcionarios_empresa`: employee contacts per customer.
- `produtos`: catalog of items.
- `transacoes`: sales, payment status, and optional customer link.
- `itens_transacao`: items in a sale.
- `pagamentos`: payments made by customers.
- `caixa_operacoes`: open/close of cash register.

## Key gaps and risks (high level)

1) No authentication or authorization:
   - The frontend uses the anon key for full CRUD.
   - RLS is disabled and tables are granted to anon.

2) No multi-tenant isolation:
   - There is no tenant/empresa column.
   - Every query reads all rows across all businesses.

3) Time handling is inconsistent:
   - `data_transacao` is a timestamp but retroactive inserts use current time.
   - `pagamentos` are created without date fields.
   - `data_local` exists in schema but is not set consistently.

4) Integrity and scalability:
   - No server-side transactions for "transacao + itens".
   - No indexes besides primary keys.
   - No audit trail (who created/edited what, and when).

## Recommended roadmap

### Phase 1 - Security and multi-tenant foundation (critical)

Goal: make the system safe for multiple companies.

- Enable Supabase Auth.
- Add tables:
  - `empresas` (tenants)
  - `profiles` (user profile linked to auth.users)
  - `empresa_usuarios` (membership and roles)
- Add `empresa_id` to all domain tables:
  - clientes, funcionarios_empresa, produtos, transacoes, itens_transacao,
    pagamentos, caixa_operacoes
- Add RLS policies:
  - Users can access only rows with their `empresa_id`.
  - Admin role can manage company-wide data.
- Update all queries to filter by `empresa_id` (or rely on RLS).

### Phase 2 - Time model and audit consistency

Goal: fix retroactive posting and reporting accuracy.

Suggested columns:

- `created_at` (server default now())
- `created_by` (auth.uid())
- `updated_at` (trigger)
- `event_at` (the "business time" of the order)
- `business_date` (date derived from event_at and tenant timezone)

Rules:

- Use `event_at` for "when it happened".
- Use `created_at` for "when it was recorded".
- Use `business_date` to group daily reports.

### Phase 3 - Performance and reports

Goal: keep queries fast with multiple tenants and larger datasets.

- Add indexes:
  - `(empresa_id, business_date)` for daily queries
  - `(empresa_id, cliente_id)` for customer lists
  - `(empresa_id, status_pagamento)` for filters
  - `(empresa_id, caixa_operacao_id)` for cash reconciliation
- Move complex aggregations to SQL views or RPC functions.

### Phase 4 - Product expansion

Goal: new dashboard, ERP-light features, and reports.

Potential additions:

- Dashboard KPIs: daily revenue, open cash, overdue balances.
- Inventory or stock alerts (if required).
- User/role management screen.
- Reports page (currently placeholder).

## Notes about frontend animations

There are transition-group animations and CSS transitions in multiple pages.
If you want to reduce animation load, remove or simplify transitions in:

- `src/pages/CadernoPage.vue`
- `src/pages/ClientesPage.vue`
- `src/pages/ProdutosPage.vue`
- `src/pages/ContasPage.vue`
- `src/css/app.scss` and `src/css/app-theme.scss`

## Suggested next steps

1) Decide multi-tenant approach (single DB + tenant_id + RLS).
2) Implement Auth + tenant tables + RLS.
3) Fix time model with `event_at` + `created_at` + `business_date`.
4) Update services and UI to use the new fields.
5) Add indexes and reports.
