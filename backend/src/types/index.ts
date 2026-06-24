import { Request } from 'express';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  [key: string]: unknown;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'viewer';
  created_at: string;
  [key: string]: unknown;
}

export interface Case {
  id: string;
  organization_id: string;
  title: string;
  type: string;
  status: 'open' | 'in_progress' | 'resolved' | 'deleted';
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string;
  description?: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface CaseRow extends Case {
  assigned_to_name?: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface CaseStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organization_id: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface RegisterBody {
  orgName: string;
  email: string;
  password: string;
  name: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface AIChatBody {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AIResponse {
  answer: string;
  sources?: Array<{ id: string; title: string; status?: string; priority?: string }>;
  queryType: 'sql' | 'rag' | 'general';
  data?: Record<string, unknown>[] | null;
}

export interface ServiceChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  organization_id: string;
}

export interface JwtRefreshPayload {
  id: string;
  tokenId: string;
}

export interface CasesQueryParams {
  status?: string;
  type?: string;
  priority?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
}

export interface CreateCaseBody {
  title: string;
  type?: string;
  status?: Case['status'];
  priority?: Case['priority'];
  assigned_to?: string | null;
  description?: string;
  data?: Record<string, unknown>;
}

export interface UpdateCaseBody extends Partial<CreateCaseBody> {}

export interface EmbeddingSearchResult {
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface PaginatedCasesResponse {
  cases: CaseRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CountRow {
  total: string;
  [key: string]: unknown;
}

export interface StatusCountRow {
  status: string;
  count: string;
  [key: string]: unknown;
}

export interface TypeCountRow {
  type: string;
  count: string;
  [key: string]: unknown;
}

export interface PriorityCountRow {
  priority: string;
  count: string;
  [key: string]: unknown;
}
