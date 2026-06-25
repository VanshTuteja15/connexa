import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { get } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { useApiCall } from '../hooks/useApiCall';
import { RequireConnection } from '../components/RequireConnection';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { HistoryListResponse, QueryHistoryRecord } from '../types';
import { Copy, Play, ChevronDown, ChevronRight } from 'lucide-react';

export default function QueryHistoryPage() {
  const navigate = useNavigate();
  const { connections } = useConnections();
  const [page, setPage] = useState(1);
  const [connectionFilter, setConnectionFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiCall<HistoryListResponse>(
    () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (connectionFilter) params.set('connection_id', connectionFilter);
      return get<HistoryListResponse>(`/history?${params.toString()}`);
    },
    [page, connectionFilter]
  );

  const handleRerun = (record: QueryHistoryRecord): void => {
    const params = new URLSearchParams({
      connection_id: record.connection_id,
      sql: record.generated_sql,
    });
    if (record.question) params.set('question', record.question);
    navigate(`/ai-query?${params.toString()}`);
  };

  const handleCopy = async (sql: string): Promise<void> => {
    await navigator.clipboard.writeText(sql);
    toast.success('SQL copied to clipboard');
  };

  return (
    <RequireConnection>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Query History</h1>
          <p className="mt-1 text-sm text-slate-500">Review and re-run past queries.</p>
        </div>

        <div className="flex gap-3">
          <select
            className="input-field max-w-xs"
            value={connectionFilter}
            onChange={(e) => { setConnectionFilter(e.target.value); setPage(1); }}
          >
            <option value="">All connections</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading && <LoadingSpinner className="py-12" />}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={() => void refetch()} className="ml-2 underline">Retry</button>
          </div>
        )}

        {!loading && data && data.records.length === 0 && (
          <EmptyState
            title="No query history"
            description="Run your first AI query to see history here."
            actionLabel="Go to AI Query"
            actionTo="/ai-query"
          />
        )}

        {data && data.records.length > 0 && (
          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {data.records.map((record) => (
              <div key={record.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}>
                        {expandedId === record.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {record.question || 'Manual SQL query'}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(record.created_at).toLocaleString()} · {record.connection_name} ·{' '}
                      {record.status === 'success' ? `${record.row_count} rows` : 'failed'}
                    </p>
                    {expandedId === record.id && (
                      <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                        {record.generated_sql}
                      </pre>
                    )}
                    {!expandedId && (
                      <p className="mt-1 truncate font-mono text-xs text-slate-400">{record.generated_sql}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => void handleCopy(record.generated_sql)} className="btn-secondary !px-2 !py-1" title="Copy SQL">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleRerun(record)} className="btn-secondary !px-2 !py-1" title="Re-run">
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary text-sm">Prev</button>
            <span className="text-sm text-slate-500">Page {page}</span>
            <button disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)} className="btn-secondary text-sm">Next</button>
          </div>
        )}
      </div>
    </RequireConnection>
  );
}
