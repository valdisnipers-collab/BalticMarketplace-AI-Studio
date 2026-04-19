import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Package, TrendingUp, MessageSquare, Star, AlertTriangle, BarChart2, ArrowUpRight } from 'lucide-react';

interface DashboardData {
  listings: { total: number; active: number };
  sales: { count: number; revenue: number };
  offers: { total: number; pending: number; accepted: number };
  reviews: { count: number; avg_rating: string };
  disputes: { open: number };
  top_listings: any[];
  sales_by_day: { date: string; count: number; revenue: number }[];
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function SellerDashboard() {
  const { user, token } = useAuth() as any;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = token || localStorage.getItem('auth_token');
    if (!t) return;
    fetch('/api/seller/dashboard', {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Kļūda ielādējot datus'); setLoading(false); });
  }, [token]);

  if (!user) return <div className="max-w-4xl mx-auto px-4 py-8 text-center"><p>Lūdzu, piesakies</p></div>;

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <p className="text-red-500">{error}</p>
    </div>
  );

  if (!data) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pārdevēja panelis</h1>
        <p className="text-slate-500 text-sm mt-1">Statistika par pēdējām 30 dienām</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="Aktīvie sludinājumi"
          value={data.listings.active}
          sub={`no ${data.listings.total} kopā`}
          color="bg-[#E64415]"
        />
        <StatCard
          icon={TrendingUp}
          label="Ieņēmumi"
          value={`€${data.sales.revenue.toFixed(0)}`}
          sub={`${data.sales.count} pārdošanas`}
          color="bg-green-500"
        />
        <StatCard
          icon={MessageSquare}
          label="Piedāvājumi"
          value={data.offers.total}
          sub={`${data.offers.pending} gaida atbildi`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Star}
          label="Vidējais vērtējums"
          value={data.reviews.avg_rating}
          sub={`no ${data.reviews.count} atsauksmēm`}
          color="bg-amber-500"
        />
      </div>

      {(data.disputes.open > 0 || data.offers.pending > 0) && (
        <div className="space-y-2">
          {data.disputes.open > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                {data.disputes.open} aktīvs strīds — <Link to="/profile" className="underline">skatīt</Link>
              </p>
            </div>
          )}
          {data.offers.pending > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <MessageSquare className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                {data.offers.pending} piedāvājumi gaida atbildi — <Link to="/profile" className="underline">atbildēt</Link>
              </p>
            </div>
          )}
        </div>
      )}

      {data.top_listings.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Populārākie sludinājumi</h2>
          </div>
          <div className="space-y-3">
            {data.top_listings.map(l => (
              <div key={l.id} className="flex items-center gap-3">
                {l.image_url && (
                  <img
                    src={(() => { try { const u = JSON.parse(l.image_url); return Array.isArray(u) ? u[0] : l.image_url; } catch { return l.image_url; } })()}
                    alt={l.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/listing/${l.id}`} className="text-sm font-medium text-slate-900 hover:text-[#E64415] truncate block">
                    {l.title}
                  </Link>
                  <p className="text-xs text-slate-500">
                    €{l.price} · {l.favorites_count} favorīti · {l.offers_count} piedāvājumi
                  </p>
                </div>
                <Link to={`/listing/${l.id}`} className="shrink-0 text-slate-300 hover:text-[#E64415]">
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sales_by_day.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">Pārdošanas (30 dienas)</h2>
          </div>
          <div className="flex items-end gap-1 h-24">
            {(() => {
              const maxRevenue = Math.max(...data.sales_by_day.map(d => d.revenue), 1);
              return data.sales_by_day.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-[#E64415] rounded-t opacity-70 group-hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(4, (d.revenue / maxRevenue) * 80)}px` }}
                    title={`${d.date}: €${d.revenue}`}
                  />
                </div>
              ));
            })()}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{data.sales_by_day[0]?.date}</span>
            <span>{data.sales_by_day[data.sales_by_day.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
