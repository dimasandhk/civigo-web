-- Migration: Backend Analytics Functions (RPC) & Reporting Views
-- Menyediakan fungsi SQL dan agregasi untuk analitik antrean & kepuasan ulasan masyarakat.

-- 1. Fungsi Analitik Kepuasan Ulasan Masyarakat
create or replace function public.get_agency_satisfaction_analytics(
  p_agency_id int,
  p_location_id int default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_total bigint := 0;
  v_avg numeric := 0;
  v_star_1 bigint := 0;
  v_star_2 bigint := 0;
  v_star_3 bigint := 0;
  v_star_4 bigint := 0;
  v_star_5 bigint := 0;
  v_satisfied_pct numeric := 0;
  v_result json;
begin
  select
    count(*),
    coalesce(round(avg(rating)::numeric, 1), 0),
    count(*) filter (where rating = 1),
    count(*) filter (where rating = 2),
    count(*) filter (where rating = 3),
    count(*) filter (where rating = 4),
    count(*) filter (where rating = 5),
    case
      when count(*) = 0 then 0
      else round((count(*) filter (where rating >= 4)::numeric / count(*)::numeric) * 100, 1)
    end
  into
    v_total,
    v_avg,
    v_star_1,
    v_star_2,
    v_star_3,
    v_star_4,
    v_star_5,
    v_satisfied_pct
  from public.reviews r
  where r.agency_id = p_agency_id;

  v_result := json_build_object(
    'total_reviews', v_total,
    'average_rating', v_avg,
    'satisfaction_percentage', v_satisfied_pct,
    'breakdown', json_build_object(
      'star_1', v_star_1,
      'star_2', v_star_2,
      'star_3', v_star_3,
      'star_4', v_star_4,
      'star_5', v_star_5
    )
  );

  return v_result;
end;
$$;

-- 2. Fungsi Analitik Antrean Harian & Operasional
create or replace function public.get_agency_queue_analytics(
  p_agency_id int,
  p_date date default current_date,
  p_location_id int default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_total bigint := 0;
  v_waiting bigint := 0;
  v_calling bigint := 0;
  v_serving bigint := 0;
  v_completed bigint := 0;
  v_skipped bigint := 0;
  v_postponed bigint := 0;
  v_active_counters bigint := 0;
  v_result json;
begin
  select
    count(*),
    count(*) filter (where q.status = 'waiting'),
    count(*) filter (where q.status = 'calling'),
    count(*) filter (where q.status = 'serving'),
    count(*) filter (where q.status = 'completed'),
    count(*) filter (where q.status in ('skipped', 'canceled')),
    count(*) filter (where coalesce(q.postponed, false) = true)
  into
    v_total,
    v_waiting,
    v_calling,
    v_serving,
    v_completed,
    v_skipped,
    v_postponed
  from public.queues q
  join public.services s on s.id = q.service_id
  where s.agency_id = p_agency_id
    and q.schedule_date = p_date
    and (p_location_id is null or q.location_id = p_location_id);

  select count(*)
  into v_active_counters
  from public.counters c
  where c.agency_id = p_agency_id
    and c.status = 'active'
    and (p_location_id is null or c.location_id = p_location_id);

  v_result := json_build_object(
    'date', p_date,
    'total_today', v_total,
    'waiting', v_waiting,
    'calling', v_calling,
    'serving', v_serving,
    'completed', v_completed,
    'skipped', v_skipped,
    'postponed', v_postponed,
    'active_counters', v_active_counters,
    'attendance_rate', case
      when v_total = 0 then 0
      else round((v_completed::numeric / v_total::numeric) * 100, 1)
    end
  );

  return v_result;
end;
$$;

-- Beri hak akses execute ke publik dan authenticated
grant execute on function public.get_agency_satisfaction_analytics(int, int) to anon, authenticated, service_role;
grant execute on function public.get_agency_queue_analytics(int, date, int) to anon, authenticated, service_role;
