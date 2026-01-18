# Supabase Storage Setup for Pro Insurance

## Why Supabase Instead of Cloudinary?

1. ✅ **Free 1GB storage** (enough for thousands of policies)
2. ✅ **Public URLs by default** (no 401/404 authentication issues)
3. ✅ **Handles PDFs and images** seamlessly
4. ✅ **No credit card required** for free tier
5. ✅ **Better for India** - No payment required initially

---

## Complete Setup (10 Minutes) ⚡

### Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with GitHub/Google/Email
4. Create a new project:
   - **Project Name**: `pro-insurance` (or any name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: **Singapore** (closest to India, best performance)
   - Click **"Create new project"**
   - Wait 2-3 minutes for project initialization

---

### Step 2: Create Storage Bucket ⚠️ CRITICAL STEP

1. In Supabase Dashboard → Click **"Storage"** (left sidebar, bucket icon)
2. Click **"Create a new bucket"** button
3. **Bucket Configuration**:
   ```
   Name: policy-documents
   ✅ Public bucket: CHECK THIS BOX (MUST BE ENABLED!)
   File size limit: 50 MB
   Allowed MIME types: Leave empty (allow all)
   ```
4. Click **"Create bucket"**

**⚠️ IMPORTANT:** If you forget to check "Public bucket", PDFs won't download!

---

### Step 3: Set Bucket Policies (Make Files Publicly Accessible)

After creating the bucket:

1. Click on the **`policy-documents`** bucket
2. Go to **"Configuration"** tab
3. Click **"Policies"** section
4. Click **"New Policy"** button
5. Select **"Get started quickly"** → Choose **"For full customization"**

**Add these TWO policies:**

#### Policy 1: Public Read Access (Allow Downloads)
```sql
-- Policy Name: Public Read Access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'policy-documents');
```

- **Policy name**: `Public Read Access`
- **Allowed operation**: SELECT
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'policy-documents'`

#### Policy 2: Authenticated Upload (Allow Backend to Upload)
```sql
-- Policy Name: Authenticated Upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'policy-documents');
```

- **Policy name**: `Authenticated Upload`
- **Allowed operation**: INSERT
- **Target roles**: `authenticated`, `anon`
- **WITH CHECK expression**: `bucket_id = 'policy-documents'`

#### Policy 3: Authenticated Update/Delete (Optional)
```sql
-- Policy Name: Allow Update Delete
CREATE POLICY "Allow Update Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'policy-documents');
```

**Click "Review" then "Save policy"** for each one.

---

### Step 4: Get API Credentials

1. Go to **Settings** → **API** (bottom left gear icon)
2. Copy these values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public key** (under "Project API keys"):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
   ```

---

### Step 5: Update Environment Variables

#### For LOCAL Development (backend/.env):

```env
# Supabase - Storage for PDF/Images (Active)
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### For RENDER Deployment:

1. Go to **Render Dashboard** → Your backend service
2. Click **"Environment"** tab
3. Add these variables:

```
SUPABASE_URL = https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Click **"Save Changes"**
5. Render will **automatically redeploy** (wait 2-3 minutes)

---

### Step 6: Restart & Test

#### Local:
```bash
cd backend
npm run dev
```

#### Test Upload:
1. Create a new policy with PDF document
2. Click **"Download"** on the policy
3. PDF should download directly ✅

---

## Verify Setup is Working

Upload a test policy and check:

1. **Supabase Dashboard** → Storage → policy-documents
   - You should see uploaded files (policy_xxx.pdf)
2. **Click on file** → Copy URL
   - URL format: `https://xxx.supabase.co/storage/v1/object/public/policy-documents/policies/policy_xxx.pdf`
3. **Open URL in browser** → PDF should open directly ✅

---

## Troubleshooting

### Error: "Bucket not found" (404)
**Fix:** Bucket name must be exactly `policy-documents` (check spelling!)

### Error: "new row violates row-level security policy" (403)
**Fix:** Bucket must have "Public bucket" checked OR add SELECT policy for public role

### PDFs uploading but not downloading (401/403)?
**Fix:** 
1. Ensure bucket is PUBLIC (Storage → policy-documents → Settings → Public = ON)
2. Check "Public Read Access" policy exists
3. Policy USING expression: `bucket_id = 'policy-documents'`

### Files not uploading from Render?
**Fix:** Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Render environment variables

---

## Storage Limits

- **Free Tier**: 1 GB storage
- **Bandwidth**: Unlimited downloads
- **Max file size**: 50 MB per file
- **Files**: Unlimited number

**Capacity Estimate:**
- Average PDF policy = 500 KB
- 1 GB = ~2,000 policies
- Perfect for small-medium agencies!

---

## Fallback to Cloudinary

The app has **intelligent fallback**:
- If `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set → Uses Supabase ✅
- If NOT set → Automatically uses Cloudinary (old system)

**This means:**
- Local development can use Supabase
- Production can use Cloudinary (or vice versa)
- No breaking changes!

---

## Quick Reference

| Item | Value |
|------|-------|
| Bucket Name | `policy-documents` |
| Public Access | ✅ MUST be enabled |
| Region | Singapore (ap-south-1 or similar) |
| Max File Size | 50 MB |
| Policies Required | Public Read (SELECT) + Authenticated Upload (INSERT) |

---

## SQL Script (Quick Setup)

Run this in **SQL Editor** (Supabase Dashboard → SQL Editor):

```sql
-- Create bucket if not exists (via dashboard preferred)
-- This is just for reference

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'policy-documents');

-- Policy 2: Authenticated upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'policy-documents');

-- Policy 3: Authenticated update/delete
CREATE POLICY "Allow Update Delete"
ON storage.objects FOR UPDATE
USING (bucket_id = 'policy-documents');

CREATE POLICY "Allow Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'policy-documents');
```

---

## Support

If stuck:
1. Check Supabase Dashboard → Logs
2. Check Render Logs (for production)
3. Verify bucket is public
4. Verify policies are created
5. Test URL directly in browser

**Happy Uploading! 🚀**
