import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Ban, ShieldCheck, Pause, NotebookPen } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/lib/apiClient';

interface Row {
  id: number; email: string; name: string; phone: string | null;
  role: string; is_verified: number | boolean | null; is_banned: boolean | null;
  suspension_until: string | null; created_at: string; balance: number;
  trust_score: number | null;
}

export default function AdminUsersTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState<{ open: boolean; action: (() => Promise<void>) | null; title: string; desc?: string; dangerous?: boolean }>({
    open: false, action: null, title: '',
  });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      const data = await apiGet<Row[]>(`/api/admin/users/search?${params}`);
      setRows(data);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function askConfirm(title: string, action: () => Promise<void>, desc?: string, dangerous = true) {
    setConfirm({ open: true, title, desc, dangerous, action });
  }

  async function ban(id: number) {
    askConfirm('Bloķēt lietotāju?', async () => {
      await apiPost(`/api/admin/users/${id}/ban`, { reason: 'Admin action' });
      await load();
    }, 'Lietotājs nevarēs pieslēgties. Darbība tiek ierakstīta audita žurnālā.');
  }
  async function unban(id: number) {
    askConfirm('Atbloķēt lietotāju?', async () => {
      await apiPost(`/api/admin/users/${id}/unban`, {});
      await load();
    }, 'Lietotājs atkal varēs pieslēgties un lietot platformu. Darbība tiek ierakstīta audita žurnālā.', false);
  }
  async function verify(id: number) {
    await apiPost(`/api/admin/users/${id}/verify`, {});
    await load();
  }
  async function suspend(id: number) {
    const until = new Date(Date.now() + 7 * 86400_000).toISOString();
    askConfirm('Apturēt uz 7 dienām?', async () => {
      await apiPost(`/api/admin/users/${id}/suspend`, { until, reason: 'Admin suspension' });
      await load();
    });
  }
  async function addNote(id: number) {
    const note = prompt('Ievadi piezīmi:');
    if (!note) return;
    await apiPost(`/api/admin/users/${id}/notes`, { note });
  }
  async function changeRole(id: number, nextRole: string) {
    await apiPut(`/api/admin/users/${id}/role`, { role: nextRole });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lietotāji</h1>
          <p className="text-sm text-slate-500">Meklē, filtrē, bloķē, apturi vai verificē</p>
        </div>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <Input placeholder="Meklēt pēc vārda / e-pasta / ID" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Visas lomas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Visas lomas</SelectItem>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="b2b">b2b</SelectItem>
            <SelectItem value="moderator">moderator</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Jebkurš statuss" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Jebkurš</SelectItem>
            <SelectItem value="active">Aktīvi</SelectItem>
            <SelectItem value="suspended">Apturēti</SelectItem>
            <SelectItem value="banned">Bloķēti</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={load} variant="outline">Meklēt</Button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Vārds / E-pasts</TableHead>
              <TableHead>Loma</TableHead>
              <TableHead>Statuss</TableHead>
              <TableHead>Uzticamība</TableHead>
              <TableHead className="text-right">Darbības</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Ielādē...</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Nav lietotāju</TableCell></TableRow>
            ) : rows.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{u.name || '—'}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="b2b">b2b</SelectItem>
                      <SelectItem value="moderator">moderator</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {u.is_banned ? <Badge className="bg-red-100 text-red-700">Bloķēts</Badge>
                    : u.suspension_until && new Date(u.suspension_until) > new Date() ? <Badge className="bg-amber-100 text-amber-700">Apturēts</Badge>
                    : <Badge className="bg-emerald-100 text-emerald-700">Aktīvs</Badge>}
                  {u.is_verified ? <Badge className="ml-1 bg-blue-100 text-blue-700">✓</Badge> : null}
                </TableCell>
                <TableCell>{u.trust_score ?? '—'}</TableCell>
                <TableCell className="text-right space-x-1">
                  {u.is_banned
                    ? <Button size="sm" variant="outline" onClick={() => unban(u.id)}>Atbloķēt</Button>
                    : <>
                        <Button size="sm" variant="ghost" title="Apturēt" onClick={() => suspend(u.id)}><Pause className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" title="Bloķēt" onClick={() => ban(u.id)}><Ban className="w-3.5 h-3.5 text-red-600" /></Button>
                      </>}
                  {!u.is_verified && <Button size="sm" variant="ghost" title="Verificēt" onClick={() => verify(u.id)}><ShieldCheck className="w-3.5 h-3.5 text-blue-600" /></Button>}
                  <Button size="sm" variant="ghost" title="Pievienot piezīmi" onClick={() => addNote(u.id)}><NotebookPen className="w-3.5 h-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(o) => setConfirm({ ...confirm, open: o })}
        title={confirm.title}
        description={confirm.desc}
        dangerous={confirm.dangerous}
        onConfirm={async () => { await confirm.action?.(); }}
      />
    </div>
  );
}
