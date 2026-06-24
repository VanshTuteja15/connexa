import { useEffect, useState } from 'react';
import { get } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { FolderOpen, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import ExportButton from './ExportButton';
import { CaseStats, DashboardProps } from '../types';

interface StatCard {
  label: string;
  value: number;
  icon: typeof FolderOpen;
  color: string;
}

export default function Dashboard({ onNewCase }: DashboardProps) {
  const { organization, user } = useAuth();
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        const data = await get<CaseStats>('/cases/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchStats();
  }, []);

  const statCards: StatCard[] = [
    {
      label: 'Total Cases',
      value: stats?.total ?? 0,
      icon: FolderOpen,
      color: 'text-accent bg-accent/10',
    },
    {
      label: 'Open',
      value: stats?.open ?? 0,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'In Progress',
      value: stats?.in_progress ?? 0,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Resolved',
      value: stats?.resolved ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {organization?.name} — Case Management Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <button onClick={onNewCase} className="btn-primary">
            + New Case
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="card flex items-center gap-4 !p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900">
                {loading ? '—' : card.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
