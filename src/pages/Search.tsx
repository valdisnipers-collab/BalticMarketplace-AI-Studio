import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, SlidersHorizontal, Heart, Clock, Image as ImageIcon, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthContext';
import { CATEGORY_SCHEMAS, CATEGORY_NAMES } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

const categories = ['Visi', ...CATEGORY_NAMES];

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
  const [subcategory, setSubcategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Reset attributes when category changes
  useEffect(() => {
    setSubcategory('');
    setAttributeFilters({});
  }, [category]);

  // Reset attributes when subcategory changes
  useEffect(() => {
    setAttributeFilters({});
  }, [subcategory]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let url = '/api/listings';
      const params = new URLSearchParams();
      
      if (query) {
        url = '/api/listings/search';
        params.append('q', query);
      }
      
      if (category !== 'Visi') params.append('category', category);
      if (subcategory) params.append('subcategory', subcategory);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      
      // Append attribute filters
      Object.entries(attributeFilters).forEach(([key, value]) => {
        if (value) {
          params.append(`attr_${key}`, String(value));
        }
      });

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

  const isEarlyAccess = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes <= 15;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile filter toggle */}
      <div className="md:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-16 z-30 shadow-sm">
        <span className="font-medium text-slate-700">Atrasti {filteredListings.length} sludinājumi</span>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtri
        </Button>
      </div>

      {/* Sidebar Filters */}
      <div className={`
        fixed inset-0 z-50 bg-white md:bg-transparent md:static md:w-80 flex-shrink-0 border-r border-slate-200
        transform transition-transform duration-300 ease-in-out
        ${showFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full overflow-y-auto p-6 md:p-8">
          <div className="flex justify-between items-center mb-8 md:hidden">
            <h2 className="text-xl font-bold text-slate-900">Filtri</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSearch} className="space-y-8">
            {/* Search Input */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900">Meklēt</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Atslēgvārds..."
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900">Kategorija</label>
              <div className="space-y-2.5">
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
                    <span className="ml-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Subcategory */}
            {category !== 'Visi' && CATEGORY_SCHEMAS[category]?.subcategories && Object.keys(CATEGORY_SCHEMAS[category].subcategories).length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-900">Apakškategorija</label>
                <div className="relative">
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  >
                    <option value="">Visas</option>
                    {Object.keys(CATEGORY_SCHEMAS[category].subcategories).map(subcat => (
                      <option key={subcat} value={subcat}>{subcat}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            )}

            {/* Price Range */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900">Cena (€)</label>
              <div className="flex items-center space-x-3">
                <Input
                  type="number"
                  placeholder="No"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="text-slate-400">-</span>
                <Input
                  type="number"
                  placeholder="Līdz"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Dynamic Attributes */}
            {category !== 'Visi' && subcategory && CATEGORY_SCHEMAS[category]?.subcategories[subcategory]?.fields.map(field => (
              <div key={field.name} className="space-y-3">
                <label className="block text-sm font-semibold text-slate-900">{field.label}</label>
                {field.type === 'select' ? (
                  <div className="relative">
                    <select
                      value={attributeFilters[field.name] || ''}
                      onChange={(e) => setAttributeFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                    >
                      <option value="">Visi</option>
                      {field.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder || 'Jebkāds'}
                    value={attributeFilters[field.name] || ''}
                    onChange={(e) => setAttributeFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <Button 
              type="submit"
              className="w-full"
              size="lg"
              onClick={() => setShowFilters(false)}
            >
              Parādīt rezultātus
            </Button>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="mb-8 hidden md:block">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Atrasti {filteredListings.length} sludinājumi
          </h1>
          <p className="text-slate-500 mt-1">Pārlūkojiet un atrodiet labākos piedāvājumus.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <SearchIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Nekas netika atrasts</h3>
            <p className="text-slate-500">Mēģiniet mainīt meklēšanas kritērijus vai noņemt filtrus.</p>
            <Button 
              variant="link"
              onClick={() => {
                setQuery('');
                setCategory('Visi');
                setMinPrice('');
                setMaxPrice('');
              }}
              className="mt-4"
            >
              Notīrīt visus filtrus
            </Button>
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
                        <Badge variant="default" className="bg-amber-400 text-amber-950 hover:bg-amber-500 font-bold shadow-sm">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          TOP
                        </Badge>
                      ) : null}
                      {isEarlyAccess(listing.created_at) && (
                        <Badge variant="default" className="bg-indigo-500 text-white hover:bg-indigo-600 font-bold shadow-sm">
                          <Clock className="w-3 h-3 mr-1" />
                          Agrā piekļuve
                        </Badge>
                      )}
                      <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white font-semibold shadow-sm">
                        {listing.category}
                      </Badge>
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
