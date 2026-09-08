-- Unblocks agency ("instansi") accounts and aligns role naming with business-flow notes.
--
-- Live schema before this migration:
--   users.nik  varchar NOT NULL UNIQUE, CHECK (nik ~ '^[0-9]{16}$')
--   users.role varchar NOT NULL DEFAULT 'citizen', CHECK IN ('citizen','officer','admin')
--   users has no agency_id; services has no info_procedure.

-- 1. role -> native enum. The deployed values are citizen/officer/admin, which
--    map onto the agreed naming as user/instansi/super_admin.
create type public.user_role as enum ('user', 'instansi', 'super_admin');

alter table public.users alter column role drop default;
alter table public.users drop constraint users_role_check;

alter table public.users
  alter column role type public.user_role
  using case role
          when 'citizen' then 'user'
          when 'officer' then 'instansi'
          when 'admin'   then 'super_admin'
        end::public.user_role;

alter table public.users alter column role set default 'user';

-- 2. NIK optional, so an agency account can be created without one. UNIQUE stays:
--    Postgres treats NULLs as distinct, so many NIK-less rows still pass it. The
--    existing users_nik_format CHECK also passes on NULL (evaluates to unknown).
--    Citizens are still required to carry a NIK.
alter table public.users alter column nik drop not null;

alter table public.users
  add constraint users_nik_required_for_citizen
  check (role <> 'user' or nik is not null);

-- 3. users.agency_id -> which agency an 'instansi' account operates.
--    ON DELETE RESTRICT: an agency row is referenced by services/counters/queue
--    history, so it must not disappear from under a live account.
alter table public.users
  add column agency_id integer references public.agencies (id) on delete restrict;

-- Postgres does not index FK columns automatically; without this, deleting an
-- agency sequentially scans users.
create index users_agency_id_idx on public.users (agency_id);

-- 'instansi' must have an agency; 'user' and 'super_admin' must not (super admin
-- is global scope).
alter table public.users
  add constraint users_agency_matches_role
  check ((role = 'instansi') = (agency_id is not null));

-- 4. services.info_procedure
alter table public.services add column info_procedure text;

-- 5. handle_new_user() hardcodes the literal 'citizen', which is no longer a
--    valid role. Unchanged apart from that literal; CREATE OR REPLACE keeps the
--    ownership and the REVOKEd EXECUTE grants from the earlier migrations.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_nik text := nullif(btrim(new.raw_user_meta_data ->> 'nik'), '');
  v_full_name text := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');
  v_constraint text;
begin
  if v_nik is null or v_nik !~ '^[0-9]{16}$' then
    raise exception 'NIK harus berupa 16 digit angka' using errcode = '23514';
  end if;

  if v_full_name is null then
    raise exception 'Nama lengkap wajib diisi' using errcode = '23502';
  end if;

  -- `role` is deliberately not read from raw_user_meta_data. That column holds
  -- whatever the client passed to signUp(options.data), so honouring it here
  -- would reopen the privilege escalation from the other side.
  insert into public.users (id, nik, full_name, email, role)
  values (new.id, v_nik, v_full_name, new.email, 'user'::public.user_role);

  return new;
exception
  when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'users_nik_key' then
      raise exception 'NIK % sudah terdaftar', v_nik using errcode = '23505';
    end if;
    raise;
end;
$$;
