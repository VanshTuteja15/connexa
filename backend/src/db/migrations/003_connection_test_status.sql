ALTER TABLE database_connections
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20);
