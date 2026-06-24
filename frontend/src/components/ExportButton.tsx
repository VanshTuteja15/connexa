import { useState } from 'react';
import client from '../api/client';
import { Download, Loader2 } from 'lucide-react';
import { ExportButtonProps } from '../types';

export default function ExportButton({ filters = {}, className }: ExportButtonProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const handleExport = async (): Promise<void> => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const queryString = params.toString();
      const url = `/export/cases${queryString ? `?${queryString}` : ''}`;

      const response = await client.get<Blob>(url, { responseType: 'blob' });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `cases-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void handleExport()}
      disabled={loading}
      className={className || 'btn-secondary flex items-center gap-2'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? 'Exporting...' : 'Export'}
    </button>
  );
}
