import { useState, FormEvent, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { post, del } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { RequireConnection } from '../components/RequireConnection';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { ConnectionFormData, DatabaseConnection } from '../types';
import { Trash2, CheckCircle, XCircle, Circle } from 'lucide-react';

const CONNECTION_STATUS_KEY = 'connexa_connection_status';

function getConnectionStatus(id: string): 'passed' | 'failed' | 'untested' {
  const stored = localStorage.getItem(CONNECTION_STATUS_KEY);
  if (!stored) return 'untested';
  const map = JSON.parse(stored) as Record<string, string>;
  return (map[id] as 'passed' | 'failed') || 'untested';
}

function setConnectionStatus(id: string, status: 'passed' | 'failed'): void {
  const stored = localStorage.getItem(CONNECTION_STATUS_KEY);
  const map = stored ? (JSON.parse(stored) as Record<string, string>) : {};
  map[id] = status;
  localStorage.setItem(CONNECTION_STATUS_KEY, JSON.stringify(map));
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

function StatusDot({ status }: { status: 'passed' | 'failed' | 'untested' }) {
  if (status === 'passed') return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
}

export default function ConnectDatabase() {
  const { connections, loading, error, refetch } = useConnections();
  const [form, setForm] = useState<ConnectionFormData>(defaultForm);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTest = async (): Promise<void> => {
    setTesting(true);
    try {
      await post('/connections/test', form);
      toast.success('Connection successful!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      const conn = await post<DatabaseConnection>('/connections/save', form);
      setConnectionStatus(conn.id, 'passed');
      toast.success('Connection saved!');
      setForm(defaultForm);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
                placeholder="Production DB"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Host</label>
              <input className="input-field" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Port</label>
              <input type="number" className="input-field" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value, 10) })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Database</label>
              <input className="input-field" value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Username</label>
              <input className="input-field" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.ssl} onChange={(e) => setForm({ ...form, ssl: e.target.checked })} />
              Use SSL
            </label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => void handleTest()} disabled={testing} className="btn-secondary">
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
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
              <button onClick={() => void refetch()} className="ml-2 underline">Retry</button>
            </div>
          )}
          {!loading && connections.length === 0 && (
            <EmptyState
              title="No connections yet"
              description="Add your first PostgreSQL connection above to start querying."
            />
          )}
          {connections.length > 0 && (
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StatusDot status={getConnectionStatus(conn.id)} />
                    <div>
                      <p className="font-medium text-slate-900">{conn.name}</p>
                      <p className="text-xs text-slate-500">{conn.host}:{conn.port}/{conn.database}</p>
                    </div>
                  </div>
                  <button onClick={() => void handleDelete(conn.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireConnection>
  );
}
