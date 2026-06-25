import * as XLSX from 'xlsx';

export function getExportFilename(ext: 'csv' | 'xlsx'): string {
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `connexa-query-${ts}.${ext}`;
}

export function exportToCSV(
  columns: string[],
  rows: Record<string, unknown>[],
  filename?: string
): void {
  const header = columns.join(',');
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = String(row[col] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(',')
    )
    .join('\n');

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || getExportFilename('csv');
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToExcel(
  columns: string[],
  rows: Record<string, unknown>[],
  filename?: string
): void {
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((c) => {
        obj[c] = r[c];
      });
      return obj;
    })
  );

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true } };
  }

  ws['!cols'] = columns.map((c) => ({ wch: Math.max(c.length, 10) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, filename || getExportFilename('xlsx'));
}
