import { useState, FormEvent, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { post, del } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { RequireConnection } from '../components/RequireConnection';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { ConnectionFormData, DatabaseConnection } from '../types';
import { Trash2, CheckCircle, XCircle, Circle, RefreshCw } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

const defaultForm: ConnectionFormData = {
  name: '',
  host: 'localhost',
  port: 5432,
  database: '',
  username: 'postgres',
  password: '',
  ssl: false,
};

function StatusDot({ status }: { status: string | null }) {
  if (status === 'success') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
}

export default function ConnectDatabase() {
  const { connections, loading, error, refetch } = useConnections();
  const [form, setForm] = useState<ConnectionFormData>(defaultForm);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [retestingId, setRetestingId] = useState<string | null>(null);

  const resetTestState = (): void => {
    setTestPassed(false);
    setTestResult(null);
  };

  const handleTest = async (): Promise<void> => {
    if (!form.host || !form.database || !form.username || !form.password) {
      toast.error('Fill in host, database, username, and password');
      return;
    }
    if (form.port < 1 || form.port > 65535) {
      toast.error('Port must be between 1 and 65535');
      return;
    }

    setTesting(true);
    resetTestState();
    try {
      const result = await post<TestResult>('/connections/test', form);
      setTestResult(result);
      setTestPassed(result.success);
      if (result.success) {
        toast.success(`Connected in ${result.latency_ms ?? '?'}ms`);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!testPassed) {
      toast.error('Test the connection before saving');
      return;
    }
    setSaving(true);
    try {
      await post<DatabaseConnection>('/connections/save', form);
      toast.success('Connection saved!');
      setForm(defaultForm);
      resetTestState();
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRetest = async (id: string): Promise<void> => {
    setRetestingId(id);
    try {
      const result = await post<TestResult>(`/connections/${id}/test`, {});
      if (result.success) {
        toast.success(`Connected in ${result.latency_ms ?? '?'}ms`);
      } else {
        toast.error(result.message);
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setRetestingId(null);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('Delete this connection?')) return;
    try {
      await del(`/connections/${id}`);
      toast.success('Connection deleted');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <RequireConnection allowWithout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Database Connections</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect your PostgreSQL databases to query with natural language.
          </p>
        </div>

        <form onSubmit={handleSave} className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Connection Name</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setForm({ ...form, name: e.target.value });
                  resetTestState();
                }}
                placeholder="Production DB"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Host</label>
              <input
                className="input-field"
                value={form.host}
                onChange={(e) => {
                  setForm({ ...form, host: e.target.value });
                  resetTestState();
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                className="input-field"
                value={form.port}
                onChange={(e) => {
                  setForm({ ...form, port: parseInt(e.target.value, 10) });
                  resetTestState();
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Database Name</label>
              <input
                className="input-field"
                value={form.database}
                onChange={(e) => {
                  setForm({ ...form, database: e.target.value });
                  resetTestState();
                }}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <input
                className="input-field"
                value={form.username}
                onChange={(e) => {
                  setForm({ ...form, username: e.target.value });
                  resetTestState();
                }}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  resetTestState();
                }}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.ssl}
                onChange={(e) => {
                  setForm({ ...form, ssl: e.target.checked });
                  resetTestState();
                }}
              />
              Use SSL
            </label>
          </div>

          {testResult && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {testResult.message}
              {testResult.latency_ms !== undefined && ` (${testResult.latency_ms}ms)`}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing}
              className="btn-secondary"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="submit" disabled={saving || !testPassed} className="btn-primary">
              {saving ? 'Saving...' : 'Save Connection'}
            </button>
          </div>
        </form>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Saved Connections</h2>
          {loading && <LoadingSpinner className="py-8" />}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button onClick={() => void refetch()} className="ml-2 underline">
                Retry
              </button>
            </div>
          )}
          {!loading && connections.length === 0 && (
            <EmptyState
              title="No connections yet"
              description="Add your first database above."
            />
          )}
          {connections.length > 0 && (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={conn.last_test_status} />
                    <div>
                      <p className="font-medium text-slate-900">{conn.name}</p>
                      <p className="text-xs text-slate-500">
                        {conn.host}:{conn.port}/{conn.database}
                        {conn.ssl && (
                          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            SSL
                          </span>
                        )}
                      </p>
                      {conn.last_tested_at && (
                        <p className="text-[10px] text-slate-400">
                          Last tested: {new Date(conn.last_tested_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleRetest(conn.id)}
                      disabled={retestingId === conn.id}
                      className="btn-secondary !px-2 !py-1 text-sm"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${retestingId === conn.id ? 'animate-spin' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => void handleDelete(conn.id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireConnection>
  );
}
