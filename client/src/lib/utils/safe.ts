/**
 * ARAS Safe Utilities
 * Null-safe helpers to prevent runtime crashes
 * UPGRADE: Never crash on undefined/null, always return safe fallback
 */

/**
 * Safely convert any value to string
 */
export function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

/**
 * Safely trim a string (never crashes on non-string)
 */
export function safeTrim(v: unknown, fallback = ""): string {
  return asString(v, fallback).trim();
}

/**
 * Safely convert to array
 */
export function asArray<T>(v: unknown, fallback: T[] = []): T[] {
  return Array.isArray(v) ? (v as T[]) : fallback;
}

/**
 * Safely get array length
 */
export function safeLength(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (typeof v === "string") return v.length;
  return 0;
}

/**
 * Safely access object property
 */
export function safeGet<T>(obj: unknown, key: string, fallback: T): T {
  if (obj && typeof obj === "object" && key in obj) {
    return (obj as any)[key] ?? fallback;
  }
  return fallback;
}

/**
 * Safely map over array-like
 */
export function safeMap<T, R>(
  v: unknown,
  fn: (item: T, index: number) => R,
  fallback: R[] = []
): R[] {
  if (!Array.isArray(v)) return fallback;
  try {
    return v.map(fn);
  } catch {
    return fallback;
  }
}

/**
 * Safely filter array
 */
export function safeFilter<T>(
  v: unknown,
  fn: (item: T, index: number) => boolean,
  fallback: T[] = []
): T[] {
  if (!Array.isArray(v)) return fallback;
  try {
    return v.filter(fn);
  } catch {
    return fallback;
  }
}
