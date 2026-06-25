import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';
import { DatabaseConnection } from '../types';

export function useConnections() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<DatabaseConnection[]>('/connections');
      setConnections(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  return { connections, loading, error, refetch: fetchConnections, hasConnections: connections.length > 0 };
}
