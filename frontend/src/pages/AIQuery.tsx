import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { RequireConnection } from '../components/RequireConnection';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToCSV, exportToExcel } from '../utils/export';
import { GenerateSQLResponse, QueryRunResponse } from '../types';
import { Download, Play, Sparkles, AlertTriangle, Database, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 50;

export default function AIQueryPage() {
  const { connections } = useConnections();
  const [searchParams] = useSearchParams();
  const [connectionId, setConnectionId] = useState('');
  const [question, setQuestion] = useState('');
  const [sql, setSql] = useState('');
  const [editedSql, setEditedSql] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [results, setResults] = useState<QueryRunResponse | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const preloadedQuestion = searchParams.get('question');
    const preloadedSql = searchParams.get('sql');
    const preloadedConn = searchParams.get('connection_id');
    if (preloadedQuestion) setQuestion(preloadedQuestion);
    if (preloadedSql) {
      setSql(preloadedSql);
      setEditedSql(preloadedSql);
    }
    if (preloadedConn) setConnectionId(preloadedConn);
  }, [searchParams]);

  useEffect(() => {
    if (!connectionId && connections.length > 0) {
      setConnectionId(connections[0].id);
    }
  }, [connections, connectionId]);

  const activeSql = editMode ? editedSql : sql;
  const sqlWasEdited = editMode && editedSql !== sql;

  const handleGenerate = async (): Promise<void> => {
    if (!connectionId || !question.trim()) {
      toast.error('Select a connection and enter a question');
      return;
    }
    setGenerating(true);
    setGenError(null);
    setResults(null);
    try {
      const data = await post<GenerateSQLResponse>('/query/generate', {
        connection_id: connectionId,
        question: question.trim(),
      });
      setSql(data.sql);
      setEditedSql(data.sql);
      setEditMode(false);
      toast.success('SQL generated!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setGenError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRun = async (): Promise<void> => {
    if (!connectionId || !activeSql.trim()) {
      toast.error('No SQL to run');
      return;
    }
    setRunning(true);
    setRunError(null);
    try {
      const data = await post<QueryRunResponse>('/query/run', {
        connection_id: connectionId,
        sql: activeSql.trim(),
        question: question.trim() || undefined,
      });
      setResults(data);
      setPage(0);
      toast.success(`Query returned ${data.row_count} rows in ${data.execution_time_ms}ms`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setRunError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  const pageRows = useMemo(
    () => (results ? results.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : []),
    [results, page]
  );
  const totalPages = results ? Math.ceil(results.rows.length / PAGE_SIZE) : 0;

  return (
    <RequireConnection>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI Query</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ask questions in plain English, get SQL and results.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="input-field max-w-xs"
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Link
              to="/schema"
              className="btn-secondary flex items-center gap-1 text-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Schema
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="card space-y-4">
              <textarea
                className="input-field min-h-[120px] resize-y"
                placeholder="Ask a question in plain English... e.g. 'Show me the top 10 customers by revenue'"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Generating...' : 'Generate SQL'}
              </button>
              {genError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{genError}</div>
              )}
            </div>

            {sql && (
              <div className="card space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Generated SQL</h2>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={editMode}
                      onChange={(e) => setEditMode(e.target.checked)}
                    />
                    Edit SQL
                  </label>
                </div>
                {sqlWasEdited && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    You&apos;ve modified the generated SQL
                  </div>
                )}
                {editMode ? (
                  <textarea
                    className="input-field min-h-[140px] font-mono text-sm"
                    value={editedSql}
                    onChange={(e) => setEditedSql(e.target.value)}
                  />
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
                    {sql}
                  </pre>
                )}
                <button
                  onClick={() => void handleRun()}
                  disabled={running}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {running ? 'Running query...' : 'Run Query'}
                </button>
                {runError && (
                  <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{runError}</div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="card min-h-[400px]">
              {running && (
                <div className="flex flex-col items-center justify-center py-16">
                  <LoadingSpinner />
                  <p className="mt-3 text-sm text-slate-500">Running query...</p>
                </div>
              )}

              {!running && !results && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Database className="mb-3 h-12 w-12" />
                  <p>Run a query to see results</p>
                </div>
              )}

              {!running && results && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      {results.row_count} rows · {results.execution_time_ms}ms
                      {results.truncated && (
                        <span className="ml-2 text-amber-600">Results limited to 1000 rows</span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportToCSV(results.columns, results.rows)}
                        disabled={results.rows.length === 0}
                        className="btn-secondary flex items-center gap-1 text-sm"
                      >
                        <Download className="h-3.5 w-3.5" /> Export CSV
                      </button>
                      <button
                        onClick={() => exportToExcel(results.columns, results.rows)}
                        disabled={results.rows.length === 0}
                        className="btn-secondary flex items-center gap-1 text-sm"
                      >
                        <Download className="h-3.5 w-3.5" /> Export Excel
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-100">
                          {results.columns.map((col) => (
                            <th
                              key={col}
                              className="border border-slate-200 px-3 py-2 text-left font-medium whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {results.columns.map((col) => (
                              <td
                                key={col}
                                className="border border-slate-200 px-3 py-1.5 font-mono text-xs whitespace-nowrap"
                              >
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        disabled={page === 0}
                        onClick={() => setPage(page - 1)}
                        className="btn-secondary text-sm"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-slate-500">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(page + 1)}
                        className="btn-secondary text-sm"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireConnection>
  );
}
