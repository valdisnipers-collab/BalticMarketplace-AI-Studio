import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Search, Car, Home as HomeIcon, Smartphone, Briefcase, Sofa, MoreHorizontal, MapPin, Image as ImageIcon, Heart, Star, Sparkles, ShieldCheck, Lock, Headphones, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHeader } from '@/components/ui/section-header';

const categories = [
  { id: 'auto', name: 'Transports', icon: Car, color: 'bg-indigo-500', subcategories: ['Vieglie auto', 'Motocikli'] },
  { id: 'nekustamais-ipasums', name: 'Īpašumi', icon: HomeIcon, color: 'bg-emerald-500', subcategories: ['Dzīvokļi', 'Mājas'] },
  { id: 'elektronika', name: 'Elektronika', icon: Smartphone, color: 'bg-purple-500', subcategories: ['Telefoni', 'Datori'] },
  { id: 'darbs', name: 'Darbs', icon: Briefcase, color: 'bg-amber-500', subcategories: ['Vakances', 'Pakalpojumi'] },
  { id: 'majai', name: 'Mājai', icon: Sofa, color: 'bg-rose-500', subcategories: ['Mēbeles', 'Dārzam'] },
  { id: 'cits', name: 'Cits', icon: MoreHorizontal, color: 'bg-slate-500', subcategories: ['Sports', 'Hobiji'] },
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
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      alert('Lūdzu, ienāc sistēmā, lai pievienotu favorītiem!');
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
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
        className="group bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
      >
        <Link to={`/listing/${listing.id}`} className="block flex-grow">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {listing.image_url ? (
              <img 
                src={listing.image_url} 
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-10 h-10 opacity-20" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {listing.is_highlighted ? (
                <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white shadow-md border-none">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  IETEIKTS
                </Badge>
              ) : null}
            </div>

            <button 
              onClick={(e) => toggleFavorite(e, listing.id)}
              className="absolute top-3 right-3 p-2 bg-background/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-background transition-all group/fav"
            >
              <Heart className={`w-4 h-4 transition-colors ${isFavorite ? 'fill-destructive text-destructive' : 'text-muted-foreground group-hover/fav:text-destructive'}`} />
            </button>
          </div>
          
          <div className="p-4 flex flex-col h-full">
            <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1.5">
              {listing.category}
            </div>
            <h3 className="text-foreground font-semibold text-base line-clamp-2 mb-3 leading-snug">
              {listing.title}
            </h3>
            <div className="mt-auto flex items-end justify-between">
              <span className="text-foreground font-bold text-lg">
                €{listing.price.toLocaleString()}
              </span>
              <div className="flex items-center text-muted-foreground text-xs font-medium">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate max-w-[100px]">{listing.location || 'Latvija'}</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="pb-20 bg-background selection:bg-primary/20 selection:text-primary">
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/20 to-slate-950/80" />
        </div>
        
        <div className="relative z-10 max-w-5xl w-full px-6 text-center mt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold uppercase tracking-wider mb-8 shadow-2xl">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-400" />
              The Future of Baltic Commerce
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
              Curating the <br />
              <span className="text-primary-400">Baltic Marketplace</span>.
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 mb-10 font-medium max-w-2xl mx-auto leading-relaxed">
              Atrodiet labākos piedāvājumus Baltijā. <br className="hidden md:block" />
              Premium sludinājumi, pārbaudīti pārdevēji, droši darījumi.
            </p>
            
            <div className="relative max-w-2xl mx-auto">
              <form 
                onSubmit={handleSearch}
                className="relative flex items-center bg-background rounded-2xl shadow-2xl overflow-hidden p-1.5 border border-border/50"
              >
                <div className="flex-grow flex items-center px-4">
                  <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
                  <Input 
                    type="text"
                    placeholder="Meklēt sludinājumus..."
                    className="w-full border-0 focus-visible:ring-0 shadow-none px-0 text-base h-12 bg-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" size="lg" className="rounded-xl px-8 h-12 text-base font-semibold shrink-0">
                  Meklēt
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Strip */}
      <div className="relative -mt-12 z-20 max-w-6xl mx-auto px-6">
        <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border/50 p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="flex items-center space-x-4 md:px-4 pt-4 md:pt-0 first:pt-0">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Pārbaudīti pārdevēji</div>
                <div className="text-sm text-muted-foreground mt-0.5">Droši darījumi ar verificētiem lietotājiem.</div>
              </div>
            </div>
            <div className="flex items-center space-x-4 md:px-4 pt-4 md:pt-0">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Droši maksājumi</div>
                <div className="text-sm text-muted-foreground mt-0.5">Jūsu dati un nauda ir drošībā.</div>
              </div>
            </div>
            <div className="flex items-center space-x-4 md:px-4 pt-4 md:pt-0">
              <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Atbalsts 24/7</div>
                <div className="text-sm text-muted-foreground mt-0.5">Mēs esam šeit, lai palīdzētu jebkurā laikā.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24 space-y-24">
        {/* Categories Rail */}
        <section>
          <SectionHeader 
            title="Pārlūkot kategorijas" 
            description="Atrodiet tieši to, ko meklējat mūsu populārākajās kategorijās."
            action={
              <Button variant="ghost" onClick={() => navigate('/search')} className="group">
                Skatīt visas <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            }
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link 
                key={cat.id}
                to={`/search?category=${cat.name}`}
                className="group bg-card rounded-xl p-6 border border-border/50 hover:border-primary/30 hover:shadow-md transition-all text-center flex flex-col items-center justify-center"
              >
                <div className={`w-14 h-14 ${cat.color} bg-opacity-10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <cat.icon className={`w-7 h-7 ${cat.color.replace('bg-', 'text-')}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        {/* Premium Listings */}
        <section>
          <SectionHeader 
            title="Īpaši atlasīti" 
            description="Mūsu ekspertu izvēlētie labākie piedāvājumi šodien."
            className="mb-8"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              listings.filter(l => l.is_highlighted).slice(0, 4).map(renderListingCard)
            )}
          </div>
        </section>

        {/* Latest Listings */}
        <section>
          <SectionHeader 
            title="Jaunumi" 
            description="Nupat pievienotie sludinājumi no visas Baltijas."
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
              Skatīt visus sludinājumus
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-muted/30 pt-20 pb-10 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-primary-foreground font-bold text-xl">B</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground uppercase">BALTIC<span className="text-primary">MODERN</span></span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                The premier digital destination for high-end commerce in the Baltic region. Built for trust, designed for elegance.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-6 uppercase tracking-wider text-xs">Marketplace</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><Link to="/search?category=Transports" className="hover:text-primary transition-colors">Transports</Link></li>
                <li><Link to="/search?category=Nekustamais īpašums" className="hover:text-primary transition-colors">Real Estate</Link></li>
                <li><Link to="/search?category=Elektronika" className="hover:text-primary transition-colors">Electronics</Link></li>
                <li><Link to="/search?category=Darbs un pakalpojumi" className="hover:text-primary transition-colors">Services</Link></li>
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
              © 2026 BALTIC MODERN. ESTABLISHED IN RIGA.
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
