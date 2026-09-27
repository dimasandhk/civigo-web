-- Migration: Enable Realtime Broadcast for Queues Table
-- Enables supabase_realtime publication on public.queues so display screens (QueueDisplayLive)
-- and mobile apps receive live updates without polling.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'queues'
  ) then
    alter publication supabase_realtime add table public.queues;
  end if;
end $$;

-- Set replica identity full so update payloads include complete row details if needed
alter table public.queues replica identity full;
