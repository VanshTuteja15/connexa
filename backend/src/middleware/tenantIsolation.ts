import { Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../types';

export function withOrg(req: AuthRequest): { organization_id: string } {
  if (!req.user || !req.user.organization_id) {
    throw new Error('Organization context required');
  }
  return { organization_id: req.user.organization_id };
}

export const tenantIsolation: RequestHandler = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.organization_id) {
    res.status(403).json({ error: 'Organization context required' });
    return;
  }
  next();
};
