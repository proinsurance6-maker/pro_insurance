import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (optional - falls back to Cloudinary if not configured)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Only create client if both URL and key are provided
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export interface UploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  resource_type: string;
  bytes: number;
}

// ==========================================
// UPLOAD DOCUMENT TO SUPABASE
// ==========================================
export const uploadDocument = async (
  buffer: Buffer, 
  filename: string, 
  folder: string = 'insurance-docs',
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto',
  originalExtension?: string
): Promise<UploadResult> => {
  // If Supabase not configured, throw error with helpful message
  if (!supabase) {
    throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in environment variables.');
  }

  try {
    const ext = originalExtension || filename.split('.').pop() || '';
    const contentType = getContentType(ext);
    const filePath = `${folder}/${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('policy-documents') // Bucket name
      .upload(filePath, buffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('policy-documents')
      .getPublicUrl(filePath);

    return {
      public_id: filePath,
      secure_url: urlData.publicUrl,
      original_filename: filename,
      format: ext,
      resource_type: resourceType,
      bytes: buffer.length,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// Helper to determine content type
const getContentType = (extension: string): string => {
  const ext = extension.toLowerCase();
  const contentTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return contentTypes[ext] || 'application/octet-stream';
};

// ==========================================
// UPLOAD POLICY DOCUMENTS
// ==========================================
export const uploadPolicyDocuments = async (files: {
  policyCopy?: Express.Multer.File;
  rcDocument?: Express.Multer.File;
  aadharFront?: Express.Multer.File;
  aadharBack?: Express.Multer.File;
  panCard?: Express.Multer.File;
  photo?: Express.Multer.File;
  cancelCheque?: Express.Multer.File;
}, policyNumber: string) => {
  const uploadedDocuments: { [key: string]: UploadResult } = {};

  const documentTypes = [
    { key: 'policyCopy', folder: 'policies', prefix: 'policy' },
    { key: 'rcDocument', folder: 'rc-documents', prefix: 'rc' },
    { key: 'aadharFront', folder: 'kyc/aadhar', prefix: 'aadhar_front' },
    { key: 'aadharBack', folder: 'kyc/aadhar', prefix: 'aadhar_back' },
    { key: 'panCard', folder: 'kyc/pan', prefix: 'pan' },
    { key: 'photo', folder: 'kyc/photos', prefix: 'photo' },
    { key: 'cancelCheque', folder: 'kyc/bank', prefix: 'cheque' },
  ];

  for (const docType of documentTypes) {
    const file = files[docType.key as keyof typeof files];
    if (file) {
      try {
        const ext = file.originalname.split('.').pop() || '';
        const filename = `${docType.prefix}_${policyNumber}_${Date.now()}.${ext}`;
        const resourceType = ext === 'pdf' ? 'raw' : 'image';
        
        const result = await uploadDocument(
          file.buffer, 
          filename, 
          docType.folder,
          resourceType,
          ext
        );
        
        uploadedDocuments[docType.key] = result;
      } catch (error) {
        console.error(`Failed to upload ${docType.key}:`, error);
        // Continue with other uploads even if one fails
      }
    }
  }

  return uploadedDocuments;
};

// ==========================================
// DELETE DOCUMENT FROM SUPABASE
// ==========================================
export const deleteDocument = async (publicId: string): Promise<boolean> => {
  if (!supabase) {
    console.warn('Supabase not configured - cannot delete document');
    return false;
  }

  try {
    const { error } = await supabase.storage
      .from('policy-documents')
      .remove([publicId]);

    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    return false;
  }
};
