import React, { useState, useEffect, useRef } from 'react';
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
import { CarMakeDropdown, CarModelDropdown } from '../components/CarDropdown';
import DiscoveryFeed from '../components/DiscoveryFeed';

const mainCategories = [
  { id: 'nekustamais-ipasums', name: 'Īpašumi', icon: HomeIcon, color: 'text-[#E64415]', subcategories: [
    { name: 'Dzīvokļi', icon: Building2 },
    { name: 'Mājas', icon: HomeIcon },
    { name: 'Zeme', icon: MapPin },
    { name: 'Telpu īre', icon: Briefcase },
    { name: 'Garāžas', icon: Lock },
    { name: 'Mežs', icon: Trees }
  ]},
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
  listing_type?: 'sale' | 'auction' | 'giveaway' | 'exchange';
  exchange_for?: string;
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
  const [activeCategoryId, setActiveCategoryId] = useState(''); // Empty means universal search is active

  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [showHeroText, setShowHeroText] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(1); // Visual center (Transports)

  // Duplicate items for the endless scrolling effect without needing fake padding
  // To keep exactly 7 visible, we'll repeat the array to ensure there's always items above and below
  const extendedCategories = [...mainCategories, ...mainCategories, ...mainCategories];
  const itemSize = window.innerWidth < 768 ? 96 : 80;
  
  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isMobile = window.innerWidth < 768;
    const scrollPos = isMobile ? el.scrollLeft : el.scrollTop;
    
    // Calculate index based on actual scrolled items
    const rawIdx = Math.round(scrollPos / itemSize);
    
    // Map raw scroll index back to the real category index (modulo)
    const realIdx = rawIdx % mainCategories.length;

    if (rawIdx !== scrollIndex) {
      setScrollIndex(rawIdx);
      
      // Auto-activate category purely based on center (only if not universal search)
      if (activeCategoryId !== '') {
        const newCat = mainCategories[realIdx];
        if (newCat && newCat.id !== activeCategoryId) {
          setActiveCategoryId(newCat.id);
          setActiveSubcategoryName('');
          updateFilter('subcategory', '');
        }
      }
    }

    // Infinite wrap logic (reset scroll seamlessly when reaching ends of the extended list)
    const exactCenterStart = mainCategories.length * itemSize;
    if (scrollPos < itemSize) {
      // Scrolled too far up/left
      if (isMobile) {
        el.scrollLeft = scrollPos + exactCenterStart;
      } else {
        el.scrollTop = scrollPos + exactCenterStart;
      }
    } else if (scrollPos > exactCenterStart * 2) {
      // Scrolled too far down/right
      if (isMobile) {
        el.scrollLeft = scrollPos - exactCenterStart;
      } else {
        el.scrollTop = scrollPos - exactCenterStart;
      }
    }
  };

  // Modern wheel interceptor: strict 1-item movement per wheel tick
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isScrolling = false;
    let wheelTimeout: NodeJS.Timeout;

    const handleWheel = (e: WheelEvent) => {
      // Determine if this is a large, discrete mouse wheel tick
      // Trackpads send tiny deltaY values (<20 usually) and often deltaMode === 0.
      // Physical mouse wheels send deltaMode=1 (lines) or deltaY=100+ (pixels).
      const isDiscreteWheel = Math.abs(e.deltaY) >= 30 || e.deltaMode > 0;

      if (isDiscreteWheel) {
        e.preventDefault(); // Stop native scrolling bypassing multiple items

        if (isScrolling) return;
        isScrolling = true;

        const isMobile = window.innerWidth < 768;
        const itemSize = isMobile ? 96 : 80;
        const currentScroll = isMobile ? el.scrollLeft : el.scrollTop;
        
        // Exact closest snapped idx
        const currentIdx = Math.round(currentScroll / itemSize);
        const direction = Math.sign(e.deltaY);
        
        // Move exactly 1 index
        const targetScroll = (currentIdx + direction) * itemSize;

        el.scrollTo({
          [isMobile ? 'left' : 'top']: targetScroll,
          behavior: 'smooth'
        });

        // Release lock
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          isScrolling = false;
        }, 300); // 300ms matches smooth scrolling duration well
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, []);

  // Initial scroll positioning - center on Transports (idx 1) in the middle block
  useEffect(() => {
    if (scrollRef.current) {
      const isMobile = window.innerWidth < 768;
      // Start at the middle block (mainCategories.length items down) + Transports (index 1)
      const initialScrollTarget = (mainCategories.length + 1) * itemSize;
      
      if (isMobile) {
        scrollRef.current.scrollTo({ left: initialScrollTarget, behavior: 'instant' });
      } else {
        scrollRef.current.scrollTo({ top: initialScrollTarget, behavior: 'instant' });
      }
      setScrollIndex(mainCategories.length + 1);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeroText(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
  
  const activeCategory = mainCategories.find(c => c.id === activeCategoryId) || mainCategories[0];
  const subcategories = activeCategory.subcategories || [];
  
  const [activeSubcategoryName, setActiveSubcategoryName] = useState('');

  useEffect(() => {
    setActiveSubcategoryName('');
    updateFilter('subcategory', '');
  }, [activeCategoryId]);

  const placeholderExamples: Record<string, string[]> = {
    'universal': [
      "Meklēju ekonomisku pilsētas auto līdz 10 000 €",
      "Pārdod 3-istabu dzīvokli Rīgas centrā",
      "Meklēju portatīvo datoru videospēlēm",
      "Vēlos attālinātu darbu mārketingā",
      "Pērku stūra dīvānu pelēkā krāsā"
    ],
    'auto': [
      "Piem. 'Meklēju ekonomisku pilsētas auto sievietei līdz 10 000 €'...",
      "Piem. 'Vēlos iegādāties lietotu krosa motociklu'...",
      "Piem. 'Pārdodu labi koptu Volvo XC60 apvidus auto'...",
      "Piem. 'Nepieciešama piekabe laivas pārvadāšanai'...",
      "Piem. 'Iegādāšos traktoru lauksaimniecības darbiem'..."
    ],
    'nekustamais-ipasums': [
      "Piem. 'Meklēju saulainu 3-istabu dzīvokli jaunajā projektā Teikā'...",
      "Piem. 'Vēlos īrēt nelielu biroja telpu centrā'...",
      "Piem. 'Pērku lauksaimniecības zemi Zemgalē'...",
      "Piem. 'Meklēju vasarnīcu pie jūras Saulkrastos'...",
      "Piem. 'Izīrēju izremontētu 1-istabas dzīvokli studentam'..."
    ],
    'elektronika': [
      "Piem. 'Meklēju jaudīgu klēpjdatoru video montāžai un spēlēm'...",
      "Piem. 'Pārdodu lietotu iPhone 13 Pro labā stāvoklī'...",
      "Piem. 'Vēlos iegādāties skaņu izolējošas bezvadu austiņas'...",
      "Piem. 'Meklēju spoguļkameru iesācējam ar objektīviem'...",
      "Piem. 'Pērku PlayStation 5 konsoli ar spēlēm'..."
    ],
    'darbs': [
      "Piem. 'Meklēju attālinātu darbu mārketingā ar elastīgu grafiku'...",
      "Piem. 'Piedāvāju darbu pieredzējušam celtniekam'...",
      "Piem. 'Vēlos strādāt par kurjeru nedēļas nogalēs'...",
      "Piem. 'Meklēju auklītes darbu Rīgas centrā'...",
      "Piem. 'Uzņēmums meklē PHP programmētāju pilnas slodzes darbam'..."
    ],
    'majai': [
      "Piem. 'Meklēju stūra dīvānu pelēkā krāsā mazai viesistabai'...",
      "Piem. 'Pārdodu ozolkoka pusdienu galdu ar 6 krēsliem'...",
      "Piem. 'Vēlos iegādāties lietotu, bet labu veļas mašīnu'...",
      "Piem. 'Meklēju dārza mēbeļu komplektu terasei'...",
      "Piem. 'Pērku lielu drēbju skapi ar bīdāmām durvīm'..."
    ],
    'mode': [
      "Piem. 'Meklēju elegantu vakarkleitu vasaras kāzām, izmērs M'...",
      "Piem. 'Pārdodu vīriešu ziemas mēteli tumši zilā krāsā'...",
      "Piem. 'Vēlos nopirkt oriģinālus sporta apavus izmērs 43'...",
      "Piem. 'Meklēju ādas pleca somu ikdienai'...",
      "Piem. 'Pērku zelta gredzenu ar iestrādātu akmentiņu'..."
    ],
    'berniem': [
      "Piem. 'Meklēju drošu autokrēsliņu zīdainim līdz 13 kg'...",
      "Piem. 'Pārdodu ratiņus 3 in 1 labā stāvoklī'...",
      "Piem. 'Vēlos iegādāties koka attīstošās rotaļlietas'...",
      "Piem. 'Meklēju ziemas kombinezonu zēnam, izmērs 98'...",
      "Piem. 'Pērku Lego komplektus no Star Wars sērijas'..."
    ],
    'sports': [
      "Piem. 'Meklēju kalnu velosipēdu ar alumīnija rāmi un disku bremzēm'...",
      "Piem. 'Pārdodu mazlietotas slēpes ar zābakiem'...",
      "Piem. 'Vēlos nopirkt telti 4 personām kempingam'...",
      "Piem. 'Meklēju hanteles treniņiem mājās, 2x10kg'...",
      "Piem. 'Pērku akustisko ģitāru iesācējam'..."
    ],
    'dzivnieki': [
      "Piem. 'Meklēju draudzīgu Labradora kucēnu no sertificētas audzētavas'...",
      "Piem. 'Pārdodu lielu būri papagailim'...",
      "Piem. 'Vēlos iegādāties akvāriju ar aprīkojumu, 100 litri'...",
      "Piem. 'Meklēju kaķu nagu asināmo torni'...",
      "Piem. 'Dāvinu jauktas šķirnes kaķēnus labās rokās'..."
    ]
  };

  const useTypewriter = (categoryId: string) => {
    const [displayText, setDisplayText] = useState('');
    const [exampleIndex, setExampleIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    // Get the right array, fallback to universal if empty string or not found
    const key = categoryId === '' ? 'universal' : (placeholderExamples[categoryId] ? categoryId : 'universal');
    const examples = placeholderExamples[key];

    // Reset when category changes
    useEffect(() => {
      setDisplayText('');
      setExampleIndex(0);
      setIsDeleting(false);
    }, [categoryId]);

    useEffect(() => {
      if (!examples || examples.length === 0) return;

      const currentText = examples[exampleIndex % examples.length];
      let timeoutId: NodeJS.Timeout;

      if (!isDeleting) {
        // Typing phase
        if (displayText !== currentText) {
          const nextChar = currentText.substring(0, displayText.length + 1);
          // Human-like typing delay: base 40ms + random up to 60ms
          const typingDelay = Math.random() * 60 + 40;
          timeoutId = setTimeout(() => {
            setDisplayText(nextChar);
          }, typingDelay);
        } else {
          // Pause when word is complete
          timeoutId = setTimeout(() => {
            setIsDeleting(true);
          }, 2000);
        }
      } else {
        // Deleting phase
        if (displayText === '') {
          setIsDeleting(false);
          setExampleIndex(prev => prev + 1);
        } else {
          const nextChar = currentText.substring(0, displayText.length - 1);
          // Fast deleting: ~15ms per character
          const deleteDelay = 15;
          timeoutId = setTimeout(() => {
            setDisplayText(nextChar);
          }, deleteDelay);
        }
      }

      return () => clearTimeout(timeoutId);
    }, [displayText, isDeleting, exampleIndex, examples]);

    return displayText;
  };

  const currentPlaceholder = useTypewriter(activeCategoryId);

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
        await fetch(`/api/users/me/favorites/${listingId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await fetch(`/api/users/me/favorites/${listingId}`, {
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
                {listing.listing_type === 'giveaway' ? 'BEZ MAKSAS' : 
                 listing.listing_type === 'exchange' ? 'MAIŅA' : 
                 `${listing.price.toLocaleString()} €`}
              </span>
              {listing.listing_type !== 'giveaway' && listing.listing_type !== 'exchange' && (
                <span className="text-slate-500 text-xs font-medium">mtl. incl. VAT.</span>
              )}
            </div>
            {listing.listing_type === 'exchange' && listing.exchange_for && (
              <p className="text-indigo-600 text-[10px] font-bold uppercase truncate mb-3">Pret: {listing.exchange_for}</p>
            )}
            {listing.listing_type !== 'exchange' && (
              <p className="text-slate-500 text-xs mb-3">36 months, 5.000 km per year</p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {listing.listing_type === 'giveaway' ? (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-600 border-none font-bold text-[10px] px-2 py-0.5 uppercase">
                  ATDOD
                </Badge>
              ) : listing.listing_type === 'exchange' ? (
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-600 border-none font-bold text-[10px] px-2 py-0.5 uppercase">
                  MAIŅA
                </Badge>
              ) : listing.listing_type === 'auction' ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-600 border-none font-bold text-[10px] px-2 py-0.5 uppercase">
                  IZSOLE
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-orange-100 text-[#E64415] border-none font-bold text-[10px] px-2 py-0.5 uppercase">
                  DEAL
                </Badge>
              )}
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
      <section className="bg-slate-50 pt-16 pb-12 md:pt-24 md:pb-20 overflow-hidden relative">
        {/* Subtle background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-24 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative">
          <motion.div 
            className="text-center mb-16"
            initial={{ height: 'auto', opacity: 1, marginBottom: '4rem' }}
            animate={{ 
              height: showHeroText ? 'auto' : 0, 
              opacity: showHeroText ? 1 : 0,
              marginBottom: showHeroText ? '4rem' : 0,
              overflow: 'hidden'
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
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

          <motion.div 
            layout
            className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 overflow-hidden flex flex-col md:flex-row h-auto md:h-[560px]"
          >
            {/* Left Sidebar - Main Categories (Carousel) */}
            <div 
              ref={scrollRef}
              onScroll={handleSidebarScroll}
              className="w-full md:w-28 bg-[#f8fafc] border-b md:border-b-0 md:border-r border-slate-200 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto scrollbar-hide shrink-0 snap-x snap-mandatory md:snap-y relative"
              style={{ overflowBehavior: 'contain' } as any}
            >
              <div className="hidden md:block shrink-0 h-[240px] w-full"></div>
              <div className="block md:hidden shrink-0 w-[calc(50vw-48px)] h-full"></div>

              {extendedCategories.map((cat, rawIndex) => {
                const distance = Math.abs(rawIndex - scrollIndex);
                
                // Opacity fading for 7 visible items (center + 3 above + 3 below)
                const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : distance === 2 ? 0.3 : distance === 3 ? 0.1 : 0;
                const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : distance === 2 ? 0.8 : 0.7;

                // For universal search mode, the central item (distance === 0) looks active, 
                // but we check activeCategoryId for actual category specific states.
                const isCenterVisuallyActive = distance === 0 && !activeCategoryId;
                const isCategoryActive = activeCategoryId === cat.id && distance === 0;
                const isVisuallyBold = isCenterVisuallyActive || isCategoryActive;

                return (
                  <button
                    key={`${cat.id}-${rawIndex}`}
                    onClick={() => {
                      setActiveCategoryId(cat.id);
                      setActiveSubcategoryName('');
                      updateFilter('subcategory', '');
                      
                      if (scrollRef.current) {
                        const isMobile = window.innerWidth < 768;
                        const size = isMobile ? 96 : 80;
                        if (isMobile) {
                          scrollRef.current.scrollTo({ left: rawIndex * size, behavior: 'smooth' });
                        } else {
                          scrollRef.current.scrollTo({ top: rawIndex * size, behavior: 'smooth' });
                        }
                      }
                    }}
                    className={cn(
                      "relative flex flex-col items-center justify-center shrink-0 transition-all duration-300 snap-center snap-always w-24 h-24 md:w-full md:h-20",
                      isCategoryActive ? "bg-white border-y border-slate-200 shadow-sm z-10" : ""
                    )}
                    style={{ opacity, transform: `scale(${scale})` }}
                    title={cat.name}
                  >
                    {isCategoryActive && (
                      <div className="absolute bottom-0 md:bottom-auto md:left-0 md:top-0 w-full md:w-1 h-1 md:h-full bg-[#E64415]" />
                    )}
                    <cat.icon className={cn(
                      "w-6 h-6 mb-1 transition-colors",
                      isVisuallyBold ? "text-[#E64415]" : "text-slate-500"
                    )} />
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-tight text-center leading-tight px-1",
                      isVisuallyBold ? "text-[#E64415]" : "text-slate-500"
                    )}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}

              <div className="hidden md:block shrink-0 h-[240px] w-full"></div>
              <div className="block md:hidden shrink-0 w-[calc(50vw-48px)] h-full"></div>
            </div>

            {/* Right Area - Dynamic Content */}
            <div className="flex-grow flex flex-col bg-white overflow-y-auto w-full">
              {!activeCategoryId ? (
                // State 0: No main category selected -> Show Universal Search
                <div className="p-6 md:p-12 flex flex-col items-center justify-center h-full min-h-[500px]">
                  <div className="max-w-2xl w-full text-center mb-10 -mt-8">
                    <h2 className="text-3xl md:text-[2.75rem] font-black tracking-tight mb-4 text-slate-800 leading-tight">
                      Meklē gudrāk. Atrodi ātrāk.
                    </h2>
                    <p className="text-slate-500 text-lg">
                      Vienkārši ieraksti, ko meklē, un mēs parādīsim atbilstošākos piedāvājumus visās kategorijās.
                    </p>
                  </div>
                  
                  <div className="w-full max-w-3xl flex flex-col items-center">
                    <form 
                      onSubmit={handleSearch}
                      className="w-full relative flex items-center bg-white rounded-full border-2 border-slate-100 p-2 focus-within:border-[#E64415] focus-within:shadow-[0_8px_30px_rgb(230,68,21,0.1)] transition-all shadow-md"
                    >
                      <div className="bg-[#E64415] w-12 h-12 rounded-full flex items-center justify-center shrink-0 ml-1">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-grow flex items-center px-4">
                        <Input 
                          type="text"
                          placeholder={currentPlaceholder}
                          className="w-full border-0 focus-visible:ring-0 shadow-none px-0 text-base md:text-lg h-12 md:h-14 bg-transparent font-medium text-slate-700 placeholder:text-slate-400 italic"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="submit"
                        className="bg-[#E64415] hover:bg-[#d13d13] text-white rounded-full px-6 md:px-8 h-12 font-bold text-sm md:text-base transition-transform hover:scale-105 shrink-0 mr-1"
                      >
                        Atrast piedāvājumus
                      </Button>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-4 w-full max-w-lg px-4 hidden sm:flex">
                      <div className="h-[2px] bg-slate-100 flex-grow"></div>
                      <div className="text-slate-500 font-semibold text-sm tracking-wide">
                        Auto <span className="text-slate-300 mx-1">•</span> Īpašumi <span className="text-slate-300 mx-1">•</span> Elektronika <span className="text-slate-300 mx-1">•</span> Darbs <span className="text-slate-300 mx-1">•</span> Mājai
                      </div>
                      <div className="h-[2px] bg-slate-100 flex-grow"></div>
                    </div>
                  </div>
                </div>
              ) : !activeSubcategoryName ? (
                // State 1: Main category selected, no subcategory -> Show AI Search + Subcategory Grid
                <div className="p-6 md:p-8 flex flex-col h-full">
                  {/* AI Search Bar - Category Specific */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        {activeCategory.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('home.hero.ai_search')}</span>
                        <Badge className="bg-[#E64415] text-white hover:bg-[#E64415] border-none font-bold text-[9px] px-2 py-0.5 italic">POWERED</Badge>
                      </div>
                    </div>
                    <form 
                      onSubmit={handleSearch}
                      className="relative flex items-center bg-slate-50 rounded-2xl border-2 border-slate-100 p-1.5 focus-within:border-[#E64415] focus-within:bg-white transition-all shadow-sm"
                    >
                      <div className="flex-grow flex items-center px-4">
                        <Sparkles className="w-5 h-5 text-[#E64415] mr-3 shrink-0 animate-pulse" />
                        <Input 
                          type="text"
                          placeholder={currentPlaceholder}
                          className="w-full border-0 focus-visible:ring-0 shadow-none px-0 text-sm md:text-base h-10 md:h-12 bg-transparent font-semibold text-slate-900 placeholder:text-slate-400 italic"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </form>
                  </div>

                  {/* Subcategories Grid */}
                  {subcategories.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-1">
                      {subcategories.map((subcat) => (
                        <button
                          key={subcat.name}
                          onClick={() => {
                            setActiveSubcategoryName(subcat.name);
                            updateFilter('subcategory', subcat.name);
                          }}
                          className="flex flex-col items-center justify-center p-4 transition-all text-center gap-2.5 border border-slate-100 rounded-2xl hover:border-[#E64415] hover:bg-orange-50/30 group bg-white shadow-sm hover:shadow-md h-[90px] md:h-[100px]"
                        >
                          <subcat.icon className="w-7 h-7 md:w-8 md:h-8 text-[#E64415] group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-700 leading-tight">
                            {subcat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // State 2: Subcategory selected -> Show Specific Filters
                <div className="p-6 md:p-8 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setActiveSubcategoryName('');
                          updateFilter('subcategory', '');
                        }}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
                      >
                        <ChevronDown className="w-6 h-6 text-slate-500 rotate-90" />
                      </button>
                      <div className="flex items-center gap-4">
                        {(() => {
                          const subcat = subcategories.find(s => s.name === activeSubcategoryName);
                          const Icon = subcat?.icon || activeCategory.icon;
                          return (
                            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100">
                              <Icon className="w-8 h-8 text-[#E64415]" />
                            </div>
                          );
                        })()}
                        <div>
                          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{activeSubcategoryName}</h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Filters - Compact */}
                  <motion.div 
                    key={activeSubcategoryName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-grow"
                  >
                    {renderCategoryFilters()}
                    
                    {activeCategoryId === 'auto' && (
                      <div className="mt-6 flex items-center gap-2">
                        <input type="checkbox" id="electric" className="w-4 h-4 accent-[#E64415] rounded" />
                        <label htmlFor="electric" className="text-sm font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                          Tikai elektroauto <Zap className="w-4 h-4 text-[#E64415]" />
                        </label>
                      </div>
                    )}
                  </motion.div>

                  {/* Action Buttons - Compact */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={resetFilters}
                        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Notīrīt
                      </button>
                      <button className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                        Vairāk filtru
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
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <DiscoveryFeed />

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
