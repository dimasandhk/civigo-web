-- Migration: Make time_block optional (nullable) on public.queues and add postpone tracking
-- This removes the mandatory session hour requirement when booking tickets,
-- while preserving the column so existing queries selecting time_block do not break.

-- 1. Make time_block nullable
alter table public.queues alter column time_block drop not null;
alter table public.queues alter column time_block set default null;

-- 2. Add postpone tracking columns if not already present
alter table public.queues
  add column if not exists postponed boolean not null default false,
  add column if not exists postponed_at timestamptz default null;

-- 3. Document the column change
comment on column public.queues.time_block is 'Sesi jam kunjungan (opsional). Nullable karena antrean memakai dynamic pooling tanpa sesi kaku.';
comment on column public.queues.postponed is 'Penanda bahwa antrean pernah dimundurkan ke antrean paling belakang oleh petugas.';
