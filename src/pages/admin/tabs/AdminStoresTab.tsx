import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPost } from '@/lib/apiClient';

interface Store { id: number; slug: string; owner_name: string | null; owner_email: string | null; verification_status: string; tagline: string | null; created_at: string }

export default function AdminStoresTab() {
  const [rows, setRows] = useState<Store[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    setRows(await apiGet<Store[]>(`/api/admin/stores?${params}`));
  }
  useEffect(() => { load(); }, []);

  async function act(id: number, action: 'verify' | 'suspend' | 'reject' | 'reactivate') {
    await apiPost(`/api/admin/stores/${id}/${action}`, {});
    await load();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Uzņēmumu konti</h1></div>
      <div className="flex gap-2 items-center flex-wrap">
        <Input placeholder="Meklēt..." value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-44"><SelectValue placeholder="Verifikācija" /></SelectTrigger><SelectContent>
          <SelectItem value="">Visi</SelectItem>
          {['unverified','pending','verified','rejected','suspended'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent></Select>
        <Button variant="outline" onClick={load}>Atjaunot</Button>
      </div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Slug</TableHead><TableHead>Īpašnieks</TableHead><TableHead>Statuss</TableHead><TableHead className="text-right">Darbības</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Nav uzņēmumu</TableCell></TableRow>
             : rows.map(s => (
              <TableRow key={s.id}>
                <TableCell>{s.id}</TableCell>
                <TableCell className="font-mono text-xs">{s.slug}</TableCell>
                <TableCell>{s.owner_name} <span className="text-xs text-slate-500">{s.owner_email}</span></TableCell>
                <TableCell><Badge variant="outline">{s.verification_status}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  {s.verification_status !== 'verified' && <Button size="sm" variant="ghost" onClick={() => act(s.id, 'verify')}>Verificēt</Button>}
                  {s.verification_status !== 'suspended' && <Button size="sm" variant="ghost" onClick={() => act(s.id, 'suspend')} className="text-amber-600">Apturēt</Button>}
                  {s.verification_status !== 'rejected' && <Button size="sm" variant="ghost" onClick={() => act(s.id, 'reject')} className="text-red-600">Noraidīt</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
