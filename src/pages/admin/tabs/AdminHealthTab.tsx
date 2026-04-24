import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Tag, Database, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet } from '@/lib/apiClient';

interface Svc { configured: boolean; ok?: boolean; note?: string }
interface Health {
  db: Svc; ai: Svc; stripe: Svc; meilisearch: Svc; redis: Svc;
  cloudinary: Svc; twilio: Svc; email: Svc; push: Svc;
  uptime_seconds: number; node_env: string; version: string; last_migration: string | null;
}
interface Evt { id: number; level: string; source: string; message: string; created_at: string }

const REQUIRED = new Set(['db','stripe','ai','cloudinary']);

function Pill({ name, svc }: { name: string; svc: Svc }) {
  const isReq = REQUIRED.has(name);
  const good = svc.configured && svc.ok !== false;
  const badge = good
    ? { icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'OK' }
    : svc.configured
      ? { icon: <AlertCircle className="w-4 h-4 text-amber-600" />, color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'ISSUE' }
      : { icon: <XCircle className={`w-4 h-4 ${isReq ? 'text-red-600' : 'text-slate-400'}`} />, color: isReq ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200', label: isReq ? 'MISSING' : 'OPTIONAL' };
  return (
    <div className={`rounded-xl border p-4 ${badge.color}`}>
      <div className="flex items-center justify-between">
        <p className="font-semibold text-sm uppercase tracking-wide">{name}</p>
        {badge.icon}
      </div>
      <p className="text-xs mt-1">{badge.label}{svc.note ? ` — ${svc.note}` : ''}</p>
    </div>
  );
}

export default function AdminHealthTab() {
  const [h, setH] = useState<Health | null>(null);
  const [events, setEvents] = useState<Evt[]>([]);

  async function load() {
    const [ha, ev] = await Promise.all([
      apiGet<Health>('/api/admin/health'),
      apiGet<Evt[]>('/api/admin/health/events').catch(() => []),
    ]);
    setH(ha); setEvents(ev ?? []);
  }
  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, []);

  if (!h) return <div className="text-slate-400">Ielādē...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Sistēmas veselība</h1><p className="text-sm text-slate-500">Tikai konfigurācijas stāvoklis. Slepenas vērtības netiek rādītas.</p></div>
        <div className="text-right text-xs text-slate-500">
          <div className="flex items-center gap-1 justify-end"><Tag className="w-3 h-3" /> v{h.version}</div>
          <div className="flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> uptime {Math.round(h.uptime_seconds/60)} min</div>
          <div className="flex items-center gap-1 justify-end"><Database className="w-3 h-3" /> {h.last_migration ?? 'none'}</div>
          <div className="flex items-center gap-1 justify-end"><Cpu className="w-3 h-3" /> env: {h.node_env}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Pill name="db" svc={h.db} />
        <Pill name="ai" svc={h.ai} />
        <Pill name="stripe" svc={h.stripe} />
        <Pill name="meilisearch" svc={h.meilisearch} />
        <Pill name="redis" svc={h.redis} />
        <Pill name="cloudinary" svc={h.cloudinary} />
        <Pill name="twilio" svc={h.twilio} />
        <Pill name="email" svc={h.email} />
        <Pill name="push" svc={h.push} />
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <p className="text-sm font-semibold text-slate-800 px-4 py-3 border-b border-slate-100">Pēdējie sistēmas notikumi</p>
        <Table>
          <TableHeader><TableRow><TableHead>Līmenis</TableHead><TableHead>Avots</TableHead><TableHead>Ziņa</TableHead><TableHead>Laiks</TableHead></TableRow></TableHeader>
          <TableBody>
            {events.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-400">Nav notikumu</TableCell></TableRow>
             : events.map(e => (
              <TableRow key={e.id}>
                <TableCell><Badge variant="outline">{e.level}</Badge></TableCell>
                <TableCell className="text-xs">{e.source}</TableCell>
                <TableCell className="text-xs max-w-[480px] truncate">{e.message}</TableCell>
                <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
