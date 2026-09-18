-- Migration: Create locations and agency branch support
-- Mendukung multi-cabang (Kantor Induk, MPP, Gerai) untuk instansi pelayanan publik

-- 1. Tabel Master Lokasi Fisik / Gedung
create table if not exists public.locations (
  id integer generated always as identity primary key,
  name varchar not null,
  address text not null,
  city varchar default 'Kota Bogor',
  type varchar not null default 'kantor_induk' check (type in ('mpp', 'kantor_induk', 'gerai')),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  created_at timestamptz not null default now()
);

-- 2. Tabel Relasi Instansi dengan Lokasi Pelayanan (Many-to-Many)
create table if not exists public.agency_locations (
  agency_id integer not null references public.agencies (id) on delete cascade,
  location_id integer not null references public.locations (id) on delete cascade,
  primary key (agency_id, location_id)
);

-- 3. Tambahkan kolom location_id pada tabel loket, antrean, dan akun petugas
alter table public.counters
  add column if not exists location_id integer references public.locations (id) on delete set null;

alter table public.queues
  add column if not exists location_id integer references public.locations (id) on delete set null;

alter table public.users
  add column if not exists location_id integer references public.locations (id) on delete set null;

-- 4. Indeks Performa
create index if not exists counters_location_id_idx on public.counters (location_id);
create index if not exists queues_location_id_idx on public.queues (location_id);
create index if not exists users_location_id_idx on public.users (location_id);
create index if not exists agency_locations_location_id_idx on public.agency_locations (location_id);

-- 5. Row Level Security (RLS)
alter table public.locations enable row level security;
alter table public.agency_locations enable row level security;

create policy "Locations are viewable by everyone"
  on public.locations for select using (true);

create policy "Agency locations are viewable by everyone"
  on public.agency_locations for select using (true);

create policy "Service role manages locations"
  on public.locations for all to service_role using (true) with check (true);

create policy "Service role manages agency_locations"
  on public.agency_locations for all to service_role using (true) with check (true);

-- 6. Seed Data Lokasi Awal (1 Gedung MPP + 3 Kantor Induk Dinas)
insert into public.locations (name, address, city, type, latitude, longitude)
values
  ('Mall Pelayanan Publik (MPP) Grha Sawala', 'Jl. Pajajaran No. 45, Lantai 2', 'Kota Bogor', 'mpp', -6.5950380, 106.7901230),
  ('Kantor Induk Disdukcapil', 'Jl. Pemuda No. 10', 'Kota Bogor', 'kantor_induk', -6.5821000, 106.7954000),
  ('Kantor Samsat Induk', 'Jl. Ir. H. Juanda No. 8', 'Kota Bogor', 'kantor_induk', -6.5982000, 106.7993000),
  ('Kantor Imigrasi Kelas I', 'Jl. Jend. A. Yani No. 19', 'Kota Bogor', 'kantor_induk', -6.5794000, 106.8012000)
on conflict do nothing;

-- 7. Seed Relasi Instansi ke Cabang
insert into public.agency_locations (agency_id, location_id)
values
  (1, 1), -- Disdukcapil di Gedung MPP
  (1, 2), -- Disdukcapil di Kantor Induk
  (2, 1), -- Samsat di Gedung MPP
  (2, 3), -- Samsat di Kantor Samsat Induk
  (3, 1), -- Imigrasi di Gedung MPP
  (3, 4)  -- Imigrasi di Kantor Imigrasi
on conflict do nothing;

-- 8. Backfill data loket, antrean, dan akun petugas eksisting ke Gedung MPP (id = 1)
update public.counters set location_id = 1 where location_id is null;
update public.queues set location_id = 1 where location_id is null;
update public.users set location_id = 1 where role = 'instansi' and location_id is null;
