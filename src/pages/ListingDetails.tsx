import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { ArrowLeft, MapPin, Clock, User, Mail, Image as ImageIcon, Star, BadgeCheck, MessageCircle, Gavel, Car, Settings, Calendar, Info, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

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
  attributes?: string;
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
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Bid form state
  const [bidAmount, setBidAmount] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');

  useEffect(() => {
    const fetchListingAndReviews = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        if (!res.ok) throw new Error('Sludinājums nav atrasts');
        const data = await res.json();
        setListing(data);

        // Fetch reviews for the seller
        const reviewsRes = await fetch(`/api/users/${data.user_id}/reviews`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData);
        }

        // Fetch bids if it's an auction
        const parsedAttributes = data.attributes ? JSON.parse(data.attributes) : null;
        if (parsedAttributes?.saleType === 'auction') {
          const bidsRes = await fetch(`/api/listings/${id}/bids`);
          if (bidsRes.ok) {
            const bidsData = await bidsRes.json();
            setBids(bidsData);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingAndReviews();
  }, [id]);

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listing) return;
    
    setSubmittingBid(true);
    setBidError('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/listings/${id}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(bidAmount) })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās pievienot solījumu');

      // Refresh bids
      const bidsRes = await fetch(`/api/listings/${id}/bids`);
      if (bidsRes.ok) {
        const bidsData = await bidsRes.json();
        setBids(bidsData);
      }
      
      setBidAmount('');
    } catch (err: any) {
      setBidError(err.message);
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !listing) return;
    
    setSubmittingReview(true);
    setReviewError('');

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/users/${listing.user_id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās pievienot atsauksmi');

      // Refresh reviews
      const reviewsRes = await fetch(`/api/users/${listing.user_id}/reviews`);
      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }
      
      setComment('');
      setRating(5);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('lv-LV', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Kaut kas nogāja greizi</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Link to="/" className="text-primary-600 font-medium hover:text-primary-700 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atpakaļ uz sākumlapu
        </Link>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
    : 'Nav vērtējumu';

  const parsedAttributes = listing.attributes ? JSON.parse(listing.attributes) : null;
  const isAuction = parsedAttributes?.saleType === 'auction';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 pb-12">
      {/* Immersive Image Gallery Header */}
      <div className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] bg-slate-900 relative">
        {listing.image_url ? (
          <img 
            src={listing.image_url} 
            alt={listing.title} 
            className="w-full h-full object-cover opacity-90"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
            <ImageIcon className="w-20 h-20 opacity-30 mb-4" />
            <span className="text-lg font-medium">Nav pievienots attēls</span>
          </div>
        )}
        
        {/* Top Gradient Overlay */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent"></div>
        
        {/* Bottom Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-900 to-transparent"></div>

        {/* Back Button */}
        <div className="absolute top-6 left-4 sm:left-6 lg:left-8 z-10">
          <Link to="/" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-md transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-6 left-4 sm:left-6 lg:left-8 z-10">
          <div className="bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-lg inline-block mb-3">
            {listing.category}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Title & Price Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                  {listing.title}
                </h1>
                <div className="flex-shrink-0">
                  <p className="text-3xl sm:text-4xl font-extrabold text-primary-600">
                    € {listing.price.toFixed(2)}
                  </p>
                  {isAuction && (
                    <div className="flex items-center text-amber-600 mt-1 font-medium text-sm">
                      <Gavel className="w-4 h-4 mr-1" />
                      Sākuma cena
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 pb-6 border-b border-slate-100">
                <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  {formatDate(listing.created_at)}
                </div>
                <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                  Latvija
                </div>
              </div>

              {/* Attributes Grid */}
              {parsedAttributes && (
                <div className="py-6 border-b border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Galvenā informācija</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {parsedAttributes.brand && (
                      <div className="flex items-start">
                        <div className="p-2 bg-primary-50 rounded-lg mr-3 text-primary-600">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Marka</p>
                          <p className="font-semibold text-slate-900">{parsedAttributes.brand}</p>
                        </div>
                      </div>
                    )}
                    {parsedAttributes.model && (
                      <div className="flex items-start">
                        <div className="p-2 bg-primary-50 rounded-lg mr-3 text-primary-600">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Modelis</p>
                          <p className="font-semibold text-slate-900">{parsedAttributes.model}</p>
                        </div>
                      </div>
                    )}
                    {parsedAttributes.year && (
                      <div className="flex items-start">
                        <div className="p-2 bg-primary-50 rounded-lg mr-3 text-primary-600">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Gads</p>
                          <p className="font-semibold text-slate-900">{parsedAttributes.year}</p>
                        </div>
                      </div>
                    )}
                    {parsedAttributes.condition && (
                      <div className="flex items-start">
                        <div className="p-2 bg-primary-50 rounded-lg mr-3 text-primary-600">
                          <Info className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Stāvoklis</p>
                          <p className="font-semibold text-slate-900">{parsedAttributes.condition}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {parsedAttributes.features && (
                    <div className="mt-6">
                      <p className="text-xs text-slate-500 font-medium mb-2">Papildus ekstras</p>
                      <div className="flex flex-wrap gap-2">
                        {parsedAttributes.features.split(',').map((feature: string, idx: number) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                            {feature.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Apraksts</h3>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {listing.description || "Pārdevējs nav pievienojis aprakstu."}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Reviews Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8"
            >
              {isAuction && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                    <Gavel className="w-6 h-6 mr-2 text-primary-600" />
                    Solījumu vēsture
                  </h2>
                  
                  {user && user.id !== listing.user_id && (
                    <form onSubmit={handleBidSubmit} className="mb-8 bg-amber-50 p-6 rounded-xl border border-amber-100">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Izteikt solījumu</h3>
                      
                      {bidError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                          {bidError}
                        </div>
                      )}
                      
                      <div className="flex gap-4">
                        <div className="flex-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-slate-500 sm:text-sm">€</span>
                          </div>
                          <input
                            type="number"
                            min={bids.length > 0 ? bids[0].amount + 1 : listing.price + 1}
                            step="1"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-medium"
                            placeholder="Ievadiet summu"
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={submittingBid}
                          className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {submittingBid ? 'Sola...' : 'Solīt'}
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">
                        Minimālais solījums: €{bids.length > 0 ? bids[0].amount + 1 : listing.price + 1}
                      </p>
                    </form>
                  )}

                  <div className="space-y-3">
                    {bids.length === 0 ? (
                      <p className="text-slate-500 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">Vēl nav neviena solījuma. Esiet pirmais!</p>
                    ) : (
                      bids.map((bid, index) => (
                        <div 
                          key={bid.id} 
                          className={`flex justify-between items-center p-4 rounded-xl border ${
                            index === 0 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-green-200 text-green-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {bid.bidder_name}
                                {index === 0 && <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">Līderis</span>}
                              </p>
                              <p className="text-xs text-slate-500">{formatDate(bid.created_at)}</p>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${index === 0 ? 'text-green-700' : 'text-slate-700'}`}>
                            € {bid.amount.toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-slate-900 mb-6">Pārdevēja atsauksmes</h2>
              
              {/* Add Review Form */}
              {user && user.id !== listing.user_id && (
                <form onSubmit={handleReviewSubmit} className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Atstāt atsauksmi</h3>
                  
                  {reviewError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                      {reviewError}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Vērtējums</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none"
                        >
                          <Star 
                            className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-2">Komentārs</label>
                    <textarea
                      id="comment"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Kāda bija jūsu pieredze ar šo pārdevēju?"
                      required
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {submittingReview ? 'Pievieno...' : 'Pievienot atsauksmi'}
                  </button>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Šim pārdevējam vēl nav atsauksmju.</p>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{review.reviewer_name}</p>
                          <p className="text-xs text-slate-500">{formatDate(review.created_at)}</p>
                        </div>
                        {renderStars(review.rating)}
                      </div>
                      <p className="text-slate-600 mt-2">{review.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Action Bar & Seller Info */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24 space-y-6"
            >
              {/* Action Bar */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Sazināties</h3>
                <div className="space-y-3">
                  <a 
                    href={`mailto:${listing.author_email}?subject=Par sludinājumu: ${listing.title}`}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl shadow-sm text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Rakstīt ziņu
                  </a>
                  
                  {isAuction ? (
                    <button 
                      onClick={() => {
                        const bidInput = document.querySelector('input[type="number"]') as HTMLInputElement;
                        if (bidInput) bidInput.focus();
                      }}
                      className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl border-2 border-primary-600 text-base font-semibold text-primary-700 hover:bg-primary-50 transition-colors"
                    >
                      <Gavel className="w-5 h-5 mr-2" />
                      Solīt cenu
                    </button>
                  ) : (
                    <button className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl border-2 border-slate-200 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors">
                      Piedāvāt cenu
                    </button>
                  )}
                </div>
              </div>

              {/* Seller Info Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Pārdevējs</h3>
                
                <div className="flex items-center mb-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-primary-100 to-primary-200 text-primary-700 rounded-full flex items-center justify-center mr-4 shadow-inner">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <p className="font-bold text-lg text-slate-900 mr-1">{listing.author_name}</p>
                      <BadgeCheck className="w-5 h-5 text-blue-500" title="Verificēts lietotājs" />
                    </div>
                    <div className="flex items-center text-sm text-slate-600 mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 mr-1" />
                      <span className="font-medium mr-1">{averageRating}</span>
                      <span>({reviews.length} atsauksmes)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Drošs darījums</p>
                    <p className="text-xs text-green-700 mt-1">Šis pārdevējs ir verificējis savu identitāti ar Smart-ID.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
