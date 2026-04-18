import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
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
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import useEmblaCarousel from 'embla-carousel-react';
import { CATEGORY_SCHEMAS } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { parseImages } from '../lib/utils';

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
  status?: string;
  ai_trust_score?: number;
  ai_moderation_status?: string;
  ai_moderation_reason?: string;
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [sellerBadges, setSellerBadges] = useState<any[]>([]);
  const [sellerStore, setSellerStore] = useState<any>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Calculator states
  const [downPayment, setDownPayment] = useState(20);
  const [term, setTerm] = useState(60);
  const [interestRate, setInterestRate] = useState(4.5);
  const [bidAmount, setBidAmount] = useState('');
  const [isBidding, setIsBidding] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('omniva');
  const [shippingAddress, setShippingAddress] = useState('');
  const [omnivaLocations, setOmnivaLocations] = useState<any[]>([]);
  const [omnivaSearch, setOmnivaSearch] = useState('');
  const [selectedLocker, setSelectedLocker] = useState<any>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

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

        fetch(`/api/users/${data.user_id}/badges`)
          .then(r => r.json())
          .then(setSellerBadges)
          .catch(() => {});

        fetch(`/api/stores/by-user/${data.user_id}`)
          .then(r => r.ok ? r.json() : null)
          .then(setSellerStore)
          .catch(() => {});

        const parsedAttributes = data.attributes ? JSON.parse(data.attributes) : null;
        if (parsedAttributes?.saleType === 'auction') {
          const bidsRes = await fetch(`/api/listings/${id}/bids`);
          if (bidsRes.ok) {
            const bidsData = await bidsRes.json();
            setBids(bidsData);
          }
        }

        // Check if favorite and follow status
        if (user) {
          const token = localStorage.getItem('auth_token');
          const favsRes = await fetch('/api/users/me/favorites', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (favsRes.ok) {
            const favsData: ListingDetails[] = await favsRes.json();
            setIsFavorite(favsData.some(f => f.id === data.id));
          }

          const followRes = await fetch(`/api/users/${data.user_id}/follow-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (followRes.ok) {
            const followData = await followRes.json();
            setIsFollowing(followData.isFollowing);
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

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!listing) return;

    const token = localStorage.getItem('auth_token');
    try {
      if (isFollowing) {
        await fetch(`/api/users/${listing.user_id}/follow`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsFollowing(false);
      } else {
        await fetch(`/api/users/${listing.user_id}/follow`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow", error);
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

  const handleBid = async () => {
    if (!user) {
      alert('Lūdzu, ienāc sistēmā, lai solītu!');
      return;
    }
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Lūdzu ievadiet derīgu summu.');
      return;
    }
    
    const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.amount)) : (listing?.price || 0);
    if (amount <= highestBid) {
      alert(`Jūsu solījumam jābūt lielākam par pašreizējo augstāko solījumu (€${highestBid}).`);
      return;
    }

    setIsBidding(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/listings/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });
      
      if (res.ok) {
        const newBid = await res.json();
        setBids(prev => [...prev, newBid].sort((a, b) => b.amount - a.amount));
        setBidAmount('');
        alert('Solījums veiksmīgi pievienots!');
      } else {
        const data = await res.json();
        alert(data.error || 'Neizdevās pievienot solījumu.');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Notika kļūda, mēģiniet vēlreiz.');
    } finally {
      setIsBidding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!shippingAddress.trim()) {
      alert('Lūdzu ievadiet piegādes adresi');
      return;
    }

    setIsBuying(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/checkout/escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId: listing?.id,
          shippingMethod,
          shippingAddress
        })
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const err = await res.json();
        alert(err.error || 'Kļūda izveidojot pirkumu');
      }
    } catch (error) {
      console.error("Error buying", error);
      alert('Kļūda izveidojot pirkumu');
    } finally {
      setIsBuying(false);
    }
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
        <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('search.noResults')}</h2>
        <p className="text-slate-500 mb-10 font-medium max-w-sm mx-auto">{error || "Pieprasītais sludinājums nevarēja tikt ielādēts."}</p>
        <Button size="lg" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('add.back')}
        </Button>
      </div>
    );
  }

  const parsedAttributes = listing.attributes ? JSON.parse(listing.attributes) : null;
  const isAuction = parsedAttributes?.saleType === 'auction';
  const isAuctionEnded = isAuction && listing.status !== 'active';
  const imageUrls = parseImages(listing.image_url);
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="min-h-screen bg-slate-50 pb-32 selection:bg-primary-100 selection:text-primary-900">
      <Helmet>
        <title>{listing.title} | Sludinājumi</title>
        <meta name="description" content={listing.description ? listing.description.substring(0, 160) : `Pārdod ${listing.title} par €${listing.price}`} />
        <meta property="og:title" content={listing.title} />
        <meta property="og:description" content={listing.description ? listing.description.substring(0, 160) : `Pārdod ${listing.title} par €${listing.price}`} />
        {imageUrls.length > 0 && <meta property="og:image" content={imageUrls[0]} />}
      </Helmet>

      {/* Top Navigation Bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/search" className="group flex items-center text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('add.back')}
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
              <div className="aspect-[16/10] rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 shadow-xl relative">
                {imageUrls.length > 0 ? (
                  <>
                    <div className="overflow-hidden h-full" ref={emblaRef}>
                      <div className="flex h-full">
                        {imageUrls.map((url, index) => (
                          <div className="flex-[0_0_100%] min-w-0 h-full relative" key={index}>
                            <img 
                              src={url} 
                              alt={`${listing.title} - Attēls ${index + 1}`} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {imageUrls.length > 1 && (
                      <>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => emblaApi?.scrollPrev()}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => emblaApi?.scrollNext()}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {imageUrls.map((_, index) => (
                            <button
                              key={index}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === selectedIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                              }`}
                              onClick={() => emblaApi?.scrollTo(index)}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon className="w-20 h-20 opacity-20 mb-4" />
                    <span className="font-bold uppercase tracking-wider text-xs">Attēls nav pieejams</span>
                  </div>
                )}
              </div>

              {(listing as any).video_url && (
                <div className="mt-4 rounded-2xl overflow-hidden bg-black">
                  <video controls className="w-full max-h-80" preload="metadata">
                    <source src={(listing as any).video_url} type="video/mp4" />
                  </video>
                </div>
              )}

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
                {listing.ai_trust_score !== undefined && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "font-bold px-2.5 py-1 gap-1.5",
                      listing.ai_trust_score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      listing.ai_trust_score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    <ShieldCheck className={cn("w-3.5 h-3.5", listing.ai_trust_score < 50 && "text-red-500")} />
                    AI Drošība: {listing.ai_trust_score}%
                  </Badge>
                )}
                <span className="text-sm font-medium text-slate-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatDate(listing.created_at)}
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
                
                // Find the label for this attribute key
                let label = key;
                const categorySchema = CATEGORY_SCHEMAS[listing.category];
                if (categorySchema) {
                  const subcategorySchema = categorySchema.subcategories[parsedAttributes.subcategory || ''];
                  if (subcategorySchema) {
                    const field = subcategorySchema.fields.find(f => f.name === key);
                    if (field) {
                      label = field.label;
                    }
                  }
                }

                return (
                  <div key={key} className="space-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                    <div className="text-lg font-bold text-slate-900">{value as string}</div>
                  </div>
                );
              })}
            </div>

            {/* Narrative Description */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                <Info className="w-6 h-6 mr-3 text-primary-600" />
                {t('listing.description')}
              </h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                  {listing.description || "Pārdevējs nav pievienojis aprakstu šim sludinājumam."}
                </p>
              </div>
            </div>

            {/* AI Safety Analysis */}
            {listing.ai_moderation_status && (
              <div className={cn(
                "rounded-3xl p-8 border relative overflow-hidden",
                listing.ai_trust_score >= 80 ? "bg-emerald-50 border-emerald-100" :
                listing.ai_trust_score >= 50 ? "bg-amber-50 border-amber-100" :
                "bg-red-50 border-red-100"
              )}>
                <div className="relative z-10">
                  <h3 className={cn(
                    "text-xl font-bold mb-4 flex items-center uppercase tracking-wide",
                    listing.ai_trust_score >= 80 ? "text-emerald-900" :
                    listing.ai_trust_score >= 50 ? "text-amber-900" :
                    "text-red-900"
                  )}>
                    <ShieldCheck className="w-6 h-6 mr-3" />
                    AI Drošības Analīze
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                      <p className={cn(
                        "text-sm font-medium leading-relaxed",
                        listing.ai_trust_score >= 80 ? "text-emerald-700" :
                        listing.ai_trust_score >= 50 ? "text-amber-700" :
                        "text-red-700"
                      )}>
                        {listing.ai_moderation_reason || "Sludinājums ir veiksmīgi izgājis AI drošības pārbaudi un atbilst portāla noteikumiem."}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <Badge className={cn(
                          "border-none font-bold",
                          listing.ai_trust_score >= 80 ? "bg-emerald-500 text-white" :
                          listing.ai_trust_score >= 50 ? "bg-amber-500 text-white" :
                          "bg-red-500 text-white"
                        )}>
                          Uzticamība: {listing.ai_trust_score}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex justify-center md:justify-end">
                      <div className="relative w-24 h-24">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200 stroke-current"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={cn(
                              "stroke-current transition-all duration-1000",
                              listing.ai_trust_score >= 80 ? "text-emerald-500" :
                              listing.ai_trust_score >= 50 ? "text-amber-500" :
                              "text-red-500"
                            )}
                            strokeWidth="3"
                            strokeDasharray={`${listing.ai_trust_score}, 100`}
                            strokeLinecap="round"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <text x="18" y="20.35" className="font-bold text-[8px] text-center fill-current" textAnchor="middle">
                            {listing.ai_trust_score}%
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Market Intelligence */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 blur-[80px] rounded-full -mr-32 -mt-32" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-8 flex items-center uppercase tracking-wide">
                  <TrendingUp className="w-6 h-6 mr-3 text-amber-400" />
                  {t('listing.marketAnalysis')}
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

            {/* Reviews Section */}
            <div className="space-y-6 pt-8 border-t border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                <Star className="w-6 h-6 mr-3 text-amber-400 fill-current" />
                {t('listing.reviews')}
              </h2>

              {reviews.length === 0 ? (
                <p className="text-slate-500 italic">{t('listing.noReviews')}</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
                            {review.reviewer_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-bold text-slate-900">{review.reviewer_name || 'Lietotājs'}</span>
                        </div>
                        <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
                      </div>
                      <div className="flex items-center mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Transaction Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-10">
              
              {/* Valuation & CTA */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
                {isAuction ? (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('listing.currentBid')}</div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="w-3 h-3 mr-1" /> {t('listing.auction')}
                        </Badge>
                      </div>
                      <div className="text-5xl font-bold text-slate-900">
                        €{bids.length > 0 ? Math.max(...bids.map(b => b.amount)).toLocaleString() : listing.price.toLocaleString()}
                      </div>
                      <div className="text-sm text-slate-500 mt-2 font-medium">
                        {t('listing.startingPrice')}: €{listing.price.toLocaleString()} • {bids.length} {t('listing.bids')}
                      </div>
                    </div>

                    {isAuctionEnded ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center mb-6">
                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{t('listing.auctionEnded')}</h3>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">€</span>
                          <input 
                            type="number" 
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-primary-500 focus:ring-0 transition-colors font-bold text-lg"
                          />
                        </div>
                        <Button 
                          size="lg" 
                          className="w-full text-sm bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={handleBid}
                          disabled={isBidding}
                        >
                          {isBidding ? '...' : t('listing.placeBid')}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="lg" 
                          className="w-full text-sm"
                          onClick={() => navigate(`/chat?userId=${listing.user_id}&listingId=${listing.id}`)}
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          {t('listing.contactSeller')}
                        </Button>
                      </div>
                    )}

                    {bids.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Pēdējie solījumi</div>
                        <div className="space-y-3">
                          {bids.slice(0, 3).map((bid) => (
                            <div key={bid.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-slate-600">
                                <User className="w-4 h-4 mr-2 text-slate-400" />
                                {bid.bidder_name}
                              </div>
                              <div className="font-bold text-slate-900">€{bid.amount.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mb-8">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('listing.price')}</div>
                      <div className="text-5xl font-bold text-slate-900">
                        €{listing.price.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        size="lg" 
                        className="w-full text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200"
                        onClick={() => setShowCheckoutModal(true)}
                      >
                        <ShieldCheck className="w-5 h-5 mr-2" />
                        Pirkt droši
                      </Button>
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => navigate(`/chat?userId=${listing.user_id}&listingId=${listing.id}`)}
                      >
                        <MessageCircle className="w-5 h-5 mr-2" />
                        {t('listing.contactSeller')}
                      </Button>
                      <Button variant="outline" size="lg" className="w-full text-sm border-2 border-primary-200 text-primary-700 hover:bg-primary-50">
                        <Zap className="w-5 h-5 mr-2 text-amber-500" />
                        {t('listing.makeOffer')}
                      </Button>
                    </div>
                  </>
                )}
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
                    {sellerBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sellerBadges.map(b => (
                          <span key={b.badge_id} title={b.description}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 cursor-default">
                            {b.icon} {b.label}
                          </span>
                        ))}
                      </div>
                    )}
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
                  <div className="pt-2 space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full border-primary-200 text-primary-700 hover:bg-primary-50 font-bold"
                      onClick={() => {
                        alert('Tālruņa numurs: +371 20000000 (Demo)');
                        // In a real app, this would fetch the phone number or reveal it if already fetched
                      }}
                    >
                      {t('listing.showPhone')}
                    </Button>
                    {user?.id !== listing.user_id && (
                      <Button 
                        variant={isFollowing ? "secondary" : "default"}
                        className="w-full font-bold"
                        onClick={handleFollow}
                      >
                        {isFollowing ? 'Sekojat' : 'Sekot pārdevējam'}
                      </Button>
                    )}
                  </div>
                </div>
                
                <Button variant="outline" className="w-full" onClick={() => navigate(`/profile/${listing.user_id}`)}>
                  Skatīt profilu
                </Button>
                {sellerStore && (
                  <Link to={`/store/${sellerStore.slug}`}
                    className="block text-center text-sm font-semibold text-[#E64415] hover:underline mt-2">
                    Skatīt veikalu →
                  </Link>
                )}
              </div>

              {/* Financial Architecture */}
              {(listing.category === 'Transports' || listing.category === 'Nekustamais īpašums') && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center uppercase tracking-wide">
                    <Calculator className="w-5 h-5 mr-3 text-primary-600" />
                    {t('listing.creditCalculator')}
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <span>Pirmā iemaksa</span>
                        <span className="text-primary-600">{downPayment}%</span>
                      </div>
                      <Slider
                        min={0} max={50} step={5}
                        value={[downPayment]}
                        onValueChange={(val) => setDownPayment(val[0])}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                        <span>Termiņš (mēneši)</span>
                        <span className="text-primary-600">{term}</span>
                      </div>
                      <Slider
                        min={12} max={120} step={12}
                        value={[term]}
                        onValueChange={(val) => setTerm(val[0])}
                        className="w-full"
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

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 mb-6">Drošs pirkums</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Piegādes veids</label>
                <select 
                  className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus:border-emerald-500 outline-none"
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                >
                  <option value="omniva">Omniva pakomāts (+3.00 €)</option>
                  <option value="dpd">DPD pakomāts (+3.00 €)</option>
                  <option value="pickup">Saņemt klātienē (Bezmaksas)</option>
                </select>
              </div>

              {shippingMethod === 'omniva' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Omniva pakomāts</label>
                  <input
                    type="text"
                    className="w-full h-10 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus:border-emerald-500 outline-none"
                    placeholder="Meklēt pilsētu (piem., Rīga)..."
                    value={omnivaSearch}
                    onChange={e => {
                      setOmnivaSearch(e.target.value);
                      if (e.target.value.length >= 2) {
                        fetch(`/api/shipping/omniva-locations?city=${encodeURIComponent(e.target.value)}`)
                          .then(r => r.json()).then(setOmnivaLocations).catch(() => {});
                      } else {
                        setOmnivaLocations([]);
                      }
                    }}
                  />
                  {omnivaLocations.length > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-white divide-y divide-slate-50">
                      {omnivaLocations.map(loc => (
                        <button key={loc.id} type="button"
                          onClick={() => { setSelectedLocker(loc); setShippingAddress(`Omniva: ${loc.name}, ${loc.address}`); setOmnivaLocations([]); setOmnivaSearch(loc.name); }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedLocker?.id === loc.id ? 'bg-emerald-50 font-semibold' : ''}`}>
                          <p className="font-semibold text-slate-800">{loc.name}</p>
                          <p className="text-slate-500">{loc.address}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedLocker && <p className="text-xs text-emerald-600 font-semibold">✓ {selectedLocker.name}</p>}
                </div>
              ) : shippingMethod !== 'pickup' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Piegādes adrese / Pakomāts</label>
                  <input
                    type="text"
                    className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-sm font-semibold focus:border-emerald-500 outline-none"
                    placeholder="Ievadiet adresi vai pakomāta nosaukumu"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-sm font-semibold text-slate-600">
                  <span>Prece</span>
                  <span>€{listing?.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-slate-600">
                  <span>Piegāde</span>
                  <span>{shippingMethod === 'pickup' ? '€0.00' : '€3.00'}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Kopā</span>
                  <span>€{((listing?.price || 0) + (shippingMethod === 'pickup' ? 0 : 3)).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowCheckoutModal(false)}
                >
                  Atcelt
                </Button>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleBuyNow}
                  disabled={isBuying || (shippingMethod !== 'pickup' && !shippingAddress.trim())}
                >
                  {isBuying ? 'Apstrādā...' : 'Maksāt droši'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
