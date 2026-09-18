-- Migration: Create locations and agency branch support
-- Mendukung multi-cabang (Kantor Induk, MPP, Gerai) untuk instansi pelayanan publik

-- 1. Tabel Master Lokasi Fisik / Gedung
CREATE TABLE IF NOT EXISTS public.locations (
    id serial PRIMARY KEY,
    name text NOT NULL,
    address text NOT NULL,
    city text DEFAULT 'Bandung',
    type text NOT NULL DEFAULT 'mpp', -- 'mpp' atau 'kantor_induk'
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Relasi Instansi dengan Lokasi Pelayanan (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.agency_locations (
    agency_id integer NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    location_id integer NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (agency_id, location_id)
);

-- 3. Tambahkan kolom location_id ke tabel counters, queues, dan users jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'counters' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE public.counters 
        ADD COLUMN location_id integer REFERENCES public.locations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'queues' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE public.queues 
        ADD COLUMN location_id integer REFERENCES public.locations(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN location_id integer REFERENCES public.locations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Buat Indexes
CREATE INDEX IF NOT EXISTS idx_queues_location_id ON public.queues(location_id);
CREATE INDEX IF NOT EXISTS idx_counters_location_id ON public.counters(location_id);
CREATE INDEX IF NOT EXISTS idx_users_location_id ON public.users(location_id);
CREATE INDEX IF NOT EXISTS idx_agency_locations_loc ON public.agency_locations(location_id);

-- 5. RLS Policies
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Locations viewable by everyone" ON public.locations;
CREATE POLICY "Locations viewable by everyone"
    ON public.locations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Locations manageable by service_role" ON public.locations;
CREATE POLICY "Locations manageable by service_role"
    ON public.locations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Agency locations viewable by everyone" ON public.agency_locations;
CREATE POLICY "Agency locations viewable by everyone"
    ON public.agency_locations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Agency locations manageable by service_role" ON public.agency_locations;
CREATE POLICY "Agency locations manageable by service_role"
    ON public.agency_locations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Seed Data Lokasi (MPP + Kantor Induk)
INSERT INTO public.locations (id, name, address, city, type, latitude, longitude)
VALUES
    (1, 'Mall Pelayanan Publik Grha Sawala', 'Jl. Cianjur No. 34, Batununggal', 'Bandung', 'mpp', -6.9189, 107.6321),
    (2, 'Kantor Disdukcapil Kota Bandung', 'Jl. Ambon No. 1B, Citarum', 'Bandung', 'kantor_induk', -6.9082, 107.6189),
    (3, 'Kantor Samsat Bandung Timur', 'Jl. Soekarno-Hatta No. 528', 'Bandung', 'kantor_induk', -6.9452, 107.6433),
    (4, 'Kantor Imigrasi Kelas I TPI Bandung', 'Jl. Surapati No. 82', 'Bandung', 'kantor_induk', -6.8998, 107.6254)
ON CONFLICT (id) DO NOTHING;

-- Sinkronkan sequence ID locations
SELECT setval(pg_get_serial_sequence('public.locations', 'id'), coalesce(max(id), 1)) FROM public.locations;

-- 7. Seed Relasi Instansi ke Lokasi (agency_locations)
INSERT INTO public.agency_locations (agency_id, location_id)
SELECT 1, 1 WHERE EXISTS (SELECT 1 FROM public.agencies WHERE id = 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.agency_locations (agency_id, location_id)
SELECT 1, 2 WHERE EXISTS (SELECT 1 FROM public.agencies WHERE id = 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.agency_locations (agency_id, location_id)
SELECT 2, 1 WHERE EXISTS (SELECT 1 FROM public.agencies WHERE id = 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.agency_locations (agency_id, location_id)
SELECT 2, 3 WHERE EXISTS (SELECT 1 FROM public.agencies WHERE id = 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.agency_locations (agency_id, location_id)
SELECT 3, 1 WHERE EXISTS (SELECT 1 FROM public.agencies WHERE id = 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.agency_locations (agency_id, location_id)
SELECT 3, 4 WHERE EXISTS (SELECT 1 FROM public.agencies WHERE id = 3)
ON CONFLICT DO NOTHING;

-- 8. Backfill Data Eksisting ke MPP Grha Sawala (id = 1)
UPDATE public.counters SET location_id = 1 WHERE location_id IS NULL;
UPDATE public.queues SET location_id = 1 WHERE location_id IS NULL;
UPDATE public.users SET location_id = 1 WHERE role = 'instansi' AND location_id IS NULL;
