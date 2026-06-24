import { useState, useEffect, useCallback } from 'react';
import { get } from '../api/client';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import CaseTable from '../components/CaseTable';
import AIChatPanel from '../components/AIChatPanel';
import CaseForm from '../components/CaseForm';
import ExportButton from '../components/ExportButton';
import { CaseRow, PaginatedCasesResponse } from '../types';

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
    <div className="min-h-screen bg-slate-50">
      <Navbar
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((prev) => !prev)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div
        className={`transition-all duration-300 ${
          chatOpen ? 'mr-0 sm:mr-[400px]' : ''
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard onNewCase={handleNewCase} />
          )}

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
                <h2 className="text-xl font-bold text-slate-900">Cases</h2>
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
