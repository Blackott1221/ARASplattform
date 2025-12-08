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
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Authentication required" 
      });
    }

    // 2. Hole User-Objekt
    const user = req.user as Express.User & { userRole?: string };
    
    // 3. Prüfe ob userRole vorhanden
    if (!user.userRole) {
      console.warn(`[RBAC] User ${user.username} hat keine Rolle gesetzt - access denied`);
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Access denied" 
      });
    }

    // 4. Prüfe ob User eine erlaubte Rolle hat
    if (!allowedRoles.includes(user.userRole)) {
      console.warn(
        `[RBAC] User ${user.username} (${user.userRole}) tried to access ${req.path} - denied`
      );
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Insufficient permissions" 
      });
    }

    // 5. User hat passende Rolle - erlaubt
    console.log(
      `[RBAC] User ${user.username} (${user.userRole}) accessing ${req.path} - allowed`
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
  const user = req.user as Express.User & { userRole?: string };
  return user.userRole ? roles.includes(user.userRole) : false;
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
