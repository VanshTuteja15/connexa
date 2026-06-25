import { useState, useMemo } from 'react';
import { get } from '../api/client';
import { useConnections } from '../hooks/useConnections';
import { RequireConnection } from '../components/RequireConnection';
import LoadingSpinner from '../components/LoadingSpinner';
import { SchemaResponse, SchemaTable } from '../types';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

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
          <span className="text-xs text-slate-400">~{table.row_count_estimate.toLocaleString()} rows</span>
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2">Column</th>
                <th className="pb-2">Type</th>
                <th className="pb-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col) => {
                const fk = table.foreign_keys.find((f) => f.column === col.name);
                return (
                  <tr key={col.name} className="border-t border-slate-50">
                    <td className="py-1.5 font-mono text-xs">{col.name}</td>
                    <td className="py-1.5 text-slate-600">{col.type}</td>
                    <td className="py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {col.is_primary_key && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">PK</span>
                        )}
                        {col.nullable && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">NULL</span>
                        )}
                        {fk && (
                          <button
                            onClick={() => onFkClick(fk.references_table)}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 hover:underline"
                          >
                            → {fk.references_table}.{fk.references_column}
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

export default function SchemaPage() {
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

        <div className="flex flex-col gap-3 sm:flex-row">
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
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-9"
              placeholder="Filter tables..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {loading && <LoadingSpinner className="py-12" />}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={() => void loadSchema(connectionId)} className="ml-2 underline">Retry</button>
          </div>
        )}

        {schema && !loading && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              Database: <span className="font-medium">{schema.database}</span> · {filteredTables.length} tables
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
