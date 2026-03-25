import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { User, Package, Trash2, Clock, Image as ImageIcon, Pencil, Heart, Wallet, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
}

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'listings' | 'favorites' | 'wallet'>('listings');
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);

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

    if (user) {
      fetchMyListings();
      fetchFavorites();
      fetchBalance();
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex items-center space-x-6">
          <div className="h-20 w-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.name || 'Lietotājs'}</h1>
            <p className="text-slate-500">{user.email}</p>
          </div>
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
        </div>

        {/* Mans Maks */}
        {activeTab === 'wallet' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8"
          >
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
                    <li key={listing.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
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
                          <h3 className="text-lg font-semibold text-slate-900 truncate hover:text-primary-600 transition-colors">
                            {listing.title}
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
                    <li key={listing.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
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
                          <h3 className="text-lg font-semibold text-slate-900 truncate hover:text-primary-600 transition-colors">
                            {listing.title}
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
    </div>
  );
}
