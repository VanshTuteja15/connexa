import { Response } from 'express';
import * as XLSX from 'xlsx';
import { query } from '../config/db';
import { withOrg } from '../middleware/tenantIsolation';
import { AuthRequest } from '../types';

interface ExportCaseRow {
  id: string;
  title: string;
  type: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  description: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function getQueryString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function exportCases(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const status = getQueryString(req.query.status as string | string[] | undefined);
    const type = getQueryString(req.query.type as string | string[] | undefined);
    const priority = getQueryString(req.query.priority as string | string[] | undefined);
    const search = getQueryString(req.query.search as string | string[] | undefined);

    const conditions = ['c.organization_id = $1', "c.status != 'deleted'"];
    const params: unknown[] = [organization_id];
    let paramIndex = 2;

    if (status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (type) {
      conditions.push(`c.type = $${paramIndex}`);
      params.push(type);
      paramIndex += 1;
    }

    if (priority) {
      conditions.push(`c.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex += 1;
    }

    if (search) {
      conditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.join(' AND ');

    const result = await query<ExportCaseRow>(
      `SELECT c.id, c.title, c.type, c.status, c.priority,
              u.name AS assigned_to, c.description, c.data,
              c.created_at, c.updated_at
       FROM cases c
       LEFT JOIN users u ON u.id = c.assigned_to AND u.organization_id = c.organization_id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );

    const rows = result.map((c) => ({
      ID: c.id,
      Title: c.title,
      Type: c.type || '',
      Status: c.status,
      Priority: c.priority,
      'Assigned To': c.assigned_to || '',
      Description: c.description || '',
      'Custom Data': c.data ? JSON.stringify(c.data) : '',
      'Created At': c.created_at ? new Date(c.created_at).toISOString() : '',
      'Updated At': c.updated_at ? new Date(c.updated_at).toISOString() : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 36 },
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 10 },
      { wch: 20 },
      { wch: 40 },
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cases');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const filename = `cases-export-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export cases error:', error);
    res.status(500).json({ error: 'Failed to export cases' });
  }
}
