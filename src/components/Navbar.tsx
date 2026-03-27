import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Plus, User, LogOut, MessageSquare, ShieldAlert, ShieldCheck, Coins } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, signOut, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && token) {
      const fetchUnreadCount = async () => {
        try {
          const res = await fetch('/api/messages/unread-count', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      };

      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [user, token]);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-primary-900 uppercase">BALTIC<span className="text-primary-600">MODERN</span></span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/search" className="text-sm font-bold tracking-wide text-slate-600 hover:text-primary-600 transition-colors uppercase">Atklāt</Link>
              <Link to="/search?category=auto" className="text-sm font-bold tracking-wide text-slate-600 hover:text-primary-600 transition-colors uppercase">Auto</Link>
              <Link to="/search?category=nekustamais-ipasums" className="text-sm font-bold tracking-wide text-slate-600 hover:text-primary-600 transition-colors uppercase">Īpašumi</Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'admin' && (
                  <Link 
                    to="/admin"
                    className="p-2 text-red-500 hover:text-red-600 transition-colors"
                    title="Admin Panelis"
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </Link>
                )}
                <Link to="/chat" className="p-2 text-slate-500 hover:text-primary-600 relative transition-colors">
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-accent-amber text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="flex items-center space-x-3 p-1.5 pr-3 rounded-full bg-slate-50 border border-slate-100 hover:border-primary-200 transition-all">
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
                    {user.name?.[0] || 'U'}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-slate-900 leading-none">{user.name || user.phone}</div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center">
                      <Coins className="w-2.5 h-2.5 mr-1 text-accent-amber" />
                      {user.points} pts
                      {user.is_verified && (
                        <ShieldCheck className="w-3 h-3 ml-1 text-green-500" />
                      )}
                    </div>
                  </div>
                </Link>
                <Link 
                  to="/add" 
                  className="hidden sm:flex items-center px-5 py-2.5 bg-primary-600 text-white text-sm font-bold tracking-wide rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all active:scale-95 uppercase"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Pievienot
                </Link>
                <button 
                  onClick={signOut} 
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Iziet"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-sm font-bold tracking-wide text-slate-600 hover:text-primary-600 px-4 py-2 transition-colors uppercase">Ienākt</Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2.5 bg-primary-600 text-white text-sm font-bold tracking-wide rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all active:scale-95 uppercase"
                >
                  Reģistrēties
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
