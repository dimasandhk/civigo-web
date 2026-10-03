-- Migration: catat kapan tiket diselesaikan.
--
-- Kartu "Sebelumnya" di dasbor loket perlu tiket yang paling akhir diselesaikan.
-- Tanpa waktu selesai, dasbor memakai nomor tiket terbesar, yang salah begitu ada
-- tiket dimundurkan (Web #5): B-001 yang dimundurkan selesai paling akhir, tapi
-- kartu tetap menampilkan B-004.
--
-- Diisi oleh trigger, bukan kode aplikasi, supaya jalur apa pun yang menyelesaikan
-- tiket (API, SQL manual) ikut tercatat. Tiket yang selesai sebelum kolom ini ada
-- tetap null.

alter table public.queues
  add column if not exists completed_at timestamptz;

comment on column public.queues.completed_at is
  'Waktu tiket berubah menjadi completed. Diisi trigger queues_set_completed_at. Null untuk tiket yang selesai sebelum 03/10/2026.';

create or replace function public.set_queue_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists queues_set_completed_at on public.queues;

create trigger queues_set_completed_at
  before update of status on public.queues
  for each row
  execute function public.set_queue_completed_at();
