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
import { Copy, Play, ChevronDown, ChevronRight, Check, X } from 'lucide-react';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function QueryHistoryPage() {
  const navigate = useNavigate();
  const { connections } = useConnections();
  const [page, setPage] = useState(1);
  const [connectionFilter, setConnectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApiCall<HistoryListResponse>(
    () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (connectionFilter) params.set('connection_id', connectionFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFrom) params.set('from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('to', new Date(`${dateTo}T23:59:59`).toISOString());
      return get<HistoryListResponse>(`/query/history?${params.toString()}`);
    },
    [page, connectionFilter, statusFilter, dateFrom, dateTo]
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
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Query History</h1>
          <p className="mt-1 text-sm text-slate-500">Review and re-run past queries.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            className="input-field max-w-xs"
            value={connectionFilter}
            onChange={(e) => {
              setConnectionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All connections</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input-field max-w-[140px]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
          <input
            type="date"
            className="input-field max-w-[160px]"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            title="From date"
          />
          <input
            type="date"
            className="input-field max-w-[160px]"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            title="To date"
          />
        </div>

        {loading && <LoadingSpinner className="py-12" />}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={() => void refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {!loading && data && data.records.length === 0 && (
          <EmptyState
            title="No queries yet"
            description="Head to AI Query to get started."
            actionLabel="Go to AI Query"
            actionTo="/ai-query"
          />
        )}

        {data && data.records.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">SQL</th>
                  <th className="px-4 py-3">Connection</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600" title={new Date(record.created_at).toLocaleString()}>
                      {relativeTime(record.created_at)}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3" title={record.question || undefined}>
                      {record.question ? truncate(record.question, 60) : '—'}
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                        className="flex items-start gap-1 text-left font-mono text-xs text-slate-600 hover:text-slate-900"
                      >
                        {expandedId === record.id ? (
                          <ChevronDown className="mt-0.5 h-3 w-3 shrink-0" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" />
                        )}
                        <span className={expandedId === record.id ? 'whitespace-pre-wrap break-all' : 'truncate'}>
                          {expandedId === record.id
                            ? record.generated_sql
                            : truncate(record.generated_sql, 80)}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{record.connection_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.status === 'success' ? record.row_count ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.execution_time_ms != null ? `${record.execution_time_ms}ms` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {record.status === 'success' ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span title={record.error_message || undefined}>
                          <X className="h-4 w-4 text-red-500" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => void handleCopy(record.generated_sql)}
                          className="btn-secondary !px-2 !py-1"
                          title="Copy SQL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRerun(record)}
                          className="btn-secondary !px-2 !py-1"
                          title="Re-run"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex justify-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-secondary text-sm"
            >
              Prev
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {Math.ceil(data.total / data.limit)}
            </span>
            <button
              disabled={page * data.limit >= data.total}
              onClick={() => setPage(page + 1)}
              className="btn-secondary text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </RequireConnection>
  );
}
