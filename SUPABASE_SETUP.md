# Supabase Storage Setup for Pro Insurance

## Why Supabase Instead of Cloudinary?

1. ✅ **Free 1GB storage** (enough for thousands of policies)
2. ✅ **Public URLs by default** (no authentication issues)
3. ✅ **Handles PDFs and images** seamlessly
4. ✅ **No credit card required** for free tier
5. ✅ **Better for India** - No payment required initially

---

## Setup Steps (5 Minutes)

### 1. Create Supabase Account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub/Google/Email
4. Create a new project:
   - **Project Name**: `pro-insurance`
   - **Database Password**: (save this)
   - **Region**: Select closest to India (Singapore recommended)
   - Click "Create new project"

### 2. Create Storage Bucket
1. In Supabase Dashboard → Click **Storage** (left sidebar)
2. Click **"New bucket"**
3. Bucket settings:
   - **Name**: `policy-documents`
   - **Public bucket**: ✅ **CHECK THIS** (important!)
   - Click "Create bucket"

### 3. Set Bucket Policies (Allow Public Access)
1. Click on the `policy-documents` bucket
2. Go to **Policies** tab
3. Click **"New Policy"**
4. Select **"For full customization"**
5. Add this policy:

```sql
-- Policy Name: Public Read Access
-- Allowed operation: SELECT
-- Policy definition:
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT USING (bucket_id = 'policy-documents');

-- Policy Name: Authenticated Upload
-- Allowed operation: INSERT
-- Policy definition:
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'policy-documents');
```

**OR use the simple UI:**
- Policy name: `Public Access for Downloads`
- Target roles: `public`
- Allowed operations: `SELECT`
- Policy definition: `true`

### 4. Get API Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 5. Update Backend .env File

Add these to `backend/.env`:

```env
# Supabase Storage (Replace Cloudinary)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 6. Restart Backend

```bash
cd backend
npm run dev
```

---

## Testing

1. Upload a policy with PDF document
2. Click "Download" on the policy
3. PDF should download directly without errors ✅

---

## Storage Limits

- **Free Tier**: 1 GB storage
- **Bandwidth**: Unlimited downloads
- **Files**: Unlimited number of files

**Estimate**: 
- Average PDF policy = 500 KB
- 1 GB = ~2,000 policies
- More than enough for small-medium agencies!

---

## Troubleshooting

### PDFs still not downloading?
1. Check bucket is **public** (Storage → policy-documents → Settings → Public bucket = ON)
2. Check policies are set (should have "Public Read Access" policy)
3. Verify `.env` has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Files uploading but URL not working?
- Make sure bucket policies allow SELECT for public role
- URL format should be: `https://xxx.supabase.co/storage/v1/object/public/policy-documents/...`

---

## Migration from Cloudinary

Old files in Cloudinary will continue to work. New uploads will use Supabase.

To migrate old files:
1. Download from Cloudinary
2. Upload to Supabase
3. Update database URLs (optional)

---

## Future Upgrades

If you need more storage:
- **Pro Plan**: $25/month = 100 GB + extra features
- **Pay-as-you-go**: $0.021 per GB per month

But 1 GB free should be enough for most agents!
