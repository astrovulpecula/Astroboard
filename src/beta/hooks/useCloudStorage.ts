import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BETA_CONFIG } from '../config';
import type { BetaUser } from './useBetaAuth';

interface UseCloudStorageReturn {
  uploading: boolean;
  downloading: boolean;
  error: string | null;
  uploadImage: (file: File, fileName: string) => Promise<string | null>;
  uploadJson: (data: object, fileName: string) => Promise<boolean>;
  downloadJson: (fileName: string) => Promise<object | null>;
  listUserFiles: (bucket: 'user-data' | 'user-images') => Promise<string[]>;
  deleteFile: (bucket: 'user-data' | 'user-images', fileName: string) => Promise<boolean>;
  getPublicUrl: (bucket: 'user-images', fileName: string) => string | null;
}

async function compressImage(file: File, maxSizeMB: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions (max 2000px on longest side)
      let { width, height } = img;
      const maxDim = 2000;

      if (width > height && width > maxDim) {
        height = (height / width) * maxDim;
        width = maxDim;
      } else if (height > maxDim) {
        width = (width / height) * maxDim;
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // Try to compress with given quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // If still too large, reduce quality further
            if (blob.size > maxSizeMB * 1024 * 1024) {
              canvas.toBlob(
                (smallerBlob) => {
                  resolve(smallerBlob || blob);
                },
                'image/jpeg',
                quality * 0.7
              );
            } else {
              resolve(blob);
            }
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function useCloudStorage(betaUser: BetaUser | null): UseCloudStorageReturn {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserPath = useCallback((fileName: string) => {
    if (!betaUser) return null;
    // Get auth user id from the betaUser's user_id field
    return `${betaUser.user_id}/${fileName}`;
  }, [betaUser]);

  const uploadImage = useCallback(async (file: File, fileName: string): Promise<string | null> => {
    if (!betaUser || !BETA_CONFIG.FEATURES.CLOUD_STORAGE) return null;

    setUploading(true);
    setError(null);

    try {
      // Check file size
      if (file.size > BETA_CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        // Compress the image
        const compressedBlob = await compressImage(
          file,
          BETA_CONFIG.MAX_IMAGE_SIZE_MB,
          BETA_CONFIG.IMAGE_COMPRESSION_QUALITY
        );
        file = new File([compressedBlob], fileName, { type: 'image/jpeg' });
      }

      const path = getUserPath(fileName);
      if (!path) throw new Error('User path not available');

      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('user-images')
        .getPublicUrl(path);

      return data.publicUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error uploading image';
      setError(message);
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploading(false);
    }
  }, [betaUser, getUserPath]);

  const uploadJson = useCallback(async (data: object, fileName: string): Promise<boolean> => {
    if (!betaUser || !BETA_CONFIG.FEATURES.CLOUD_STORAGE) return false;

    setUploading(true);
    setError(null);

    try {
      const path = getUserPath(fileName);
      if (!path) throw new Error('User path not available');

      const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });

      const { error: uploadError } = await supabase.storage
        .from('user-data')
        .upload(path, jsonBlob, { upsert: true });

      if (uploadError) throw uploadError;

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error uploading data';
      setError(message);
      console.error('Upload error:', err);
      return false;
    } finally {
      setUploading(false);
    }
  }, [betaUser, getUserPath]);

  const downloadJson = useCallback(async (fileName: string): Promise<object | null> => {
    if (!betaUser || !BETA_CONFIG.FEATURES.CLOUD_STORAGE) return null;

    setDownloading(true);
    setError(null);

    try {
      const path = getUserPath(fileName);
      if (!path) throw new Error('User path not available');

      const { data, error: downloadError } = await supabase.storage
        .from('user-data')
        .download(path);

      if (downloadError) {
        // File might not exist yet, which is fine
        if (downloadError.message.includes('not found')) {
          return null;
        }
        throw downloadError;
      }

      const text = await data.text();
      return JSON.parse(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error downloading data';
      setError(message);
      console.error('Download error:', err);
      return null;
    } finally {
      setDownloading(false);
    }
  }, [betaUser, getUserPath]);

  const listUserFiles = useCallback(async (bucket: 'user-data' | 'user-images'): Promise<string[]> => {
    if (!betaUser) return [];

    try {
      const { data, error: listError } = await supabase.storage
        .from(bucket)
        .list(betaUser.user_id);

      if (listError) throw listError;

      return data?.map(f => f.name) || [];
    } catch (err) {
      console.error('List error:', err);
      return [];
    }
  }, [betaUser]);

  const deleteFile = useCallback(async (
    bucket: 'user-data' | 'user-images',
    fileName: string
  ): Promise<boolean> => {
    if (!betaUser) return false;

    try {
      const path = getUserPath(fileName);
      if (!path) return false;

      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Delete error:', err);
      return false;
    }
  }, [betaUser, getUserPath]);

  const getPublicUrl = useCallback((bucket: 'user-images', fileName: string): string | null => {
    if (!betaUser) return null;
    
    const path = getUserPath(fileName);
    if (!path) return null;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }, [betaUser, getUserPath]);

  return {
    uploading,
    downloading,
    error,
    uploadImage,
    uploadJson,
    downloadJson,
    listUserFiles,
    deleteFile,
    getPublicUrl,
  };
}
