import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { post } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { RequireConnection } from '../components/RequireConnection';
import LoadingSpinner from '../components/LoadingSpinner';
import { exportToCSV, exportToExcel } from '../utils/export';
import { GenerateSQLResponse, QueryRunResponse } from '../types';
import { Download, Play, Sparkles, AlertTriangle } from 'lucide-react';

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
      toast.error(err instanceof Error ? err.message : 'Generation failed');
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
      toast.error(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setRunning(false);
    }
  };

  const pageRows = results
    ? results.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : [];
  const totalPages = results ? Math.ceil(results.rows.length / PAGE_SIZE) : 0;

  return (
    <RequireConnection>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Query</h1>
          <p className="mt-1 text-sm text-slate-500">Ask questions in plain English, get SQL and results.</p>
        </div>

        <select
          className="input-field max-w-xs"
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="card space-y-4">
          <textarea
            className="input-field min-h-[100px] resize-y"
            placeholder="Ask a question about your data..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Generating...' : 'Generate SQL'}
          </button>
        </div>

        {sql && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Generated SQL</h2>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />
                Edit SQL
              </label>
            </div>
            {sqlWasEdited && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                SQL has been manually edited. Review before running.
              </div>
            )}
            {editMode ? (
              <textarea
                className="input-field min-h-[120px] font-mono text-sm"
                value={editedSql}
                onChange={(e) => setEditedSql(e.target.value)}
              />
            ) : (
              <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">{sql}</pre>
            )}
            <button
              onClick={() => void handleRun()}
              disabled={running}
              className="btn-primary flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {running ? 'Running...' : 'Run Query'}
            </button>
          </div>
        )}

        {running && <LoadingSpinner className="py-8" />}

        {results && (
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {results.row_count} rows · {results.execution_time_ms}ms
                {results.truncated && ' · truncated at 1000'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => exportToCSV(results.columns, results.rows)}
                  className="btn-secondary flex items-center gap-1 text-sm"
                  title={results.rows.length === 0 ? 'Run a query first' : undefined}
                  disabled={results.rows.length === 0}
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => exportToExcel(results.columns, results.rows)}
                  className="btn-secondary flex items-center gap-1 text-sm"
                  disabled={results.rows.length === 0}
                >
                  <Download className="h-3.5 w-3.5" /> Export Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {results.columns.map((col) => (
                      <th key={col} className="border border-slate-200 px-3 py-2 text-left font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      {results.columns.map((col) => (
                        <td key={col} className="border border-slate-200 px-3 py-1.5 font-mono text-xs">
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
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn-secondary text-sm">Prev</button>
                <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="btn-secondary text-sm">Next</button>
              </div>
            )}
          </div>
        )}
      </div>
    </RequireConnection>
  );
}
