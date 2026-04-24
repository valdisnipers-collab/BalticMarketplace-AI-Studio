import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPost } from '@/lib/apiClient';

interface Order { id: number; listing_title: string | null; buyer_name: string | null; seller_name: string | null; amount: number; status: string; manual_review: boolean; created_at: string }

export default function AdminOrdersTab() {
  const [rows, setRows] = useState<Order[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [manualOnly, setManualOnly] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (manualOnly) params.set('manual_review_only', 'true');
    setRows(await apiGet<Order[]>(`/api/admin/orders?${params}`));
  }
  useEffect(() => { load(); }, []);

  async function toggleReview(o: Order) {
    await apiPost(`/api/admin/orders/${o.id}/manual-review`, { enabled: !o.manual_review });
    await load();
  }
  async function addNote(id: number) {
    const note = prompt('Piezīme:'); if (note == null) return;
    await apiPost(`/api/admin/orders/${id}/notes`, { note });
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Pasūtījumi</h1></div>
      <div className="flex gap-2 items-center flex-wrap">
        <Input placeholder="Meklēt..." value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Statuss" /></SelectTrigger><SelectContent>
          <SelectItem value="">Jebkurš</SelectItem>
          {['pending','paid','shipped','completed','refunded','cancelled','disputed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent></Select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={manualOnly} onChange={e => setManualOnly(e.target.checked)} /> Tikai manuāla pārbaude</label>
        <Button onClick={load} variant="outline">Atjaunot</Button>
      </div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Sludinājums</TableHead><TableHead>Pircējs</TableHead><TableHead>Pārdevējs</TableHead><TableHead>Summa</TableHead><TableHead>Statuss</TableHead><TableHead>Manuāla?</TableHead><TableHead className="text-right">Darbības</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Nav pasūtījumu</TableCell></TableRow>
             : rows.map(o => (
              <TableRow key={o.id}>
                <TableCell>{o.id}</TableCell>
                <TableCell className="max-w-[200px] truncate">{o.listing_title ?? '—'}</TableCell>
                <TableCell>{o.buyer_name ?? '—'}</TableCell>
                <TableCell>{o.seller_name ?? '—'}</TableCell>
                <TableCell>€{o.amount}</TableCell>
                <TableCell><Badge variant="outline">{o.status}</Badge></TableCell>
                <TableCell>{o.manual_review ? '⚠' : ''}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleReview(o)}>{o.manual_review ? 'Noņemt flag' : 'Iezīmēt'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => addNote(o.id)}>Piezīme</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
