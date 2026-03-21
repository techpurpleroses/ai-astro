-- Migration 19: Add gender and relationship_status to identity.profiles
-- These fields are used in the "You" / Profile section of the dashboard.

alter table identity.profiles
  add column if not exists gender text null
    check (gender in ('female', 'male', 'non_binary'));

alter table identity.profiles
  add column if not exists relationship_status text null
    check (relationship_status in ('single', 'engaged', 'married', 'soulmate', 'difficult'));

comment on column identity.profiles.gender is 'User gender identity: female, male, or non_binary';
comment on column identity.profiles.relationship_status is 'User relationship status for personalisation: single, engaged, married, soulmate, difficult';
