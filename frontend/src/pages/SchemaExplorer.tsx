import { useState, useMemo } from 'react';
import { get } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { RequireConnection } from '../components/RequireConnection';
import { SchemaResponse, SchemaTable } from '../types';
import { ChevronDown, ChevronRight, Search, RefreshCw, Database } from 'lucide-react';

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}

function TableCard({ table, onFkClick }: { table: SchemaTable; onFkClick: (name: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div id={`table-${table.name}`} className="rounded-lg border border-slate-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-slate-900">{table.name}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            ~{table.row_count_estimate.toLocaleString()} rows
          </span>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Nullable</th>
                <th className="pb-2">Constraints</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col) => {
                const fk = table.foreign_keys.find((f) => f.column === col.name);
                return (
                  <tr key={col.name} className="border-t border-slate-50">
                    <td className="py-1.5 font-mono text-xs">{col.name}</td>
                    <td className="py-1.5 text-slate-600">{col.type}</td>
                    <td className="py-1.5 text-slate-600">{col.nullable ? 'Yes' : 'No'}</td>
                    <td className="py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {col.is_primary_key && (
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                            PK
                          </span>
                        )}
                        {fk && (
                          <button
                            onClick={() => onFkClick(fk.references_table)}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 hover:underline"
                          >
                            FK → {fk.references_table}.{fk.references_column}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SchemaExplorer() {
  const { connections } = useConnections();
  const [connectionId, setConnectionId] = useState('');
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const loadSchema = async (id: string): Promise<void> => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await get<SchemaResponse>(`/schema/${id}`);
      setSchema(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schema');
      setSchema(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = useMemo(() => {
    if (!schema) return [];
    if (!filter) return schema.tables;
    return schema.tables.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()));
  }, [schema, filter]);

  const scrollToTable = (name: string): void => {
    document.getElementById(`table-${name}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <RequireConnection>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Schema Explorer</h1>
          <p className="mt-1 text-sm text-slate-500">Browse tables, columns, and relationships.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            className="input-field max-w-xs"
            value={connectionId}
            onChange={(e) => {
              setConnectionId(e.target.value);
              void loadSchema(e.target.value);
            }}
          >
            <option value="">Select connection...</option>
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void loadSchema(connectionId)}
            disabled={!connectionId || loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9"
              placeholder="Filter tables..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              disabled={!schema}
            />
          </div>
        </div>

        {!connectionId && !loading && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-slate-400">
            <Database className="mb-3 h-10 w-10" />
            <p>Select a connection to explore its schema</p>
          </div>
        )}

        {loading && <TableSkeleton />}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={() => void loadSchema(connectionId)} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {schema && !loading && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              Database: <span className="font-medium">{schema.database}</span> ·{' '}
              {filteredTables.length} tables
            </p>
            {filteredTables.map((table) => (
              <TableCard key={table.name} table={table} onFkClick={scrollToTable} />
            ))}
          </div>
        )}
      </div>
    </RequireConnection>
  );
}
