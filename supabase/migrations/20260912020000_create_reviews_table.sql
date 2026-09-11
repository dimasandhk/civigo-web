-- Migration: Create reviews table and policies
-- For agency ratings and citizen feedbacks

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  agency_id bigint not null references public.agencies (id) on delete cascade,
  service_id bigint references public.services (id) on delete set null,
  counter_id bigint references public.counters (id) on delete set null,
  queue_id bigint references public.queues (id) on delete set null,
  user_id uuid references public.users (id) on delete set null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Foreign key indexes
create index if not exists reviews_agency_id_idx on public.reviews (agency_id);
create index if not exists reviews_service_id_idx on public.reviews (service_id);
create index if not exists reviews_counter_id_idx on public.reviews (counter_id);
create index if not exists reviews_queue_id_idx on public.reviews (queue_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- Enable RLS
alter table public.reviews enable row level security;

-- Policies:
-- 1. Anyone (or authenticated users) can read reviews for their agency
create policy "Reviews are viewable by everyone"
  on public.reviews
  for select
  using (true);

-- 2. Authenticated users (citizens) can insert reviews
create policy "Authenticated users can insert reviews"
  on public.reviews
  for insert
  to authenticated
  with check (true);

-- 3. Service role can perform all actions
create policy "Service role has full access to reviews"
  on public.reviews
  for all
  to service_role
  using (true)
  with check (true);

-- Seed initial review data for Disdukcapil (agency_id = 1)
insert into public.reviews (agency_id, service_id, counter_id, rating, comment, created_at)
values
  (1, 1, 1, 5, 'Pelayanannya sangat cepat dan petugasnya ramah.', now() - interval '5 minutes'),
  (1, 2, 2, 4, 'Pelayanannya sudah bagus dan cukup membantu saat cetak berkas.', now() - interval '25 minutes'),
  (1, 1, 1, 5, 'Proses pembuatan KTP berjalan tertib tanpa antre lama.', now() - interval '2 hours'),
  (1, 2, 2, 5, 'Petugas di loket 2 sangat responsif dan sigap.', now() - interval '4 hours'),
  (1, 1, 1, 3, 'Ruang tunggu agak ramai tapi loket bergerak lancar.', now() - interval '1 day'),
  (1, 2, 2, 4, 'Cukup puas dengan kejelasan instruksi.', now() - interval '2 days');
