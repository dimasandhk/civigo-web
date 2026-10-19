-- Migration: Scope queue numbers per location / branch
-- Memastikan penomoran antrean di cabang berbeda dihitung independen (tidak menyambung antar cabang)

-- 1. Pastikan seluruh baris memiliki location_id (default ke lokasi 1 jika null)
UPDATE public.queues
SET location_id = 1
WHERE location_id IS NULL;

-- 2. Ganti unique index lama agar memperhitungkan location_id
DROP INDEX IF EXISTS public.queues_number_per_service_day_idx;

CREATE UNIQUE INDEX queues_number_per_service_day_idx
  ON public.queues (schedule_date, service_id, location_id, queue_number);
