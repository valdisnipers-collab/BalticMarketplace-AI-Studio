import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Filter, SlidersHorizontal, Heart, Clock, Image as ImageIcon, Star, X, ChevronDown, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { SmartExpandDrawer } from '../components/SmartExpandDrawer';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { CATEGORY_SCHEMAS, CATEGORY_NAMES, isAutoCategory } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterPill } from '@/components/ui/filter-pill';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  author_name: string;
  location?: string;
  is_highlighted?: number;
  ai_trust_score?: number;
  ai_moderation_status?: string;
  attributes?: string;
}

const categories = ['Visi', ...CATEGORY_NAMES];

function FilterSection({
  isOpen, onToggle, label, badge, children,
}: {
  isOpen: boolean;
  onToggle: () => void;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  const sectionId = `filter-section-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-slate-800 hover:text-[#E64415] transition-colors"
      >
        <span className="flex items-center gap-2">
          {label}
          {badge ? (
            <span className="w-4 h-4 rounded-full bg-[#E64415] text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {badge}
            </span>
          ) : null}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={sectionId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Search() {
  const { t, lang } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [openExpandId, setOpenExpandId] = useState<number | null>(null);

  // Initialize attribute filters from URL
  const initialAttributes: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith('attr_')) {
      initialAttributes[key.replace('attr_', '')] = value;
    }
  });

  // Filter states
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'Visi');
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>(initialAttributes);
  const [showFilters, setShowFilters] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ search: true, category: true, price: false, attributes: true });
  const toggleSection = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  // Sync local state with URL params when they change externally (e.g., back navigation, links)
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || 'Visi');
    setSubcategory(searchParams.get('subcategory') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setLocation(searchParams.get('location') || '');
    setSort(searchParams.get('sort') || 'newest');
    
    const newAttributes: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('attr_')) {
        newAttributes[key.replace('attr_', '')] = value;
      }
    });
    setAttributeFilters(newAttributes);
  }, [searchParams]);

  // Reset attributes when category changes
  useEffect(() => {
    if (category !== searchParams.get('category')) {
      setSubcategory('');
      setAttributeFilters({});
    }
  }, [category, searchParams]);

  // Reset attributes when subcategory changes
  useEffect(() => {
    if (subcategory !== searchParams.get('subcategory')) {
      setAttributeFilters({});
    }
  }, [subcategory, searchParams]);

  useEffect(() => {
    if (subcategory && CATEGORY_SCHEMAS[category]?.subcategories[subcategory]?.fields.length > 0) {
      setOpenSections(p => ({ ...p, attributes: true }));
    }
  }, [subcategory, category]);

  const fetchListings = async () => {
    setLoading(true);
    setAiSummary('');
    try {
      const q = searchParams.get('q');
      const url = q ? '/api/listings/search' : '/api/listings';
      const queryString = searchParams.toString();
      const finalUrl = queryString ? `${url}?${queryString}` : url;

      const token = localStorage.getItem('auth_token');
      const res = await fetch(finalUrl, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (q && data && typeof data === 'object' && 'listings' in data) {
        setListings(data.listings);
        setAiSummary(data.aiSummary || '');
      } else {
        setListings(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
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
      alert(t('nav.login'));
      return;
    }

    const isFavorite = favorites.has(listingId);
    const token = localStorage.getItem('auth_token');
    
    try {
      const res = await fetch(`/api/users/me/favorites/${listingId}`, {
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

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'Visi') params.set('category', category);
    if (subcategory) params.set('subcategory', subcategory);
    if (location) params.set('location', location);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sort !== 'newest') params.set('sort', sort);
    
    Object.entries(attributeFilters).forEach(([key, value]) => {
      if (value) params.set(`attr_${key}`, value);
    });
    
    setSearchParams(params);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('Visi');
    setSubcategory('');
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setAttributeFilters({});
    setSearchParams(new URLSearchParams());
  };

  const filteredListings = listings; // We now rely on server-side filtering

  const isEarlyAccess = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes <= 15;
  };

  const handleSaveSearch = async () => {
    if (!user) {
      alert('Lūdzu, ienāciet, lai saglabātu meklējumu.');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me/saved-searches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          category: category !== 'Visi' ? category : null,
          subcategory,
          min_price: minPrice ? parseFloat(minPrice) : null,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          attributes: Object.keys(attributeFilters).length > 0 ? attributeFilters : null
        })
      });

      if (!res.ok) throw new Error('Neizdevās saglabāt meklējumu');
      alert('Meklējums veiksmīgi saglabāts! Jūs saņemsiet paziņojumus par jauniem sludinājumiem.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeFilters = [
    category !== 'Visi' ? { key: 'category', label: category, onRemove: () => setCategory('Visi') } : null,
    subcategory ? { key: 'subcategory', label: subcategory, onRemove: () => setSubcategory('') } : null,
    minPrice ? { key: 'minPrice', label: `no €${minPrice}`, onRemove: () => setMinPrice('') } : null,
    maxPrice ? { key: 'maxPrice', label: `līdz €${maxPrice}`, onRemove: () => setMaxPrice('') } : null,
    location ? { key: 'location', label: location, onRemove: () => setLocation('') } : null,
    ...Object.entries(attributeFilters)
      .filter(([, v]) => v)
      .map(([k, v]) => ({ key: k, label: v, onRemove: () => setAttributeFilters(p => ({ ...p, [k]: '' })) })),
  ].filter((f): f is { key: string; label: string; onRemove: () => void } => f !== null);

  const totalActiveFilterCount = activeFilters.length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col md:flex-row">
      <Helmet>
        <title>{t('nav.discover')} | Sludinājumi</title>
        <meta name="description" content="Meklējiet un atrodiet labākos sludinājumus. Izmantojiet filtrus, lai atrastu tieši to, ko meklējat." />
      </Helmet>

      {/* Mobile filter toggle */}
      <div className="md:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-16 z-30 shadow-sm">
        <span className="font-medium text-slate-700">{filteredListings.length} sludinājumi</span>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('search.filters')}
        </Button>
      </div>

      {/* Sidebar Filters */}
      <div className={`
        fixed inset-0 z-[110] bg-white md:bg-transparent md:static md:w-72 flex-shrink-0 md:z-0
        transform transition-transform duration-300 ease-in-out
        ${showFilters ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full flex flex-col md:rounded-2xl md:border md:border-slate-200 md:shadow-sm md:bg-white md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] overflow-hidden">

          {/* Mobile header */}
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 md:hidden flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-900">Filtri</h2>
            <button
              type="button"
              aria-label="Aizvērt filtrus"
              onClick={() => setShowFilters(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable filter sections */}
          <div className="flex-1 overflow-y-auto">
            <form id="search-filter-form" onSubmit={handleSearch}>
              <div className="px-5 py-1">

                {/* Search + Location */}
                <FilterSection
                  isOpen={openSections.search}
                  onToggle={() => toggleSection('search')}
                  label="Meklēšana"
                  badge={(query || location) ? [query, location].filter(Boolean).length : undefined}
                >
                  <div className="space-y-2 mt-1">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('home.search.placeholder')}
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white h-9 text-sm"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Pilsēta vai novads..."
                        className="pl-9 bg-slate-50 border-slate-200 focus:bg-white h-9 text-sm"
                      />
                    </div>
                  </div>
                </FilterSection>

                {/* Category chips */}
                <FilterSection
                  isOpen={openSections.category}
                  onToggle={() => toggleSection('category')}
                  label={t('home.categories.title')}
                  badge={category !== 'Visi' ? 1 : undefined}
                >
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={category === cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          category === cat
                            ? 'bg-[#E64415] border-[#E64415] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-[#E64415] hover:text-[#E64415]'
                        }`}
                      >
                        {cat === 'Visi'
                          ? (lang === 'EN' ? 'All' : lang === 'RU' ? 'Все' : lang === 'LT' ? 'Visi' : lang === 'EE' ? 'Kõik' : 'Visi')
                          : cat}
                      </button>
                    ))}
                  </div>

                  {/* Subcategory — inline below chips */}
                  {category !== 'Visi' && CATEGORY_SCHEMAS[category]?.subcategories && Object.keys(CATEGORY_SCHEMAS[category].subcategories).length > 0 && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t('add.step2')}</label>
                      <Select value={subcategory || 'all'} onValueChange={(value) => setSubcategory(value === 'all' ? '' : value)}>
                        <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-9 text-sm">
                          <SelectValue placeholder="Visas">{subcategory || 'Visas'}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Visas</SelectItem>
                          {Object.keys(CATEGORY_SCHEMAS[category].subcategories).map(subcat => (
                            <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </FilterSection>

                {/* Price range */}
                <FilterSection
                  isOpen={openSections.price}
                  onToggle={() => toggleSection('price')}
                  label={`${t('listing.price')} (€)`}
                  badge={(minPrice || maxPrice) ? 1 : undefined}
                >
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder={t('search.minPrice')}
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="bg-slate-50 border-slate-200 h-9 text-sm"
                    />
                    <span className="text-slate-300 font-light flex-shrink-0">—</span>
                    <Input
                      type="number"
                      placeholder={t('search.maxPrice')}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="bg-slate-50 border-slate-200 h-9 text-sm"
                    />
                  </div>
                </FilterSection>

                {/* Dynamic attributes — shown only when subcategory with fields is selected */}
                {category !== 'Visi' && subcategory && CATEGORY_SCHEMAS[category]?.subcategories[subcategory]?.fields.length > 0 && (
                  <FilterSection
                    isOpen={openSections.attributes}
                    onToggle={() => toggleSection('attributes')}
                    label="Papildu filtri"
                    badge={Object.values(attributeFilters).filter(Boolean).length || undefined}
                  >
                    <div className="space-y-3 mt-1">
                      {CATEGORY_SCHEMAS[category].subcategories[subcategory].fields.map(field => (
                        <div key={field.name}>
                          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{field.label}</label>
                          {field.type === 'select' ? (
                            <Select
                              value={attributeFilters[field.name] || 'all'}
                              onValueChange={(value) => setAttributeFilters(prev => ({ ...prev, [field.name]: value === 'all' ? '' : value }))}
                            >
                              <SelectTrigger className="w-full bg-slate-50 border-slate-200 h-9 text-sm">
                                <SelectValue placeholder="Visi">{attributeFilters[field.name] || 'Visi'}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Visi</SelectItem>
                                {field.options?.map(opt => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={field.type === 'number' ? 'number' : 'text'}
                              placeholder={field.placeholder || 'Jebkāds'}
                              value={attributeFilters[field.name] || ''}
                              onChange={(e) => setAttributeFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                              className="bg-slate-50 border-slate-200 h-9 text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </FilterSection>
                )}

              </div>
            </form>
          </div>

          {/* Sticky apply button — always visible */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
            <Button
              type="submit"
              form="search-filter-form"
              className="w-full bg-[#E64415] hover:bg-[#CC3A10] border-0 text-white font-semibold"
              size="lg"
              onClick={() => setShowFilters(false)}
            >
              <SearchIcon className="w-4 h-4 mr-2" />
              Meklēt
            </Button>
            <button
              type="button"
              onClick={clearFilters}
              className="w-full mt-2 py-1.5 text-sm text-slate-400 hover:text-[#E64415] transition-colors"
            >
              Notīrīt filtrus
            </button>
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="mb-8 hidden md:flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {filteredListings.length} sludinājumi
            </h1>
            <p className="text-slate-500 mt-1">Pārlūkojiet un atrodiet labākos piedāvājumus.</p>
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <Button variant="outline" onClick={handleSaveSearch} className="mr-2">
                <Heart className="w-4 h-4 mr-2" />
                Saglabāt meklējumu
              </Button>
            )}
            <span className="text-sm text-slate-500">{t('search.sort')}:</span>
            <Select value={sort} onValueChange={(val) => { setSort(val); setTimeout(() => handleSearch(), 0); }}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder={t('search.newest')}>
                  {sort === 'newest' ? t('search.newest') : 
                   sort === 'price_asc' ? t('search.priceLow') : 
                   sort === 'price_desc' ? t('search.priceHigh') : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('search.newest')}</SelectItem>
                <SelectItem value="price_asc">{t('search.priceLow')}</SelectItem>
                <SelectItem value="price_desc">{t('search.priceHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map(f => (
              <FilterPill
                key={f.key}
                label={f.label}
                onRemove={() => { f.onRemove(); setTimeout(() => handleSearch(), 0); }}
              />
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-[#E64415] underline underline-offset-2 transition-colors"
            >
              Notīrīt visu
            </button>
          </div>
        )}

        {/* AI interpretation banner */}
        {aiSummary && !loading && (
          <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-sm">
            <Sparkles className="w-4 h-4 shrink-0 text-violet-500" />
            <span><strong>AI saprata:</strong> {aiSummary}</span>
          </div>
        )}

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
            <h3 className="text-lg font-medium text-slate-900 mb-2">{t('search.noResults')}</h3>
            <p className="text-slate-500">Mēģiniet mainīt meklēšanas kritērijus vai noņemt filtrus.</p>
            <Button 
              variant="link"
              onClick={clearFilters}
              className="mt-4"
            >
              {t('search.reset')}
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
                  <div className={`relative ${isAutoCategory(listing.category) ? 'aspect-[16/9]' : 'aspect-[4/3]'} overflow-hidden rounded-t-2xl bg-slate-100`}>
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
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {listing.is_highlighted ? (
                        <Badge variant="default" className="bg-amber-400 text-amber-950 hover:bg-amber-500 font-bold shadow-sm text-[10px]">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          TOP
                        </Badge>
                      ) : isEarlyAccess(listing.created_at) ? (
                        <Badge variant="default" className="bg-indigo-500 text-white hover:bg-indigo-600 font-bold shadow-sm text-[10px]">
                          <Clock className="w-3 h-3 mr-1" />
                          Agrā piekļuve
                        </Badge>
                      ) : null}
                      {listing.ai_trust_score !== undefined && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-none font-bold shadow-sm text-[10px]",
                            listing.ai_trust_score >= 80 ? "bg-emerald-500 text-white" :
                            listing.ai_trust_score >= 50 ? "bg-amber-500 text-white" :
                            "bg-red-500 text-white"
                          )}
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {listing.ai_trust_score}%
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="secondary"
                      size="icon"
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                    >
                      <Heart 
                        className={`w-4 h-4 ${favorites.has(listing.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} 
                      />
                    </Button>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {listing.title}
                    </h3>
                    <p className="text-xl font-extrabold text-primary-600 mb-1">
                      € {listing.price.toFixed(2)}
                    </p>
                    {isAutoCategory(listing.category) && (() => {
                      let attrs: Record<string, string> = {};
                      try { attrs = JSON.parse(listing.attributes || '{}'); } catch { return null; }
                      const parts: string[] = [];
                      if (attrs.year_month || attrs.year) parts.push(String(attrs.year_month || attrs.year));
                      if (attrs.mileage) parts.push(`${Number(attrs.mileage).toLocaleString()} km`);
                      if (attrs.fuel) parts.push(attrs.fuel);
                      if (attrs.transmission) parts.push(attrs.transmission);
                      if (parts.length === 0) return null;
                      return <p className="text-xs text-slate-500 mb-3 truncate">{parts.join(' • ')}</p>;
                    })()}
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatDate(listing.created_at)}
                      </div>
                      <div className="flex items-center font-medium truncate max-w-[100px]">
                        <MapPin className="w-3.5 h-3.5 mr-1" />
                        {listing.location || 'Latvija'}
                      </div>
                    </div>
                    {isAutoCategory(listing.category) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenExpandId(openExpandId === listing.id ? null : listing.id);
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#E64415] hover:text-[#c73a11] transition-colors py-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        {openExpandId === listing.id ? 'Aizvērt kopsavilkumu' : 'AI kopsavilkums'}
                      </button>
                    )}
                  </div>
                </Link>
                {isAutoCategory(listing.category) && (
                  <SmartExpandDrawer
                    listingId={listing.id}
                    isOpen={openExpandId === listing.id}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
