import { Response } from 'express';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiEnvelope<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendError(res: Response, error: string, status = 400): void {
  const body: ApiEnvelope<never> = { success: false, error };
  res.status(status).json(body);
}
