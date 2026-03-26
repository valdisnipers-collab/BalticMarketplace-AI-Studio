import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Users, Package, Trash2, ShieldAlert, Flag, CheckCircle, XCircle, Settings, Megaphone, Plus, Edit, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  balance: number;
}

interface ListingData {
  id: number;
  title: string;
  price: number;
  category: string;
  created_at: string;
  author_name: string;
  author_email: string;
}

interface ReportData {
  id: number;
  reporter_id: number;
  listing_id: number | null;
  user_id: number | null;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string;
  reported_user_name: string | null;
  reported_listing_title: string | null;
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
  user_id: number | null;
  user_name: string | null;
  status: string;
  price_points: number;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'reports' | 'settings' | 'ads'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [ads, setAds] = useState<AdData[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [adStats, setAdStats] = useState<{date: string, views: number, clicks: number}[]>([]);
  const [editingAd, setEditingAd] = useState<AdData | null>(null);
  const [adForm, setAdForm] = useState({
    title: '',
    image_url: '',
    link_url: '',
    size: '728x90',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    is_active: true,
    category: '',
    status: 'approved'
  });

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (user.role !== 'admin') {
        navigate('/');
      } else {
        fetchData();
      }
    }
  }, [user, loading, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!usersRes.ok) throw new Error('Failed to fetch users');
      const usersData = await usersRes.json();
      setUsers(usersData);

      const listingsRes = await fetch('/api/admin/listings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!listingsRes.ok) throw new Error('Failed to fetch listings');
      const listingsData = await listingsRes.json();
      setListings(listingsData);
      
      const reportsRes = await fetch('/api/admin/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!reportsRes.ok) throw new Error('Failed to fetch reports');
      const reportsData = await reportsRes.json();
      setReports(reportsData);

      const adsRes = await fetch('/api/admin/ads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!adsRes.ok) throw new Error('Failed to fetch ads');
      const adsData = await adsRes.json();
      setAds(adsData);

      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Vai tiešām vēlies dzēst šo lietotāju?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās dzēst lietotāju');
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteListing = async (id: number) => {
    if (!window.confirm('Vai tiešām vēlies dzēst šo sludinājumu?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās dzēst sludinājumu');
      setListings(listings.filter(l => l.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateReportStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Neizdevās atjaunināt sūdzību');
      setReports(reports.map(r => r.id === id ? { ...r, status } : r));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Neizdevās saglabāt iestatījumus');
      setSaveMessage('Iestatījumi veiksmīgi saglabāti!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openStatsModal = async (ad: AdData) => {
    setEditingAd(ad);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/ads/${ad.id}/stats`, {
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

  const openAdModal = (ad?: AdData) => {
    if (ad) {
      setEditingAd(ad);
      setAdForm({
        title: ad.title,
        image_url: ad.image_url,
        link_url: ad.link_url,
        size: ad.size,
        start_date: new Date(ad.start_date).toISOString().slice(0, 16),
        end_date: new Date(ad.end_date).toISOString().slice(0, 16),
        is_active: ad.is_active === 1,
        category: ad.category || '',
        status: ad.status || 'approved'
      });
    } else {
      setEditingAd(null);
      setAdForm({
        title: '',
        image_url: '',
        link_url: '',
        size: '728x90',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        is_active: true,
        category: '',
        status: 'approved'
      });
    }
    setIsAdModalOpen(true);
  };

  const handleQuickAdStatus = async (ad: AdData, newStatus: 'approved' | 'rejected') => {
    if (!window.confirm(`Vai tiešām vēlies ${newStatus === 'approved' ? 'apstiprināt' : 'noraidīt'} šo reklāmu?`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...ad,
          status: newStatus,
          is_active: newStatus === 'approved' ? true : false
        })
      });
      
      if (!res.ok) throw new Error('Neizdevās atjaunināt reklāmas statusu');
      
      // Refresh ads
      const adsRes = await fetch('/api/admin/ads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (adsRes.ok) {
        setAds(await adsRes.json());
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('auth_token');
      const method = editingAd ? 'PUT' : 'POST';
      const url = editingAd ? `/api/admin/ads/${editingAd.id}` : '/api/admin/ads';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(adForm)
      });
      
      if (!res.ok) throw new Error('Neizdevās saglabāt reklāmu');
      
      // Refresh ads
      const adsRes = await fetch('/api/admin/ads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (adsRes.ok) {
        setAds(await adsRes.json());
      }
      
      setIsAdModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAd = async (id: number) => {
    if (!window.confirm('Vai tiešām vēlies dzēst šo reklāmu?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās dzēst reklāmu');
      setAds(ads.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 flex items-center space-x-6">
          <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Panelis</h1>
            <p className="text-slate-500">Pārvaldi lietotājus, sludinājumus un sūdzības</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'users' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Lietotāji ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'listings' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            Sludinājumi ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'reports' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Flag className="w-4 h-4 mr-2" />
            Sūdzības ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'settings' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Iestatījumi
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ads' 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Reklāmas ({ads.length})
          </button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vārds</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">E-pasts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Loma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Maks</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Darbības</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">€{u.balance.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:text-red-900 flex items-center justify-end w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Dzēst
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nosaukums</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cena</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Autors</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Darbības</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{l.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{l.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">€{l.price.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{l.author_name} ({l.author_email})</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleDeleteListing(l.id)}
                          className="text-red-600 hover:text-red-900 flex items-center justify-end w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Dzēst
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sūdzības iesniedzējs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mērķis</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Iemesls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statuss</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Darbības</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{r.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{r.reporter_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {r.listing_id ? `Sludinājums: ${r.reported_listing_title}` : `Lietotājs: ${r.reported_user_name}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          r.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {r.status === 'pending' ? 'Gaida' : r.status === 'resolved' ? 'Atrisināts' : 'Noraidīts'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {r.status === 'pending' && (
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                              className="text-green-600 hover:text-green-900"
                              title="Atzīmēt kā atrisinātu"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}
                              className="text-slate-400 hover:text-slate-600"
                              title="Noraidīt"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 max-w-2xl"
          >
            <h2 className="text-lg font-bold text-slate-900 mb-6">Sistēmas iestatījumi</h2>
            
            {saveMessage && (
              <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                {saveMessage}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Agrās piekļuves cena (punktos)
                </label>
                <input
                  type="number"
                  value={settings.early_access_price || ''}
                  onChange={(e) => setSettings({ ...settings, early_access_price: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  min="0"
                />
                <p className="mt-1 text-sm text-slate-500">Punktu skaits, kas nepieciešams, lai iegādātos agro piekļuvi.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reklāmas cena (punktos)
                </label>
                <input
                  type="number"
                  value={settings.ad_price_points || ''}
                  onChange={(e) => setSettings({ ...settings, ad_price_points: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  min="0"
                />
                <p className="mt-1 text-sm text-slate-500">Punktu skaits, kas nepieciešams, lai lietotājs nopirktu reklāmas vietu.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Agrās piekļuves ilgums (stundās)
                </label>
                <input
                  type="number"
                  value={settings.early_access_duration_hours || ''}
                  onChange={(e) => setSettings({ ...settings, early_access_duration_hours: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  min="1"
                />
                <p className="mt-1 text-sm text-slate-500">Cik ilgi (stundās) lietotājam būs aktīva agrā piekļuve pēc iegādes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  100 punktu cena (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.points_price_eur_per_100 || ''}
                  onChange={(e) => setSettings({ ...settings, points_price_eur_per_100: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                  min="0"
                />
                <p className="mt-1 text-sm text-slate-500">Cik maksā 100 punkti (šobrīd tikai vizuāli).</p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Saglabāt iestatījumus
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">Reklāmu pārvaldība</h2>
              <button
                onClick={() => openAdModal()}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Pievienot reklāmu
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reklāma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Lietotājs / Kat.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Izmērs</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Periods</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statistika</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statuss</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Darbības</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <img src={ad.image_url} alt={ad.title} className="h-10 w-10 object-cover rounded border border-slate-200 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{ad.title}</div>
                            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate max-w-[200px] inline-block">
                              {ad.link_url}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="font-medium text-slate-900">{ad.user_name || 'Admins'}</div>
                        <div className="text-xs">{ad.category || 'Visas kategorijas'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                          {ad.size}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div>No: {new Date(ad.start_date).toLocaleDateString('lv-LV')}</div>
                        <div>Līdz: {new Date(ad.end_date).toLocaleDateString('lv-LV')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div>Skatījumi: {ad.views}</div>
                        <div>Klikšķi: {ad.clicks}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                            ad.status === 'approved' ? 'bg-green-100 text-green-800' :
                            ad.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {ad.status === 'approved' ? 'Apstiprināta' :
                             ad.status === 'pending' ? 'Gaida' : 'Noraidīta'}
                          </span>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${
                            ad.is_active === 1 
                              ? new Date(ad.end_date) < new Date() 
                                ? 'bg-slate-100 text-slate-800' // Expired
                                : 'bg-blue-100 text-blue-800' // Active
                              : 'bg-slate-100 text-slate-800' // Inactive
                          }`}>
                            {ad.is_active === 1 
                              ? new Date(ad.end_date) < new Date() ? 'Beigusies' : 'Aktīva'
                              : 'Neaktīva'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {ad.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleQuickAdStatus(ad, 'approved')}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="Apstiprināt"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleQuickAdStatus(ad, 'rejected')}
                              className="text-red-600 hover:text-red-900 mr-3"
                              title="Noraidīt"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => openStatsModal(ad)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="Skatīt statistiku"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => openAdModal(ad)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          title="Rediģēt"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAd(ad.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Dzēst"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {ads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        Nav pievienotu reklāmu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </div>

      {/* Ad Modal */}
      {isAdModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                {editingAd ? 'Rediģēt reklāmu' : 'Pievienot jaunu reklāmu'}
              </h3>
              <button 
                onClick={() => setIsAdModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveAd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nosaukums</label>
                <input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={e => setAdForm({...adForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Pavasara izpārdošana"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attēla URL (JPG, PNG, GIF)</label>
                <input
                  type="url"
                  required
                  value={adForm.image_url}
                  onChange={e => setAdForm({...adForm, image_url: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/banner.gif"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Saites URL (kurp vedīs klikšķis)</label>
                <input
                  type="url"
                  required
                  value={adForm.link_url}
                  onChange={e => setAdForm({...adForm, link_url: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://example.com/promo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Izmērs / Novietojums</label>
                <select
                  value={adForm.size}
                  onChange={e => setAdForm({...adForm, size: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="728x90">Leaderboard (728x90) - Augšā/Apakšā</option>
                  <option value="300x250">Medium Rectangle (300x250) - Sānos/Sarakstā</option>
                  <option value="970x250">Billboard (970x250) - Liels baneris augšā</option>
                  <option value="300x600">Half Page (300x600) - Sānu panelī</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sākuma datums</label>
                  <input
                    type="datetime-local"
                    required
                    value={adForm.start_date}
                    onChange={e => setAdForm({...adForm, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beigu datums</label>
                  <input
                    type="datetime-local"
                    required
                    value={adForm.end_date}
                    onChange={e => setAdForm({...adForm, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategorija (Mērķauditorija)</label>
                <select
                  value={adForm.category}
                  onChange={e => setAdForm({...adForm, category: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Visas kategorijas (Rādīt visur)</option>
                  <option value="Transports">Transports</option>
                  <option value="Nekustamais īpašums">Nekustamais īpašums</option>
                  <option value="Elektronika">Elektronika</option>
                  <option value="Mājai un dārzam">Mājai un dārzam</option>
                  <option value="Apģērbi un apavi">Apģērbi un apavi</option>
                  <option value="Pakalpojumi">Pakalpojumi</option>
                  <option value="Cits">Cits</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statuss</label>
                <select
                  value={adForm.status}
                  onChange={e => setAdForm({...adForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="approved">Apstiprināta</option>
                  <option value="pending">Gaida apstiprinājumu</option>
                  <option value="rejected">Noraidīta</option>
                </select>
              </div>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={adForm.is_active}
                  onChange={e => setAdForm({...adForm, is_active: e.target.checked})}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-slate-900">
                  Reklāma ir aktīva
                </label>
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
                  className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingAd ? 'Saglabāt izmaiņas' : 'Pievienot'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Stats Modal */}
      {isStatsModalOpen && editingAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">
                Statistika: {editingAd.title}
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
                  <div className="text-2xl font-bold text-slate-900">{editingAd.views}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="text-sm font-medium text-slate-500 mb-1">Kopējie klikšķi</div>
                  <div className="text-2xl font-bold text-slate-900">{editingAd.clicks}</div>
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
