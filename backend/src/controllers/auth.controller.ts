import { Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import {
  AuthRequest,
  RegisterBody,
  LoginBody,
  RefreshBody,
  User,
  Organization,
  JwtPayload,
} from '../types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function createUniqueSlug(baseName: string): Promise<string> {
  let slug = slugify(baseName);
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [candidate]
    );
    if (existing.length === 0) {
      return candidate;
    }
    suffix += 1;
  }
}

async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

function buildTokenPayload(user: {
  id: string;
  email: string;
  role: string;
  organization_id: string;
}): JwtPayload {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id,
  };
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { orgName, email, password, name } = req.body as RegisterBody;

    if (!orgName || !email || !password) {
      sendError(res, 'Organization name, email, and password are required', 400);
      return;
    }

    if (password.length < 8) {
      sendError(res, 'Password must be at least 8 characters', 400);
      return;
    }

    const existingUser = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existingUser.length > 0) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    const slug = await createUniqueSlug(orgName);
    const passwordHash = await bcrypt.hash(password, 12);

    const orgRows = await query<Organization>(
      `INSERT INTO organizations (name, slug, plan)
       VALUES ($1, $2, 'starter')
       RETURNING id, name, slug, plan, created_at`,
      [orgName, slug]
    );
    const org = orgRows[0];

    const userRows = await query<User>(
      `INSERT INTO users (organization_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, organization_id, email, name, role, created_at`,
      [org.id, email.toLowerCase(), passwordHash, name || '']
    );
    const user = userRows[0];

    const payload = buildTokenPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ id: user.id, tokenId: uuidv4() });

    await saveRefreshToken(user.id, refreshToken);

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        created_at: user.created_at,
      },
      organization: org,
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 'Registration failed', 500);
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    const userRows = await query<
      User & {
        password_hash: string;
        org_name: string;
        org_slug: string;
        org_id: string;
        org_created_at: string;
        plan: Organization['plan'];
      }
    >(
      `SELECT u.id, u.organization_id, u.email, u.password_hash, u.name, u.role, u.created_at,
              o.id AS org_id, o.name AS org_name, o.slug AS org_slug, o.plan, o.created_at AS org_created_at
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (userRows.length === 0) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const user = userRows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const payload = buildTokenPayload(user);
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken({ id: user.id, tokenId: uuidv4() });

    await saveRefreshToken(user.id, refreshToken);

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        created_at: user.created_at,
      },
      organization: {
        id: user.org_id,
        name: user.org_name,
        slug: user.org_slug,
        plan: user.plan,
        created_at: user.org_created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
}

export async function refresh(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshBody;

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 400);
      return;
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      sendError(res, 'Invalid or expired refresh token', 401);
      return;
    }

    const tokenRows = await query<{
      id: string;
      user_id: string;
      expires_at: string;
      email: string;
      role: string;
      organization_id: string;
    }>(
      `SELECT rt.id, rt.user_id, rt.expires_at, u.email, u.role, u.organization_id
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.user_id = $2`,
      [refreshToken, decoded.id]
    );

    if (tokenRows.length === 0) {
      sendError(res, 'Refresh token not found', 401);
      return;
    }

    const record = tokenRows[0];

    if (new Date(record.expires_at) < new Date()) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [record.id]);
      sendError(res, 'Refresh token expired', 401);
      return;
    }

    const accessToken = signAccessToken({
      id: record.user_id,
      email: record.email,
      role: record.role,
      organization_id: record.organization_id,
    });

    sendSuccess(res, { accessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    sendError(res, 'Token refresh failed', 500);
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshBody;

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Logout failed', 500);
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const userRows = await query<
      User & {
        org_name: string;
        org_slug: string;
        org_id: string;
        plan: Organization['plan'];
        logo_url?: string;
        org_created_at: string;
      }
    >(
      `SELECT u.id, u.email, u.name, u.role, u.organization_id, u.created_at,
              o.id AS org_id, o.name AS org_name, o.slug AS org_slug, o.plan, o.logo_url,
              o.created_at AS org_created_at
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1 AND u.organization_id = $2`,
      [req.user.id, req.user.organization_id]
    );

    if (userRows.length === 0) {
      sendError(res, 'User not found', 404);
      return;
    }

    const user = userRows[0];

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization_id: user.organization_id,
        created_at: user.created_at,
      },
      organization: {
        id: user.org_id,
        name: user.org_name,
        slug: user.org_slug,
        plan: user.plan,
        logo_url: user.logo_url,
        created_at: user.org_created_at,
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    sendError(res, 'Failed to fetch user profile', 500);
  }
}
