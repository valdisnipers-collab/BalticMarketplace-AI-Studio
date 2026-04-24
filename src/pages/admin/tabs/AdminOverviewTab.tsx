import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/apiClient';

interface Stats { [k: string]: number }
interface TrendPoint { day: string; count: number }
interface TopCat { category: string; count: number }

export default function AdminOverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [users, setUsers] = useState<TrendPoint[]>([]);
  const [cats, setCats] = useState<TopCat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, t, u, c] = await Promise.all([
          apiGet<Stats>('/api/admin/overview/stats'),
          apiGet<TrendPoint[]>('/api/admin/overview/trends?metric=listings&days=30'),
          apiGet<TrendPoint[]>('/api/admin/overview/trends?metric=users&days=30'),
          apiGet<TopCat[]>('/api/admin/overview/top-categories'),
        ]);
        if (cancelled) return;
        setStats(s); setTrends(t); setUsers(u); setCats(c);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const cards: Array<{ key: keyof Stats | string; label: string }> = [
    { key: 'users_total', label: 'Lietotāji kopā' },
    { key: 'users_new_today', label: 'Šodien reģistrēti' },
    { key: 'users_new_week', label: 'Nedēļā reģistrēti' },
    { key: 'users_banned', label: 'Bloķēti' },
    { key: 'listings_active', label: 'Aktīvi sludinājumi' },
    { key: 'listings_pending', label: 'Gaida moderāciju' },
    { key: 'listings_sold', label: 'Pārdoti' },
    { key: 'offers_total', label: 'Piedāvājumi' },
    { key: 'offers_pending', label: 'Gaidoši piedāv.' },
    { key: 'orders_total', label: 'Pasūtījumi' },
    { key: 'disputes_open', label: 'Atklātie strīdi' },
    { key: 'reports_pending', label: 'Sūdzības' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pārskats</h1>
        <p className="text-sm text-slate-500">Platformas galvenie rādītāji</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.key} className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</p>
            {loading ? <Skeleton className="h-7 w-16 mt-2" /> : (
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.[c.key] ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800 mb-2">Sludinājumi pa dienām</p>
          {trends.length === 0 ? <p className="text-xs text-slate-400">Nav datu</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey="count" stroke="#E64415" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800 mb-2">Reģistrācijas pa dienām</p>
          {users.length === 0 ? <p className="text-xs text-slate-400">Nav datu</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={users}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey="count" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-800 mb-2">Populārākās kategorijas</p>
        {cats.length === 0 ? <p className="text-xs text-slate-400">Nav datu</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#E64415" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
