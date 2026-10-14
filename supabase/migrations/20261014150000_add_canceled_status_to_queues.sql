-- Migrasi status antrean 'canceled' untuk pembatalan tiket sukarela oleh warga.
-- Mendukung integritas data tanpa loophole antrean hantu di loket.

-- 1. Perbarui constraint queues_status_valid agar menerima 'canceled'
ALTER TABLE public.queues DROP CONSTRAINT IF EXISTS queues_status_valid;

ALTER TABLE public.queues
  ADD CONSTRAINT queues_status_valid
  CHECK (status IN ('scheduled', 'present', 'served', 'completed', 'skipped', 'canceled'));

-- 2. Kolom waktu dan alasan pembatalan untuk riwayat audit
ALTER TABLE public.queues
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN public.queues.canceled_at IS 'Waktu tiket dibatalkan secara sukarela oleh warga';
COMMENT ON COLUMN public.queues.cancel_reason IS 'Alasan pembatalan dari warga (opsional)';
