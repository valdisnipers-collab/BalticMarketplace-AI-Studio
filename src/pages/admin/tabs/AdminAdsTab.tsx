import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPut, apiDelete } from '@/lib/apiClient';

interface Ad { id: number; title: string; size: string; placement: string; status: string; is_active: number; user_name: string | null; category: string | null; start_date: string | null; end_date: string | null; created_at: string; views?: number; clicks?: number }

export default function AdminAdsTab() {
  const [rows, setRows] = useState<Ad[]>([]);
  async function load() { setRows(await apiGet<Ad[]>('/api/admin/ads')); }
  useEffect(() => { load(); }, []);

  async function toggleActive(a: Ad) {
    await apiPut(`/api/admin/ads/${a.id}`, { ...a, is_active: a.is_active ? 0 : 1 });
    await load();
  }
  async function del(id: number) {
    if (!confirm('Dzēst šo reklāmu?')) return;
    await apiDelete(`/api/admin/ads/${id}`);
    await load();
  }
  function ctr(a: Ad) {
    const v = a.views ?? 0; const c = a.clicks ?? 0;
    return v > 0 ? `${(c / v * 100).toFixed(1)}%` : '—';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Reklāmas</h1><p className="text-sm text-slate-500">Kampaņas + CTR</p></div>
      </div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nosaukums</TableHead><TableHead>Izmērs</TableHead><TableHead>Izvietojums</TableHead><TableHead>Statuss</TableHead><TableHead>Aktīva</TableHead><TableHead>CTR</TableHead><TableHead className="text-right">Darbības</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Nav reklāmu</TableCell></TableRow>
             : rows.map(a => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell className="max-w-[240px] truncate">{a.title}</TableCell>
                <TableCell className="text-xs">{a.size}</TableCell>
                <TableCell className="text-xs">{a.placement || 'default'}</TableCell>
                <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                <TableCell>{a.is_active ? '✓' : '—'}</TableCell>
                <TableCell className="text-xs">{ctr(a)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(a)}>{a.is_active ? 'Pauzēt' : 'Aktivizēt'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => del(a.id)} className="text-red-600">Dzēst</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
