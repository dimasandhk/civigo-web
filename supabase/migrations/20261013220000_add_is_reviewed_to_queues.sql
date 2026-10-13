-- Migration: Menambahkan kolom is_reviewed pada tabel queues
--
-- Untuk memfasilitasi alur review di mobile:
-- - null  (default): belum di-review / baru selesai, belum memilih aksi.
-- - false: user memilih "Nanti Saja" (Later), tiket tetap di active_tickets sebagai reminder.
-- - true : user telah memberikan review, tiket berpindah ke history_tickets.

alter table public.queues
  add column if not exists is_reviewed boolean default null;

comment on column public.queues.is_reviewed is
  'Status ulasan layanan: null = belum diulas (default), false = diulas nanti (later), true = sudah diulas.';

-- Index untuk filter cepat riwayat ulasan & antrean
create index if not exists queues_is_reviewed_idx on public.queues (is_reviewed);

-- Sinkronisasi data historis: tiket yang sudah memiliki relasi di tabel reviews ditandai true
update public.queues q
set is_reviewed = true
where q.is_reviewed is null
  and exists (
    select 1
    from public.reviews r
    where r.queue_id = q.id
  );
