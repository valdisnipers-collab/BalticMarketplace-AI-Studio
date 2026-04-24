import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiGet, apiPut, apiPost } from '@/lib/apiClient';

interface ChatMessage { id: number; sender_id: number; sender_name: string | null; content: string | null; image_url: string | null; created_at: string }
interface ChatResponse { context: { listing_id: number; buyer_id: number; seller_id: number }; messages: ChatMessage[] }

interface Report { id: number; reporter_name: string | null; reported_listing_title: string | null; reason: string; status: string; created_at: string }
interface Dispute { id: number; order_id: number; reason: string; description: string | null; status: string; admin_notes: string | null; listing_title: string | null; buyer_name: string | null; seller_name: string | null; created_at: string; order_amount: number }

export default function AdminReportsTab() {
  const [sub, setSub] = useState<'reports' | 'disputes'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [chatDisputeId, setChatDisputeId] = useState<number | null>(null);
  const [chatData, setChatData] = useState<ChatResponse | null>(null);

  useEffect(() => {
    if (chatDisputeId == null) { setChatData(null); return; }
    let cancelled = false;
    apiGet<ChatResponse>(`/api/admin/disputes/${chatDisputeId}/chat`)
      .then(d => { if (!cancelled) setChatData(d); })
      .catch(() => { if (!cancelled) setChatData({ context: { listing_id: 0, buyer_id: 0, seller_id: 0 }, messages: [] }); });
    return () => { cancelled = true; };
  }, [chatDisputeId]);

  async function load() {
    const [r, d] = await Promise.all([
      apiGet<Report[]>('/api/admin/reports'),
      apiGet<Dispute[]>('/api/admin/disputes'),
    ]);
    setReports(r); setDisputes(d);
  }
  useEffect(() => { load(); }, []);

  async function resolveReport(id: number, status: 'resolved' | 'dismissed') {
    await apiPut(`/api/admin/reports/${id}`, { status });
    await load();
  }
  async function resolveDispute(id: number, action: 'refund' | 'release') {
    const notes = prompt(`Iemesls (${action}):`) ?? '';
    await apiPost(`/api/admin/disputes/${id}/resolve`, { action, admin_notes: notes });
    await load();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Sūdzības un strīdi</h1></div>
      <div className="flex gap-2">
        <Button size="sm" variant={sub === 'reports' ? 'default' : 'outline'} onClick={() => setSub('reports')}>Sūdzības ({reports.length})</Button>
        <Button size="sm" variant={sub === 'disputes' ? 'default' : 'outline'} onClick={() => setSub('disputes')}>Strīdi ({disputes.length})</Button>
      </div>

      {sub === 'reports' ? (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Ziņotājs</TableHead><TableHead>Sludinājums</TableHead><TableHead>Iemesls</TableHead><TableHead>Statuss</TableHead><TableHead className="text-right">Darbības</TableHead></TableRow></TableHeader>
            <TableBody>
              {reports.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">Nav sūdzību</TableCell></TableRow>
               : reports.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell><TableCell>{r.reporter_name ?? '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{r.reported_listing_title ?? '—'}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs">{r.reason}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    {r.status === 'pending' && <>
                      <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'resolved')}>Atrisināt</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'dismissed')}>Noraidīt</Button>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Pasūtījums</TableHead><TableHead>Sludinājums</TableHead><TableHead>Pircējs</TableHead><TableHead>Pārdevējs</TableHead><TableHead>Summa</TableHead><TableHead>Statuss</TableHead><TableHead className="text-right">Darbības</TableHead></TableRow></TableHeader>
            <TableBody>
              {disputes.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-6 text-slate-400">Nav strīdu</TableCell></TableRow>
               : disputes.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell><TableCell>#{d.order_id}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{d.listing_title ?? '—'}</TableCell>
                  <TableCell>{d.buyer_name ?? '—'}</TableCell><TableCell>{d.seller_name ?? '—'}</TableCell>
                  <TableCell>€{d.order_amount}</TableCell>
                  <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => setChatDisputeId(d.id)}>Skatīt saraksti</Button>
                    {d.status === 'open' && <>
                      <Button size="sm" variant="ghost" onClick={() => resolveDispute(d.id, 'refund')}>Atmaksāt</Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveDispute(d.id, 'release')}>Pārdevējam</Button>
                    </>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={chatDisputeId != null} onOpenChange={(o) => !o && setChatDisputeId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Strīda sarakste (#{chatDisputeId})</DialogTitle>
          </DialogHeader>
          {!chatData ? (
            <p className="text-sm text-slate-500">Ielādē...</p>
          ) : chatData.messages.length === 0 ? (
            <p className="text-sm text-slate-500">Starp pusēm par šo sludinājumu saraksta nav.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
              {chatData.messages.map(m => (
                <div key={m.id} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex justify-between items-baseline gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-700">{m.sender_name ?? `User #${m.sender_id}`}</p>
                    <p className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  {m.content && <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</p>}
                  {m.image_url && <p className="text-xs text-slate-500 italic mt-1">[attēls]</p>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
