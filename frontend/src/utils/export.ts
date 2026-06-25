import * as XLSX from 'xlsx';

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(
  columns: string[],
  rows: Record<string, unknown>[],
  filename?: string
): void {
  const header = columns.map(escapeCsvValue).join(',');
  const body = rows.map((row) => columns.map((col) => escapeCsvValue(row[col])).join(','));
  const csv = [header, ...body].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `connexa-query-${timestamp()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(
  columns: string[],
  rows: Record<string, unknown>[],
  filename?: string
): void {
  const data = rows.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((col) => {
      record[col] = row[col] ?? '';
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
  worksheet['!cols'] = columns.map(() => ({ wch: 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  XLSX.writeFile(workbook, filename || `connexa-query-${timestamp()}.xlsx`);
}
