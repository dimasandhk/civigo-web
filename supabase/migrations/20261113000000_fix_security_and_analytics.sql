-- Migration: Fix service_documents RLS security & queue status mapping in analytics function
-- 1. Security Fix: Restrict service_documents write access to instansi and super_admin only
drop policy if exists "service_documents_auth_write" on public.service_documents;
drop policy if exists "service_documents_admin_write" on public.service_documents;

create policy "service_documents_admin_write"
  on public.service_documents for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('instansi', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.role in ('instansi', 'super_admin')
    )
  );

-- 2. Analytics Fix: Support both active queue statuses ('scheduled', 'present', 'served') and legacy names
create or replace function public.get_agency_queue_analytics(
  p_agency_id int,
  p_date date default current_date,
  p_location_id int default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  v_completed int := 0;
  v_waiting int := 0;
  v_serving int := 0;
  v_skipped int := 0;
  v_canceled int := 0;
  v_attendance_rate numeric := 100.0;
begin
  select
    count(*) filter (where q.status <> 'canceled'),
    count(*) filter (where q.status = 'completed'),
    count(*) filter (where q.status in ('scheduled', 'present', 'waiting', 'called')),
    count(*) filter (where q.status in ('served', 'serving')),
    count(*) filter (where q.status in ('skipped', 'no_show')),
    count(*) filter (where q.status = 'canceled')
  into v_total, v_completed, v_waiting, v_serving, v_skipped, v_canceled
  from public.queues q
  join public.services s on s.id = q.service_id
  where s.agency_id = p_agency_id
    and q.schedule_date = p_date
    and (p_location_id is null or q.location_id = p_location_id);

  if (v_total > 0) then
    v_attendance_rate := round(((v_total - v_skipped)::numeric / v_total::numeric) * 100, 1);
  end if;

  return json_build_object(
    'total_today', coalesce(v_total, 0),
    'completed', coalesce(v_completed, 0),
    'waiting', coalesce(v_waiting, 0),
    'serving', coalesce(v_serving, 0),
    'skipped', coalesce(v_skipped, 0),
    'canceled', coalesce(v_canceled, 0),
    'attendance_rate', coalesce(v_attendance_rate, 100.0),
    'avg_service_minutes', 15
  );
end;
$$;

-- 3. Locations & Agency Locations Fix (Audit 3.4):
-- Ensure all Surabaya (MPP Siola & Kantor Induk), Bandung, Jakarta Pusat, and Serang
-- locations and agency_locations mappings exist when migrations run.
insert into public.locations (id, name, address, city, type, latitude, longitude)
values
  (1, 'Mall Pelayanan Publik Grha Sawala', 'Jl. Cianjur No. 34, Batununggal', 'Bandung', 'mpp', -6.9189, 107.6321),
  (2, 'Kantor Disdukcapil Kota Bandung', 'Jl. Ambon No. 1B, Citarum', 'Bandung', 'kantor_induk', -6.9082, 107.6189),
  (3, 'Kantor Samsat Bandung Timur', 'Jl. Soekarno-Hatta No. 528', 'Bandung', 'kantor_induk', -6.9452, 107.6433),
  (4, 'Kantor Imigrasi Kelas I TPI Bandung', 'Jl. Surapati No. 82', 'Bandung', 'kantor_induk', -6.8998, 107.6254),
  (5, 'Mall Pelayanan Publik Siola', 'Jl. Tunjungan No. 1-3, Genteng', 'Surabaya', 'mpp', -7.255661, 112.737016),
  (6, 'Kantor Dispendukcapil Kota Surabaya', 'Gedung Siola Lt. 3, Jl. Tunjungan No. 1-3, Genteng', 'Surabaya', 'kantor_induk', -7.255661, 112.737016),
  (7, 'Kantor Bersama Samsat Surabaya Timur', 'Jl. Manyar Kertoarjo No. 1, Manyar Sabrangan', 'Surabaya', 'kantor_induk', -7.279812, 112.768142),
  (8, 'Satpas SIM Colombo Polrestabes Surabaya', 'Jl. Ikan Kerapu No. 2-4, Perak Barat, Krembangan', 'Surabaya', 'kantor_induk', -7.218521, 112.731456),
  (9, 'Kantor Imigrasi Kelas I Khusus TPI Surabaya', 'Jl. Raya Juanda KM 3-4, Sedati, Sidoarjo', 'Surabaya', 'kantor_induk', -7.37521, 112.77123),
  (10, 'Kantor BPJS Kesehatan Cabang Surabaya', 'Jl. Dharmahusada No. 2, Mojo, Gubeng', 'Surabaya', 'kantor_induk', -7.26789, 112.75945),
  (11, 'Mall Pelayanan Publik Provinsi DKI Jakarta', 'Jl. HR Rasuna Said Kav. C-22, Karet Kuningan', 'Jakarta Pusat', 'mpp', -6.2198, 106.8327),
  (12, 'Mall Pelayanan Publik Kota Serang', 'Jl. Jenderal Sudirman No. 5, Sumurpecung', 'Serang', 'mpp', -6.1158, 106.1685)
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  city = excluded.city,
  type = excluded.type,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

select setval(pg_get_serial_sequence('public.locations', 'id'), coalesce(max(id), 1)) from public.locations;

insert into public.agency_locations (agency_id, location_id)
select v.agency_id, v.location_id
from (
  values
    -- Surabaya MPP Siola (Semua Instansi 1..5)
    (1, 5), (2, 5), (3, 5), (4, 5), (5, 5),
    -- Surabaya Kantor Induk
    (1, 6), (2, 7), (4, 8), (3, 9), (5, 10),
    -- Bandung MPP Grha Sawala (Semua Instansi 1..5)
    (1, 1), (2, 1), (3, 1), (4, 1), (5, 1),
    -- Bandung Kantor Induk
    (1, 2), (2, 3), (3, 4),
    -- Jakarta Pusat MPP
    (1, 11), (2, 11), (3, 11), (4, 11), (5, 11),
    -- Serang MPP
    (1, 12), (2, 12), (3, 12), (4, 12), (5, 12)
) as v(agency_id, location_id)
where exists (select 1 from public.agencies a where a.id = v.agency_id)
  and exists (select 1 from public.locations l where l.id = v.location_id)
on conflict (agency_id, location_id) do nothing;
