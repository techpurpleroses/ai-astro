begin;

create or replace function identity.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = identity, public
as $$
declare
  v_display_name text;
  v_subject_id uuid;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );

  insert into identity.profiles (id, display_name, preferred_system)
  values (new.id, v_display_name, 'western')
  on conflict (id) do update
  set display_name = case
    when coalesce(identity.profiles.display_name, '') = '' then excluded.display_name
    else identity.profiles.display_name
  end;

  if not exists (
    select 1
    from identity.subjects s
    where s.user_id = new.id
      and s.is_primary = true
  ) then
    insert into identity.subjects (
      user_id,
      label,
      relationship_type,
      birth_date,
      birth_time,
      timezone,
      birth_place_name,
      latitude,
      longitude,
      is_primary
    )
    values (
      new.id,
      'My Profile',
      'self',
      current_date,
      time '12:00:00',
      'UTC',
      null,
      null,
      null,
      true
    )
    returning id into v_subject_id;
  else
    select s.id
    into v_subject_id
    from identity.subjects s
    where s.user_id = new.id
      and s.is_primary = true
    order by s.created_at asc
    limit 1;
  end if;

  update identity.profiles p
  set primary_subject_id = v_subject_id
  where p.id = new.id
    and p.primary_subject_id is null
    and v_subject_id is not null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_bootstrap on auth.users;

create trigger on_auth_user_created_bootstrap
after insert on auth.users
for each row execute function identity.handle_auth_user_created();

-- Backfill existing users so legacy accounts also have required identity rows.
insert into identity.profiles (id, display_name, preferred_system)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  'western'
from auth.users u
where not exists (
  select 1 from identity.profiles p where p.id = u.id
);

insert into identity.subjects (
  user_id,
  label,
  relationship_type,
  birth_date,
  birth_time,
  timezone,
  birth_place_name,
  latitude,
  longitude,
  is_primary
)
select
  u.id,
  'My Profile',
  'self',
  current_date,
  time '12:00:00',
  'UTC',
  null,
  null,
  null,
  true
from auth.users u
where not exists (
  select 1
  from identity.subjects s
  where s.user_id = u.id
    and s.is_primary = true
);

update identity.profiles p
set primary_subject_id = (
  select s2.id
  from identity.subjects s2
  where s2.user_id = p.id
    and s2.is_primary = true
  order by s2.created_at asc
  limit 1
)
where p.primary_subject_id is null
  and exists (
    select 1
    from identity.subjects s3
    where s3.user_id = p.id
      and s3.is_primary = true
  );

commit;
