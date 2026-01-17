/**
 * Storage utilities for managing localStorage quota and providing warnings
 */

interface StorageEstimate {
  usage: number;
  quota: number;
  percentUsed: number;
}

/**
 * Get current storage usage estimate
 * Uses navigator.storage.estimate() when available, falls back to localStorage size calculation
 */
export async function getStorageEstimate(): Promise<StorageEstimate> {
  // Try modern Storage API first
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 5 * 1024 * 1024; // Default 5MB
      return {
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    } catch {
      // Fall through to localStorage calculation
    }
  }

  // Fallback: calculate localStorage size manually
  const localStorageUsage = calculateLocalStorageSize();
  const estimatedQuota = 5 * 1024 * 1024; // Assume 5MB quota (conservative)
  
  return {
    usage: localStorageUsage,
    quota: estimatedQuota,
    percentUsed: (localStorageUsage / estimatedQuota) * 100,
  };
}

/**
 * Calculate the size of all data in localStorage
 */
function calculateLocalStorageSize(): number {
  let total = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key);
      if (value) {
        // Each character in JavaScript is 2 bytes (UTF-16)
        total += (key.length + value.length) * 2;
      }
    }
  } catch {
    // If we can't access localStorage, return 0
  }
  return total;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check storage quota and return warning level
 */
export type StorageWarningLevel = 'ok' | 'warning' | 'critical';

export async function checkStorageQuota(): Promise<{
  level: StorageWarningLevel;
  message: string | null;
  estimate: StorageEstimate;
}> {
  const estimate = await getStorageEstimate();
  
  if (estimate.percentUsed >= 90) {
    return {
      level: 'critical',
      message: `⚠️ Almacenamiento casi lleno (${estimate.percentUsed.toFixed(1)}%). Exporta tus datos como respaldo y considera eliminar objetos o imágenes no utilizados.`,
      estimate,
    };
  }
  
  if (estimate.percentUsed >= 75) {
    return {
      level: 'warning',
      message: `Almacenamiento al ${estimate.percentUsed.toFixed(1)}% de capacidad. Recomendamos exportar tus datos regularmente.`,
      estimate,
    };
  }
  
  return {
    level: 'ok',
    message: null,
    estimate,
  };
}

/**
 * Safely save data to localStorage with quota checking
 * Returns true if save was successful, false if quota exceeded
 */
export async function safeLocalStorageSave(
  key: string,
  data: string,
  onQuotaWarning?: (message: string) => void
): Promise<boolean> {
  try {
    // Check quota before saving
    const quotaCheck = await checkStorageQuota();
    
    if (quotaCheck.level === 'critical' && onQuotaWarning) {
      onQuotaWarning(quotaCheck.message!);
    } else if (quotaCheck.level === 'warning' && onQuotaWarning) {
      onQuotaWarning(quotaCheck.message!);
    }

    localStorage.setItem(key, data);
    return true;
  } catch (err) {
    // Check if it's a quota exceeded error
    if (err instanceof DOMException && (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      if (onQuotaWarning) {
        onQuotaWarning('❌ No hay suficiente espacio de almacenamiento. Por favor, exporta tus datos y elimina objetos o imágenes no utilizados.');
      }
      return false;
    }
    
    // Re-throw other errors
    throw err;
  }
}

/**
 * Get storage usage breakdown by key
 */
export function getStorageBreakdown(): { key: string; size: number; sizeFormatted: string }[] {
  const breakdown: { key: string; size: number; sizeFormatted: string }[] = [];
  
  try {
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key);
      if (value) {
        const size = (key.length + value.length) * 2;
        breakdown.push({
          key,
          size,
          sizeFormatted: formatBytes(size),
        });
      }
    }
  } catch {
    // If we can't access localStorage, return empty array
  }
  
  // Sort by size descending
  return breakdown.sort((a, b) => b.size - a.size);
}
