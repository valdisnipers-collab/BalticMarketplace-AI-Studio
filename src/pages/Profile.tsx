import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { User, Package, Trash2, Clock, Image as ImageIcon, Pencil, Heart, Wallet, Plus, ShieldCheck, ShieldAlert, Fingerprint, Star, BarChart3, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
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

export default function Profile() {
  const { user, loading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [myAds, setMyAds] = useState<AdData[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'wallet' | 'ads'>('listings');
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [adStats, setAdStats] = useState<{date: string, views: number, clicks: number}[]>([]);
  const [addingFunds, setAddingFunds] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedAd, setSelectedAd] = useState<AdData | null>(null);
  const [adForm, setAdForm] = useState({
    title: '',
    image_url: '',
    link_url: '',
    size: '300x250',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    category: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
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

    if (user) {
      fetchMyListings();
      fetchFavorites();
      fetchBalance();
      fetchPointsHistory();
      fetchSettings();
      fetchMyAds();
    }
  }, [user, loading, navigate]);

  const handleAddFunds = async (amount: number) => {
    setAddingFunds(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/wallet/add-funds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });

      if (!res.ok) throw new Error('Neizdevās pievienot līdzekļus');

      const data = await res.json();
      setBalance(data.balance);
      setIsAddFundsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
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

  const handleBuyPoints = async (amount: number) => {
    if (!window.confirm(`Vai vēlies iegādāties ${amount} punktus?`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/wallet/buy-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ points: amount })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās iegādāties punktus');

      updateUser({ points: data.points });
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
      const res = await fetch(`/api/favorites/${id}`, {
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

  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Lietotāja info bloks */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="h-20 w-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0 relative">
              <User className="h-10 w-10" />
              {user.is_verified ? (
                <div className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full border-2 border-white" title="Verificēts lietotājs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              ) : (
                <div className="absolute bottom-0 right-0 bg-amber-500 text-white p-1 rounded-full border-2 border-white" title="Nepārbaudīts lietotājs">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                {user.name || 'Lietotājs'}
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                  {user.user_type === 'b2b' ? 'Uzņēmums' : 'Privātpersona'}
                </span>
              </h1>
              <p className="text-slate-500">{user.phone}</p>
              {user.email && <p className="text-slate-500 text-sm">{user.email}</p>}
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-primary-600">
                <span className="bg-primary-50 px-2 py-1 rounded-md">
                  {user.points} Punkti
                </span>
              </div>
            </div>
          </div>

          {!user.is_verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm w-full md:w-auto">
              <h3 className="text-amber-800 font-semibold mb-1 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" />
                Paaugstiniet uzticamību
              </h3>
              <p className="text-amber-700 text-sm mb-3">
                Verificējiet savu identitāti ar Smart-ID un saņemiet 300 bonusa punktus!
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
                <button
                  onClick={handleSmartIdVerification}
                  className="w-full flex items-center justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Verificēt ar Smart-ID
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('listings')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'listings' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            Mani sludinājumi
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'favorites' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Heart className="w-4 h-4 mr-2" />
            Favorīti
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'wallet' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Wallet className="w-4 h-4 mr-2" />
            Mans Maks
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ads' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Star className="w-4 h-4 mr-2" />
            Reklāmas
          </button>
        </div>

        {/* Mans Maks */}
        {activeTab === 'wallet' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center">
                    <Wallet className="w-6 h-6 mr-2 text-primary-600" />
                    Konta atlikums
                  </h2>
                  <p className="text-4xl font-extrabold text-slate-900">
                    € {balance.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddFundsModalOpen(true)}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-sm"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Papildināt
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                <Star className="w-6 h-6 mr-2 text-amber-500" />
                Bonusa punkti
              </h2>
              <div className="mb-6">
                <p className="text-sm text-slate-500 mb-1">Pieejamie punkti</p>
                <p className="text-3xl font-extrabold text-slate-900">{user?.points || 0}</p>
              </div>

              <div className="mb-8 p-6 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-amber-900 mb-1">Agrā piekļuve</h3>
                    <p className="text-amber-700 text-sm">
                      Iegūsti iespēju redzēt jaunākos sludinājumus 15 minūtes pirms citiem!
                    </p>
                    {user?.early_access_until && new Date(user.early_access_until) > new Date() && (
                      <p className="mt-2 text-sm font-semibold text-green-700">
                        Aktīvs līdz: {new Date(user.early_access_until).toLocaleString('lv-LV')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleBuyEarlyAccess}
                    disabled={user?.points ? user.points < (parseInt(settings.early_access_price) || 150) : true}
                    className="w-full sm:w-auto px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Pirkt ({settings.early_access_price || 150} punkti)
                  </button>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Iegādāties punktus</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[100, 500, 1000].map(amount => {
                    const pricePer100 = parseFloat(settings.points_price_eur_per_100) || 1.00;
                    const price = (amount / 100) * pricePer100;
                    return (
                      <button
                        key={amount}
                        onClick={() => handleBuyPoints(amount)}
                        className="p-4 border border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-colors text-center group"
                      >
                        <div className="text-2xl font-bold text-slate-900 group-hover:text-amber-600 mb-1">
                          {amount}
                        </div>
                        <div className="text-sm text-slate-500">
                          {price.toFixed(2)} €
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Vēsture</h3>
              {pointsHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nav punktu vēstures</p>
              ) : (
                <div className="space-y-3">
                  {pointsHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-900">{item.reason}</p>
                        <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('lv-LV')}</p>
                      </div>
                      <div className={`font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.points > 0 ? '+' : ''}{item.points}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Mani sludinājumi */}
        {activeTab === 'listings' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                Mani sludinājumi
              </h2>
              <Link 
                to="/add" 
                className="text-sm font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
              >
                Pievienot jaunu
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            {isLoadingListings ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : myListings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Tev vēl nav neviena sludinājuma</h3>
                <p className="text-slate-500 mb-6">Pievieno savu pirmo preci vai pakalpojumu jau tagad!</p>
                <Link 
                  to="/add" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Izveidot sludinājumu
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <ul className="divide-y divide-slate-200">
                  {myListings.map((listing) => (
                    <li key={listing.id} className={`p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 ${listing.is_highlighted ? 'bg-amber-50/30' : ''}`}>
                      {/* Attēls */}
                      <div className="w-full sm:w-32 h-32 sm:h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {listing.image_url ? (
                          <img 
                            src={listing.image_url} 
                            alt={listing.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                      </div>
                      
                      {/* Informācija */}
                      <div className="flex-grow min-w-0">
                        <Link to={`/listing/${listing.id}`} className="block focus:outline-none">
                          <h3 className="text-lg font-semibold text-slate-900 truncate hover:text-primary-600 transition-colors flex items-center gap-2">
                            {listing.title}
                            {listing.is_highlighted ? (
                              <span className="inline-flex items-center bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold">
                                <Star className="w-3 h-3 mr-1 fill-amber-800" />
                                TOP
                              </span>
                            ) : null}
                          </h3>
                        </Link>
                        <p className="text-lg font-bold text-primary-600 mt-1">
                          € {listing.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="bg-slate-100 px-2.5 py-0.5 rounded-md font-medium text-slate-700">
                            {listing.category}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {formatDate(listing.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Darbības */}
                      <div className="flex-shrink-0 w-full sm:w-auto flex sm:flex-col gap-2 mt-4 sm:mt-0">
                        <Link 
                          to={`/edit/${listing.id}`}
                          className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Pencil className="w-4 h-4 mr-2 sm:mr-0 md:mr-2" />
                          <span className="sm:hidden md:inline">Rediģēt</span>
                        </Link>
                        <button 
                          onClick={() => handleDelete(listing.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4 mr-2 sm:mr-0 md:mr-2" />
                          <span className="sm:hidden md:inline">Dzēst</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}

        {/* Favorīti */}
        {activeTab === 'favorites' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                Mani favorīti
              </h2>
            </div>

            {isLoadingFavorites ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : favorites.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
                <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Tev vēl nav pievienotu favorītu</h3>
                <p className="text-slate-500 mb-6">Atzīmē sludinājumus ar sirsniņu, lai tos saglabātu šeit.</p>
                <Link 
                  to="/" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Skatīt sludinājumus
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <ul className="divide-y divide-slate-200">
                  {favorites.map((listing) => (
                    <li key={listing.id} className={`p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 ${listing.is_highlighted ? 'bg-amber-50/30' : ''}`}>
                      {/* Attēls */}
                      <div className="w-full sm:w-32 h-32 sm:h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {listing.image_url ? (
                          <img 
                            src={listing.image_url} 
                            alt={listing.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                      </div>
                      
                      {/* Informācija */}
                      <div className="flex-grow min-w-0">
                        <Link to={`/listing/${listing.id}`} className="block focus:outline-none">
                          <h3 className="text-lg font-semibold text-slate-900 truncate hover:text-primary-600 transition-colors flex items-center gap-2">
                            {listing.title}
                            {listing.is_highlighted ? (
                              <span className="inline-flex items-center bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold">
                                <Star className="w-3 h-3 mr-1 fill-amber-800" />
                                TOP
                              </span>
                            ) : null}
                          </h3>
                        </Link>
                        <p className="text-lg font-bold text-primary-600 mt-1">
                          € {listing.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="bg-slate-100 px-2.5 py-0.5 rounded-md font-medium text-slate-700">
                            {listing.category}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {formatDate(listing.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Darbības */}
                      <div className="flex-shrink-0 w-full sm:w-auto flex sm:flex-col gap-2 mt-4 sm:mt-0">
                        <button 
                          onClick={() => handleRemoveFavorite(listing.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Heart className="w-4 h-4 mr-2 sm:mr-0 md:mr-2 fill-slate-400 text-slate-400" />
                          <span className="sm:hidden md:inline">Noņemt</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
        {/* Reklāmas */}
        {activeTab === 'ads' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                Manas reklāmas
              </h2>
              <button
                onClick={() => setIsAdModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pievienot reklāmu
              </button>
            </div>

            {isLoadingAds ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : myAds.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
                <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-1">Tev vēl nav pievienotu reklāmu</h3>
                <p className="text-slate-500 mb-6">Izveido reklāmu, lai piesaistītu vairāk uzmanības.</p>
                <button 
                  onClick={() => setIsAdModalOpen(true)}
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Izveidot reklāmu
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <ul className="divide-y divide-slate-200">
                  {myAds.map((ad) => (
                    <li key={ad.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                      <div className="w-full sm:w-32 h-32 sm:h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {ad.image_url ? (
                          <img 
                            src={ad.image_url} 
                            alt={ad.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className="text-lg font-semibold text-slate-900 truncate flex items-center gap-2">
                          {ad.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                            ad.status === 'approved' ? 'bg-green-100 text-green-800' :
                            ad.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {ad.status === 'approved' ? 'Apstiprināta' :
                             ad.status === 'pending' ? 'Gaida' : 'Noraidīta'}
                          </span>
                          <span className="bg-slate-100 px-2.5 py-0.5 rounded-md font-medium text-slate-700">
                            {ad.size}
                          </span>
                          {ad.category && (
                            <span className="bg-slate-100 px-2.5 py-0.5 rounded-md font-medium text-slate-700">
                              {ad.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span>Skatījumi: {ad.views}</span>
                          <span>Klikšķi: {ad.clicks}</span>
                          <span>Līdz: {formatDate(ad.end_date)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-full sm:w-auto flex sm:flex-col gap-2 mt-4 sm:mt-0">
                        <button 
                          onClick={() => openStatsModal(ad)}
                          className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 border border-slate-200 text-indigo-600 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          <span>Statistika</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Add Funds Modal */}
      {isAddFundsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Papildināt maku</h3>
            <p className="text-slate-500 mb-6">Izvēlieties summu, par kādu vēlaties papildināt savu kontu (Mock maksājums).</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[10, 20, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAddFunds(amount)}
                  disabled={addingFunds}
                  className="py-4 px-6 rounded-xl border-2 border-slate-200 text-lg font-bold text-slate-700 hover:border-primary-600 hover:text-primary-600 hover:bg-primary-50 transition-all disabled:opacity-50"
                >
                  + €{amount}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsAddFundsModalOpen(false)}
                disabled={addingFunds}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Atcelt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ad Modal */}
      {isAdModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Izveidot jaunu reklāmu
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Reklāmas izveide maksā {settings.ad_price_points || '500'} punktus. Pēc izveides tā tiks nosūtīta apstiprināšanai.
              </p>
            </div>
            
            <form onSubmit={handleAddAd} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Virsraksts
                </label>
                <input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={e => setAdForm({...adForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Reklāmas virsraksts"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Attēla URL
                </label>
                <input
                  type="url"
                  required
                  value={adForm.image_url}
                  onChange={e => setAdForm({...adForm, image_url: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Saites URL
                </label>
                <input
                  type="url"
                  required
                  value={adForm.link_url}
                  onChange={e => setAdForm({...adForm, link_url: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Izmērs
                  </label>
                  <select
                    value={adForm.size}
                    onChange={e => setAdForm({...adForm, size: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="300x250">Vidējs taisnstūris (300x250)</option>
                    <option value="300x600">Puslapa (300x600)</option>
                    <option value="728x90">Liels baneris (728x90)</option>
                    <option value="970x250">Milzu baneris (970x250)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kategorija (neobligāti)
                  </label>
                  <select
                    value={adForm.category}
                    onChange={e => setAdForm({...adForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Visas kategorijas</option>
                    <option value="Elektronika">Elektronika</option>
                    <option value="Transports">Transports</option>
                    <option value="Mājoklis">Mājoklis</option>
                    <option value="Darbs">Darbs</option>
                    <option value="Pakalpojumi">Pakalpojumi</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sākuma datums
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={adForm.start_date}
                    onChange={e => setAdForm({...adForm, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Beigu datums
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={adForm.end_date}
                    onChange={e => setAdForm({...adForm, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAdModalOpen(false)}
                  className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Atcelt
                </button>
                <button
                  type="submit"
                  disabled={user && user.points < parseInt(settings.ad_price_points || '500', 10)}
                  className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Izveidot un apmaksāt
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Stats Modal */}
      {isStatsModalOpen && selectedAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                Statistika: {selectedAd.title}
              </h3>
              <button 
                onClick={() => setIsStatsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Kopējie skatījumi</div>
                  <div className="text-2xl font-bold text-slate-900">{selectedAd.views}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Kopējie klikšķi</div>
                  <div className="text-2xl font-bold text-slate-900">{selectedAd.clicks}</div>
                </div>
              </div>

              {adStats.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={adStats} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} stroke="#94a3b8" />
                      <YAxis yAxisId="left" tick={{fontSize: 12}} stroke="#94a3b8" />
                      <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="views" name="Skatījumi" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="clicks" name="Klikšķi" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  Nav pietiekami daudz datu grafika attēlošanai.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
