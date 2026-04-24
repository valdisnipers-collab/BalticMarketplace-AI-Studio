import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { apiGet, apiPut } from '@/lib/apiClient';

interface Setting { key: string; value: unknown; category: string; description: string | null; is_public: boolean; updated_at: string }
type Grouped = Record<string, Setting[]>;

const DANGEROUS = new Set(['maintenance_mode','registration_enabled','listing_creation_enabled']);

export default function AdminSettingsTab() {
  const [grouped, setGrouped] = useState<Grouped>({});
  const [edits, setEdits] = useState<Record<string, unknown>>({});
  const [confirm, setConfirm] = useState<{ open: boolean; key: string; value: unknown } | null>(null);

  async function load() { setGrouped(await apiGet<Grouped>('/api/admin/settings')); }
  useEffect(() => { load(); }, []);

  function patch(key: string, value: unknown) { setEdits(p => ({ ...p, [key]: value })); }

  async function persist(key: string, value: unknown) {
    await apiPut(`/api/admin/settings/${encodeURIComponent(key)}`, { value });
    setEdits(p => { const n = { ...p }; delete n[key]; return n; });
    await load();
  }

  async function save(key: string) {
    const value = edits[key];
    if (value === undefined) return;
    if (DANGEROUS.has(key) && value === true) {
      setConfirm({ open: true, key, value });
      return;
    }
    await persist(key, value);
  }

  function renderInput(s: Setting) {
    const current = edits[s.key] !== undefined ? edits[s.key] : s.value;
    if (typeof s.value === 'boolean' || typeof current === 'boolean') {
      return <Checkbox checked={!!current} onCheckedChange={v => patch(s.key, !!v)} />;
    }
    if (typeof s.value === 'number' || typeof current === 'number') {
      return <Input type="number" value={String(current ?? '')} onChange={e => patch(s.key, e.target.value === '' ? null : Number(e.target.value))} className="w-40" />;
    }
    if (s.key === 'ai_moderation_strictness') {
      return <Select value={String(current ?? 'medium')} onValueChange={v => patch(s.key, v)}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="low">low</SelectItem>
          <SelectItem value="medium">medium</SelectItem>
          <SelectItem value="high">high</SelectItem>
        </SelectContent>
      </Select>;
    }
    if (Array.isArray(current) || Array.isArray(s.value)) {
      return <Input value={JSON.stringify(current ?? [])} onChange={e => { try { patch(s.key, JSON.parse(e.target.value)); } catch { /* ignore */ } }} />;
    }
    return <Input value={String(current ?? '')} onChange={e => patch(s.key, e.target.value)} />;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Platformas iestatījumi</h1><p className="text-sm text-slate-500">Pārvaldi funkciju slēdžus un limitus</p></div>
      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="rounded-xl bg-white border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs uppercase tracking-wide font-semibold text-slate-500">{category}</div>
          <div className="divide-y divide-slate-100">
            {items.map(s => {
              const dirty = s.key in edits;
              return (
                <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{s.key}</div>
                    {s.description && <div className="text-xs text-slate-500">{s.description}</div>}
                  </div>
                  <div className="flex-1">{renderInput(s)}</div>
                  <Button size="sm" disabled={!dirty} onClick={() => save(s.key)}>Saglabāt</Button>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={!!confirm?.open}
        onOpenChange={(o) => setConfirm(c => c ? { ...c, open: o } : null)}
        title="Apstiprināt jutīgo iestatījumu?"
        description={`Šī darbība (${confirm?.key}) ietekmēs visus lietotājus.`}
        dangerous
        onConfirm={async () => { if (confirm) await persist(confirm.key, confirm.value); }}
      />
    </div>
  );
}
