export interface DatabaseConnection {
  id: string;
  organization_id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password_encrypted: string;
  ssl: boolean;
  last_tested_at: Date | null;
  last_test_status: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectionInput {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  ssl: boolean;
}

export interface ConnectionPublic {
  id: string;
  organization_id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionTestInput {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}
