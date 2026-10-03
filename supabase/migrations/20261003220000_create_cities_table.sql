-- Migration: Create cities table for mobile city selection and reverse geocoding fallback
CREATE TABLE IF NOT EXISTS public.cities (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    province text NOT NULL,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cities viewable by everyone" ON public.cities;
CREATE POLICY "Cities viewable by everyone"
    ON public.cities FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Cities manageable by service_role" ON public.cities;
CREATE POLICY "Cities manageable by service_role"
    ON public.cities FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed Initial Cities
INSERT INTO public.cities (name, province, latitude, longitude)
VALUES
    ('Surabaya', 'Jawa Timur', -7.2575, 112.7521),
    ('Bandung', 'Jawa Barat', -6.9175, 107.6191),
    ('Serang', 'Banten', -6.1104, 106.1640),
    ('Jakarta Pusat', 'DKI Jakarta', -6.1818, 106.8223)
ON CONFLICT (name) DO NOTHING;
