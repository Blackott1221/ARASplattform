/**
 * ============================================================================
 * ARAS COMMAND CENTER - ROLE-BASED ACCESS CONTROL MIDDLEWARE
 * ============================================================================
 * Diese Middleware schützt interne Routes vor unauthorisiertem Zugriff
 * NUR admin und staff haben Zugriff auf /internal/* Routes und APIs
 * ============================================================================
 */

import { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

// Erweitere Express Request Type um userRole
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      userRole?: string; // RBAC Role
    }
  }
}

/**
 * Middleware: Prüft ob User eingeloggt ist
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "Authentication required" 
    });
  }
  next();
}

/**
 * Middleware: Prüft ob User eine bestimmte Rolle hat
 * @param allowedRoles - Array von erlaubten Rollen (z.B. ['admin', 'staff'])
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Prüfe ob User eingeloggt ist
    const isAuth = req.isAuthenticated ? req.isAuthenticated() : false;
    
    if (!isAuth) {
      console.warn('[RBAC] 401 Unauthorized:', {
        path: req.originalUrl,
        isAuthenticatedFn: typeof req.isAuthenticated,
        isAuthenticatedResult: isAuth,
        hasSession: !!req.session,
        sessionKeys: req.session ? Object.keys(req.session) : [],
        hasUser: !!req.user,
        cookiePresent: !!req.headers.cookie,
      });
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Authentication required",
        debug: {
          hasSession: !!req.session,
          hasPassport: !!(req.session as any)?.passport,
          hasUser: !!req.user,
        }
      });
    }

    // 2. Hole User-Objekt
    const user = req.user as any; // Use 'any' to access all DB fields
    
    // 🔍 DEBUG: Log full user object
    console.log('[RBAC-DEBUG] Full user object:', {
      id: user.id,
      username: user.username,
      userRole: user.userRole,
      user_role: user.user_role, // Check if it's snake_case in DB
      allKeys: Object.keys(user)
    });
    
    // 3. Prüfe ob userRole vorhanden (check both camelCase and snake_case)
    const userRole = user.userRole || user.user_role;
    
    if (!userRole) {
      console.warn(`[RBAC] User ${user.username} hat keine Rolle gesetzt - access denied`);
      console.warn(`[RBAC] User object:`, user);
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Access denied - no role found" 
      });
    }

    // 4. Prüfe ob User eine erlaubte Rolle hat
    if (!allowedRoles.includes(userRole)) {
      console.warn(
        `[RBAC] User ${user.username} (${userRole}) tried to access ${req.path} - denied`
      );
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Insufficient permissions" 
      });
    }

    // 5. User hat passende Rolle - erlaubt
    console.log(
      `[RBAC] User ${user.username} (${userRole}) accessing ${req.path} - allowed`
    );
    next();
  };
}

/**
 * Convenience: Nur für Admins
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Convenience: Für Admins und Staff
 */
export const requireInternal = requireRole(['admin', 'staff']);

/**
 * Helper: Prüft ob aktueller User eine bestimmte Rolle hat
 */
export function hasRole(req: Request, roles: string[]): boolean {
  if (!req.user) return false;
  const user = req.user as any;
  const userRole = user.userRole || user.user_role;
  return userRole ? roles.includes(userRole) : false;
}

/**
 * Helper: Prüft ob aktueller User Admin ist
 */
export function isAdmin(req: Request): boolean {
  return hasRole(req, ['admin']);
}

/**
 * Helper: Prüft ob aktueller User Internal (admin oder staff) ist
 */
export function isInternal(req: Request): boolean {
  return hasRole(req, ['admin', 'staff']);
}
