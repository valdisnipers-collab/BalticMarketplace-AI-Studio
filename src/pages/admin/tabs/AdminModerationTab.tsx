import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPost } from '@/lib/apiClient';

interface Item { type: string; id: number; subject: string; ai_moderation_reason: string | null; created_at: string; actor_name: string | null }

export default function AdminModerationTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState('');

  async function load() {
    setItems(await apiGet<Item[]>('/api/admin/moderation/queue'));
  }
  useEffect(() => { load(); }, []);

  async function act(type: string, id: number, action: string) {
    const reason = action === 'reject' || action === 'dismiss' ? prompt('Iemesls (vari atstāt tukšu):') : null;
    await apiPost(`/api/admin/moderation/${type}/${id}/action`, { action, reason });
    await load();
  }

  const shown = filter ? items.filter(i => i.type === filter) : items;

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Moderācijas centrs</h1><p className="text-sm text-slate-500">Apvienota rinda: sludinājumi, sūdzības, aizdomīgas ziņas, strīdi</p></div>
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Visi tipi" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Visi tipi</SelectItem>
          <SelectItem value="listing">Sludinājumi</SelectItem>
          <SelectItem value="report">Sūdzības</SelectItem>
          <SelectItem value="message">Ziņas</SelectItem>
          <SelectItem value="dispute">Strīdi</SelectItem>
        </SelectContent>
      </Select>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Tips</TableHead><TableHead>ID</TableHead><TableHead>Temats</TableHead><TableHead>Iemesls</TableHead><TableHead>Autors</TableHead><TableHead>Datums</TableHead><TableHead className="text-right">Darbības</TableHead></TableRow></TableHeader>
          <TableBody>
            {shown.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Rinda ir tukša</TableCell></TableRow>
             : shown.map(i => (
              <TableRow key={`${i.type}-${i.id}`}>
                <TableCell><Badge variant="outline">{i.type}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{i.id}</TableCell>
                <TableCell className="max-w-[280px] truncate">{i.subject}</TableCell>
                <TableCell className="text-xs text-slate-500 max-w-[240px] truncate">{i.ai_moderation_reason ?? '—'}</TableCell>
                <TableCell className="text-xs">{i.actor_name ?? '—'}</TableCell>
                <TableCell className="text-xs">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-1">
                  {i.type === 'listing' && <>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'approve')}>Apstiprināt</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'hide')}>Slēpt</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'reject')} className="text-red-600">Noraidīt</Button>
                  </>}
                  {i.type === 'report' && <>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'resolve')}>Atrisināt</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'escalate')}>Eskalēt</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'dismiss')}>Noraidīt</Button>
                  </>}
                  {i.type === 'message' && <>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'warn')}>Brīdinājums</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'delete')} className="text-red-600">Dzēst ziņu</Button>
                    <Button size="sm" variant="ghost" onClick={() => act(i.type, i.id, 'note')}>Piezīme</Button>
                  </>}
                  {i.type === 'dispute' && (
                    <span className="text-xs text-slate-400">Pārvaldīt sadaļā "Sūdzības un strīdi"</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
