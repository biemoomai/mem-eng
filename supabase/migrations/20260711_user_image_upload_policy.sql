-- Mem-eng: keep public user-card image storage limited to small image files.
-- Images remain public by product choice so the existing card URLs continue to work.

drop policy if exists "Users upload their own card images" on storage.objects;
create policy "Users upload their own small image cards"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'gif'])
    and coalesce((metadata->>'size')::bigint, 0) <= 5242880
  );

drop policy if exists "Users update their own card images" on storage.objects;
create policy "Users update their own small image cards"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'user-card-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) = any (array['jpg', 'jpeg', 'png', 'webp', 'gif'])
    and coalesce((metadata->>'size')::bigint, 0) <= 5242880
  );
