import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { post, put, get } from '../api/client';
import { X, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { CaseFormProps, CaseFormData, OrgUser } from '../types';

interface CustomField {
  key: string;
  value: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

const defaultForm: CaseFormData = {
  title: '',
  type: '',
  status: 'open',
  priority: 'medium',
  description: '',
  assigned_to: '',
  data: {},
};

export default function CaseForm({ isOpen, onClose, caseData, onSuccess }: CaseFormProps) {
  const [form, setForm] = useState<CaseFormData>(defaultForm);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<ToastState | null>(null);

  const isEdit = !!caseData?.id;

  useEffect(() => {
    if (isOpen) {
      void get<{ users: OrgUser[] }>('/cases/users')
        .then((data) => setUsers(data.users || []))
        .catch(() => setUsers([]));

      if (caseData) {
        setForm({
          title: caseData.title || '',
          type: caseData.type || '',
          status: caseData.status || 'open',
          priority: caseData.priority || 'medium',
          description: caseData.description || '',
          assigned_to: caseData.assigned_to || '',
          data: {},
        });
        const fields = Object.entries(caseData.data || {}).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        setCustomFields(fields);
      } else {
        setForm(defaultForm);
        setCustomFields([]);
      }
      setError('');
    }
  }, [isOpen, caseData]);

  const showToast = (message: string, type: 'success' | 'error' = 'success'): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    const dataObj: Record<string, string> = {};
    customFields.forEach(({ key, value }) => {
      if (key.trim()) {
        dataObj[key.trim()] = value;
      }
    });

    const payload = {
      ...form,
      assigned_to: form.assigned_to || null,
      data: dataObj,
    };

    setLoading(true);
    try {
      if (isEdit && caseData) {
        await put(`/cases/${caseData.id}`, payload);
        showToast('Case updated successfully');
      } else {
        await post('/cases', payload);
        showToast('Case created successfully');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError((err.response?.data as { error?: string })?.error || 'Failed to save case');
      } else {
        setError('Failed to save case');
      }
    } finally {
      setLoading(false);
    }
  };

  const addCustomField = (): void => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string): void => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const removeCustomField = (index: number): void => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        {toast && (
          <div
            className={`absolute left-4 right-4 top-4 z-10 rounded-lg px-4 py-2 text-sm text-white ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Edit Case' : 'New Case'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, title: e.target.value })
              }
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
              <input
                type="text"
                value={form.type}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setForm({ ...form, type: e.target.value })
                }
                className="input-field"
                placeholder="e.g. HR, Legal, IT"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, status: e.target.value as CaseFormData['status'] })
                }
                className="input-field"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <select
                value={form.priority}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, priority: e.target.value as CaseFormData['priority'] })
                }
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assigned To</label>
              <select
                value={form.assigned_to}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setForm({ ...form, assigned_to: e.target.value })
                }
                className="input-field"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setForm({ ...form, description: e.target.value })
              }
              className="input-field min-h-[80px]"
              rows={3}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Custom Data Fields</label>
              <button
                type="button"
                onClick={addCustomField}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
              >
                <Plus className="h-3 w-3" /> Add field
              </button>
            </div>
            {customFields.map((field, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={field.key}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateCustomField(i, 'key', e.target.value)
                  }
                  className="input-field flex-1"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={field.value}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    updateCustomField(i, 'value', e.target.value)
                  }
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCustomField(i)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : isEdit ? 'Update Case' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
