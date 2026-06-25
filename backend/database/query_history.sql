CREATE TABLE IF NOT EXISTS query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID,
  connection_id UUID NOT NULL REFERENCES database_connections(id) ON DELETE CASCADE,
  question TEXT,
  generated_sql TEXT NOT NULL,
  row_count INTEGER,
  execution_time_ms INTEGER,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_org ON query_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON query_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_connection ON query_history(connection_id);
