import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Users, Package, Trash2, ShieldAlert, Flag, CheckCircle, XCircle, Settings, Megaphone, Plus, Edit, BarChart3, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  location?: string;
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
  const [stats, setStats] = useState<{totalUsers: number, totalListings: number, pendingReports: number, totalRevenue: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState('newest');

  const [listingSearch, setListingSearch] = useState('');
  const [listingCategoryFilter, setListingCategoryFilter] = useState('all');
  const [listingSort, setListingSort] = useState('newest');

  const [adSearch, setAdSearch] = useState('');
  const [adStatusFilter, setAdStatusFilter] = useState('all');
  const [adSort, setAdSort] = useState('newest');

  const [reportSearch, setReportSearch] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportSort, setReportSort] = useState('newest');

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
      
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

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

  const handleUpdateUserRole = async (id: number, newRole: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Neizdevās atjaunināt lietotāja lomu');
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: number): Promise<boolean> => {
    if (!window.confirm('Vai tiešām vēlies dzēst šo lietotāju?')) return false;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās dzēst lietotāju');
      setUsers(users.filter(u => u.id !== id));
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    }
  };

  const handleDeleteListing = async (id: number): Promise<boolean> => {
    if (!window.confirm('Vai tiešām vēlies dzēst šo sludinājumu?')) return false;
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Neizdevās dzēst sludinājumu');
      setListings(listings.filter(l => l.id !== id));
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
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

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Kopā lietotāji</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Kopā sludinājumi</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalListings}</p>
                </div>
                <div className="h-12 w-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Neapstrādātas sūdzības</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.pendingReports}</p>
                </div>
                <div className="h-12 w-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                  <Flag className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Kopējie ienākumi</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">€{stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('users')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 rounded-none transition-colors whitespace-nowrap h-auto ${
              activeTab === 'users' 
                ? 'border-primary-600 text-primary-600 bg-transparent hover:bg-transparent' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-transparent hover:bg-transparent'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Lietotāji ({users.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('listings')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 rounded-none transition-colors whitespace-nowrap h-auto ${
              activeTab === 'listings' 
                ? 'border-primary-600 text-primary-600 bg-transparent hover:bg-transparent' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-transparent hover:bg-transparent'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            Sludinājumi ({listings.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 rounded-none transition-colors whitespace-nowrap h-auto ${
              activeTab === 'reports' 
                ? 'border-primary-600 text-primary-600 bg-transparent hover:bg-transparent' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-transparent hover:bg-transparent'
            }`}
          >
            <Flag className="w-4 h-4 mr-2" />
            Sūdzības ({reports.length})
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 rounded-none transition-colors whitespace-nowrap h-auto ${
              activeTab === 'settings' 
                ? 'border-primary-600 text-primary-600 bg-transparent hover:bg-transparent' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-transparent hover:bg-transparent'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Iestatījumi
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('ads')}
            className={`py-4 px-6 font-medium text-sm flex items-center border-b-2 rounded-none transition-colors whitespace-nowrap h-auto ${
              activeTab === 'ads' 
                ? 'border-primary-600 text-primary-600 bg-transparent hover:bg-transparent' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 bg-transparent hover:bg-transparent'
            }`}
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Reklāmas ({ads.length})
          </Button>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Input
                placeholder="Meklēt lietotājus pēc vārda vai e-pasta..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Loma">
                      {userRoleFilter === 'all' ? 'Visas lomas' : 
                       userRoleFilter === 'user' ? 'Lietotājs' : 
                       userRoleFilter === 'admin' ? 'Administrators' : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visas lomas</SelectItem>
                    <SelectItem value="user">Lietotājs</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userSort} onValueChange={setUserSort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kārtot">
                      {userSort === 'newest' ? 'Jaunākie vispirms' : 
                       userSort === 'oldest' ? 'Vecākie vispirms' : 
                       userSort === 'balance_desc' ? 'Lielākais atlikums' : 
                       userSort === 'balance_asc' ? 'Mazākais atlikums' : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Jaunākie vispirms</SelectItem>
                    <SelectItem value="oldest">Vecākie vispirms</SelectItem>
                    <SelectItem value="balance_desc">Lielākais atlikums</SelectItem>
                    <SelectItem value="balance_asc">Mazākais atlikums</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Vārds</TableHead>
                      <TableHead>E-pasts</TableHead>
                      <TableHead>Loma</TableHead>
                      <TableHead>Maks</TableHead>
                      <TableHead className="text-right">Darbības</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(u => 
                        (u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                        u.email.toLowerCase().includes(userSearch.toLowerCase())) &&
                        (userRoleFilter === 'all' || u.role === userRoleFilter)
                      )
                      .sort((a, b) => {
                        if (userSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        if (userSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        if (userSort === 'balance_desc') return b.balance - a.balance;
                        if (userSort === 'balance_asc') return a.balance - b.balance;
                        return 0;
                      })
                      .map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.id}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(value) => handleUpdateUserRole(u.id, value)}
                            disabled={u.id === user?.id} // Prevent changing own role
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue placeholder="Izvēlies lomu">
                                {u.role === 'user' ? 'Lietotājs' : 
                                 u.role === 'admin' ? 'Admins' : 
                                 u.role === 'b2b' ? 'B2B' : u.role}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Lietotājs</SelectItem>
                              <SelectItem value="b2b">B2B</SelectItem>
                              <SelectItem value="admin">Admins</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>€{u.balance.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {u.role !== 'admin' && (
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:text-red-900 flex items-center justify-end w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Dzēst
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Input
                placeholder="Meklēt sludinājumus pēc nosaukuma..."
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={listingCategoryFilter} onValueChange={setListingCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Kategorija">
                      {listingCategoryFilter === 'all' ? 'Visas kategorijas' : listingCategoryFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visas kategorijas</SelectItem>
                    {Array.from(new Set(listings.map(l => l.category))).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={listingSort} onValueChange={setListingSort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kārtot">
                      {listingSort === 'newest' ? 'Jaunākie vispirms' : 
                       listingSort === 'oldest' ? 'Vecākie vispirms' : 
                       listingSort === 'price_desc' ? 'Dārgākie vispirms' : 
                       listingSort === 'price_asc' ? 'Lētākie vispirms' : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Jaunākie vispirms</SelectItem>
                    <SelectItem value="oldest">Vecākie vispirms</SelectItem>
                    <SelectItem value="price_desc">Dārgākie vispirms</SelectItem>
                    <SelectItem value="price_asc">Lētākie vispirms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nosaukums</TableHead>
                      <TableHead>Cena</TableHead>
                      <TableHead>Kategorija</TableHead>
                      <TableHead>Atrašanās vieta</TableHead>
                      <TableHead>Autors</TableHead>
                      <TableHead className="text-right">Darbības</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings
                      .filter(l => 
                        l.title.toLowerCase().includes(listingSearch.toLowerCase()) &&
                        (listingCategoryFilter === 'all' || l.category === listingCategoryFilter)
                      )
                      .sort((a, b) => {
                        if (listingSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        if (listingSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        if (listingSort === 'price_desc') return b.price - a.price;
                        if (listingSort === 'price_asc') return a.price - b.price;
                        return 0;
                      })
                      .map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.id}</TableCell>
                        <TableCell>{l.title}</TableCell>
                        <TableCell>€{l.price.toFixed(2)}</TableCell>
                        <TableCell>{l.category}</TableCell>
                        <TableCell>{l.location || 'Nav norādīta'}</TableCell>
                        <TableCell>{l.author_name} ({l.author_email})</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteListing(l.id)}
                            className="text-red-600 hover:text-red-900 flex items-center justify-end w-full"
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Dzēst
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Input
                placeholder="Meklēt sūdzības pēc iemesla vai iesniedzēja..."
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={reportStatusFilter} onValueChange={setReportStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Statuss">
                      {reportStatusFilter === 'all' ? 'Visi statusi' : 
                       reportStatusFilter === 'pending' ? 'Gaida' : 
                       reportStatusFilter === 'resolved' ? 'Atrisināts' : 
                       reportStatusFilter === 'dismissed' ? 'Noraidīts' : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visi statusi</SelectItem>
                    <SelectItem value="pending">Gaida</SelectItem>
                    <SelectItem value="resolved">Atrisināts</SelectItem>
                    <SelectItem value="dismissed">Noraidīts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={reportSort} onValueChange={setReportSort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kārtot">
                      {reportSort === 'newest' ? 'Jaunākie vispirms' : 
                       reportSort === 'oldest' ? 'Vecākie vispirms' : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Jaunākie vispirms</SelectItem>
                    <SelectItem value="oldest">Vecākie vispirms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Sūdzības iesniedzējs</TableHead>
                      <TableHead>Mērķis</TableHead>
                      <TableHead>Iemesls</TableHead>
                      <TableHead>Statuss</TableHead>
                      <TableHead className="text-right">Darbības</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports
                      .filter(r => 
                        (r.reason.toLowerCase().includes(reportSearch.toLowerCase()) || 
                        r.reporter_name.toLowerCase().includes(reportSearch.toLowerCase())) &&
                        (reportStatusFilter === 'all' || r.status === reportStatusFilter)
                      )
                      .sort((a, b) => {
                        if (reportSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        if (reportSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        return 0;
                      })
                      .map((r) => (
                      <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell>{r.reporter_name}</TableCell>
                      <TableCell>
                        {r.listing_id ? `Sludinājums: ${r.reported_listing_title}` : `Lietotājs: ${r.reported_user_name}`}
                      </TableCell>
                      <TableCell className="max-w-xs truncate" title={r.reason}>{r.reason}</TableCell>
                      <TableCell>
                        <Badge variant={
                          r.status === 'pending' ? 'outline' : 
                          r.status === 'resolved' ? 'default' : 
                          'secondary'
                        } className={
                          r.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                          r.status === 'resolved' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                          ''
                        }>
                          {r.status === 'pending' ? 'Gaida' : r.status === 'resolved' ? 'Atrisināts' : 'Noraidīts'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'pending' && (
                          <div className="flex items-center justify-end space-x-2">
                            {r.listing_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const success = await handleDeleteListing(r.listing_id!);
                                  if (success) {
                                    handleUpdateReportStatus(r.id, 'resolved');
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                title="Dzēst sludinājumu"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                            {r.user_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  const success = await handleDeleteUser(r.user_id!);
                                  if (success) {
                                    handleUpdateReportStatus(r.id, 'resolved');
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 hover:bg-red-50"
                                title="Dzēst lietotāju"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50"
                              title="Atzīmēt kā atrisinātu"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </Button>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}
                              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              title="Noraidīt"
                            >
                              <XCircle className="w-5 h-5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                <Input
                  type="number"
                  value={settings.early_access_price || ''}
                  onChange={(e) => setSettings({ ...settings, early_access_price: e.target.value })}
                  required
                  min="0"
                />
                <p className="mt-1 text-sm text-slate-500">Punktu skaits, kas nepieciešams, lai iegādātos agro piekļuvi.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reklāmas cena (punktos)
                </label>
                <Input
                  type="number"
                  value={settings.ad_price_points || ''}
                  onChange={(e) => setSettings({ ...settings, ad_price_points: e.target.value })}
                  required
                  min="0"
                />
                <p className="mt-1 text-sm text-slate-500">Punktu skaits, kas nepieciešams, lai lietotājs nopirktu reklāmas vietu.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Agrās piekļuves ilgums (stundās)
                </label>
                <Input
                  type="number"
                  value={settings.early_access_duration_hours || ''}
                  onChange={(e) => setSettings({ ...settings, early_access_duration_hours: e.target.value })}
                  required
                  min="1"
                />
                <p className="mt-1 text-sm text-slate-500">Cik ilgi (stundās) lietotājam būs aktīva agrā piekļuve pēc iegādes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  100 punktu cena (EUR)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.points_price_eur_per_100 || ''}
                  onChange={(e) => setSettings({ ...settings, points_price_eur_per_100: e.target.value })}
                  required
                  min="0"
                />
                <p className="mt-1 text-sm text-slate-500">Cik maksā 100 punkti (šobrīd tikai vizuāli).</p>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Saglabāt iestatījumus
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Input
                placeholder="Meklēt reklāmas pēc nosaukuma vai lietotāja..."
                value={adSearch}
                onChange={(e) => setAdSearch(e.target.value)}
                className="max-w-md"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={adStatusFilter} onValueChange={setAdStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Statuss" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visi statusi</SelectItem>
                    <SelectItem value="approved">Apstiprināts</SelectItem>
                    <SelectItem value="pending">Gaida</SelectItem>
                    <SelectItem value="rejected">Noraidīts</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={adSort} onValueChange={setAdSort}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kārtot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Jaunākie vispirms</SelectItem>
                    <SelectItem value="oldest">Vecākie vispirms</SelectItem>
                    <SelectItem value="views_desc">Vairāk skatījumu</SelectItem>
                    <SelectItem value="clicks_desc">Vairāk klikšķu</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => openAdModal()}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pievienot reklāmu
                </Button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reklāma</TableHead>
                      <TableHead>Lietotājs / Kat.</TableHead>
                      <TableHead>Izmērs</TableHead>
                      <TableHead>Periods</TableHead>
                      <TableHead>Statistika</TableHead>
                      <TableHead>Statuss</TableHead>
                      <TableHead className="text-right">Darbības</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads
                      .filter(a => 
                        (a.title.toLowerCase().includes(adSearch.toLowerCase()) || 
                        (a.user_name && a.user_name.toLowerCase().includes(adSearch.toLowerCase()))) &&
                        (adStatusFilter === 'all' || a.status === adStatusFilter)
                      )
                      .sort((a, b) => {
                        if (adSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        if (adSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                        if (adSort === 'views_desc') return b.views - a.views;
                        if (adSort === 'clicks_desc') return b.clicks - a.clicks;
                        return 0;
                      })
                      .map((ad) => (
                      <TableRow key={ad.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <img src={ad.image_url} alt={ad.title} className="h-10 w-10 object-cover rounded border border-slate-200 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-slate-900">{ad.title}</div>
                            <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline truncate max-w-[200px] inline-block">
                              {ad.link_url}
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{ad.user_name || 'Admins'}</div>
                        <div className="text-xs text-slate-500">{ad.category || 'Visas kategorijas'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ad.size}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        <div className="text-sm">No: {new Date(ad.start_date).toLocaleDateString('lv-LV')}</div>
                        <div className="text-sm">Līdz: {new Date(ad.end_date).toLocaleDateString('lv-LV')}</div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        <div className="text-sm">Skatījumi: {ad.views}</div>
                        <div className="text-sm">Klikšķi: {ad.clicks}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={
                            ad.status === 'approved' ? 'default' :
                            ad.status === 'pending' ? 'outline' :
                            'destructive'
                          } className={`w-fit ${
                            ad.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                            ad.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                            ''
                          }`}>
                            {ad.status === 'approved' ? 'Apstiprināta' :
                             ad.status === 'pending' ? 'Gaida' : 'Noraidīta'}
                          </Badge>
                          <Badge variant="secondary" className={`w-fit ${
                            ad.is_active === 1 
                              ? new Date(ad.end_date) < new Date() 
                                ? 'bg-slate-100 text-slate-800' // Expired
                                : 'bg-blue-100 text-blue-800' // Active
                              : 'bg-slate-100 text-slate-800' // Inactive
                          }`}>
                            {ad.is_active === 1 
                              ? new Date(ad.end_date) < new Date() ? 'Beigusies' : 'Aktīva'
                              : 'Neaktīva'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {ad.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuickAdStatus(ad, 'approved')}
                              className="text-green-600 hover:text-green-900 hover:bg-green-50 mr-1"
                              title="Apstiprināt"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </Button>
                            <Button 
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuickAdStatus(ad, 'rejected')}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 mr-1"
                              title="Noraidīt"
                            >
                              <XCircle className="w-5 h-5" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => openStatsModal(ad)}
                          className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 mr-1"
                          title="Skatīt statistiku"
                        >
                          <BarChart3 className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => openAdModal(ad)}
                          className="text-primary-600 hover:text-primary-900 hover:bg-primary-50 mr-1"
                          title="Rediģēt"
                        >
                          <Edit className="w-5 h-5" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAd(ad.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                          title="Dzēst"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                        Nav pievienotu reklāmu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => setIsAdModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </Button>
            </div>
            
            <form onSubmit={handleSaveAd} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nosaukums</label>
                <Input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={e => setAdForm({...adForm, title: e.target.value})}
                  placeholder="Pavasara izpārdošana"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attēla URL (JPG, PNG, GIF)</label>
                <Input
                  type="url"
                  required
                  value={adForm.image_url}
                  onChange={e => setAdForm({...adForm, image_url: e.target.value})}
                  placeholder="https://example.com/banner.gif"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Saites URL (kurp vedīs klikšķis)</label>
                <Input
                  type="url"
                  required
                  value={adForm.link_url}
                  onChange={e => setAdForm({...adForm, link_url: e.target.value})}
                  placeholder="https://example.com/promo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Izmērs / Novietojums</label>
                <Select value={adForm.size} onValueChange={value => setAdForm({...adForm, size: value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Izvēlieties izmēru" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="728x90">Leaderboard (728x90) - Augšā/Apakšā</SelectItem>
                    <SelectItem value="300x250">Medium Rectangle (300x250) - Sānos/Sarakstā</SelectItem>
                    <SelectItem value="970x250">Billboard (970x250) - Liels baneris augšā</SelectItem>
                    <SelectItem value="300x600">Half Page (300x600) - Sānu panelī</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sākuma datums</label>
                  <Input
                    type="datetime-local"
                    required
                    value={adForm.start_date}
                    onChange={e => setAdForm({...adForm, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Beigu datums</label>
                  <Input
                    type="datetime-local"
                    required
                    value={adForm.end_date}
                    onChange={e => setAdForm({...adForm, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategorija (Mērķauditorija)</label>
                <Select value={adForm.category || 'all'} onValueChange={value => setAdForm({...adForm, category: value === 'all' ? '' : value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Izvēlieties kategoriju" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Visas kategorijas (Rādīt visur)</SelectItem>
                    <SelectItem value="Transports">Transports</SelectItem>
                    <SelectItem value="Nekustamais īpašums">Nekustamais īpašums</SelectItem>
                    <SelectItem value="Elektronika">Elektronika</SelectItem>
                    <SelectItem value="Mājai un dārzam">Mājai un dārzam</SelectItem>
                    <SelectItem value="Apģērbi un apavi">Apģērbi un apavi</SelectItem>
                    <SelectItem value="Pakalpojumi">Pakalpojumi</SelectItem>
                    <SelectItem value="Cits">Cits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statuss</label>
                <Select value={adForm.status} onValueChange={value => setAdForm({...adForm, status: value})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Izvēlieties statusu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Apstiprināta</SelectItem>
                    <SelectItem value="pending">Gaida apstiprinājumu</SelectItem>
                    <SelectItem value="rejected">Noraidīta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center mt-4 space-x-2">
                <Checkbox
                  id="is_active"
                  checked={adForm.is_active}
                  onCheckedChange={(checked) => setAdForm({...adForm, is_active: checked as boolean})}
                />
                <label htmlFor="is_active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900">
                  Reklāma ir aktīva
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 mt-6">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAdModalOpen(false)}
                  className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Atcelt
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingAd ? 'Saglabāt izmaiņas' : 'Pievienot'}
                </Button>
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
              <Button 
                variant="ghost"
                size="icon"
                onClick={() => setIsStatsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </Button>
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
