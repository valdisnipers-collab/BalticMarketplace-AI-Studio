import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  User, 
  Mail, 
  Image as ImageIcon, 
  Star, 
  BadgeCheck, 
  MessageCircle, 
  Gavel, 
  Car, 
  Settings, 
  Calendar, 
  Info, 
  ShieldCheck, 
  Flag,
  Share2,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Printer,
  Sparkles,
  Calculator,
  TrendingUp,
  History,
  CheckCircle2,
  Heart,
  ShieldAlert,
  Zap,
  ExternalLink,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ListingDetails {
  id: number;
  user_id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  author_name: string;
  author_email: string;
  author_is_verified?: number;
  author_user_type?: string;
  attributes?: string;
  is_highlighted?: number;
  location?: string;
}

interface Review {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Bid {
  id: number;
  bidder_name: string;
  amount: number;
  created_at: string;
}

export default function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Calculator states
  const [downPayment, setDownPayment] = useState(20);
  const [term, setTerm] = useState(60);
  const [interestRate, setInterestRate] = useState(4.5);

  useEffect(() => {
    const fetchListingAndReviews = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        if (!res.ok) throw new Error('Sludinājums nav atrasts');
        const data = await res.json();
        setListing(data);

        const reviewsRes = await fetch(`/api/users/${data.user_id}/reviews`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        }

        const parsedAttributes = data.attributes ? JSON.parse(data.attributes) : null;
        if (parsedAttributes?.saleType === 'auction') {
          const bidsRes = await fetch(`/api/listings/${id}/bids`);
          if (bidsRes.ok) {
            const bidsData = await bidsRes.json();
            setBids(bidsData);
          }
        }

        // Check if favorite
        if (user) {
          const token = localStorage.getItem('auth_token');
          const favsRes = await fetch('/api/users/me/favorites', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (favsRes.ok) {
            const favsData: ListingDetails[] = await favsRes.json();
            setIsFavorite(favsData.some(f => f.id === data.id));
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingAndReviews();
  }, [id, user]);

  const toggleFavorite = async () => {
    if (!user) {
      alert('Lūdzu, ienāc sistēmā, lai pievienotu favorītiem!');
      return;
    }

    const token = localStorage.getItem('auth_token');
    try {
      if (isFavorite) {
        await fetch(`/api/favorites/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsFavorite(false);
      } else {
        await fetch(`/api/favorites/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  const calculateMonthlyPayment = () => {
    if (!listing) return 0;
    const principal = listing.price * (1 - downPayment / 100);
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = term;
    const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return isNaN(payment) ? 0 : payment;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('lv-LV', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pb-32">
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-16">
              <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Skeleton className="h-6 w-24 rounded-lg" />
                  <Skeleton className="h-6 w-32 rounded-lg" />
                </div>
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-6 w-48" />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="space-y-10">
                <Skeleton className="h-64 w-full rounded-3xl" />
                <Skeleton className="h-48 w-full rounded-3xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">Sludinājums nav atrasts</h2>
        <p className="text-slate-500 mb-10 font-medium max-w-sm mx-auto">{error || "Pieprasītais sludinājums nevarēja tikt ielādēts."}</p>
        <Button size="lg" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atgriezties sākumā
        </Button>
      </div>
    );
  }

  const parsedAttributes = listing.attributes ? JSON.parse(listing.attributes) : null;
  const isAuction = parsedAttributes?.saleType === 'auction';
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="min-h-screen bg-white pb-32 selection:bg-primary-100 selection:text-primary-900">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/search" className="group flex items-center text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Atpakaļ uz meklēšanu
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleFavorite}
              className={isFavorite ? 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100 hover:text-red-600' : ''}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="hover:text-red-500 hover:border-red-200">
              <Flag className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Column: Media & Details */}
          <div className="lg:col-span-8 space-y-16">
            
            {/* Main Visual */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative group"
            >
              <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 shadow-xl">
                {listing.image_url ? (
                  <img 
                    src={listing.image_url} 
                    alt={listing.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-20 h-20 opacity-20 mb-4" />
                    <span className="font-bold uppercase tracking-wider text-xs">Attēls nav pieejams</span>
                  </div>
                )}
              </div>
              
              {listing.is_highlighted ? (
                <Badge className="absolute top-6 left-6 bg-amber-400 text-amber-950 hover:bg-amber-500 font-bold shadow-lg px-3 py-1.5 text-xs">
                  <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  IETEIKTS
                </Badge>
              ) : null}

              <div className="absolute bottom-6 right-6 flex gap-2">
                <Button variant="secondary" size="icon" className="shadow-lg bg-white/90 backdrop-blur-md hover:bg-white">
                  <LayoutGrid className="w-5 h-5 text-slate-700" />
                </Button>
              </div>
            </motion.div>

            {/* Title & Core Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold px-2.5 py-1">
                  {listing.category}
                </Badge>
                <span className="text-sm font-medium text-slate-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  Pievienots {formatDate(listing.created_at)}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                {listing.title}
              </h1>
              
              <div className="flex items-center text-slate-600 font-semibold">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                {listing.location || 'Rīga, Latvija'}
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-slate-100">
              {parsedAttributes && Object.entries(parsedAttributes).map(([key, value]) => {
                if (['features', 'saleType', 'subcategory'].includes(key) || !value) return null;
                return (
                  <div key={key} className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{key}</div>
                    <div className="text-lg font-bold text-slate-900">{value as string}</div>
                  </div>
                );
              })}
            </div>

            {/* Narrative Description */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                <Info className="w-6 h-6 mr-3 text-primary-600" />
                Apraksts
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                  {listing.description || "Pārdevējs nav pievienojis aprakstu šim sludinājumam."}
                </p>
              </div>
            </div>

            {/* Market Intelligence */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 blur-[80px] rounded-full -mr-32 -mt-32" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-8 flex items-center uppercase tracking-wide">
                  <TrendingUp className="w-6 h-6 mr-3 text-amber-400" />
                  Tirgus analīze
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Cenas novērtējums</div>
                    <div className="text-xl font-bold text-emerald-400">Laba cena</div>
                    <div className="text-[10px] text-white/60 mt-1.5 font-bold uppercase tracking-widest">5.2% zem vidējā</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Pieprasījums</div>
                    <div className="text-xl font-bold text-amber-400">Augsts</div>
                    <div className="text-[10px] text-white/60 mt-1.5 font-bold uppercase tracking-widest">18 aktīvas intereses</div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Likviditāte</div>
                    <div className="text-xl font-bold text-white">12-18 dienas</div>
                    <div className="text-[10px] text-white/60 mt-1.5 font-bold uppercase tracking-widest">Vēsturiskais vidējais</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Transaction Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-10">
              
              {/* Valuation & CTA */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
                <div className="mb-8">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cena</div>
                  <div className="text-5xl font-bold text-slate-900">
                    €{listing.price.toLocaleString()}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    size="lg" 
                    className="w-full text-sm"
                    onClick={() => navigate(`/chat?userId=${listing.user_id}&listingId=${listing.id}`)}
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Sazināties ar pārdevēju
                  </Button>
                  <Button variant="outline" size="lg" className="w-full text-sm border-2 border-primary-200 text-primary-700 hover:bg-primary-50">
                    <Zap className="w-5 h-5 mr-2 text-amber-500" />
                    Piedāvāt savu cenu
                  </Button>
                </div>
              </div>

              {/* Curator/Seller Profile */}
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden">
                    <User className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-lg">{listing.author_name}</h4>
                      {listing.author_is_verified ? <BadgeCheck className="w-5 h-5 text-blue-500" /> : null}
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current mr-1" />
                      {averageRating} Reitings
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-center text-xs font-bold text-slate-600">
                    <ShieldCheck className="w-4 h-4 mr-3 text-emerald-500" />
                    Identitāte verificēta
                  </div>
                  <div className="flex items-center text-xs font-bold text-slate-600">
                    <History className="w-4 h-4 mr-3 text-primary-400" />
                    Biedrs kopš 2023. gada
                  </div>
                </div>
                
                <Button variant="outline" className="w-full" onClick={() => navigate(`/profile/${listing.user_id}`)}>
                  Skatīt profilu
                </Button>
              </div>

              {/* Financial Architecture */}
              {(listing.category === 'Transports' || listing.category === 'Nekustamais īpašums') && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center uppercase tracking-wide">
                    <Calculator className="w-5 h-5 mr-3 text-primary-600" />
                    Kredīta kalkulators
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <span>Pirmā iemaksa</span>
                        <span className="text-primary-600">{downPayment}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="50" step="5"
                        value={downPayment}
                        onChange={(e) => setDownPayment(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <span>Termiņš (mēneši)</span>
                        <span className="text-primary-600">{term}</span>
                      </div>
                      <input 
                        type="range" 
                        min="12" max="120" step="12"
                        value={term}
                        onChange={(e) => setTerm(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Aptuvenais mēneša maksājums</div>
                      <div className="text-3xl font-bold text-primary-600">
                        €{calculateMonthlyPayment().toFixed(2)}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                        *Aprēķins ir informatīvs ({interestRate}% GPL)
                      </p>
                    </div>
                    
                    <Button className="w-full" size="lg">
                      Pieteikties līzingam
                    </Button>
                  </div>
                </div>
              )}

              {/* Safety Protocol */}
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex items-center space-x-3 mb-3">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-amber-900 text-sm uppercase tracking-wide">Drošības padomi</h4>
                </div>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  Nekad neveiciet priekšapmaksu pirms preces apskates. Izmantojiet drošus maksājumu veidus.
                </p>
                <Link to="/safety" className="inline-flex items-center mt-3 text-xs font-bold text-amber-600 uppercase tracking-wider hover:underline">
                  Lasīt vairāk <ExternalLink className="w-3 h-3 ml-1.5" />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
