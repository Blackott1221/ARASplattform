/**
 * Time utilities for Mission Control
 * Europe/Vienna timezone formatting
 */

/**
 * Format ISO timestamp to Vienna date + time
 * @returns "DD.MM.YYYY, HH:MM" or fallback
 */
export function formatViennaDateTime(iso?: string): string {
  if (!iso) return new Date().toLocaleString('de-AT', { 
    timeZone: 'Europe/Vienna',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  try {
    return new Date(iso).toLocaleString('de-AT', { 
      timeZone: 'Europe/Vienna',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '--.--.----, --:--';
  }
}

/**
 * Format ISO timestamp to Vienna time only
 * @returns "HH:MM" or fallback
 */
export function formatViennaTime(iso?: string): string {
  if (!iso) return '--:--';
  
  try {
    return new Date(iso).toLocaleTimeString('de-AT', { 
      timeZone: 'Europe/Vienna',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '--:--';
  }
}

/**
 * Format seconds to countdown string
 * @param totalSeconds - Total seconds remaining
 * @returns "HH:MM:SS" if >= 3600, else "MM:SS"
 */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
