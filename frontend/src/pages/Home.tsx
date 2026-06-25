import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';
import axios from 'axios';
import Dashboard from '../components/Dashboard';
import CaseTable from '../components/CaseTable';
import AIChatPanel from '../components/AIChatPanel';
import CaseForm from '../components/CaseForm';
import ExportButton from '../components/ExportButton';
import { CaseRow, PaginatedCasesResponse } from '../types';
import clsx from 'clsx';

export default function Home() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases'>('dashboard');
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<CaseRow | null>(null);

  const fetchCases = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const data = await get<PaginatedCasesResponse>('/cases?limit=100');
      setCases(data.cases || []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { error?: string })?.error || 'Failed to load cases');
      } else {
        setError('Failed to load cases');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCases();
  }, [fetchCases]);

  const handleCaseClick = (caseItem: CaseRow): void => {
    setSelectedCase(caseItem);
    setFormOpen(true);
  };

  const handleNewCase = (): void => {
    setSelectedCase(null);
    setFormOpen(true);
  };

  const handleFormSuccess = (): void => {
    void fetchCases();
  };

  const handleCaseUpdate = (caseId: string, updates: Partial<CaseRow>): void => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, ...updates } : c))
    );
  };

  return (
    <div className={clsx('transition-all duration-300', chatOpen && 'mr-0 sm:mr-[400px]')}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cases</h1>
            <p className="mt-1 text-sm text-slate-500">Manage cases and use AI chat for insights.</p>
          </div>
          <button
            onClick={() => setChatOpen((prev) => !prev)}
            className="btn-secondary text-sm"
          >
            {chatOpen ? 'Close AI Chat' : 'Open AI Chat'}
          </button>
        </div>

        <div className="mb-6 flex gap-2 border-b border-slate-200">
          {(['dashboard', 'cases'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard onNewCase={handleNewCase} />}

        {activeTab === 'cases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">All Cases</h2>
              <div className="flex items-center gap-2">
                <ExportButton />
                <button onClick={handleNewCase} className="btn-primary">
                  + New Case
                </button>
              </div>
            </div>
            {loading ? (
              <div className="card flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              </div>
            ) : (
              <CaseTable
                cases={cases}
                onCaseClick={handleCaseClick}
                onCaseUpdate={handleCaseUpdate}
                onRefresh={fetchCases}
              />
            )}
          </div>
        )}

        {activeTab === 'dashboard' && !loading && cases.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Recent Cases</h2>
              <ExportButton />
            </div>
            <CaseTable
              cases={cases}
              onCaseClick={handleCaseClick}
              onCaseUpdate={handleCaseUpdate}
              onRefresh={fetchCases}
            />
          </div>
        )}
      </div>

      <AIChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      <CaseForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedCase(null);
        }}
        caseData={selectedCase}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
