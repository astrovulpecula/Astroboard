import { useState, useCallback, useEffect, useRef } from 'react';
import { useBetaContextOptional, useCloudStorage, BETA_CONFIG } from '@/beta';
import { useToast } from '@/hooks/use-toast';

const CLOUD_DATA_FILENAME = 'astro-tracker-data.json';
const CLOUD_PLANNED_FILENAME = 'astro-tracker-planned.json';
const CLOUD_SETTINGS_FILENAME = 'astro-tracker-settings.json';

interface UseCloudSyncReturn {
  // State
  isLoading: boolean;
  isSyncing: boolean;
  isCloudEnabled: boolean;
  lastSyncTime: Date | null;
  
  // Data operations
  loadFromCloud: () => Promise<{ objects: any[] | null; planned: any[] | null; settings: any | null }>;
  saveToCloud: (objects: any[], planned: any[], settings: any) => Promise<boolean>;
  
  // Image operations  
  uploadImageToCloud: (imageDataUrl: string, imageName: string) => Promise<string | null>;
  deleteImageFromCloud: (imageName: string) => Promise<boolean>;
  
  // Sync trigger
  triggerSync: () => void;
}

/**
 * Converts a base64 data URL to a File object
 */
function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], fileName, { type: mime });
  } catch (e) {
    console.error('Error converting data URL to file:', e);
    return null;
  }
}

/**
 * Hook to synchronize AstroTracker data with cloud storage
 */
export function useCloudSync(): UseCloudSyncReturn {
  const betaContext = useBetaContextOptional();
  const betaUser = betaContext?.betaUser ?? null;
  const cloudStorage = useCloudStorage(betaUser);
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isCloudEnabled = !!(
    betaUser && 
    BETA_CONFIG.FEATURES.CLOUD_STORAGE && 
    BETA_CONFIG.BETA_ENABLED
  );

  /**
   * Load all data from cloud storage
   */
  const loadFromCloud = useCallback(async () => {
    if (!isCloudEnabled) {
      return { objects: null, planned: null, settings: null };
    }
    
    setIsLoading(true);
    
    try {
      const [objectsData, plannedData, settingsData] = await Promise.all([
        cloudStorage.downloadJson(CLOUD_DATA_FILENAME),
        cloudStorage.downloadJson(CLOUD_PLANNED_FILENAME),
        cloudStorage.downloadJson(CLOUD_SETTINGS_FILENAME),
      ]);
      
      return {
        objects: objectsData as any[] | null,
        planned: plannedData as any[] | null,
        settings: settingsData as any | null,
      };
    } catch (error) {
      console.error('Error loading from cloud:', error);
      return { objects: null, planned: null, settings: null };
    } finally {
      setIsLoading(false);
    }
  }, [isCloudEnabled, cloudStorage]);

  /**
   * Save all data to cloud storage
   */
  const saveToCloud = useCallback(async (
    objects: any[], 
    planned: any[], 
    settings: any
  ): Promise<boolean> => {
    if (!isCloudEnabled) {
      return false;
    }
    
    setIsSyncing(true);
    
    try {
      const [objectsSuccess, plannedSuccess, settingsSuccess] = await Promise.all([
        cloudStorage.uploadJson(objects, CLOUD_DATA_FILENAME),
        cloudStorage.uploadJson(planned, CLOUD_PLANNED_FILENAME),
        cloudStorage.uploadJson(settings, CLOUD_SETTINGS_FILENAME),
      ]);
      
      const allSuccess = objectsSuccess && plannedSuccess && settingsSuccess;
      
      if (allSuccess) {
        setLastSyncTime(new Date());
      } else {
        console.warn('Partial cloud sync failure');
      }
      
      return allSuccess;
    } catch (error) {
      console.error('Error saving to cloud:', error);
      toast({
        title: 'Error de sincronización',
        description: 'No se pudieron guardar los datos en la nube',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isCloudEnabled, cloudStorage, toast]);

  /**
   * Upload a single image to cloud storage
   * Returns the public URL of the uploaded image or null on failure
   */
  const uploadImageToCloud = useCallback(async (
    imageDataUrl: string, 
    imageName: string
  ): Promise<string | null> => {
    if (!isCloudEnabled) {
      // Return the original data URL if cloud is not enabled
      return imageDataUrl;
    }
    
    // Skip if it's already a cloud URL
    if (imageDataUrl.startsWith('http')) {
      return imageDataUrl;
    }
    
    // Convert data URL to File
    const file = dataUrlToFile(imageDataUrl, imageName);
    if (!file) {
      console.error('Failed to convert image to file');
      return imageDataUrl; // Return original on failure
    }
    
    try {
      const cloudUrl = await cloudStorage.uploadImage(file, imageName);
      return cloudUrl || imageDataUrl; // Fallback to original if upload fails
    } catch (error) {
      console.error('Error uploading image to cloud:', error);
      return imageDataUrl; // Return original on failure
    }
  }, [isCloudEnabled, cloudStorage]);

  /**
   * Delete an image from cloud storage
   */
  const deleteImageFromCloud = useCallback(async (imageName: string): Promise<boolean> => {
    if (!isCloudEnabled) {
      return true;
    }
    
    try {
      return await cloudStorage.deleteFile('user-images', imageName);
    } catch (error) {
      console.error('Error deleting image from cloud:', error);
      return false;
    }
  }, [isCloudEnabled, cloudStorage]);

  /**
   * Trigger a debounced sync operation
   */
  const triggerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    // Debounce sync by 2 seconds
    syncTimeoutRef.current = setTimeout(() => {
      // This will be called by the component that uses this hook
      // They should pass the current state to saveToCloud
    }, 2000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    isSyncing,
    isCloudEnabled,
    lastSyncTime,
    loadFromCloud,
    saveToCloud,
    uploadImageToCloud,
    deleteImageFromCloud,
    triggerSync,
  };
}
