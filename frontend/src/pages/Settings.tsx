import { useState } from 'react';
import toast from 'react-hot-toast';
import { del } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { RequireConnection } from '../components/RequireConnection';

export default function SettingsPage() {
  const { organization } = useAuth();
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteHistory = async (): Promise<void> => {
    setDeleting(true);
    try {
      await del('/history', { headers: { 'X-Confirm': 'delete-all' } });
      toast.success('All query history deleted');
      setShowDeleteModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete history');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <RequireConnection allowWithout>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your organization preferences.</p>
        </div>

        <section className="card space-y-4">
          <h2 className="font-semibold text-slate-900">Organization</h2>
          <div>
            <label className="mb-1 block text-sm font-medium">Display Name</label>
            <input
              className="input-field"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your organization"
            />
            <p className="mt-1 text-xs text-slate-400">Organization settings sync coming soon.</p>
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold text-slate-900">API Keys</h2>
          <p className="text-sm text-slate-500">
            Programmatic API access will be available in a future release.
          </p>
        </section>

        <section className="card border-red-200 space-y-4">
          <h2 className="font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-slate-600">
            Permanently delete all query history for your organization.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete all query history
          </button>
        </section>

        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">Delete all query history?</h3>
              <p className="mt-2 text-sm text-slate-600">This action cannot be undone.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
                <button
                  onClick={() => void handleDeleteHistory()}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete all'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireConnection>
  );
}
