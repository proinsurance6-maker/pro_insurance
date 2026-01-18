import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// Supports both individual keys and CLOUDINARY_URL format
if (process.env.CLOUDINARY_URL) {
  // Use CLOUDINARY_URL if available (automatically parses)
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  // Fallback to individual environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export interface UploadResult {
  public_id: string;
  secure_url: string;
  original_filename: string;
  format: string;
  resource_type: string;
  bytes: number;
}

// Helper function to get file extension
const getFileExtension = (filename: string, mimetype: string): string => {
  // Try to get from filename first
  const extFromName = filename.split('.').pop()?.toLowerCase();
  if (extFromName && extFromName.length <= 4 && extFromName !== filename.toLowerCase()) {
    return extFromName;
  }
  
  // Fallback to mimetype mapping
  const mimeToExt: { [key: string]: string } = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  
  return mimeToExt[mimetype] || '';
};

// ==========================================
// UPLOAD DOCUMENT TO CLOUDINARY
// ==========================================
export const uploadDocument = async (
  buffer: Buffer, 
  filename: string, 
  folder: string = 'insurance-docs',
  resourceType: 'image' | 'raw' | 'video' | 'auto' = 'auto',
  originalExtension?: string
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    // For PDFs and raw files, include extension in public_id for proper download
    const publicId = originalExtension ? `${filename}` : filename;
    
    cloudinary.uploader.upload_stream(
      {
        folder: `${folder}`,
        public_id: publicId,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: false, // Keep our filename as-is
        // For raw files (PDFs), set format explicitly
        ...(resourceType === 'raw' && originalExtension ? { format: originalExtension } : {}),
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          // For raw files (PDFs), modify URL to include fl_attachment for proper download
          let secureUrl = result.secure_url;
          if (resourceType === 'raw' && originalExtension === 'pdf') {
            // Add fl_attachment flag to force browser to download with correct name
            secureUrl = secureUrl.replace('/upload/', '/upload/fl_attachment/');
          }
          
          resolve({
            public_id: result.public_id,
            secure_url: secureUrl,
            original_filename: result.original_filename || filename,
            format: result.format || originalExtension || '',
            resource_type: result.resource_type,
            bytes: result.bytes,
          });
        } else {
          reject(new Error('Upload failed - no result'));
        }
      }
    ).end(buffer);
  });
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
        // Extract extension from original filename or mimetype
        const originalName = file.originalname || '';
        const extension = getFileExtension(originalName, file.mimetype);
        
        const filename = `${docType.prefix}_${policyNumber}_${Date.now()}`;
        const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
        
        const result = await uploadDocument(
          file.buffer,
          filename,
          docType.folder,
          resourceType,
          extension
        );
        
        uploadedDocuments[docType.key] = result;
      } catch (error) {
        console.error(`Failed to upload ${docType.key}:`, error);
      }
    }
  }

  return uploadedDocuments;
};

// ==========================================
// UPLOAD SUB-AGENT KYC DOCUMENTS
// ==========================================
export const uploadSubAgentKyc = async (
  files: Express.Multer.File[], 
  subAgentCode: string
): Promise<UploadResult[]> => {
  const uploadPromises = files.map(async (file, index) => {
    const extension = getFileExtension(file.originalname || '', file.mimetype);
    const filename = `${subAgentCode}_kyc_${Date.now()}_${index}`;
    const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'image';
    
    return uploadDocument(
      file.buffer,
      filename,
      'sub-agents/kyc',
      resourceType,
      extension
    );
  });

  return Promise.all(uploadPromises);
};

// ==========================================
// DELETE DOCUMENT FROM CLOUDINARY
// ==========================================
export const deleteDocument = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw error;
  }
};

// ==========================================
// GENERATE SECURE URL WITH EXPIRY
// ==========================================
export const generateSecureUrl = (
  publicId: string, 
  expiresAt: number = Math.floor(Date.now() / 1000) + 3600 // 1 hour
): string => {
  return cloudinary.url(publicId, {
    sign_url: true,
    expires_at: expiresAt,
  });
};

// ==========================================
// GENERATE DOWNLOAD URL WITH PROPER FILENAME
// ==========================================
export const generateDownloadUrl = (
  publicId: string,
  resourceType: 'image' | 'raw' = 'raw',
  format?: string
): string => {
  // For raw files (PDFs), use the fl_attachment flag to force download with proper filename
  const options: any = {
    resource_type: resourceType,
    flags: 'attachment',
  };
  
  // Add format if provided
  if (format) {
    options.format = format;
  }
  
  return cloudinary.url(publicId, options);
};

// ==========================================
// GET PROPER URL FOR DOCUMENT (VIEW OR DOWNLOAD)
// ==========================================
export const getDocumentUrl = (
  secureUrl: string,
  format?: string,
  forceDownload: boolean = false
): string => {
  if (!secureUrl) return secureUrl;
  
  // For PDFs, add fl_attachment to force proper download with extension
  if (format === 'pdf' || secureUrl.includes('/raw/')) {
    // Insert fl_attachment flag before /upload/ in the URL
    if (forceDownload && !secureUrl.includes('fl_attachment')) {
      return secureUrl.replace('/upload/', '/upload/fl_attachment/');
    }
  }
  
  return secureUrl;
};

export default cloudinary;