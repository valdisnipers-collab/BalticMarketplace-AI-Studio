import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPut, apiPost } from '@/lib/apiClient';

interface Tmpl {
  key: string;
  title_lv: string | null; body_lv: string | null;
  title_ru: string | null; body_ru: string | null;
  title_en: string | null; body_en: string | null;
  channel: string; is_enabled: boolean;
}

export default function AdminNotificationsTab() {
  const [rows, setRows] = useState<Tmpl[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Tmpl>>({});

  async function load() {
    const r = await apiGet<Tmpl[]>('/api/admin/notifications/templates');
    setRows(r);
    if (!selected && r.length) setSelected(r[0].key);
  }
  useEffect(() => { load(); }, []);

  const current = rows.find(r => r.key === selected);
  const editing = current ? { ...current, ...draft } : null;

  async function save() {
    if (!selected || !editing) return;
    await apiPut(`/api/admin/notifications/templates/${selected}`, {
      title_lv: editing.title_lv, body_lv: editing.body_lv,
      title_ru: editing.title_ru, body_ru: editing.body_ru,
      title_en: editing.title_en, body_en: editing.body_en,
      channel: editing.channel, is_enabled: editing.is_enabled,
    });
    setDraft({}); await load();
  }
  async function preview() {
    if (!selected) return;
    const vars: Record<string, string> = {};
    const v = prompt('Variables as JSON (empty = defaults):') || '{}';
    try { Object.assign(vars, JSON.parse(v)); } catch {}
    const r = await apiPost<{ title: string; body: string }>(`/api/admin/notifications/templates/${selected}/preview`, { lang: 'lv', variables: vars });
    alert(`${r.title}\n\n${r.body}`);
  }

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Paziņojumu šabloni</h1></div>
      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <p className="text-xs font-semibold text-slate-500 px-3 py-2 border-b border-slate-100">{rows.length} šabloni</p>
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {rows.map(r => (
              <button key={r.key} onClick={() => { setSelected(r.key); setDraft({}); }}
                      className={`w-full text-left px-3 py-2 text-sm ${r.key === selected ? 'bg-primary-50 text-[#E64415] font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                <div className="truncate">{r.key}</div>
                <div className="flex gap-1 items-center">
                  <Badge variant="outline" className="text-[10px]">{r.channel}</Badge>
                  {!r.is_enabled && <Badge className="bg-slate-200 text-slate-600 text-[10px]">off</Badge>}
                </div>
              </button>
            ))}
          </div>
        </div>
        {editing ? (
          <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-mono text-sm">{editing.key}</div>
              <label className="flex items-center gap-1 text-sm"><Checkbox checked={!!editing.is_enabled} onCheckedChange={v => setDraft(d => ({ ...d, is_enabled: !!v }))} /> Ieslēgts</label>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Kanāls</p>
              <Select value={String(editing.channel)} onValueChange={v => setDraft(d => ({ ...d, channel: v }))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['email','push','in_app','sms'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(['lv','ru','en'] as const).map(lng => (
              <div key={lng} className="space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase">{lng} virsraksts</p>
                <Input value={(editing as any)[`title_${lng}`] ?? ''} onChange={e => setDraft(d => ({ ...d, [`title_${lng}`]: e.target.value } as any))} />
                <p className="text-xs font-semibold text-slate-500 uppercase">{lng} saturs</p>
                <textarea className="w-full min-h-[80px] rounded-md border border-slate-200 p-2 text-sm" value={(editing as any)[`body_${lng}`] ?? ''} onChange={e => setDraft(d => ({ ...d, [`body_${lng}`]: e.target.value } as any))} />
              </div>
            ))}
            <p className="text-xs text-slate-500">Mainīgie: <code>{`{{userName}}`}</code>, <code>{`{{listingTitle}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{reason}}`}</code>, <code>{`{{orderId}}`}</code></p>
            <div className="flex gap-2">
              <Button onClick={save} disabled={Object.keys(draft).length === 0}>Saglabāt</Button>
              <Button variant="outline" onClick={preview}>Priekšskatīt</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-slate-400">Izvēlies šablonu no saraksta</div>
        )}
      </div>
    </div>
  );
}
