import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser, JwtPayload, JwtRefreshPayload } from '../types';

export const authenticate: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'JWT configuration error' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const authReq = req as AuthRequest;
    authReq.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organization_id: decoded.organization_id,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Access token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid access token' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export function requireRole(role: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (authReq.user.role !== role) {
      res.status(403).json({ error: `Role '${role}' required` });
      return;
    }

    next();
  };
}

export function signAccessToken(payload: AuthUser): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, jwtSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtRefreshPayload): string {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return jwt.sign(payload, jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtRefreshSecret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return jwt.verify(token, jwtRefreshSecret) as JwtRefreshPayload;
}
