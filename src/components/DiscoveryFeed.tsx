import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Sparkles } from 'lucide-react';

interface DiscoveryItem {
  id: number;
  title: string;
  price: number;
  image_url: string | null;
  category: string;
  location: string | null;
}

export default function DiscoveryFeed() {
  const { token } = useAuth() as any;
  const [items, setItems] = useState<DiscoveryItem[]>([]);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/listings/discovery', { headers })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setItems(d))
      .catch(() => {});
  }, [token]);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="flex items-center gap-2 mb-3 px-4">
        <Sparkles className="w-4 h-4 text-[#E64415]" />
        <h2 className="text-sm font-semibold text-slate-700">Ieteicamie sludinājumi</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {items.map(item => {
          let thumb = item.image_url;
          if (thumb) {
            try {
              const parsed = JSON.parse(thumb);
              if (Array.isArray(parsed)) thumb = parsed[0];
            } catch {}
          }
          return (
            <Link
              key={item.id}
              to={`/listing/${item.id}`}
              className="shrink-0 w-36 bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-24 bg-slate-100 overflow-hidden">
                {thumb ? (
                  <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-200" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-slate-900 truncate">{item.title}</p>
                <p className="text-xs text-[#E64415] font-semibold">€{item.price}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
