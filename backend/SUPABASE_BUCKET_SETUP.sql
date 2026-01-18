-- =====================================================
-- SUPABASE STORAGE BUCKET SETUP FOR PRO INSURANCE
-- =====================================================
-- Run this in Supabase Dashboard → SQL Editor
-- OR use the UI (Storage → Create Bucket)

-- NOTE: Bucket creation via SQL is limited
-- Preferred method: Use Supabase Dashboard UI
-- This script is for POLICIES ONLY (after bucket is created)

-- =====================================================
-- STEP 1: Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Create Storage Policies for 'policy-documents' bucket
-- =====================================================

-- Policy 1: Allow PUBLIC to SELECT (download/view) files
-- This allows anyone with the URL to download PDFs
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'policy-documents');

-- Policy 2: Allow AUTHENTICATED users to INSERT (upload) files
-- This allows the backend (with anon key) to upload files
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'policy-documents');

-- Policy 3: Allow AUTHENTICATED users to UPDATE files
-- This allows updating file metadata
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'policy-documents')
WITH CHECK (bucket_id = 'policy-documents');

-- Policy 4: Allow AUTHENTICATED users to DELETE files
-- This allows deleting files if needed
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'policy-documents');

-- =====================================================
-- STEP 3: Verify Policies
-- =====================================================
-- Run this to check if policies are created:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

-- =====================================================
-- VERIFICATION CHECKLIST
-- =====================================================
-- ✅ Bucket 'policy-documents' exists (create via UI)
-- ✅ Bucket is marked as PUBLIC (checkbox in UI)
-- ✅ All 4 policies are created (run query above)
-- ✅ SUPABASE_URL is set in .env
-- ✅ SUPABASE_ANON_KEY is set in .env
-- ✅ Backend restarted after env changes

-- =====================================================
-- MANUAL BUCKET CREATION (PREFERRED METHOD)
-- =====================================================
-- 1. Go to Supabase Dashboard
-- 2. Storage → New Bucket
-- 3. Name: policy-documents
-- 4. ✅ Public bucket (MUST CHECK THIS!)
-- 5. File size limit: 50 MB
-- 6. Click "Create bucket"
-- 7. Run this SQL script to add policies

-- =====================================================
-- TESTING
-- =====================================================
-- Upload a test file via backend
-- Expected URL format:
-- https://YOUR_PROJECT.supabase.co/storage/v1/object/public/policy-documents/policies/policy_123.pdf
-- 
-- Open URL in browser → Should download/view PDF directly
-- If 404: Bucket not created or wrong name
-- If 403: Policies missing or bucket not public
-- If 401: SUPABASE_ANON_KEY incorrect

-- =====================================================
-- CLEANUP (if needed to start fresh)
-- =====================================================
-- DROP ALL POLICIES:
-- DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- DELETE BUCKET (WARNING: Deletes all files!):
-- DELETE FROM storage.buckets WHERE name = 'policy-documents';
