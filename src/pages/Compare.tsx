import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { X, ArrowLeft } from 'lucide-react';

function useCompareListings(ids: string[]) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ids.length === 0) { setListings([]); return; }
    setLoading(true);
    Promise.all(
      ids.map(id => fetch(`/api/listings/${id}`).then(r => r.json()))
    ).then(results => {
      setListings(results.filter(l => l && !l.error));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [ids.join(',')]);

  return { listings, loading };
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const { listings, loading } = useCompareListings(ids);

  const removeFromCompare = (id: number) => {
    const newIds = ids.filter(i => i !== String(id));
    if (newIds.length === 0) setSearchParams({});
    else setSearchParams({ ids: newIds.join(',') });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {ids.map(id => (
            <div key={id} className="bg-white rounded-2xl h-96 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-500">Nav sludinājumu salīdzināšanai</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-2 text-[#E64415] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Atpakaļ uz sākumlapu
        </Link>
      </div>
    );
  }

  const allAttrKeys = Array.from(new Set(
    listings.flatMap(l => {
      try { return Object.keys(JSON.parse(l.attributes || '{}')); } catch { return []; }
    })
  ));

  const getAttr = (listing: any, key: string) => {
    try {
      const attrs = JSON.parse(listing.attributes || '{}');
      return attrs[key] || '—';
    } catch { return '—'; }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Salīdzināt sludinājumus</h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <td className="w-32 pr-4" />
              {listings.map(l => (
                <td key={l.id} className="pb-4 pr-4 min-w-48">
                  <div className="relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                    <button
                      onClick={() => removeFromCompare(l.id)}
                      className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {l.image_url && (
                      <img
                        src={(() => { try { const u = JSON.parse(l.image_url); return Array.isArray(u) ? u[0] : l.image_url; } catch { return l.image_url; } })()}
                        alt={l.title}
                        className="w-full h-32 object-cover rounded-xl mb-3"
                      />
                    )}
                    <Link to={`/listing/${l.id}`} className="text-sm font-semibold text-slate-900 hover:text-[#E64415] line-clamp-2">
                      {l.title}
                    </Link>
                    <p className="text-lg font-bold text-[#E64415] mt-1">€{l.price}</p>
                  </div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { key: 'price', label: 'Cena', render: (l: any) => `€${l.price}` },
              { key: 'location', label: 'Atrašanās vieta', render: (l: any) => l.location || '—' },
              { key: 'quality_score', label: 'Kvalitātes rādītājs', render: (l: any) => l.quality_score ? `${l.quality_score}/100` : '—' },
              { key: 'author', label: 'Pārdevējs', render: (l: any) => l.author_name || '—' },
            ].map(row => (
              <tr key={row.key}>
                <td className="py-3 pr-4 text-xs font-medium text-slate-500">{row.label}</td>
                {listings.map(l => (
                  <td key={l.id} className="py-3 pr-4 text-sm text-slate-700">{row.render(l)}</td>
                ))}
              </tr>
            ))}
            {allAttrKeys.filter(k => !['saleType','auctionEndDate','reservePrice'].includes(k)).map(key => (
              <tr key={key}>
                <td className="py-3 pr-4 text-xs font-medium text-slate-500 capitalize">{key}</td>
                {listings.map(l => (
                  <td key={l.id} className="py-3 pr-4 text-sm text-slate-700">{getAttr(l, key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
