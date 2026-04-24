import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet } from '@/lib/apiClient';

interface Entry { id: number; admin_id: number | null; admin_name: string | null; action: string; target_type: string | null; target_id: string | null; reason: string | null; before_value: unknown; after_value: unknown; ip_address: string | null; created_at: string }

export default function AdminAuditLogTab() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [filters, setFilters] = useState({ action: '', target_type: '', admin_id: '' });
  const [open, setOpen] = useState<number | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.target_type) params.set('target_type', filters.target_type);
    if (filters.admin_id) params.set('admin_id', filters.admin_id);
    setRows(await apiGet<Entry[]>(`/api/admin/audit?${params}`));
  }
  useEffect(() => {
    load();
    apiGet<string[]>('/api/admin/audit/actions').then(setActions).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Audita žurnāls</h1></div>
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={filters.action} onValueChange={v => setFilters(f => ({ ...f, action: v }))}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Darbība" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Visas darbības</SelectItem>
            {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Admin ID" value={filters.admin_id} onChange={e => setFilters(f => ({ ...f, admin_id: e.target.value }))} className="w-32" />
        <Input placeholder="Mērķa tips" value={filters.target_type} onChange={e => setFilters(f => ({ ...f, target_type: e.target.value }))} className="w-40" />
        <Button variant="outline" onClick={load}>Meklēt</Button>
      </div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Laiks</TableHead><TableHead>Admin</TableHead><TableHead>Darbība</TableHead><TableHead>Mērķis</TableHead><TableHead>Iemesls</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Nav ierakstu</TableCell></TableRow>
             : rows.map(e => (
              <>
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{e.admin_name ?? e.admin_id ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline">{e.action}</Badge></TableCell>
                  <TableCell className="text-xs">{e.target_type}#{e.target_id}</TableCell>
                  <TableCell className="text-xs max-w-[240px] truncate">{e.reason ?? '—'}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setOpen(open === e.id ? null : e.id)}>Diff</Button></TableCell>
                </TableRow>
                {open === e.id && (
                  <TableRow key={`${e.id}-diff`}>
                    <TableCell colSpan={6}>
                      <div className="grid md:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-md text-xs font-mono">
                        <div><p className="font-semibold text-slate-600 mb-1">Pirms</p><pre className="whitespace-pre-wrap">{JSON.stringify(e.before_value, null, 2)}</pre></div>
                        <div><p className="font-semibold text-slate-600 mb-1">Pēc</p><pre className="whitespace-pre-wrap">{JSON.stringify(e.after_value, null, 2)}</pre></div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
