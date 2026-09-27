-- Migration: Broadcast queue changes to the public display (TV)
--
-- The TV display (/display/[agencyId]/antrean) has no session, so it listens as
-- `anon`. postgres_changes respects RLS, and the only policy on `queues` is
-- `auth.uid() = user_id`, so the display never received a single event from
-- 20260927201600_enable_realtime_for_queues — it only updated via polling.
--
-- Opening `queues` to anon is not an option (it would expose `nik` over
-- PostgREST). Instead this trigger broadcasts a content-free signal to a public
-- topic per agency; the display re-renders from the server (service_role) when
-- it hears it. The payload carries no ticket data, so a public topic is safe.
--
-- Topic: `display:agency:<agency_id>`, event: `queue_changed`.

create or replace function public.broadcast_queue_change_to_display()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service_id integer := coalesce(new.service_id, old.service_id);
  v_schedule_date date := coalesce(new.schedule_date, old.schedule_date);
  v_agency_id integer;
begin
  -- The display only shows today's board; skip bookings for other days.
  if v_schedule_date is distinct from (now() at time zone 'Asia/Jakarta')::date then
    return null;
  end if;

  select s.agency_id into v_agency_id
  from public.services s
  where s.id = v_service_id;

  if v_agency_id is null then
    return null;
  end if;

  begin
    perform realtime.send(
      jsonb_build_object('agency_id', v_agency_id),
      'queue_changed',
      'display:agency:' || v_agency_id,
      false
    );
  exception when others then
    -- A broadcast failure must never roll back a queue write.
    raise warning 'broadcast_queue_change_to_display failed: %', sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.broadcast_queue_change_to_display() from public, anon, authenticated;

drop trigger if exists queues_broadcast_to_display on public.queues;

create trigger queues_broadcast_to_display
after insert or update or delete on public.queues
for each row execute function public.broadcast_queue_change_to_display();
