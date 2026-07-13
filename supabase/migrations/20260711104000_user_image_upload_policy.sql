-- Constrain card images at bucket and object-policy level.
-- Public URLs are retained for current UI compatibility; paths contain unguessable user/card UUIDs.

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'user-card-images';

create or replace function public.can_upload_user_card_image(p_user_id uuid, p_object_name text)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  user_object_count integer;
  global_object_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then return false; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended('memeng-card-image:' || p_user_id::text, 0));
  if exists (
    select 1 from storage.objects
    where bucket_id = 'user-card-images' and name = p_object_name
  ) then
    return true;
  end if;

  select count(*) into user_object_count
  from storage.objects
  where bucket_id = 'user-card-images'
    and name like p_user_id::text || '/%';
  select count(*) into global_object_count
  from storage.objects
  where bucket_id = 'user-card-images';

  return user_object_count < 25 and global_object_count < 500;
end;
$$;
revoke all on function public.can_upload_user_card_image(uuid, text) from public, anon;
grant execute on function public.can_upload_user_card_image(uuid, text) to authenticated;
drop policy if exists "Users upload their own card images" on storage.objects;
drop policy if exists "Users upload their own small image cards" on storage.objects;
drop policy if exists "Users update their own card images" on storage.objects;
drop policy if exists "Users update their own small image cards" on storage.objects;
drop policy if exists "Users delete their own card images" on storage.objects;

create policy "Users upload their own small image cards"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'user-card-images'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}/cover\.(jpg|jpeg|png|webp|gif)$')
    and exists (
      select 1 from public.user_decks as deck
      where deck.id = ((storage.foldername(name))[2])::uuid
        and deck.user_id = auth.uid()
    )
    and public.can_upload_user_card_image(auth.uid(), name)
  );

create policy "Users update their own small image cards"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'user-card-images'
    and name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}/cover\.(jpg|jpeg|png|webp|gif)$')
  )
  with check (
    bucket_id = 'user-card-images'
    and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}/cover\.(jpg|jpeg|png|webp|gif)$')
    and exists (
      select 1 from public.user_decks as deck
      where deck.id = ((storage.foldername(name))[2])::uuid
        and deck.user_id = auth.uid()
    )
  );

create policy "Users delete their own card images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'user-card-images'
    and name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}/cover\.(jpg|jpeg|png|webp|gif)$')
  );
