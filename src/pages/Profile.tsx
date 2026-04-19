import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { User, Package, Trash2, Clock, Image as ImageIcon, Pencil, Heart, Wallet, Plus, ShieldCheck, ShieldAlert, Fingerprint, Star, BarChart3, XCircle, Eye, TrendingUp, Settings, Building2, X, ChevronDown, MapPin, Handshake, UserPlus, PlusCircle, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  location?: string;
  is_highlighted?: number;
}

interface PointsHistory {
  id: number;
  points: number;
  reason: string;
  created_at: string;
}

interface AdData {
  id: number;
  title: string;
  image_url: string;
  link_url: string;
  size: string;
  start_date: string;
  end_date: string;
  is_active: number;
  views: number;
  clicks: number;
  created_at: string;
  category: string | null;
  status: string;
}

interface Offer {
  id: number;
  listing_id: number;
  listing_title: string;
  listing_image: string;
  buyer_id: number;
  buyer_name?: string;
  seller_id?: number;
  seller_name?: string;
  sender_id: number;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export default function Profile() {
  const { t } = useI18n();
  const { user, loading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [myAds, setMyAds] = useState<AdData[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [isLoadingSavedSearches, setIsLoadingSavedSearches] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'wallet' | 'ads' | 'offers' | 'company' | 'settings' | 'saved-searches' | 'notifications' | 'orders'>('listings');
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [adStats, setAdStats] = useState<{date: string, views: number, clicks: number}[]>([]);
  const [addingFunds, setAddingFunds] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedAd, setSelectedAd] = useState<AdData | null>(null);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    company_reg_number: '',
    company_vat: ''
  });
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    image_url: '',
    link_url: '',
    size: '300x250',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    category: ''
  });
  const [boughtOrders, setBoughtOrders] = useState<any[]>([]);
  const [soldOrders, setSoldOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    // Handle Stripe Checkout success
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const type = params.get('type');
      if (type === 'funds') {
        alert('Konta papildināšana veiksmīga! Līdzekļi drīz parādīsies jūsu kontā.');
      } else if (type === 'points') {
        alert('Punktu iegāde veiksmīga! Punkti drīz parādīsies jūsu kontā.');
      } else if (type === 'subscription') {
        alert('Abonements veiksmīgi noformēts!');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      // Force a reload to get updated balance/points from server
      setTimeout(() => window.location.reload(), 1500);
    }
    if (params.get('canceled') === 'true') {
      alert('Maksājums tika atcelts.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (user) {
      fetch(`/api/users/${user.id}/badges`)
        .then(r => r.json())
        .then(setBadges)
        .catch(() => {});
    }

    const fetchMyListings = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/users/me/listings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Neizdevās ielādēt sludinājumus');
        
        const data = await res.json();
        setMyListings(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoadingListings(false);
      }
    };

    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/users/me/favorites', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Neizdevās ielādēt favorītus');
        
        const data = await res.json();
        setFavorites(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsLoadingFavorites(false);
      }
    };

    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    };

    const fetchPointsHistory = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/wallet/points-history', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setPointsHistory(data);
        }
      } catch (err) {
        console.error("Error fetching points history:", err);
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          setSettings(await res.json());
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    const fetchMyAds = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/users/me/ads', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Neizdevās ielādēt reklāmas');
        
        const data = await res.json();
        setMyAds(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsLoadingAds(false);
      }
    };

    const fetchOffers = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const [receivedRes, sentRes] = await Promise.all([
          fetch('/api/users/me/offers/received', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/users/me/offers/sent', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (receivedRes.ok) setReceivedOffers(await receivedRes.json());
        if (sentRes.ok) setSentOffers(await sentRes.json());
      } catch (err) {
        console.error("Error fetching offers:", err);
      } finally {
        setIsLoadingOffers(false);
      }
    };

    const fetchSavedSearches = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/users/me/saved-searches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setSavedSearches(await res.json());
      } catch (err) {
        console.error("Error fetching saved searches:", err);
      } finally {
        setIsLoadingSavedSearches(false);
      }
    };

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/users/me/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setNotifications(await res.json());
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    const fetchOrders = async () => {
      setIsLoadingOrders(true);
      try {
        const token = localStorage.getItem('auth_token');
        const [boughtRes, soldRes] = await Promise.all([
          fetch('/api/users/me/orders/bought', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/users/me/orders/sold', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (boughtRes.ok) setBoughtOrders(await boughtRes.json());
        if (soldRes.ok) setSoldOrders(await soldRes.json());
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    if (user) {
      fetchMyListings();
      fetchFavorites();
      fetchBalance();
      fetchPointsHistory();
      fetchSettings();
      fetchMyAds();
      fetchOffers();
      fetchSavedSearches();
      fetchNotifications();
      fetchOrders();
      setCompanyForm({
        company_name: user.company_name || '',
        company_reg_number: user.company_reg_number || '',
        company_vat: user.company_vat || ''
      });
    }
  }, [user, loading, navigate]);

  const handleAddFunds = async (amount: number) => {
    setAddingFunds(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount, type: 'funds' })
      });

      if (!res.ok) throw new Error('Neizdevās izveidot maksājumu');

      const data = await res.json();
      window.location.href = data.url;
    } catch (err: any) {
      alert(err.message);
      setAddingFunds(false);
    }
  };

  const openStatsModal = async (ad: AdData) => {
    setSelectedAd(ad);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/users/me/ads/${ad.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setAdStats(data);
      setIsStatsModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseInt(settings.ad_price_points || '500', 10);
    if (!window.confirm(`Vai vēlies izveidot reklāmu par ${price} punktiem?`)) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās izveidot reklāmu');

      alert('Reklāma veiksmīgi izveidota un gaida apstiprinājumu!');
      setIsAdModalOpen(false);
      
      // Refresh ads and points
      const adsRes = await fetch('/api/users/me/ads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (adsRes.ok) setMyAds(await adsRes.json());
      
      const historyRes = await fetch('/api/wallet/points-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyRes.ok) setPointsHistory(await historyRes.json());
      
      if (user) {
         updateUser({ points: user.points - price });
      }

    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBuyEarlyAccess = async () => {
    const price = settings.early_access_price || 150;
    const duration = settings.early_access_duration_hours || 24;
    if (!window.confirm(`Vai vēlies iegādāties agro piekļuvi uz ${duration} stundām par ${price} punktiem?`)) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/wallet/buy-early-access', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās iegādāties agro piekļuvi');

      updateUser({ points: data.points, early_access_until: data.early_access_until });
      alert(data.message);
      
      // Refresh points history
      const historyRes = await fetch('/api/wallet/points-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (historyRes.ok) {
        setPointsHistory(await historyRes.json());
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBuyPoints = async (amount: number, priceEur: number) => {
    setAddingFunds(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: priceEur, type: 'points', pointsAmount: amount })
      });

      if (!res.ok) throw new Error('Neizdevās izveidot maksājumu');

      const data = await res.json();
      window.location.href = data.url;
    } catch (err: any) {
      alert(err.message);
      setAddingFunds(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingCompany(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/me/company', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyForm)
      });

      if (!res.ok) throw new Error('Neizdevās atjaunināt uzņēmuma datus');

      const data = await res.json();
      updateUser(data.user);
      alert('Uzņēmuma dati veiksmīgi atjaunināti!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Vai tiešām vēlies dzēst šo sludinājumu?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Neizdevās dzēst sludinājumu');

      setMyListings(prev => prev.filter(listing => listing.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveFavorite = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/users/me/favorites/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Neizdevās noņemt no favorītiem');

      setFavorites(prev => prev.filter(listing => listing.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSmartIdVerification = async () => {
    setVerifying(true);
    try {
      const token = localStorage.getItem('auth_token');
      const initRes = await fetch('/api/auth/smart-id/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ personalCode: '123456-12345', country: 'LV' })
      });

      if (!initRes.ok) throw new Error('Neizdevās uzsākt Smart-ID verifikāciju');

      const initData = await initRes.json();
      setVerificationCode(initData.verificationCode);

      // Simulate waiting for user to approve on their phone
      setTimeout(async () => {
        try {
          const statusRes = await fetch('/api/auth/smart-id/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ sessionId: initData.sessionId })
          });

          if (!statusRes.ok) throw new Error('Verifikācija neizdevās');
          
          alert('Veiksmīgi verificēts! Jums piešķirti 300 punkti.');
          window.location.reload(); // Reload to get updated user data
        } catch (err: any) {
          alert(err.message);
        } finally {
          setVerifying(false);
          setVerificationCode('');
        }
      }, 3000);

    } catch (err: any) {
      alert(err.message);
      setVerifying(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('lv-LV', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const handleShipOrder = async (orderId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/orders/${orderId}/ship`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās atzīmēt kā nosūtītu');
      
      setSoldOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'shipped' } : o));
      alert('Pasūtījums atzīmēts kā nosūtīts!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmReceipt = async (order: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās apstiprināt saņemšanu');
      
      setBoughtOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
      alert('Preces saņemšana apstiprināta! Nauda pārskaitīta pārdevējam.');
      
      // Open review modal
      setReviewOrder(order);
      setReviewModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder) return;

    setIsSubmittingReview(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/users/${reviewOrder.seller_id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          orderId: reviewOrder.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Neizdevās pievienot atsauksmi');
      }

      alert('Atsauksme veiksmīgi pievienota!');
      setReviewModalOpen(false);
      setReviewOrder(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Lietotāja informācija */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="h-20 w-20 bg-[#E64415]/10 text-[#E64415] rounded-[20px] flex items-center justify-center flex-shrink-0 relative shadow-inner">
              <User className="h-10 w-10" />
              {user.is_verified ? (
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Verificēts lietotājs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              ) : (
                <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Nepārbaudīts lietotājs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex flex-wrap items-center gap-3">
                {user.name || 'Lietotājs'}
                <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
                  {user.user_type === 'b2b' ? 'Uzņēmums' : 'Privātpersona'}
                </Badge>
              </h1>
              <div className="mt-1.5 space-y-0.5">
                <p className="text-slate-600 font-semibold">{user.phone}</p>
                {user.email && <p className="text-slate-400 text-sm font-medium">{user.email}</p>}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 py-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {user.points} Punkti
                </Badge>
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {badges.map(badge => (
                    <span key={badge.badge_id} title={badge.description}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 cursor-default">
                      {badge.icon} {badge.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!user.is_verified && (
            <div className="bg-white border border-slate-200/60 rounded-[24px] p-6 max-w-sm w-full md:w-auto">
              <h3 className="text-slate-900 font-bold mb-2 flex items-center text-base uppercase tracking-tight">
                <ShieldAlert className="w-5 h-5 mr-2 text-amber-500" />
                Verifikācija
              </h3>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed font-medium">
                Verificējiet savu identitāti ar Smart-ID un saņemiet <span className="text-[#E64415] font-bold">300 bonusa punktus</span>!
              </p>
              {verifying ? (
                <div className="text-center p-3 bg-white rounded-lg border border-amber-200">
                  {verificationCode ? (
                    <>
                      <p className="text-sm text-slate-500 mb-1">Jūsu drošības kods:</p>
                      <p className="text-2xl font-mono font-bold text-slate-900 tracking-widest">{verificationCode}</p>
                      <p className="text-xs text-slate-400 mt-2">Lūdzu, apstipriniet Smart-ID lietotnē...</p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center text-amber-600 text-sm font-medium">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                      Sazinās ar Smart-ID...
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleSmartIdVerification}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Verificēt ar Smart-ID
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 p-1.5 bg-slate-100/50 rounded-2xl w-max max-w-full border border-slate-200/60">
          {[
            { id: 'listings', label: t('profile.myListings'), icon: Package },
            { id: 'favorites', label: t('profile.favorites'), icon: Heart },
            { id: 'orders', label: 'Mani pirkumi', icon: ShoppingBag },
            { id: 'saved-searches', label: t('profile.savedSearches'), icon: Eye },
            { id: 'offers', label: t('profile.offers'), icon: Handshake },
            { id: 'notifications', label: t('profile.notifications'), icon: Fingerprint },
            { id: 'wallet', label: t('profile.wallet'), icon: Wallet },
            { id: 'ads', label: t('profile.ads'), icon: Star },
            ...(user.user_type === 'b2b' ? [{ id: 'company', label: 'Uzņēmums', icon: BarChart3 }] : []),
            { id: 'settings', label: t('profile.settings'), icon: Pencil }
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              variant="ghost"
              className={`py-2.5 px-5 font-medium text-sm flex items-center rounded-xl transition-all whitespace-nowrap relative ${
                activeTab === tab.id 
                  ? 'text-slate-900' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 mr-2 relative z-10 ${activeTab === tab.id ? 'text-[#E64415]' : 'text-slate-400'}`} />
              <span className="relative z-10">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50 pointer-events-none"
                />
              )}
            </Button>
          ))}
        </div>

        {/* Piedāvājumi */}
        {activeTab === 'offers' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{t('profile.offers')} (Saņemtie)</h2>
              {isLoadingOffers ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-[24px]" />)}
                </div>
              ) : receivedOffers.length === 0 ? (
                <div className="bg-white rounded-[24px] border border-slate-200/60 p-12 text-center">
                  <Handshake className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Jums vēl nav saņemtu piedāvājumu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {receivedOffers.map(offer => (
                    <div key={offer.id} className="bg-white rounded-[24px] p-4 border border-slate-200/60 flex items-center gap-6">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
                        <img src={offer.listing_image} alt={offer.listing_title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-slate-900">{offer.listing_title}</h3>
                        <p className="text-sm text-slate-500">Pircējs: {offer.buyer_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg font-bold text-[#E64415]">€{offer.amount.toLocaleString()}</span>
                          <Badge variant={offer.status === 'accepted' ? 'default' : offer.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px] uppercase">
                            {offer.status === 'accepted' ? 'Pieņemts' : offer.status === 'pending' ? 'Gaida' : 'Noraidīts'}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/chat?userId=${offer.buyer_id}&listingId=${offer.listing_id}`)}
                        className="rounded-xl font-bold uppercase tracking-wider text-xs px-4"
                      >
                        Skatīt čatā
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Mani izteiktie piedāvājumi</h2>
              {isLoadingOffers ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
              ) : sentOffers.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-12 text-center">
                  <Handshake className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Jūs vēl neesat izteicis nevienu piedāvājumu.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {sentOffers.map(offer => (
                    <div key={offer.id} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-6">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
                        <img src={offer.listing_image} alt={offer.listing_title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-slate-900">{offer.listing_title}</h3>
                        <p className="text-sm text-slate-500">Pārdevējs: {offer.seller_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg font-bold text-[#E64415]">€{offer.amount.toLocaleString()}</span>
                          <Badge variant={offer.status === 'accepted' ? 'default' : offer.status === 'pending' ? 'secondary' : 'destructive'} className="text-[10px] uppercase">
                            {offer.status === 'accepted' ? 'Pieņemts' : offer.status === 'pending' ? 'Gaida' : 'Noraidīts'}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/chat?userId=${offer.seller_id}&listingId=${offer.listing_id}`)}
                        className="rounded-xl font-bold uppercase tracking-wider text-xs px-4"
                      >
                        Skatīt čatā
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Mans Maks */}
        {activeTab === 'wallet' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E64415]/10 rounded-full -mr-32 -mt-32 opacity-50" />
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
                <div>
                  <h2 className="text-xs font-bold text-[#E64415] uppercase tracking-wider mb-3 flex items-center">
                    <Wallet className="w-4 h-4 mr-2" />
                    Konta atlikums
                  </h2>
                  <p className="text-5xl font-bold text-slate-900">
                    € {balance.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={() => setIsAddFundsModalOpen(true)}
                  size="lg"
                  className="w-full sm:w-auto bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Papildināt maku
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center uppercase tracking-tight">
                  <Star className="w-6 h-6 mr-3 text-amber-500 fill-amber-500" />
                  Bonusa punkti
                </h2>
                <div className="mb-8">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pieejamie punkti</p>
                  <p className="text-4xl font-bold text-slate-900">{user?.points || 0}</p>
                </div>

                <div className="mb-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-amber-900 mb-2 uppercase tracking-tight">Agrā piekļuve</h3>
                    <p className="text-amber-700 text-sm leading-relaxed mb-6 font-medium">
                      Iegūsti iespēju redzēt jaunākos sludinājumus 15 minūtes pirms citiem!
                    </p>
                    {user?.early_access_until && new Date(user.early_access_until) > new Date() && (
                      <div className="mb-6 inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        Aktīvs līdz: {new Date(user.early_access_until).toLocaleString('lv-LV')}
                      </div>
                    )}
                    <Button
                      onClick={handleBuyEarlyAccess}
                      disabled={user?.points ? user.points < (parseInt(settings.early_access_price) || 150) : true}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                    >
                      Aktivizēt ({settings.early_access_price || 150} punkti)
                    </Button>
                  </div>
                </div>

                <div className="mb-8 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kā nopelnīt punktus?</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Reģistrācijas bonuss</span>
                      </div>
                      <span className="text-xs font-black text-orange-600">+50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Smart-ID verifikācija</span>
                      </div>
                      <span className="text-xs font-black text-green-600">+300</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                          <PlusCircle className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Sludinājuma pievienošana</span>
                      </div>
                      <span className="text-xs font-black text-blue-600">+50</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Maka papildināšana (1€)</span>
                      </div>
                      <span className="text-xs font-black text-purple-600">+10</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Iegādāties punktus</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[100, 500, 1000].map(amount => {
                      const pricePer100 = parseFloat(settings.points_price_eur_per_100) || 1.00;
                      const price = (amount / 100) * pricePer100;
                      return (
                      <Button
                        onClick={() => handleBuyPoints(amount, price)}
                        disabled={addingFunds}
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center justify-center gap-1 group rounded-xl transition-all hover:bg-slate-50"
                      >
                        <div className="text-xl font-bold text-slate-900 group-hover:text-[#E64415]">
                          {amount}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-[#E64415]/70 uppercase tracking-wider">
                          {price.toFixed(2)} €
                        </div>
                      </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-8 uppercase tracking-tight">Punktu vēsture</h3>
                {pointsHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <Clock className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-wider">Nav punktu vēstures</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {pointsHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-slate-900 text-sm uppercase tracking-tight">{item.reason}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">{new Date(item.created_at).toLocaleString('lv-LV')}</p>
                        </div>
                        <div className={`text-lg font-bold ${item.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {item.points > 0 ? '+' : ''}{item.points}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Uzņēmums (B2B) */}
        {activeTab === 'company' && user.user_type === 'b2b' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Aktīvie sludinājumi', value: myListings.filter(l => l.id).length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Kopējie skatījumi', value: myAds.reduce((acc, ad) => acc + (ad.views || 0), 0), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Reklāmas efektivitāte', value: '8.4%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' }
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-6`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Uzņēmuma informācija</h2>
                <div className="flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Biznesa statuss: Aktīvs
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Uzņēmuma nosaukums</label>
                    <Input 
                      type="text" 
                      value={user.company_name || ''} 
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reģistrācijas numurs</label>
                    <Input 
                      type="text" 
                      value={user.company_reg_number || ''} 
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">PVN maksātāja numurs</label>
                    <Input 
                      type="text" 
                      value={user.company_vat || ''} 
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Juridiskā adrese</label>
                    <Input 
                      type="text" 
                      value={user.company_address || ''} 
                      readOnly
                      className="bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-slate-100">
                <Button variant="outline" className="rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs shadow-sm transition-all hover:bg-slate-50">
                  Rediģēt uzņēmuma datus
                </Button>
              </div>
            </div>

            {/* SaaS Subscription Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E64415]/20 blur-[80px] rounded-full -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold uppercase tracking-tight flex items-center">
                    <Star className="w-6 h-6 mr-3 text-amber-400" />
                    B2B Pro Abonements
                  </h3>
                  <Badge className="bg-[#E64415] text-white border-none">Aktīvs</Badge>
                </div>
                <p className="text-slate-300 mb-8 max-w-2xl">
                  Jūsu uzņēmums izmanto Pro plānu, kas sniedz piekļuvi neierobežotiem sludinājumiem, prioritāram atbalstam un padziļinātai analītikai.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                    <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Nākamais rēķins</div>
                    <div className="text-xl font-bold">15. Maijs, 2026</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                    <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Mēneša maksa</div>
                    <div className="text-xl font-bold">€49.00</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                    <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">Sludinājumu limits</div>
                    <div className="text-xl font-bold text-emerald-400">Neierobežots</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs shadow-sm transition-all" onClick={async () => {
                    try {
                      const token = localStorage.getItem('auth_token');
                      const res = await fetch('/api/create-checkout-session', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ type: 'subscription', planId: 'price_123456789' }) // Replace with actual Stripe Price ID
                      });
                      if (!res.ok) throw new Error('Neizdevās izveidot abonementu');
                      const data = await res.json();
                      window.location.href = data.url;
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }}>
                    Pārvaldīt abonementu
                  </Button>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs shadow-sm transition-all">
                    Skatīt rēķinus
                  </Button>
                </div>
              </div>
            </div>

            {/* Store editor */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight mb-6">Veikala vitrīna</h2>
              <StoreEditor />
            </div>
          </motion.div>
        )}

        {/* Saved Searches */}
        {activeTab === 'saved-searches' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Saglabātie meklējumi</h2>
            </div>
            
            {isLoadingSavedSearches ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
              </div>
            ) : savedSearches.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Jums nav saglabātu meklējumu</h3>
                <p className="text-slate-500 mb-6">Saglabājiet meklējumus, lai saņemtu paziņojumus par jauniem sludinājumiem.</p>
                <Button onClick={() => navigate('/search')} className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs shadow-sm transition-all">Pāriet uz meklēšanu</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {savedSearches.map(search => (
                  <div key={search.id} className="bg-white rounded-2xl border border-slate-100 p-6 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">
                        {search.query || search.category || 'Visi sludinājumi'}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {search.subcategory && `${search.subcategory} • `}
                        {search.min_price && `No €${search.min_price} `}
                        {search.max_price && `Līdz €${search.max_price}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Button variant="outline" className="rounded-xl font-bold uppercase tracking-wider text-xs px-4" onClick={() => {
                        const params = new URLSearchParams();
                        if (search.query) params.set('q', search.query);
                        if (search.category) params.set('category', search.category);
                        if (search.subcategory) params.set('subcategory', search.subcategory);
                        if (search.min_price) params.set('minPrice', search.min_price);
                        if (search.max_price) params.set('maxPrice', search.max_price);
                        navigate(`/search?${params.toString()}`);
                      }}>
                        Meklēt
                      </Button>
                      <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl font-bold uppercase tracking-wider text-xs px-4" onClick={async () => {
                        if (!window.confirm('Vai tiešām vēlies dzēst šo meklējumu?')) return;
                        try {
                          const token = localStorage.getItem('auth_token');
                          await fetch(`/api/users/me/saved-searches/${search.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          setSavedSearches(prev => prev.filter(s => s.id !== search.id));
                        } catch (err) {
                          console.error(err);
                        }
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Paziņojumi</h2>
            </div>
            
            {isLoadingNotifications ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Fingerprint className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Jums nav jaunu paziņojumu</h3>
                <p className="text-slate-500">Šeit parādīsies informācija par jauniem piedāvājumiem un saglabātajiem meklējumiem.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map(notification => (
                  <div 
                    key={notification.id} 
                    className={`bg-white rounded-2xl border p-6 flex items-start gap-4 transition-colors ${
                      notification.is_read ? 'border-slate-100' : 'border-[#E64415]/30 bg-[#E64415]/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.is_read ? 'bg-slate-100 text-slate-500' : 'bg-[#E64415]/20 text-primary-600'
                    }`}>
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {notification.title}
                      </h4>
                      <p className="text-slate-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">{formatDate(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <Button variant="ghost" size="sm" className="rounded-xl font-bold uppercase tracking-wider text-xs px-4" onClick={async () => {
                        try {
                          const token = localStorage.getItem('auth_token');
                          await fetch(`/api/users/me/notifications/${notification.id}/read`, {
                            method: 'PUT',
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: 1 } : n));
                        } catch (err) {
                          console.error(err);
                        }
                      }}>
                        Atzīmēt kā izlasītu
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Iestatījumi */}
        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center uppercase tracking-tight">
                <Settings className="w-6 h-6 mr-3 text-primary-600" />
                Profila iestatījumi
              </h2>
              <form className="space-y-8 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Vārds, Uzvārds</label>
                    <Input 
                      type="text" 
                      defaultValue={user.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">E-pasts</label>
                    <Input 
                      type="email" 
                      defaultValue={user.email}
                      disabled
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all">
                    Saglabāt izmaiņas
                  </Button>
                </div>
              </form>
            </div>

            {user.user_type === 'b2b' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center uppercase tracking-tight">
                  <Building2 className="w-6 h-6 mr-3 text-primary-600" />
                  Uzņēmuma dati
                </h2>
                <form onSubmit={handleUpdateCompany} className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Uzņēmuma nosaukums</label>
                      <Input 
                        type="text" 
                        value={companyForm.company_name}
                        onChange={e => setCompanyForm({...companyForm, company_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Reģistrācijas numurs</label>
                      <Input 
                        type="text" 
                        value={companyForm.company_reg_number}
                        onChange={e => setCompanyForm({...companyForm, company_reg_number: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">PVN numurs</label>
                      <Input 
                        type="text" 
                        value={companyForm.company_vat}
                        onChange={e => setCompanyForm({...companyForm, company_vat: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={isUpdatingCompany}
                      className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                    >
                      {isUpdatingCompany ? 'Saglabā...' : 'Atjaunināt uzņēmuma datus'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'listings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center uppercase tracking-tight">Mani sludinājumi</h2>
              <Button 
                render={<Link to="/add" />}
                className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pievienot jaunu
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {isLoadingListings ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
                    <Skeleton className="w-full sm:w-32 h-32 rounded-xl" />
                    <div className="flex-grow space-y-3 w-full">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-6 w-1/4" />
                    </div>
                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                      <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
                      <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myListings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-16 text-center">
                <div className="w-16 h-16 bg-[#f8f9fa] rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <Package className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Tev vēl nav neviena sludinājuma</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm font-medium">Pievieno savu pirmo preci vai pakalpojumu un sāc tirgoties jau šodien!</p>
                <Button 
                  render={<Link to="/add" />}
                  size="lg"
                  className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                >
                  Izveidot pirmo sludinājumu
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myListings.map((listing) => (
                  <div key={listing.id} className={`bg-white rounded-2xl p-4 border border-slate-100 hover:border-[#E64415]/20 transition-all flex flex-col sm:flex-row items-center gap-6 group ${listing.is_highlighted ? 'ring-2 ring-amber-100 bg-amber-50/10' : ''}`}>
                    <div className="w-full sm:w-32 h-32 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                      {listing.is_highlighted && (
                        <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600 text-white gap-1 shadow-lg">
                          <Star className="w-3 h-3 fill-white" />
                          TOP
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
                          {listing.category}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(listing.created_at)}
                        </span>
                        {listing.location && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {listing.location}
                          </span>
                        )}
                      </div>
                      <Link to={`/listing/${listing.id}`} className="block group-hover:text-primary-600 transition-colors">
                        <h3 className="text-lg font-bold text-slate-900 truncate uppercase tracking-tight">{listing.title}</h3>
                      </Link>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        € {listing.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                      <Button 
                        render={<Link to={`/edit/${listing.id}`} />}
                        variant="outline"
                        className="flex-1 sm:w-32 rounded-xl font-bold uppercase tracking-wider text-xs px-4"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Rediģēt
                      </Button>
                      <Button 
                        onClick={() => handleDelete(listing.id)}
                        variant="destructive"
                        className="flex-1 sm:w-32 rounded-xl font-bold uppercase tracking-wider text-xs px-4"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Dzēst
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Mani pirkumi</h2>
              {isLoadingOrders ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : boughtOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Tev vēl nav pirkumu</h3>
                  <p className="text-slate-500 text-sm">Šeit parādīsies tavi drošie pirkumi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {boughtOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0">
                        {order.listing_image ? (
                          <img src={order.listing_image} alt={order.listing_title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>
                        )}
                      </div>
                      <div className="flex-grow text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-lg mb-1">{order.listing_title}</h4>
                        <div className="text-sm text-slate-500 mb-2">Pārdevējs: {order.seller_name}</div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {order.shipping_method === 'pickup' ? 'Saņemt klātienē' : order.shipping_method === 'omniva' ? 'Omniva' : 'DPD'}
                          </Badge>
                          <Badge className={
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                            order.status === 'paid' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                            'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          }>
                            {order.status === 'pending' ? 'Gaida apmaksu' :
                             order.status === 'paid' ? 'Apmaksāts, gaida izsūtīšanu' :
                             order.status === 'shipped' ? 'Izsūtīts' : 'Pabeigts'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-center md:text-right flex-shrink-0">
                        <div className="text-2xl font-black text-slate-900 mb-3">€{order.amount.toLocaleString()}</div>
                        {order.status === 'shipped' && (
                          <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleConfirmReceipt(order)}
                          >
                            Apstiprināt saņemšanu
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Mani pārdevumi</h2>
              {isLoadingOrders ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : soldOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-12 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Tev vēl nav pārdevumu</h3>
                  <p className="text-slate-500 text-sm">Šeit parādīsies tavi drošie pārdevumi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {soldOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl p-6 border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                      <div className="w-24 h-24 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0">
                        {order.listing_image ? (
                          <img src={order.listing_image} alt={order.listing_title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>
                        )}
                      </div>
                      <div className="flex-grow text-center md:text-left">
                        <h4 className="font-bold text-slate-900 text-lg mb-1">{order.listing_title}</h4>
                        <div className="text-sm text-slate-500 mb-2">Pircējs: {order.buyer_name}</div>
                        <div className="text-sm text-slate-600 mb-2 font-medium">
                          Adrese: {order.shipping_address}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {order.shipping_method === 'pickup' ? 'Saņemt klātienē' : order.shipping_method === 'omniva' ? 'Omniva' : 'DPD'}
                          </Badge>
                          <Badge className={
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                            order.status === 'paid' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                            'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          }>
                            {order.status === 'pending' ? 'Gaida apmaksu' :
                             order.status === 'paid' ? 'Apmaksāts, jāizsūta' :
                             order.status === 'shipped' ? 'Izsūtīts, gaida saņemšanu' : 'Pabeigts'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-center md:text-right flex-shrink-0">
                        <div className="text-2xl font-black text-slate-900 mb-3">€{order.amount.toLocaleString()}</div>
                        {order.status === 'paid' && (
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleShipOrder(order.id)}
                          >
                            Atzīmēt kā izsūtītu
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Favorīti */}
        {activeTab === 'favorites' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center uppercase tracking-tight">Mani favorīti</h2>
            </div>

            {isLoadingFavorites ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
                    <Skeleton className="w-full sm:w-32 h-32 rounded-xl" />
                    <div className="flex-grow space-y-3 w-full">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-6 w-1/4" />
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Tev vēl nav pievienotu favorītu</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm font-medium">Atzīmē sludinājumus ar sirsniņu, lai tos saglabātu šeit un viegli atrastu vēlāk.</p>
                <Button 
                  render={<Link to="/" />}
                  size="lg"
                  className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                >
                  Skatīt sludinājumus
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {favorites.map((listing) => (
                  <div key={listing.id} className={`bg-white rounded-2xl p-4 border border-slate-100 hover:border-[#E64415]/20 transition-all flex flex-col sm:flex-row items-center gap-6 group ${listing.is_highlighted ? 'ring-2 ring-amber-100 bg-amber-50/10' : ''}`}>
                    <div className="w-full sm:w-32 h-32 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {listing.image_url ? (
                        <img 
                          src={listing.image_url} 
                          alt={listing.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">
                          {listing.category}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(listing.created_at)}
                        </span>
                        {listing.location && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {listing.location}
                          </span>
                        )}
                      </div>
                      <Link to={`/listing/${listing.id}`} className="block group-hover:text-primary-600 transition-colors">
                        <h3 className="text-lg font-bold text-slate-900 truncate uppercase tracking-tight">{listing.title}</h3>
                      </Link>
                      <p className="text-xl font-bold text-slate-900 mt-1">
                        € {listing.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <Button 
                        onClick={() => handleRemoveFavorite(listing.id)}
                        variant="outline"
                        className="w-full sm:w-32 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold uppercase tracking-wider text-xs px-4"
                      >
                        <Heart className="w-4 h-4 mr-2 fill-current" />
                        Noņemt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        {/* Reklāmas */}
        {activeTab === 'ads' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center uppercase tracking-tight">
                Manas reklāmas
              </h2>
              <Button
                onClick={() => setIsAdModalOpen(true)}
                className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pievienot reklāmu
              </Button>
            </div>

            {isLoadingAds ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
                    <Skeleton className="w-full sm:w-32 h-32 rounded-xl" />
                    <div className="flex-grow space-y-3 w-full">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : myAds.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 border-dashed p-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Star className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Tev vēl nav pievienotu reklāmu</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm font-medium">Izveido reklāmu, lai piesaistītu vairāk uzmanības saviem produktiem vai pakalpojumiem.</p>
                <Button 
                  onClick={() => setIsAdModalOpen(true)}
                  size="lg"
                  className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                >
                  Izveidot pirmo reklāmu
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myAds.map((ad) => (
                  <div key={ad.id} className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-primary-100 transition-all flex flex-col sm:flex-row items-center gap-6 group">
                    <div className="w-full sm:w-32 h-32 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 relative">
                      {ad.image_url ? (
                        <img 
                          src={ad.image_url} 
                          alt={ad.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="w-8 h-8 opacity-20" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <Badge variant={
                          ad.status === 'approved' ? 'default' :
                          ad.status === 'pending' ? 'secondary' :
                          'destructive'
                        } className="uppercase tracking-wider text-[10px]">
                          {ad.status === 'approved' ? 'Apstiprināta' :
                           ad.status === 'pending' ? 'Gaida' : 'Noraidīta'}
                        </Badge>
                        <Badge variant="outline" className="uppercase tracking-wider text-[10px]">
                          {ad.size}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 truncate uppercase tracking-tight">{ad.title}</h3>
                      <div className="flex items-center justify-center sm:justify-start gap-6 mt-2">
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skatījumi</p>
                          <p className="text-xl font-bold text-slate-900">{ad.views}</p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Klikšķi</p>
                          <p className="text-xl font-bold text-slate-900">{ad.clicks}</p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Beidzas</p>
                          <p className="text-sm font-bold text-slate-900">{formatDate(ad.end_date)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-full sm:w-auto">
                      <Button 
                        onClick={() => openStatsModal(ad)}
                        variant="outline"
                        className="w-full sm:w-32 rounded-xl font-bold uppercase tracking-wider text-xs px-4"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Statistika
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Add Funds Modal */}
      {isAddFundsModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative"
          >
            <Button 
              onClick={() => setIsAddFundsModalOpen(false)}
              disabled={addingFunds}
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </Button>

            <h3 className="text-2xl font-bold text-slate-900 mb-2 uppercase tracking-tight">Papildināt maku</h3>
            <p className="text-slate-500 mb-8 text-sm font-medium">Izvēlieties summu, par kādu vēlaties papildināt savu kontu.</p>
            
            <div className="grid grid-cols-2 gap-4">
              {[10, 20, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  onClick={() => handleAddFunds(amount)}
                  disabled={addingFunds}
                  variant="outline"
                  className="rounded-xl h-auto py-6 font-bold text-xl text-slate-900 hover:bg-[#E64415]/10 hover:text-primary-600 hover:border-[#E64415]/30 shadow-sm transition-all"
                >
                  {amount} €
                </Button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Ad Modal */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col relative"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Izveidot jaunu reklāmu</h3>
              <Button 
                onClick={() => setIsAdModalOpen(false)}
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleAddAd} className="p-8 overflow-y-auto space-y-6">
              <p className="text-sm text-slate-500 mb-4 font-medium">
                Reklāmas izveide maksā <span className="font-bold text-primary-600">{settings.ad_price_points || '500'} punktus</span>.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Virsraksts</label>
                <Input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={e => setAdForm({...adForm, title: e.target.value})}
                  placeholder="Reklāmas virsraksts"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Attēla URL</label>
                <Input
                  type="url"
                  required
                  value={adForm.image_url}
                  onChange={e => setAdForm({...adForm, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Saites URL</label>
                <Input
                  type="url"
                  required
                  value={adForm.link_url}
                  onChange={e => setAdForm({...adForm, link_url: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Izmērs</label>
                  <Select value={adForm.size} onValueChange={value => setAdForm({...adForm, size: value})}>
                    <SelectTrigger className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#E64415]/20 focus:border-[#E64415] outline-none transition-all font-medium h-auto">
                      <SelectValue placeholder="Izvēlieties izmēru">
                        {adForm.size === '300x250' ? 'Vidējs taisnstūris (300x250)' : 
                         adForm.size === '300x600' ? 'Puslapa (300x600)' : 
                         adForm.size === '728x90' ? 'Liels baneris (728x90)' : 
                         adForm.size === '970x250' ? 'Milzu baneris (970x250)' : adForm.size}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300x250">Vidējs taisnstūris (300x250)</SelectItem>
                      <SelectItem value="300x600">Puslapa (300x600)</SelectItem>
                      <SelectItem value="728x90">Liels baneris (728x90)</SelectItem>
                      <SelectItem value="970x250">Milzu baneris (970x250)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Kategorija (neobligāti)</label>
                  <Select value={adForm.category || 'all'} onValueChange={value => setAdForm({...adForm, category: value === 'all' ? '' : value})}>
                    <SelectTrigger className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#E64415]/20 focus:border-[#E64415] outline-none transition-all font-medium h-auto">
                      <SelectValue placeholder="Visas kategorijas">
                        {adForm.category || 'Visas kategorijas'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Visas kategorijas</SelectItem>
                      <SelectItem value="Elektronika">Elektronika</SelectItem>
                      <SelectItem value="Transports">Transports</SelectItem>
                      <SelectItem value="Mājoklis">Mājoklis</SelectItem>
                      <SelectItem value="Darbs">Darbs</SelectItem>
                      <SelectItem value="Pakalpojumi">Pakalpojumi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Sākuma datums</label>
                  <Input
                    type="datetime-local"
                    required
                    value={adForm.start_date}
                    onChange={e => setAdForm({...adForm, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Beigu datums</label>
                  <Input
                    type="datetime-local"
                    required
                    value={adForm.end_date}
                    onChange={e => setAdForm({...adForm, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit"
                  disabled={user && user.points < parseInt(settings.ad_price_points || '500', 10)}
                  className="w-full bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-8 py-6 font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
                >
                  Izveidot un apmaksāt
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && reviewOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] shadow-xl w-full max-w-md overflow-hidden relative"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Novērtēt pārdevēju</h3>
              <Button 
                onClick={() => setReviewModalOpen(false)}
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-6">
              <div className="text-center">
                <div className="text-sm text-slate-500 mb-4">
                  Kā jūs vērtējat sadarbību ar pārdevēju <b>{reviewOrder.seller_name}</b>?
                </div>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-10 h-10 ${
                          star <= reviewRating 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-slate-200'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Komentārs (neobligāti)</label>
                <textarea
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-medium focus:border-[#E64415] focus:ring-0 outline-none resize-none h-24"
                  placeholder="Uzrakstiet savu atsauksmi par darījumu..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#E64415] hover:bg-[#d13d13] text-white font-bold py-6 rounded-xl"
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? 'Saglabā...' : 'Iesniegt atsauksmi'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Stats Modal */}
      {isStatsModalOpen && selectedAd && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden relative"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Statistika: {selectedAd.title}</h3>
              <Button 
                onClick={() => setIsStatsModalOpen(false)}
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-[#f8f9fa] p-6 rounded-[24px] border border-slate-200/60">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kopējie skatījumi</div>
                  <div className="text-3xl font-bold text-slate-900">{selectedAd.views}</div>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kopējie klikšķi</div>
                  <div className="text-3xl font-bold text-slate-900">{selectedAd.clicks}</div>
                </div>
              </div>

              <div className="h-64 w-full">
                {adStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adStats} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="views" 
                        name="Skatījumi" 
                        stroke="#2563eb" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="clicks" 
                        name="Klikšķi" 
                        stroke="#f59e0b" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <BarChart3 className="w-10 h-10 mb-4 opacity-20" />
                    <span className="text-xs font-bold uppercase tracking-wider">Nav pietiekami daudz datu</span>
                  </div>
                )}
              </div>
              <div className="mt-8 flex items-center justify-center sm:justify-start gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                Dati tiek atjaunoti reizi stundā
              </div>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  </div>
);
}

function StoreEditor() {
  const [store, setStore] = useState<any>(null);
  const [form, setForm] = useState({ slug: '', tagline: '', description: '', website: '', phone: '', working_hours: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/stores/my', { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
      .then(r => r.json())
      .then(data => { if (data) { setStore(data); setForm(prev => ({ ...prev, ...data })); } })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const data = await res.json();
        setStore(data);
        setMessage('Saglabāts!');
      } else {
        const err = await res.json();
        setMessage(err.error || 'Kļūda');
      }
    } catch {
      setMessage('Kļūda');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'slug', label: 'URL adrese (piem.: mans-veikals)', placeholder: 'mans-veikals' },
    { key: 'tagline', label: 'Tagline', placeholder: 'Jūsu veikala moto' },
    { key: 'website', label: 'Mājaslapa', placeholder: 'https://' },
    { key: 'phone', label: 'Tālrunis', placeholder: '+371...' },
    { key: 'working_hours', label: 'Darba laiks', placeholder: 'P-P: 9:00-18:00' },
  ];

  return (
    <div className="space-y-4 max-w-lg">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
          <input
            value={(form as any)[f.key] || ''}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E64415]/30"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Apraksts</label>
        <textarea
          value={form.description || ''}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Veikala apraksts..."
          rows={3}
          className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E64415]/30"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#E64415] text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#c73d13] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saglabā...' : 'Saglabāt'}
        </button>
        {message && <span className={`text-sm font-semibold ${message === 'Saglabāts!' ? 'text-green-600' : 'text-red-600'}`}>{message}</span>}
      </div>
      {store?.slug && (
        <p className="text-xs text-slate-500">
          Veikala lapa: <a href={`/store/${store.slug}`} className="text-[#E64415] hover:underline">/store/{store.slug}</a>
        </p>
      )}
    </div>
  );
}
