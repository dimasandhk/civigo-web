-- Migration: Add family_member_id to queues table
-- Allows associating a queue ticket with a registered family member receiving the service

alter table public.queues
  add column if not exists family_member_id integer references public.family_members(id) on delete set null;

create index if not exists queues_family_member_id_idx on public.queues(family_member_id);

comment on column public.queues.family_member_id is 'ID anggota keluarga yang didaftarkan untuk menerima layanan (opsional).';
