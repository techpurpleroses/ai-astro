begin;

-- Validate timezone names against PostgreSQL timezone registry.
create or replace function platform.is_valid_iana_timezone(p_tz text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from pg_timezone_names
    where name = p_tz
  );
$$;

-- Profile-level timezone for UX/day-boundary defaults.
alter table identity.profiles
  add column if not exists preferred_timezone text;

update identity.profiles
set preferred_timezone = 'UTC'
where preferred_timezone is null
   or btrim(preferred_timezone) = '';

alter table identity.profiles
  alter column preferred_timezone set default 'UTC';

alter table identity.profiles
  alter column preferred_timezone set not null;

alter table identity.profiles
  drop constraint if exists profiles_preferred_timezone_valid_chk;

alter table identity.profiles
  add constraint profiles_preferred_timezone_valid_chk
  check (platform.is_valid_iana_timezone(preferred_timezone));

-- Subject timezone is required for globally correct local-date logic.
update identity.subjects
set timezone = 'UTC'
where timezone is null
   or btrim(timezone) = '';

alter table identity.subjects
  alter column timezone set default 'UTC';

alter table identity.subjects
  alter column timezone set not null;

alter table identity.subjects
  drop constraint if exists subjects_timezone_valid_chk;

alter table identity.subjects
  add constraint subjects_timezone_valid_chk
  check (platform.is_valid_iana_timezone(timezone));

-- Helper: get local date for a timezone using a UTC timestamp.
create or replace function platform.current_local_date(
  p_tz text,
  p_now timestamptz default now()
)
returns date
language sql
stable
as $$
  select (p_now at time zone p_tz)::date;
$$;

-- Helper: convert a local day into UTC boundaries.
create or replace function platform.local_date_utc_bounds(
  p_local_date date,
  p_tz text
)
returns table (
  day_start_utc timestamptz,
  day_end_utc timestamptz
)
language sql
stable
as $$
  select
    (p_local_date::timestamp at time zone p_tz) as day_start_utc,
    ((p_local_date + 1)::timestamp at time zone p_tz) as day_end_utc;
$$;

-- Helper: resolve subject-local date safely.
create or replace function platform.subject_local_date(
  p_subject_id uuid,
  p_now timestamptz default now()
)
returns date
language sql
stable
as $$
  select platform.current_local_date(s.timezone, p_now)
  from identity.subjects s
  where s.id = p_subject_id;
$$;

commit;
