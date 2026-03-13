begin;

-- =========================================================
-- Private storage buckets (idempotent)
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'palm_scans',
    'palm_scans',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp']
  ),
  (
    'soulmatch_images',
    'soulmatch_images',
    false,
    10485760,
    array['image/jpeg','image/png','image/webp']
  ),
  (
    'astro_reports',
    'astro_reports',
    false,
    20971520,
    array['application/pdf','image/png','image/jpeg']
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =========================================================
-- Row-level policies for storage objects
-- Path rule: {user_id}/{entity_id}/{file}
-- =========================================================

drop policy if exists "storage_objects_select_own_private_buckets"
on storage.objects;

drop policy if exists "storage_objects_insert_own_private_buckets"
on storage.objects;

drop policy if exists "storage_objects_update_own_private_buckets"
on storage.objects;

drop policy if exists "storage_objects_delete_own_private_buckets"
on storage.objects;

drop policy if exists "storage_objects_service_all_private_buckets"
on storage.objects;

create policy "storage_objects_select_own_private_buckets"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports')
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_objects_insert_own_private_buckets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports')
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_objects_update_own_private_buckets"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports')
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports')
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_objects_delete_own_private_buckets"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports')
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "storage_objects_service_all_private_buckets"
on storage.objects
for all
to service_role
using (bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports'))
with check (bucket_id in ('palm_scans', 'soulmatch_images', 'astro_reports'));

commit;
