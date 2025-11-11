import { Request, Response, NextFunction } from 'express';
import { client } from '../db';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.session.userId as string;

    // Always verify against DB to avoid stale/missing session.username
    const [user] = await client`
      SELECT username FROM users WHERE id = ${userId}
    `;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.username !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // Ensure session carries username for downstream logs if needed
    (req.session as any).username = user.username;

    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Admin check failed' });
  }
};
