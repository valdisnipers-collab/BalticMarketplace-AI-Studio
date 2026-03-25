import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Users, Package, Trash2, ShieldAlert, Flag, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

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

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'reports'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

      </div>
    </div>
  );
}
