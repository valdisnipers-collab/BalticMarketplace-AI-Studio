import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { Search, Car, Home as HomeIcon, Smartphone, Briefcase, Sofa, MoreHorizontal, MapPin, Image as ImageIcon, Heart, Star, Sparkles, ShieldCheck, Lock, Headphones, ChevronRight, Shirt, Baby, Trophy, PawPrint, Bike, Zap, Tent, ArrowRight, Calendar, Fuel, Settings, Truck, Bus, Tractor, Ship, Anchor, Monitor, Laptop, Gamepad2, Flower2, Hammer, Wrench, Watch, Target, Bone, HardHat, Construction, Building2, Warehouse, Trees, Cpu, Gamepad, Dumbbell, FishSymbol, Waves, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/ui/section-header';
import { cn } from '@/lib/utils';

const mainCategories = [
  { id: 'auto', name: 'Transports', icon: Car, color: 'text-[#E64415]', subcategories: [
    { name: 'Vieglie auto', icon: Car },
    { name: 'Motocikli', icon: Bike },
    { name: 'Kravas auto', icon: Truck },
    { name: 'Piekabes', icon: Warehouse },
    { name: 'Autobusi', icon: Bus },
    { name: 'Lauksaimniecības tehnika', icon: Tractor },
    { name: 'Būvtehnika', icon: HardHat },
    { name: 'Ūdens transports', icon: Ship },
    { name: 'Detaļas un piederumi', icon: Settings }
  ]},
  { id: 'nekustamais-ipasums', name: 'Īpašumi', icon: HomeIcon, color: 'text-[#E64415]', subcategories: [
    { name: 'Dzīvokļi', icon: Building2 },
    { name: 'Mājas', icon: HomeIcon },
    { name: 'Zeme', icon: MapPin },
    { name: 'Telpu īre', icon: Briefcase },
    { name: 'Garāžas', icon: Lock },
    { name: 'Mežs', icon: Trees }
  ]},
  { id: 'elektronika', name: 'Elektronika', icon: Smartphone, color: 'text-[#E64415]', subcategories: [
    { name: 'Telefoni', icon: Smartphone },
    { name: 'Datori', icon: Laptop },
    { name: 'Audio/Video', icon: Headphones },
    { name: 'Sadzīves tehnika', icon: Zap },
    { name: 'Spēļu konsoles', icon: Gamepad2 }
  ]},
  { id: 'darbs', name: 'Darbs', icon: Briefcase, color: 'text-[#E64415]', subcategories: [
    { name: 'Vakances', icon: Briefcase },
    { name: 'Kursi un apmācība', icon: Star },
    { name: 'Juridiskie pakalpojumi', icon: ShieldCheck },
    { name: 'Saimnieciskie darbi', icon: Hammer }
  ]},
  { id: 'majai', name: 'Mājai', icon: Sofa, color: 'text-[#E64415]', subcategories: [
    { name: 'Mēbeles', icon: Sofa },
    { name: 'Interjers', icon: Sparkles },
    { name: 'Dārzam', icon: Flower2 },
    { name: 'Remontam', icon: Wrench }
  ]},
  { id: 'mode', name: 'Mode', icon: Shirt, color: 'text-[#E64415]', subcategories: [
    { name: 'Sievietēm', icon: Shirt },
    { name: 'Vīriešiem', icon: Shirt },
    { name: 'Aksesuāri', icon: Watch },
    { name: 'Rotaslietas', icon: Sparkles }
  ]},
  { id: 'berniem', name: 'Bērniem', icon: Baby, color: 'text-[#E64415]', subcategories: [
    { name: 'Rotaļlietas', icon: Gamepad },
    { name: 'Apģērbi', icon: Shirt },
    { name: 'Ratiņi', icon: Baby },
    { name: 'Mēbeles', icon: Sofa }
  ]},
  { id: 'sports', name: 'Sports', icon: Trophy, color: 'text-[#E64415]', subcategories: [
    { name: 'Velo', icon: Bike },
    { name: 'Trenažieri', icon: Dumbbell },
    { name: 'Zveja', icon: FishSymbol },
    { name: 'Medības', icon: Target }
  ]},
  { id: 'dzivnieki', name: 'Dzīvnieki', icon: PawPrint, color: 'text-[#E64415]', subcategories: [
    { name: 'Suņi', icon: PawPrint },
    { name: 'Kaķi', icon: PawPrint },
    { name: 'Barība', icon: Bone },
    { name: 'Piederumi', icon: Settings }
  ]},
];

interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  author_name: string;
  location: string;
  is_highlighted?: number;
  is_verified_seller?: boolean;
  attributes?: Record<string, any>;
}

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('auto');
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  
  const activeCategory = mainCategories.find(c => c.id === activeCategoryId) || mainCategories[0];

  const updateFilter = (key: string, value: string) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setSearchFilters({});
    setSearchQuery('');
    setLocationQuery('');
  };

  useEffect(() => {
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch listings", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('auth_token');
      fetch('/api/users/me/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then((data: Listing[]) => {
        setFavorites(new Set(data.map(item => item.id)));
      })
      .catch(err => console.error("Failed to fetch favorites", err));
    } else {
      setFavorites(new Set());
    }
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, listingId: number) => {
    e.preventDefault();
    if (!user) {
      alert(t('nav.login'));
      return;
    }

    const token = localStorage.getItem('auth_token');
    const isFavorite = favorites.has(listingId);

    try {
      if (isFavorite) {
        await fetch(`/api/favorites/${listingId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await fetch(`/api/favorites/${listingId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = new Set(prev);
          next.add(listingId);
          return next;
        });
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (locationQuery.trim()) params.set('location', locationQuery.trim());
    
    // Add category-specific filters
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    
    params.set('category', activeCategory.name);
    
    navigate(`/search?${params.toString()}`);
  };

  const renderCategoryFilters = () => {
    switch (activeCategoryId) {
      case 'auto':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Marka</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                    value={searchFilters.make || ''}
                    onChange={(e) => updateFilter('make', e.target.value)}
                  >
                    <option value="">Jebkura</option>
                    <option value="BMW">BMW</option>
                    <option value="Audi">Audi</option>
                    <option value="VW">VW</option>
                    <option value="Mercedes">Mercedes</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Modelis</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                    value={searchFilters.model || ''}
                    onChange={(e) => updateFilter('model', e.target.value)}
                  >
                    <option value="">Jebkurš</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Gads no</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                    value={searchFilters.year_from || ''}
                    onChange={(e) => updateFilter('year_from', e.target.value)}
                  >
                    <option value="">Jebkurš</option>
                    {[...Array(30)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Nobraukums līdz</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                    value={searchFilters.mileage_to || ''}
                    onChange={(e) => updateFilter('mileage_to', e.target.value)}
                  >
                    <option value="">Jebkurš</option>
                    <option value="50000">50,000 km</option>
                    <option value="100000">100,000 km</option>
                    <option value="150000">150,000 km</option>
                    <option value="200000">200,000 km</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Maksājuma veids</label>
                <div className="flex bg-slate-50 border-2 border-slate-100 rounded-xl p-1 h-12">
                  <button 
                    onClick={() => updateFilter('payment', 'buy')}
                    className={cn(
                      "flex-1 rounded-lg text-xs font-bold transition-all",
                      (searchFilters.payment === 'buy' || !searchFilters.payment) ? "bg-white shadow-sm text-[#E64415]" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Pirkt
                  </button>
                  <button 
                    onClick={() => updateFilter('payment', 'leasing')}
                    className={cn(
                      "flex-1 rounded-lg text-xs font-bold transition-all",
                      searchFilters.payment === 'leasing' ? "bg-white shadow-sm text-[#E64415]" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Līzings
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Cena līdz</label>
                <div className="relative">
                  <select 
                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                    value={searchFilters.price_to || ''}
                    onChange={(e) => updateFilter('price_to', e.target.value)}
                  >
                    <option value="">Jebkura</option>
                    <option value="5000">5,000 €</option>
                    <option value="10000">10,000 €</option>
                    <option value="20000">20,000 €</option>
                    <option value="50000">50,000 €</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Pilsēta vai pasta indekss</label>
                <div className="relative">
                  <Input 
                    type="text"
                    placeholder="Piem. Rīga"
                    className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 pr-10 text-sm font-semibold focus-visible:ring-0 focus:border-[#E64415]"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                  />
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        );
      case 'nekustamais-ipasums':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Tips</label>
              <div className="relative">
                <select 
                  className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                  value={searchFilters.type || ''}
                  onChange={(e) => updateFilter('type', e.target.value)}
                >
                  <option value="">Visi</option>
                  <option value="Dzīvoklis">Dzīvoklis</option>
                  <option value="Māja">Māja</option>
                  <option value="Zeme">Zeme</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Istabas</label>
              <div className="relative">
                <select 
                  className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold appearance-none focus:border-[#E64415] outline-none transition-colors"
                  value={searchFilters.rooms || ''}
                  onChange={(e) => updateFilter('rooms', e.target.value)}
                >
                  <option value="">Jebkurš</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4+">4+</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Platība no (m²)</label>
              <Input 
                type="number"
                placeholder="Piem. 50"
                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus-visible:ring-0 focus:border-[#E64415]"
                value={searchFilters.area_from || ''}
                onChange={(e) => updateFilter('area_from', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Cena līdz (€)</label>
              <Input 
                type="number"
                placeholder="Piem. 100000"
                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus-visible:ring-0 focus:border-[#E64415]"
                value={searchFilters.price_to || ''}
                onChange={(e) => updateFilter('price_to', e.target.value)}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Atslēgvārdi</label>
              <Input 
                type="text"
                placeholder="Ko jūs meklējat?"
                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus-visible:ring-0 focus:border-[#E64415]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Cena līdz</label>
              <Input 
                type="number"
                placeholder="€"
                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus-visible:ring-0 focus:border-[#E64415]"
                value={searchFilters.price_to || ''}
                onChange={(e) => updateFilter('price_to', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Atrašanās vieta</label>
              <Input 
                type="text"
                placeholder="Pilsēta vai rajons"
                className="h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus-visible:ring-0 focus:border-[#E64415]"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
          </div>
        );
    }
  };

  const renderListingCard = (listing: Listing) => {
    const isFavorite = favorites.has(listing.id);

    return (
      <motion.div
        key={listing.id}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group bg-white rounded-2xl overflow-hidden transition-all duration-300 flex flex-col"
      >
        <Link to={`/listing/${listing.id}`} className="block flex-grow">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            {listing.image_url ? (
              <img 
                src={listing.image_url} 
                alt={listing.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                <ImageIcon className="w-10 h-10 opacity-20" />
              </div>
            )}
            
            <Button 
              onClick={(e) => toggleFavorite(e, listing.id)}
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all"
            >
              <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-[#E64415] text-[#E64415]' : 'text-slate-400'}`} />
            </Button>
          </div>
          
          <div className="py-4 flex flex-col h-full">
            <h3 className="text-slate-900 font-bold text-lg mb-1">
              {listing.title}
            </h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-slate-900 font-black text-xl">
                {listing.price.toLocaleString()} €
              </span>
              <span className="text-slate-500 text-xs font-medium">mtl. incl. VAT.</span>
            </div>
            <p className="text-slate-500 text-xs mb-3">36 months, 5.000 km per year</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="bg-orange-100 text-[#E64415] border-none font-bold text-[10px] px-2 py-0.5 uppercase">
                DEAL
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-700">09/2025</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <Fuel className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-700">Petrol</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-700">96 kW (131 hp)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold text-slate-700">Automatic</span>
              </div>
            </div>

            <div className="flex items-center text-slate-400 text-[11px] font-medium">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{listing.location || 'Rīga, Latvija'}</span>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="pb-20 bg-background selection:bg-primary/20 selection:text-primary">
      <Helmet>
        <title>Sākums | Sludinājumi</title>
        <meta name="description" content="Atrodiet labākos piedāvājumus Baltijā. Premium sludinājumi, pārbaudīti pārdevēji, droši darījumi." />
      </Helmet>
      {/* Hero & Search Section */}
      <section className="bg-slate-50 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
              {t('home.hero.title_mobile')}
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              {t('home.hero.subtitle')}
            </p>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[480px]">
            {/* Sidebar Categories */}
            <div className="w-full md:w-24 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center justify-start py-6 px-2 gap-3 overflow-x-auto md:overflow-x-visible scrollbar-hide">
              {mainCategories.map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    resetFilters();
                  }}
                  className={cn(
                    "p-4 rounded-2xl transition-all group shrink-0 relative",
                    activeCategoryId === cat.id ? "bg-white shadow-md" : "hover:bg-white/50"
                  )}
                  title={cat.name}
                >
                  <cat.icon className={cn(
                    "w-8 h-8 transition-all",
                    activeCategoryId === cat.id ? "text-[#E64415] scale-110" : "text-slate-400 opacity-70 group-hover:opacity-100"
                  )} />
                  {activeCategoryId === cat.id && (
                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#E64415] rounded-r-full" />
                  )}
                </button>
              ))}
              <button className="p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all group shrink-0">
                <MoreHorizontal className="w-8 h-8 text-slate-400" />
              </button>
            </div>

            {/* Main Search Area */}
            <div className="flex-grow p-8 md:p-12 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <activeCategory.icon className="w-6 h-6 text-[#E64415]" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeCategory.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('home.hero.ai_search')}</span>
                  <Badge className="bg-[#E64415] text-white hover:bg-[#E64415] border-none font-bold text-[10px] px-2 py-0.5 italic">POWERED</Badge>
                </div>
              </div>

              {/* AI Search Bar - Core Engine */}
              <div className="mb-10">
                <form 
                  onSubmit={handleSearch}
                  className="relative flex items-center bg-slate-50 rounded-2xl border-2 border-slate-100 p-2 focus-within:border-[#E64415] focus-within:bg-white transition-all shadow-sm"
                >
                  <div className="flex-grow flex items-center px-4">
                    <Sparkles className="w-6 h-6 text-[#E64415] mr-3 shrink-0 animate-pulse" />
                    <Input 
                      type="text"
                      placeholder="Piem. 'Meklēju ģimenes auto ar zemu patēriņu un lielu bagāžnieku'..."
                      className="w-full border-0 focus-visible:ring-0 shadow-none px-0 text-lg h-14 bg-transparent font-semibold text-slate-900 placeholder:text-slate-400 italic"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
              </div>

              {/* Category Filters */}
              <div className="flex-grow">
                {renderCategoryFilters()}
                
                {activeCategoryId === 'auto' && (
                  <div className="mt-6 flex items-center gap-2">
                    <input type="checkbox" id="electric" className="w-4 h-4 accent-[#E64415]" />
                    <label htmlFor="electric" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      Tikai elektroauto <Zap className="w-4 h-4 text-[#E64415]" />
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={resetFilters}
                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Notīrīt filtrus
                  </button>
                  <button className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                    Vairāk filtru
                  </button>
                </div>
                
                <Button 
                  onClick={handleSearch}
                  className="bg-[#E64415] hover:bg-[#d13d13] text-white font-black text-lg px-10 py-7 rounded-2xl shadow-lg shadow-orange-200 flex items-center gap-3 w-full sm:w-auto"
                >
                  <Search className="w-6 h-6" />
                  ATRAST PIEDĀVĀJUMUS
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-20">
        {/* Premium Listings */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Top</h2>
              <Badge className="bg-orange-100 text-[#E64415] hover:bg-orange-100 border-none font-black text-lg px-3 py-1 rounded-full italic">DEALS</Badge>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">for you</h2>
            </div>
            <Button variant="link" onClick={() => navigate('/search')} className="text-[#E64415] font-bold text-lg">
              Show all
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-[4/3] rounded-xl" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/3 mt-auto" />
                </div>
              ))
            ) : (
              listings.slice(0, 4).map(renderListingCard)
            )}
          </div>
        </section>

        {/* Latest Listings */}
        <section>
          <SectionHeader 
            title={t('home.latest.title')}
            description=""
            className="mb-8"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-[4/3] rounded-xl" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/3 mt-auto" />
                </div>
              ))
            ) : (
              listings.filter(l => !l.is_highlighted).slice(0, 8).map(renderListingCard)
            )}
          </div>
          
          <div className="mt-12 text-center">
            <Button size="lg" onClick={() => navigate('/search')} className="rounded-full px-8">
              {t('home.viewAll')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* Latest Listings */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Jaunākie sludinājumi</h2>
            <Button variant="link" onClick={() => navigate('/search')} className="text-slate-500 font-bold text-lg">
              Skatīt visus
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <Skeleton className="aspect-[4/3] rounded-xl" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/3 mt-auto" />
                </div>
              ))
            ) : (
              listings.slice(4, 12).map(renderListingCard)
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 pt-20 pb-10 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-[#E64415] rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white font-black text-xl italic">b</span>
                </div>
                <span className="text-xl font-black tracking-tighter text-[#2D1152] uppercase">balticmarket</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                The premier digital destination for high-end commerce in the Baltic region. Built for trust, designed for elegance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-6 uppercase tracking-wider text-xs">{t('home.categories.title')}</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/search?category=Transports" className="hover:text-primary transition-colors">{t('nav.auto')}</Link></li>
                <li><Link to="/search?category=Nekustamais īpašums" className="hover:text-primary transition-colors">{t('nav.realEstate')}</Link></li>
                <li><Link to="/search?category=Elektronika" className="hover:text-primary transition-colors">Elektronika</Link></li>
                <li><Link to="/search?category=Darbs un pakalpojumi" className="hover:text-primary transition-colors">Darbs un pakalpojumi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-6 uppercase tracking-wider text-xs">Company</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">Our Story</Link></li>
                <li><Link to="/rules" className="hover:text-primary transition-colors">Guidelines</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-6 uppercase tracking-wider text-xs">Support</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
                <li><Link to="/safety" className="hover:text-primary transition-colors">Safety Tips</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-xs font-medium">
              © 2026 BALTICMARKET. ESTABLISHED IN RIGA.
            </p>
            <div className="flex gap-6">
              <span className="text-muted-foreground text-xs font-medium cursor-pointer hover:text-primary transition-colors">Instagram</span>
              <span className="text-muted-foreground text-xs font-medium cursor-pointer hover:text-primary transition-colors">LinkedIn</span>
              <span className="text-muted-foreground text-xs font-medium cursor-pointer hover:text-primary transition-colors">Twitter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
