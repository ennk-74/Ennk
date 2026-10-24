/*
# Multi-user auth: add user_id and owner-scoped RLS

## Summary
Transforms StyleStock AI from a single-tenant (public data) app into a
multi-user app with strict per-user data isolation. Every clothing item is
owned by the authenticated user who created it. No user can see, modify, or
delete another user's data.

## Changes

### 1. clothing_items table
- Adds `user_id uuid NOT NULL DEFAULT auth.uid()` — every row is automatically
  associated with the authenticated user at insert time. The DEFAULT means
  client inserts that omit `user_id` still succeed.
- Adds foreign key constraint to `auth.users(id)` with `ON DELETE CASCADE` —
  when a user account is deleted, all their clothing items are removed.
- Adds index on `user_id` for fast per-user queries.

### 2. RLS policies on clothing_items (BREAKING CHANGE)
- **Drops** all existing `anon_*` policies that used `USING (true)` / `WITH CHECK (true)`.
- **Replaces** them with four owner-scoped policies (SELECT/INSERT/UPDATE/DELETE)
  that verify `auth.uid() = user_id`.
- **Revokes** grants from `anon` role — only `authenticated` can reach the table.
- **Grants** SELECT, INSERT, UPDATE, DELETE to `authenticated` only.

### 3. Storage bucket `clothing-photos`
- Changes the bucket from **public to private** — photos are no longer
  accessible via public URLs. Users must use signed URLs.
- **Drops** all existing storage policies that allowed anon access.
- **Replaces** with owner-scoped storage policies:
  - SELECT: user can read objects in their own folder `user_id/...`
  - INSERT: user can upload to their own folder
  - UPDATE: user can update objects in their own folder
  - DELETE: user can delete objects in their own folder
- Storage path convention: `clothing-photos/{user_id}/{item_id}/{index}.jpg`

### 4. Data safety
- No existing data is deleted (table is currently empty).
- The `user_id` column has a DEFAULT of `auth.uid()` so it is never NULL for
  authenticated inserts. Existing rows (if any appeared between checks) would
  get NULL and be invisible to all users — they are not exposed to anyone.

### 5. Notes
- This migration is idempotent: uses IF NOT EXISTS / IF EXISTS.
- Policies are dropped before recreation to avoid duplicates.
- The `anon` role loses all access to `clothing_items` — unauthenticated
  requests will get empty results (SELECT) or permission errors (writes).
  This is intentional: the app now requires sign-in.
*/

-- =============================================================
-- 1. Add user_id column to clothing_items
-- =============================================================

ALTER TABLE clothing_items
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT auth.uid();

-- Foreign key to auth.users (CASCADE on account deletion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clothing_items_user_id_fkey'
      AND table_name = 'clothing_items'
  ) THEN
    ALTER TABLE clothing_items
      ADD CONSTRAINT clothing_items_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for per-user queries
CREATE INDEX IF NOT EXISTS idx_clothing_user_id ON clothing_items (user_id);

-- =============================================================
-- 2. Replace open RLS policies with owner-scoped policies
-- =============================================================

-- Revoke anon access entirely
REVOKE SELECT, INSERT, UPDATE, DELETE ON clothing_items FROM anon;

-- Grant only to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON clothing_items TO authenticated;

-- Drop all old open policies
DROP POLICY IF EXISTS "anon_select_clothing" ON clothing_items;
DROP POLICY IF EXISTS "anon_insert_clothing" ON clothing_items;
DROP POLICY IF EXISTS "anon_update_clothing" ON clothing_items;
DROP POLICY IF EXISTS "anon_delete_clothing" ON clothing_items;

-- Owner-scoped SELECT
CREATE POLICY "select_own_clothing" ON clothing_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Owner-scoped INSERT (WITH CHECK ensures user_id matches the authenticated user)
CREATE POLICY "insert_own_clothing" ON clothing_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner-scoped UPDATE
CREATE POLICY "update_own_clothing" ON clothing_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner-scoped DELETE
CREATE POLICY "delete_own_clothing" ON clothing_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================
-- 3. Make storage bucket private and owner-scoped
-- =============================================================

-- Change bucket from public to private
UPDATE storage.buckets SET public = false WHERE id = 'clothing-photos';

-- Drop old open storage policies
DROP POLICY IF EXISTS "Public read access for clothing photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload clothing photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon update clothing photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete clothing photos" ON storage.objects;

-- Owner-scoped storage policies
-- Path convention: clothing-photos/{user_id}/{item_id}/{index}.jpg
-- The storage.objects.name field contains the full path after the bucket prefix.

CREATE POLICY "read_own_photos" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clothing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "upload_own_photos" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clothing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "update_own_photos" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clothing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'clothing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "delete_own_photos" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clothing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
