export interface DatabaseConnection {
  id: string;
  organization_id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionFormData {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  is_primary_key: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  foreign_keys: Array<{
    column: string;
    references_table: string;
    references_column: string;
  }>;
  row_count_estimate: number;
}

export interface SchemaResponse {
  connection_id: string;
  database: string;
  tables: SchemaTable[];
}

export interface GenerateSQLResponse {
  sql: string;
  question: string;
  connection_id: string;
  generated_at: string;
}

export interface QueryRunResponse {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
  truncated: boolean;
}

export interface QueryHistoryRecord {
  id: string;
  organization_id: string;
  user_id: string | null;
  connection_id: string;
  connection_name?: string;
  question: string | null;
  generated_sql: string;
  row_count: number | null;
  execution_time_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface HistoryListResponse {
  records: QueryHistoryRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'viewer';
  created_at: string;
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

export interface UIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; title: string; status?: string; priority?: string }>;
  data?: Record<string, unknown>[] | null;
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

export interface AuthRequest {
  user?: AuthUser;
}

export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (orgName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  organization: Organization;
}

export interface MeResponse {
  user: User;
  organization: Organization;
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

export interface AIChatResponse {
  answer: string;
  sources?: Array<{ id: string; title: string; status?: string; priority?: string }>;
  queryType: 'sql' | 'rag' | 'general';
  data?: Record<string, unknown>[] | null;
}

export interface CaseFormData {
  title: string;
  type: string;
  status: Case['status'];
  priority: Case['priority'];
  description: string;
  assigned_to: string;
  data: Record<string, string>;
}

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ExportButtonProps {
  filters?: Record<string, string>;
  className?: string;
}

export interface NavbarProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  activeTab: 'dashboard' | 'cases';
  onTabChange: (tab: 'dashboard' | 'cases') => void;
}

export interface CaseTableProps {
  cases: CaseRow[];
  onCaseClick?: (caseItem: CaseRow) => void;
  onCaseUpdate?: (caseId: string, updates: Partial<CaseRow>) => void;
  onRefresh?: () => void;
}

export interface CaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  caseData?: CaseRow | null;
  onSuccess?: () => void;
}

export interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface DashboardProps {
  onNewCase: () => void;
}
