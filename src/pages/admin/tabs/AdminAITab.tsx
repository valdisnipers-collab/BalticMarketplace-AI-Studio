import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPut } from '@/lib/apiClient';

interface AISettings {
  ai_enabled?: boolean; ai_moderation_enabled?: boolean;
  ai_moderation_strictness?: string;
  ai_title_generation_enabled?: boolean; ai_description_enabled?: boolean;
  ai_price_suggestions_enabled?: boolean; ai_card_summary_enabled?: boolean;
  ai_image_quality_check_enabled?: boolean;
  ai_moderation_required_categories?: string[];
  provider_configured?: boolean;
}
interface Decision { id: number; title: string; category: string; ai_moderation_status: string; ai_moderation_reason: string | null; ai_trust_score: number; updated_at: string }

const TOGGLE_KEYS: Array<[keyof AISettings, string]> = [
  ['ai_enabled', 'AI funkcijas (kopējais slēdzis)'],
  ['ai_moderation_enabled', 'AI moderācija'],
  ['ai_title_generation_enabled', 'AI virsrakstu ģenerēšana'],
  ['ai_description_enabled', 'AI aprakstu ģenerēšana'],
  ['ai_price_suggestions_enabled', 'AI cenu ieteikumi'],
  ['ai_card_summary_enabled', 'AI kartīšu kopsavilkumi'],
  ['ai_image_quality_check_enabled', 'AI attēlu kvalitātes pārbaude'],
];

export default function AdminAITab() {
  const [settings, setSettings] = useState<AISettings>({});
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [dirty, setDirty] = useState<Partial<AISettings>>({});

  async function load() {
    const [s, d] = await Promise.all([
      apiGet<AISettings>('/api/admin/ai/settings'),
      apiGet<Decision[]>('/api/admin/ai/recent-decisions'),
    ]);
    setSettings(s); setDecisions(d);
  }
  useEffect(() => { load(); }, []);

  function patch<K extends keyof AISettings>(key: K, value: AISettings[K]) {
    setDirty(p => ({ ...p, [key]: value }));
  }
  async function save() {
    if (Object.keys(dirty).length === 0) return;
    await apiPut('/api/admin/ai/settings', dirty);
    setDirty({}); await load();
  }

  const cur = { ...settings, ...dirty };

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold text-slate-900">AI iestatījumi</h1><p className="text-sm text-slate-500">Pārvaldi funkcijas platformas līmenī</p></div>
      {!settings.provider_configured && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          AI pakalpojums nav konfigurēts (GEMINI_API_KEY trūkst). AI funkcijas būs atslēgtas neatkarīgi no zemāk esošajiem slēdžiem.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {TOGGLE_KEYS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-3">
            <Checkbox checked={!!cur[k]} onCheckedChange={v => patch(k, !!v as any)} />
            <span className="text-sm text-slate-800">{label}</span>
          </label>
        ))}
        <div className="rounded-xl bg-white border border-slate-200 p-3">
          <p className="text-sm text-slate-800 mb-2">AI moderācijas stingrība</p>
          <Select value={String(cur.ai_moderation_strictness ?? 'medium')} onValueChange={v => patch('ai_moderation_strictness', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Zema</SelectItem>
              <SelectItem value="medium">Vidēja</SelectItem>
              <SelectItem value="high">Augsta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={Object.keys(dirty).length === 0}>Saglabāt ({Object.keys(dirty).length})</Button>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
        <p className="text-sm font-semibold text-slate-800 px-4 py-3 border-b border-slate-100">Pēdējie AI moderācijas lēmumi</p>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Virsraksts</TableHead><TableHead>Statuss</TableHead><TableHead>Iemesls</TableHead><TableHead>Score</TableHead><TableHead>Laiks</TableHead></TableRow></TableHeader>
          <TableBody>
            {decisions.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">Nav lēmumu</TableCell></TableRow>
             : decisions.map(d => (
              <TableRow key={d.id}>
                <TableCell>{d.id}</TableCell>
                <TableCell className="max-w-[240px] truncate">{d.title}</TableCell>
                <TableCell><Badge variant="outline">{d.ai_moderation_status}</Badge></TableCell>
                <TableCell className="text-xs max-w-[240px] truncate">{d.ai_moderation_reason ?? '—'}</TableCell>
                <TableCell>{d.ai_trust_score}</TableCell>
                <TableCell className="text-xs">{new Date(d.updated_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
