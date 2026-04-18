import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stores/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStore(data); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-2 border-[#E64415] border-t-transparent rounded-full" />
    </div>
  );
  if (!store) return <div className="text-center py-20 text-slate-500">Veikals nav atrasts.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{store.company_name || store.name} | BalticMarket</title>
        <meta name="description" content={store.tagline || store.description?.slice(0, 160)} />
        {store.logo_url && <meta property="og:image" content={store.logo_url} />}
      </Helmet>

      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-r from-slate-800 to-slate-600 overflow-hidden">
        {store.banner_url && <img src={store.banner_url} alt="banner" className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 flex items-end p-6 gap-4">
          {store.logo_url && <img src={store.logo_url} alt="logo" className="w-16 h-16 rounded-xl border-2 border-white object-cover bg-white" />}
          <div>
            <h1 className="text-2xl font-bold text-white">{store.company_name || store.name}</h1>
            {store.tagline && <p className="text-slate-200 text-sm">{store.tagline}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2 text-sm">
              {store.description && <p className="text-slate-600">{store.description}</p>}
              {store.phone && <p className="text-slate-700"><span className="font-semibold">Tel:</span> {store.phone}</p>}
              {store.website && (
                <a href={store.website} className="text-[#E64415] hover:underline break-all" target="_blank" rel="noreferrer">
                  {store.website}
                </a>
              )}
              {store.working_hours && <p className="text-slate-700"><span className="font-semibold">Darba laiks:</span> {store.working_hours}</p>}
              {store.company_reg_number && <p className="text-slate-500 text-xs">Reģ. Nr: {store.company_reg_number}</p>}
              {store.avg_rating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-amber-500">★</span>
                  <span className="font-semibold">{Number(store.avg_rating).toFixed(1)}</span>
                  <span className="text-slate-400">({store.review_count} atsauksmes)</span>
                </div>
              )}
            </div>
          </div>

          {/* Listings grid */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Aktīvie sludinājumi ({store.active_listings_count})
            </h2>
            {store.listings.length === 0 ? (
              <p className="text-slate-400 text-sm">Nav aktīvu sludinājumu.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {store.listings.map((listing: any) => {
                  let imageUrl = '';
                  try { imageUrl = JSON.parse(listing.image_urls)?.[0] || ''; } catch {}
                  return (
                    <Link key={listing.id} to={`/listing/${listing.id}`}
                      className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      {imageUrl && (
                        <img src={imageUrl} alt={listing.title} className="w-full h-28 object-cover" />
                      )}
                      <div className="p-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{listing.title}</p>
                        <p className="text-sm font-bold text-[#E64415]">{listing.price}€</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
