import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, SlidersHorizontal, Heart, Clock, Image as ImageIcon, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../components/AuthContext';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  author_name: string;
  is_highlighted?: number;
}

const categories = [
  'Visi',
  'Transports',
  'Nekustamais īpašums',
  'Elektronika',
  'Darbs un pakalpojumi',
  'Mājai un dārzam',
  'Cits'
];

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'Visi';

  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Filter states
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = '/api/listings';
      const params = new URLSearchParams();
      
      if (query) {
        url = '/api/listings/search';
        params.append('q', query);
      } else {
        if (category !== 'Visi') params.append('category', category);
        if (minPrice) params.append('minPrice', minPrice);
        if (maxPrice) params.append('maxPrice', maxPrice);
      }

      const queryString = params.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const res = await fetch(finalUrl);
      const data = await res.json();
      setListings(data);
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(new Set(data.map((f: any) => f.listing_id)));
      }
    } catch (error) {
      console.error("Error fetching favorites", error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, listingId: number) => {
    e.preventDefault();
    if (!user) {
      alert("Lūdzu, ienāciet sistēmā, lai pievienotu favorītiem.");
      return;
    }

    const isFavorite = favorites.has(listingId);
    const token = localStorage.getItem('auth_token');
    
    try {
      const res = await fetch(`/api/favorites/${listingId}`, {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setFavorites(prev => {
          const newSet = new Set(prev);
          if (isFavorite) newSet.delete(listingId);
          else newSet.add(listingId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('lv-LV', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    fetchListings();
    if (user) {
      fetchFavorites();
    }
  }, [user, searchParams]); // Re-fetch when URL params change

  // Apply filters client-side for immediate feedback on category/price if search is active
  // But since we are moving to server-side, we should trigger fetch on form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'Visi') params.set('category', category);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    setSearchParams(params);
    setShowFilters(false);
  };

  const filteredListings = listings; // We now rely on server-side filtering

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile filter toggle */}
      <div className="md:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-16 z-30">
        <span className="font-semibold text-slate-700">Atrasti {filteredListings.length} sludinājumi</span>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center text-primary-600 font-medium bg-primary-50 px-3 py-1.5 rounded-lg"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtri
        </button>
      </div>

      {/* Sidebar Filters */}
      <div className={`
        fixed inset-0 z-40 bg-white md:bg-transparent md:static md:w-72 flex-shrink-0 border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        ${showFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6 md:hidden">
            <h2 className="text-xl font-bold text-slate-900">Filtri</h2>
            <button onClick={() => setShowFilters(false)} className="p-2 text-slate-500">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-8">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Meklēt</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Atslēgvārds..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Kategorija</label>
              <div className="space-y-2">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      value={cat}
                      checked={category === cat}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500 cursor-pointer"
                    />
                    <span className="ml-3 text-sm text-slate-700 group-hover:text-slate-900">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Cena (€)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="No"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Līdz"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
            </div>

            <button 
              type="submit"
              onClick={() => setShowFilters(false)}
              className="w-full bg-primary-600 text-white font-semibold py-2.5 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Parādīt rezultātus
            </button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="mb-6 hidden md:block">
          <h1 className="text-2xl font-bold text-slate-900">
            Atrasti {filteredListings.length} sludinājumi
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <SearchIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nekas netika atrasts</h3>
            <p className="text-slate-500">Mēģiniet mainīt meklēšanas kritērijus vai noņemt filtrus.</p>
            <button 
              onClick={() => {
                setQuery('');
                setCategory('Visi');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="mt-6 text-primary-600 font-medium hover:text-primary-700"
            >
              Notīrīt visus filtrus
            </button>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredListings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Link 
                  to={`/listing/${listing.id}`}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-all group flex flex-col h-full ${listing.is_highlighted ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 hover:border-primary-300'}`}
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {listing.image_url ? (
                      <img 
                        src={listing.image_url} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {listing.is_highlighted ? (
                        <div className="bg-amber-100/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-amber-800 shadow-sm flex items-center">
                          <Star className="w-3 h-3 mr-1 fill-amber-800" />
                          TOP
                        </div>
                      ) : null}
                      <div className="bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 shadow-sm">
                        {listing.category}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                    >
                      <Heart 
                        className={`w-4 h-4 ${favorites.has(listing.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} 
                      />
                    </button>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {listing.title}
                    </h3>
                    <p className="text-xl font-extrabold text-primary-600 mb-4">
                      € {listing.price.toFixed(2)}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatDate(listing.created_at)}
                      </div>
                      <div className="font-medium truncate max-w-[100px]">
                        {listing.author_name}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
