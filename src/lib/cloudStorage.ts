import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';

// Lazy Cloudinary initialization
let isCloudinaryConfigured = false;

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    if (!isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      isCloudinaryConfigured = true;
    }
    return cloudinary;
  }
  return null;
}

export interface UploadResult {
  url: string;
  provider: 'cloudinary' | 'firebase' | 'local';
  publicId?: string;
  format?: string;
  sizeBytes?: number;
}

/**
 * Upload an image or document (avatar, student dossier/records) to Cloudinary or fallback
 * @param fileData Base64 data URI or binary buffer or file path
 * @param options Additional upload options
 */
export async function uploadToCloudStorage(
  fileData: string,
  options: {
    folder?: string;
    publicId?: string;
    resourceType?: 'image' | 'raw' | 'auto';
    tags?: string[];
  } = {}
): Promise<UploadResult> {
  const cloud = getCloudinary();

  if (cloud) {
    try {
      const res = await cloud.uploader.upload(fileData, {
        folder: options.folder || 'qlsv_students',
        public_id: options.publicId,
        resource_type: options.resourceType || 'auto',
        tags: options.tags || ['qlsv', 'student'],
      });

      return {
        url: res.secure_url || res.url,
        provider: 'cloudinary',
        publicId: res.public_id,
        format: res.format,
        sizeBytes: res.bytes,
      };
    } catch (err: any) {
      console.warn('[CloudStorage] Cloudinary upload failed, falling back:', err?.message || err);
    }
  }

  // Fallback: return fileData (Base64 data URL) or generate storage URL
  return {
    url: fileData,
    provider: 'local',
  };
}

export function getStorageStatus() {
  const cloud = getCloudinary();
  const hasCloudinary = Boolean(cloud);
  const hasFirebaseAdmin = Boolean(
    process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_CREDENTIALS_PATH ||
    fs.existsSync(path.join(process.cwd(), 'firebase-credentials.json'))
  );

  return {
    cloudinary: {
      configured: hasCloudinary,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    },
    firebase: {
      configured: hasFirebaseAdmin,
      projectId: process.env.FIREBASE_PROJECT_ID || 'triple-network-nxctm',
    },
  };
}
