import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPut } from '@/lib/apiClient';

interface Cat {
  id: string; label_lv: string; label_ru: string; label_en: string;
  description_lv: string | null; description_ru: string | null;
  sort_order: number | null; is_active: boolean; show_on_homepage: boolean;
}

export default function AdminCategoriesTab() {
  const [rows, setRows] = useState<Cat[]>([]);
  const [edited, setEdited] = useState<Record<string, Partial<Cat>>>({});

  async function load() {
    setRows(await apiGet<Cat[]>('/api/admin/categories'));
  }
  useEffect(() => { load(); }, []);

  function patch(id: string, field: keyof Cat, value: unknown) {
    setEdited(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function save(id: string) {
    const changes = edited[id]; if (!changes) return;
    await apiPut(`/api/admin/categories/${id}`, changes);
    setEdited(p => { const n = { ...p }; delete n[id]; return n; });
    await load();
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Kategorijas</h1><p className="text-sm text-slate-500">Etiķetes un redzamība. Kanoniskie ID ir slēgti kodā.</p></div>
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead>ID</TableHead><TableHead>LV</TableHead><TableHead>RU</TableHead><TableHead>EN</TableHead>
            <TableHead>Aktīva</TableHead><TableHead>Uz sākumlapas</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(c => {
              const cur = { ...c, ...edited[c.id] };
              const dirty = !!edited[c.id];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell><Input value={cur.label_lv} onChange={e => patch(c.id, 'label_lv', e.target.value)} /></TableCell>
                  <TableCell><Input value={cur.label_ru} onChange={e => patch(c.id, 'label_ru', e.target.value)} /></TableCell>
                  <TableCell><Input value={cur.label_en} onChange={e => patch(c.id, 'label_en', e.target.value)} /></TableCell>
                  <TableCell><Checkbox checked={!!cur.is_active} onCheckedChange={v => patch(c.id, 'is_active', !!v)} /></TableCell>
                  <TableCell><Checkbox checked={!!cur.show_on_homepage} onCheckedChange={v => patch(c.id, 'show_on_homepage', !!v)} /></TableCell>
                  <TableCell><Button size="sm" disabled={!dirty} onClick={() => save(c.id)}>Saglabāt</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
