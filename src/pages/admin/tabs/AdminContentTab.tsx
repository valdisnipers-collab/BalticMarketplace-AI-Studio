import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPut } from '@/lib/apiClient';

interface Row { key: string; value: any; updated_by: number | null; updated_at: string }

export default function AdminContentTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});

  async function load() { setRows(await apiGet<Row[]>('/api/admin/content')); }
  useEffect(() => { load(); }, []);

  async function save(key: string) {
    const raw = edited[key]; if (raw === undefined) return;
    let parsed: unknown = raw;
    try { parsed = JSON.parse(raw); } catch { /* treat as plain string */ }
    await apiPut(`/api/admin/content/${encodeURIComponent(key)}`, { value: parsed });
    setEdited(p => { const n = { ...p }; delete n[key]; return n; });
    await load();
  }

  function display(v: unknown): string {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Satura pārvaldība</h1><p className="text-sm text-slate-500">Sākumlapas teksti, baneri, kājene</p></div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Atslēga</TableHead><TableHead>Vērtība (JSON/teksts)</TableHead><TableHead>Atjaunots</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Nav ierakstu</TableCell></TableRow>
             : rows.map(r => {
              const val = edited[r.key] ?? display(r.value);
              const dirty = r.key in edited;
              return (
                <TableRow key={r.key}>
                  <TableCell className="font-mono text-xs align-top pt-3">{r.key}</TableCell>
                  <TableCell>
                    <textarea className="w-full min-h-[60px] rounded-md border border-slate-200 p-2 text-sm font-mono"
                      value={val} onChange={e => setEdited(p => ({ ...p, [r.key]: e.target.value }))} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 align-top pt-3">{new Date(r.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell className="align-top pt-2"><Button size="sm" disabled={!dirty} onClick={() => save(r.key)}>Saglabāt</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
