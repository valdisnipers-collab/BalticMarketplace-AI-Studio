import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiGet, apiPost } from '@/lib/apiClient';

interface Row { id: number; title: string; price: number; category: string; status: string; ai_moderation_status: string | null; author_name: string | null; created_at: string }

export default function AdminListingsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modStatus, setModStatus] = useState('');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<{ open: boolean; action: (() => Promise<void>) | null; title: string }>({ open: false, action: null, title: '' });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (modStatus) params.set('moderation_status', modStatus);
      if (reportedOnly) params.set('reported_only', 'true');
      setRows(await apiGet<Row[]>(`/api/admin/listings/search?${params}`));
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function changeStatus(id: number, s: string) {
    await apiPost(`/api/admin/listings/${id}/status`, { status: s });
    await load();
  }
  async function bulk(action: string) {
    if (selected.size === 0) return;
    setConfirm({ open: true, title: `Apstiprināt bulk "${action}" (${selected.size})?`, action: async () => {
      await apiPost('/api/admin/listings/bulk', { ids: Array.from(selected), action });
      setSelected(new Set()); await load();
    }});
  }
  function toggle(id: number) {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Sludinājumi</h1><p className="text-sm text-slate-500">Filtrē, apstrādā masveidā, maini statusu</p></div>
      <div className="flex gap-2 flex-wrap items-center">
        <Input placeholder="Meklēt..." value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue placeholder="Statuss" /></SelectTrigger><SelectContent>
          <SelectItem value="">Jebkurš</SelectItem><SelectItem value="active">Aktīvs</SelectItem><SelectItem value="paused">Pauzēts</SelectItem>
          <SelectItem value="sold">Pārdots</SelectItem><SelectItem value="archived">Arhivēts</SelectItem><SelectItem value="rejected">Noraidīts</SelectItem>
        </SelectContent></Select>
        <Select value={modStatus} onValueChange={setModStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Moderācija" /></SelectTrigger><SelectContent>
          <SelectItem value="">Jebkura</SelectItem><SelectItem value="pending">Gaida</SelectItem><SelectItem value="approved">Apstiprināts</SelectItem>
          <SelectItem value="flagged">Atzīmēts</SelectItem><SelectItem value="rejected">Noraidīts</SelectItem>
        </SelectContent></Select>
        <label className="flex items-center gap-1 text-sm"><Checkbox checked={reportedOnly} onCheckedChange={v => setReportedOnly(!!v)} /> Tikai sūdzētie</label>
        <Button onClick={load} variant="outline">Atjaunot</Button>
        {selected.size > 0 && <>
          <Button onClick={() => bulk('pause')} variant="outline" size="sm">Pauzēt ({selected.size})</Button>
          <Button onClick={() => bulk('archive')} variant="outline" size="sm">Arhivēt</Button>
          <Button onClick={() => bulk('delete')} variant="outline" size="sm" className="text-red-600">Dzēst</Button>
        </>}
      </div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-10"></TableHead><TableHead>ID</TableHead><TableHead>Virsraksts</TableHead><TableHead>Cena</TableHead>
            <TableHead>Kategorija</TableHead><TableHead>Statuss</TableHead><TableHead>AI</TableHead><TableHead>Autors</TableHead><TableHead className="text-right">Darbības</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">Ielādē...</TableCell></TableRow>
             : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">Nav sludinājumu</TableCell></TableRow>
             : rows.map(l => (
              <TableRow key={l.id}>
                <TableCell><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggle(l.id)} /></TableCell>
                <TableCell>{l.id}</TableCell>
                <TableCell className="max-w-[280px] truncate">{l.title}</TableCell>
                <TableCell>€{l.price}</TableCell>
                <TableCell className="text-xs">{l.category}</TableCell>
                <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                <TableCell>{l.ai_moderation_status ? <Badge className={l.ai_moderation_status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>{l.ai_moderation_status}</Badge> : '—'}</TableCell>
                <TableCell className="text-xs">{l.author_name ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Select value={l.status} onValueChange={(v) => changeStatus(l.id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs ml-auto"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['active','paused','sold','archived','rejected','deleted'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ConfirmDialog open={confirm.open} onOpenChange={(o) => setConfirm({ ...confirm, open: o })} title={confirm.title} dangerous onConfirm={async () => { await confirm.action?.(); }} />
    </div>
  );
}
