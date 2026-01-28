/**
 * ============================================================================
 * ARAS CLIENT PORTAL - Authentication Routes
 * ============================================================================
 * Separate auth system for client portals (e.g., Leadely)
 * Completely isolated from main platform auth
 * ============================================================================
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

const router = Router();

// ============================================================================
// TYPES
// ============================================================================

interface PortalUser {
  portalKey: string;
  username: string;
  password: string;
  displayName: string;
  role: string;
}

interface PortalConfig {
  company: {
    name: string;
    ceo: string;
    email: string;
    addressLine: string;
    zipCity: string;
    vatId: string;
  };
  package: {
    includedCalls: number;
    label: string;
    notes: string;
  };
  ui: {
    portalTitle: string;
    tooltipMode: string;
    kpiFocus: string;
  };
  filter: {
    field: string;
    value: string;
  };
}

// ============================================================================
// ENV CONFIG PARSERS
// ============================================================================

function getPortalUsers(): PortalUser[] {
  const usersJson = process.env.CLIENT_PORTAL_USERS_JSON;
  if (!usersJson) {
    console.warn('[PORTAL-AUTH] CLIENT_PORTAL_USERS_JSON not configured');
    return [];
  }
  try {
    return JSON.parse(usersJson);
  } catch (e) {
    console.error('[PORTAL-AUTH] Failed to parse CLIENT_PORTAL_USERS_JSON:', e);
    return [];
  }
}

function getPortalConfigs(): Record<string, PortalConfig> {
  const configJson = process.env.CLIENT_PORTAL_CONFIG_JSON;
  if (!configJson) {
    console.warn('[PORTAL-AUTH] CLIENT_PORTAL_CONFIG_JSON not configured');
    return {};
  }
  try {
    return JSON.parse(configJson);
  } catch (e) {
    console.error('[PORTAL-AUTH] Failed to parse CLIENT_PORTAL_CONFIG_JSON:', e);
    return {};
  }
}

function getSessionSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.error('[PORTAL-AUTH] PORTAL_SESSION_SECRET must be at least 32 characters');
    return 'fallback_secret_do_not_use_in_production_32chars!';
  }
  return secret;
}

// ============================================================================
// SESSION HELPERS
// ============================================================================

interface PortalSession {
  portalKey: string;
  username: string;
  displayName: string;
  role: string;
  iat: number;
  exp: number;
}

function signSession(session: Omit<PortalSession, 'iat' | 'exp'>): string {
  const secret = getSessionSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (7 * 24 * 60 * 60); // 7 days
  
  const payload: PortalSession = { ...session, iat, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const hmac = createHmac('sha256', secret);
  hmac.update(payloadBase64);
  const signature = hmac.digest('base64url');
  
  return `${payloadBase64}.${signature}`;
}

function verifySession(token: string): PortalSession | null {
  const secret = getSessionSecret();
  const parts = token.split('.');
  
  if (parts.length !== 2) return null;
  
  const [payloadBase64, signature] = parts;
  
  // Verify signature
  const hmac = createHmac('sha256', secret);
  hmac.update(payloadBase64);
  const expectedSignature = hmac.digest('base64url');
  
  try {
    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
    
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }
  
  // Parse payload
  try {
    const payload: PortalSession = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf-8')
    );
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    
    return payload;
  } catch {
    return null;
  }
}

// ============================================================================
// MIDDLEWARE: requirePortalAuth
// ============================================================================

export function requirePortalAuth(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  
  const token = cookies['aras_portal_session'];
  
  if (!token) {
    return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
  }
  
  const session = verifySession(token);
  
  if (!session) {
    return res.status(401).json({ error: 'INVALID_SESSION', message: 'Session invalid or expired' });
  }
  
  // Verify portal config exists
  const configs = getPortalConfigs();
  if (!configs[session.portalKey]) {
    return res.status(401).json({ error: 'PORTAL_NOT_FOUND', message: 'Portal configuration not found' });
  }
  
  // Attach session to request
  (req as any).portalSession = session;
  (req as any).portalConfig = configs[session.portalKey];
  
  next();
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/portal/login
 * Authenticate portal user
 */
router.post('/login', (req: Request, res: Response) => {
  const { portalKey, username, password } = req.body;
  
  if (!portalKey || !username || !password) {
    return res.status(400).json({ 
      ok: false, 
      message: 'Missing required fields' 
    });
  }
  
  // Find user
  const users = getPortalUsers();
  const user = users.find(u => 
    u.portalKey === portalKey && 
    u.username === username
  );
  
  if (!user) {
    // Generic error - don't reveal if user exists
    return res.status(401).json({ 
      ok: false, 
      message: 'Invalid credentials' 
    });
  }
  
  // Verify password (constant-time comparison)
  try {
    const pwBuffer = Buffer.from(password);
    const storedBuffer = Buffer.from(user.password);
    
    if (pwBuffer.length !== storedBuffer.length || !timingSafeEqual(pwBuffer, storedBuffer)) {
      return res.status(401).json({ 
        ok: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch {
    return res.status(401).json({ 
      ok: false, 
      message: 'Invalid credentials' 
    });
  }
  
  // Verify portal config exists
  const configs = getPortalConfigs();
  if (!configs[portalKey]) {
    return res.status(401).json({ 
      ok: false, 
      message: 'Portal not configured' 
    });
  }
  
  // Create session
  const token = signSession({
    portalKey: user.portalKey,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  });
  
  // Set cookie
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    `aras_portal_session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
    isProduction ? 'Secure' : ''
  ].filter(Boolean).join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
  
  console.log('[PORTAL-AUTH] Login successful:', { 
    portalKey, 
    username: user.username, 
    displayName: user.displayName 
  });
  
  return res.json({ ok: true });
});

/**
 * POST /api/portal/logout
 * Clear session cookie
 */
router.post('/logout', (_req: Request, res: Response) => {
  const cookieOptions = [
    'aras_portal_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ].join('; ');
  
  res.setHeader('Set-Cookie', cookieOptions);
  
  return res.json({ ok: true });
});

/**
 * GET /api/portal/me
 * Get current session info + portal config
 */
router.get('/me', requirePortalAuth, (req: Request, res: Response) => {
  const session = (req as any).portalSession as PortalSession;
  const config = (req as any).portalConfig as PortalConfig;
  
  return res.json({
    portalKey: session.portalKey,
    displayName: session.displayName,
    role: session.role,
    company: config.company,
    package: config.package,
    ui: config.ui
  });
});

export default router;
