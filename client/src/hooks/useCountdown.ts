/**
 * useCountdown hook for Mission Control
 * Provides real-time countdown to a target timestamp
 */

import { useState, useEffect, useRef } from 'react';
import { formatCountdown } from '@/lib/time';

interface CountdownResult {
  isActive: boolean;
  secondsLeft: number | null;
  label: string | null;
  isReady: boolean;
}

/**
 * Real-time countdown to target ISO timestamp
 * @param targetIso - ISO timestamp to count down to
 * @param intervalMs - Update interval (default 250ms)
 */
export function useCountdown(targetIso?: string, intervalMs = 250): CountdownResult {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const previousSeconds = useRef<number | null>(null);

  useEffect(() => {
    if (!targetIso) {
      setSecondsLeft(null);
      previousSeconds.current = null;
      return;
    }

    const calculateSeconds = () => {
      try {
        const target = new Date(targetIso).getTime();
        const now = Date.now();
        const diff = target - now;
        const seconds = Math.max(0, Math.ceil(diff / 1000));
        
        // Only update state if seconds actually changed
        if (seconds !== previousSeconds.current) {
          setSecondsLeft(seconds);
          previousSeconds.current = seconds;
        }
      } catch {
        setSecondsLeft(null);
        previousSeconds.current = null;
      }
    };

    // Initial calculation
    calculateSeconds();

    // Set up interval
    const interval = setInterval(calculateSeconds, intervalMs);

    return () => clearInterval(interval);
  }, [targetIso, intervalMs]);

  if (!targetIso) {
    return {
      isActive: false,
      secondsLeft: null,
      label: null,
      isReady: false,
    };
  }

  return {
    isActive: true,
    secondsLeft,
    label: secondsLeft !== null ? formatCountdown(secondsLeft) : null,
    isReady: secondsLeft === 0,
  };
}
