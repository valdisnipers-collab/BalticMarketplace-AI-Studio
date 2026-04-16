import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { Search, Car, CarFront, Home as HomeIcon, Smartphone, Briefcase, Sofa, MoreHorizontal, MapPin, Image as ImageIcon, Heart, Star, Sparkles, ShieldCheck, Lock, Headphones, ChevronRight, Shirt, Baby, Trophy, PawPrint, Bike, Zap, Tent, ArrowRight, Calendar, Fuel, Settings, Truck, Bus, Tractor, Ship, Anchor, Monitor, Laptop, Gamepad2, Flower2, Hammer, Wrench, Watch, Target, Bone, HardHat, Construction, Building2, Warehouse, Trees, Cpu, Gamepad, Dumbbell, FishSymbol, Waves, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/ui/section-header';
import { CarMakeDropdown, CarModelDropdown } from '../components/CarDropdown';
import { cn } from '@/lib/utils';

const mainCategories = [
  { id: 'nekustamais-ipasums', name: 'Īpašumi', icon: HomeIcon, color: 'text-[#E64415]', subcategories: [
    { name: 'Dzīvokļi', icon: Building2 },
    { name: 'Mājas', icon: HomeIcon },
    { name: 'Zeme', icon: MapPin },
    { name: 'Telpu īre', icon: Briefcase },
    { name: 'Garāžas', icon: Lock },
    { name: 'Mežs', icon: Trees }
  ]},
  { id: 'auto', name: 'Transports', icon: CarFront, color: 'text-[#E64415]', subcategories: [
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
  ai_trust_score?: number;
  ai_moderation_status?: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const tripledCategories = [...mainCategories, ...mainCategories, ...mainCategories];

  useEffect(() => {
    // Initial scroll to the middle "Transports"
    const initScroll = () => {
      if (scrollRef.current) {
        const itemHeight = 80; // h-20 = 80px
        const container = scrollRef.current;
        const currentContainerHeight = container.clientHeight;
        setContainerHeight(currentContainerHeight);
        
        // If container height is 0, just use a default or skip
        if (currentContainerHeight === 0) {
          return;
        }

        const centerOffset = currentContainerHeight / 2;
        const transportsIndex = mainCategories.findIndex(c => c.id === 'auto');
        // Target the "Transports" in the middle set
        const targetIndex = mainCategories.length + transportsIndex;
        const targetScroll = (targetIndex * itemHeight) + (itemHeight / 2) - centerOffset;
        
        container.scrollTop = targetScroll;
        
        // Update state immediately
        setScrollPos(targetScroll);
        setActiveCategoryId('auto');
      }
    };

    // Small delay to ensure layout is ready
    const timer = setTimeout(initScroll, 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSidebarScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const itemHeight = 80;
    const scrollTop = container.scrollTop;
    const currentContainerHeight = container.clientHeight;
    
    if (currentContainerHeight !== containerHeight) {
      setContainerHeight(currentContainerHeight);
    }

    // Update scroll position for animations
    setScrollPos(scrollTop);

    // Calculate which item is at the center
    const center = scrollTop + (currentContainerHeight / 2);
    const index = Math.round((center - (itemHeight / 2)) / itemHeight);
    
    // Ensure index is within bounds of tripledCategories
    if (index >= 0 && index < tripledCategories.length) {
      const newActiveId = tripledCategories[index].id;
      if (newActiveId !== activeCategoryId) {
        setActiveCategoryId(newActiveId);
      }
    }

    // Handle Infinite Loop - Keep scroll in the middle section
    const totalHeight = mainCategories.length * itemHeight;
    // Jump when we leave the middle set (mainCategories.length to 2*mainCategories.length)
    if (scrollTop < totalHeight) {
      container.scrollTop = scrollTop + totalHeight;
      setScrollPos(container.scrollTop);
    } else if (scrollTop >= totalHeight * 2) {
      container.scrollTop = scrollTop - totalHeight;
      setScrollPos(container.scrollTop);
    }
  };

  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  const activeCategory = mainCategories.find(c => c.id === activeCategoryId) || mainCategories[0];

  const AI_PLACEHOLDERS: Record<string, string[]> = {
    'auto': [
      "Meklēju ekonomisku pilsētas auto sievietei līdz 10 000 €...",
      "Meklēju jaudīgu SUV ģimenei ar zemu nobraukumu...",
      "Meklēju elektroauto ar vismaz 300 km gājienu...",
      "Meklēju sportisku kupeja automašīnu līdz 20 000 €...",
    ],
    'nekustamais-ipasums': [
      "Meklēju saulainu 3-istabu dzīvokli jaunajā projektā Teikā...",
      "Meklēju māju ar dārzu Pierīgā līdz 150 000 €...",
      "Meklēju 1-istabu dzīvokli īrei studentam līdz 400 € mēnesī...",
      "Meklēju biroja telpas Rīgas centrā līdz 100 m²...",
    ],
    'elektronika': [
      "Meklēju jaudīgu klēpjdatoru video montāžai un spēlēm...",
      "Meklēju lētu Android telefonu ar labu kameru līdz 200 €...",
      "Meklēju 4K televizoru līdz 55 collām par pieņemamu cenu...",
      "Meklēju bezvadu austiņas ar trokšņu slāpēšanu...",
    ],
    'darbs': [
      "Meklēju attālinātu darbu mārketingā ar elastīgu grafiku...",
      "Meklēju grāmatveža darbu uz nepilnu slodzi Rīgā...",
      "Meklēju IT programmētāja vakanci ar konkurētspējīgu algu...",
      "Meklēju vasaras darbu studentam noliktavā vai restorānā...",
    ],
    'majai': [
      "Meklēju stūra dīvānu pelēkā krāsā mazai viesistabai...",
      "Meklēju virtuves komplektu 3 metru garumā baltā krāsā...",
      "Meklēju gultu 160×200 cm ar matraci līdz 500 €...",
      "Meklēju retro stila galda lampu dzīvojamai istabai...",
    ],
    'mode': [
      "Meklēju elegantu vakarkleitu vasaras kāzām, izmērs M...",
      "Meklēju ādas jaku vīriešiem izmērs XL līdz 100 €...",
      "Meklēju Levi's džinsus taisnā griezumā izmērs 32/32...",
      "Meklēju bērnu ziemas apģērbu komplektu izmērs 110...",
    ],
    'berniem': [
      "Meklēju drošu autokrēsliņu zīdainim līdz 13 kg...",
      "Meklēju bērnu velosipēdu 5–7 gadus vecam bērnam...",
      "Meklēju saliekamos ratiņus kompaktus ceļošanai...",
      "Meklēju LEGO komplektu bērnam dzimšanas dienā līdz 50 €...",
    ],
    'sports': [
      "Meklēju kalnu velosipēdu ar alumīnija rāmi un disku bremzēm...",
      "Meklēju skrejceļu ar motoru mājas trenažieru zālei...",
      "Meklēju kajaku divietu ūdens tūrismam par saprātīgu cenu...",
      "Meklēju svarcelt spēka sporta komplektu mājām...",
    ],
    'dzivnieki': [
      "Meklēju draudzīgu Labradora kucēnu no sertificētas audzētavas...",
      "Meklēju mājas kaķi šķirnes British Shorthair...",
      "Meklēju akvāriju ar aprīkojumu sākumam zivtiņkopībā...",
      "Meklēju trusi vai jūrascūciņu bērniem kā pirmo mājdzīvnieku...",
    ],
  };

  const [typedPlaceholder, setTypedPlaceholder] = useState('');

  useEffect(() => {
    const examples = AI_PLACEHOLDERS[activeCategoryId] ?? ["Ko jūs meklējat? Aprakstiet savu vēlmi šeit..."];
    let exampleIndex = 0;
    let charIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    setTypedPlaceholder('');

    function typeChar() {
      const current = examples[exampleIndex];
      if (charIndex <= current.length) {
        setTypedPlaceholder(current.slice(0, charIndex));
        charIndex++;
        timeoutId = setTimeout(typeChar, 50);
      } else {
        // Pauze pirms dzēšanas
        timeoutId = setTimeout(eraseChar, 2000);
      }
    }

    function eraseChar() {
      const current = examples[exampleIndex];
      if (charIndex > 0) {
        charIndex--;
        setTypedPlaceholder(current.slice(0, charIndex));
        timeoutId = setTimeout(eraseChar, 28);
      } else {
        // Pauze pirms nākamā teksta
        exampleIndex = (exampleIndex + 1) % examples.length;
        timeoutId = setTimeout(typeChar, 400);
      }
    }

    timeoutId = setTimeout(typeChar, 300);
    return () => clearTimeout(timeoutId);
  }, [activeCategoryId]);

  const updateFilter = (key: string, value: string) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setSearchFilters({});
    setSearchQuery('');
    setLocationQuery('');
  };

  useEffect(() => {
    setLoading(true);
    const endpoint = feedType === 'following' && user ? '/api/users/me/following/listings' : '/api/listings';
    const headers: Record<string, string> = {};
    if (feedType === 'following' && user) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;
    }

    fetch(endpoint, { headers })
      .then(res => res.json())
      .then(data => {
        setListings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch listings", err);
        setLoading(false);
      });
  }, [feedType, user]);

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
                <CarMakeDropdown
                  value={searchFilters.make || ''}
                  onChange={(make) => { updateFilter('make', make); updateFilter('model', ''); }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1">Modelis</label>
                <CarModelDropdown
                  make={searchFilters.make || ''}
                  value={searchFilters.model || ''}
                  onChange={(model) => updateFilter('model', model)}
                  disabled={!searchFilters.make}
                />
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
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-all z-20"
            >
              <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-[#E64415] text-[#E64415]' : 'text-slate-400'}`} />
            </Button>

            {listing.ai_trust_score !== undefined && (
              <div className={cn(
                "absolute top-3 left-3 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg z-10",
                listing.ai_trust_score >= 80 ? "bg-emerald-500 text-white" :
                listing.ai_trust_score >= 50 ? "bg-amber-500 text-white" :
                "bg-red-500 text-white"
              )}>
                <ShieldCheck className="w-3 h-3" />
                {listing.ai_trust_score}%
              </div>
            )}
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
      <section className="bg-slate-50 relative min-h-[calc(100vh-80px)] flex flex-col justify-center py-8">
        {/* Subtle background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        {/* Hero text — absolūts overlay virs meklēšanas bloka */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6 bg-slate-50"
          style={{ pointerEvents: heroVisible ? 'auto' : 'none' }}
          animate={heroVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ opacity: { duration: 0.5, ease: [0.32, 0.72, 0, 1] }, y: { duration: 0.6, ease: [0.32, 0.72, 0, 1] } }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E64415]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Jaunums: AI meklēšana ir klāt</span>
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
            Atrodi visu nepieciešamo.<br />
            <span className="bg-gradient-to-r from-[#E64415] to-[#FF8C00] bg-clip-text text-transparent">
              Baltijas lielākais
            </span> sludinājumu portāls.
          </h1>
          <p className="text-slate-500 font-medium text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            {t('home.hero.subtitle')}
          </p>
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[600px]">
            {/* Sidebar Categories - Infinite Circular Scroll */}
            <div 
              ref={scrollRef}
              onScroll={handleSidebarScroll}
              className="w-full md:w-32 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col items-center justify-start py-4 px-2 gap-0 overflow-x-auto md:overflow-y-auto scrollbar-hide snap-y snap-mandatory h-[400px] md:h-auto relative"
            >
              {tripledCategories.map((cat, idx) => {
                const itemHeight = 80;
                const itemCenter = (idx * itemHeight) + (itemHeight / 2);
                const containerCenter = scrollPos + (containerHeight / 2);
                const distanceFromCenter = Math.abs(itemCenter - containerCenter);
                
                // Calculate opacity based on distance from center
                // 1.0 for center, 0.6 for neighbors, 0.3 for next neighbors
                let opacity = 0.2;

                if (distanceFromCenter <= itemHeight * 0.5) {
                  opacity = 1;
                } else if (distanceFromCenter <= itemHeight * 1.5) {
                  opacity = 0.6;
                } else if (distanceFromCenter <= itemHeight * 2.5) {
                  opacity = 0.3;
                }

                const isActive = activeCategoryId === cat.id && distanceFromCenter <= itemHeight * 0.5;

                return (
                  <motion.button 
                    key={`${cat.id}-${idx}`} 
                    animate={{ opacity }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    onClick={() => {
                      if (scrollRef.current) {
                        const currentContainerHeight = scrollRef.current.clientHeight;
                        const targetScroll = (idx * itemHeight) - (currentContainerHeight / 2) + (itemHeight / 2);
                        scrollRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
                      }
                    }}
                    className={cn(
                      "px-2 py-2 rounded-2xl transition-all group shrink-0 relative flex flex-col items-center justify-center gap-0.5 w-full h-20 snap-center",
                      isActive ? "bg-white shadow-md z-10" : "z-0"
                    )}
                    title={cat.name}
                  >
                    <div className="flex-none w-8 h-8 flex items-center justify-center">
                      <cat.icon className={cn(
                        "w-full h-full transition-all",
                        isActive ? "text-[#E64415]" : "text-slate-400"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[8px] font-bold uppercase tracking-tight text-center leading-tight w-full px-0.5 line-clamp-2",
                      isActive ? "text-[#E64415]" : "text-slate-400"
                    )}>
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Main Search Area - Compact */}
            <div className="flex-grow p-6 md:p-10 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={activeCategoryId}
                    className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center"
                  >
                    <activeCategory.icon className="w-6 h-6 text-[#E64415]" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{activeCategory.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('home.hero.ai_search')}</span>
                  <Badge className="bg-[#E64415] text-white hover:bg-[#E64415] border-none font-bold text-[9px] px-2 py-0.5 italic">POWERED</Badge>
                </div>
              </div>

              {/* AI Search Bar - Core Engine */}
              <div className="mb-8">
                <form 
                  onSubmit={handleSearch}
                  className="relative flex items-center bg-slate-50 rounded-2xl border-2 border-slate-100 p-1.5 focus-within:border-[#E64415] focus-within:bg-white transition-all shadow-sm"
                >
                  <div className="flex-grow flex items-center px-4">
                    <Sparkles className="w-5 h-5 text-[#E64415] mr-3 shrink-0 animate-pulse" />
                    <Input 
                      type="text"
                      placeholder={typedPlaceholder}
                      className="w-full border-0 focus-visible:ring-0 shadow-none px-0 text-base h-12 bg-transparent font-semibold text-slate-900 placeholder:text-slate-400 italic"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
              </div>

              {/* Category Filters - Compact */}
              <motion.div 
                key={activeCategoryId}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-grow"
              >
                {renderCategoryFilters()}
                
                {activeCategoryId === 'auto' && (
                  <div className="mt-4 flex items-center gap-2">
                    <input type="checkbox" id="electric" className="w-4 h-4 accent-[#E64415] rounded" />
                    <label htmlFor="electric" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                      Tikai elektroauto <Zap className="w-3.5 h-3.5 text-[#E64415]" />
                    </label>
                  </div>
                )}
              </motion.div>

              {/* Action Buttons - Compact */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={resetFilters}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Notīrīt
                  </button>
                  <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    Vairāk
                  </button>
                </div>
                
                <Button 
                  onClick={handleSearch}
                  className="bg-[#E64415] hover:bg-[#d13d13] text-white font-black text-base px-8 py-6 rounded-2xl shadow-lg shadow-orange-200 flex items-center gap-2 w-full sm:w-auto transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Search className="w-5 h-5" />
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <SectionHeader 
              title={feedType === 'following' ? 'Sekoto pārdevēju sludinājumi' : t('home.latest.title')}
              description=""
              className="mb-0"
            />
            {user && (
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setFeedType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${feedType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Visi sludinājumi
                </button>
                <button
                  onClick={() => setFeedType('following')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${feedType === 'following' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sekotie
                </button>
              </div>
            )}
          </div>
          
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
