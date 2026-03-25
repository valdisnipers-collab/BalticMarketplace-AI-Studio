import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PlusCircle, User, LogOut, MessageCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
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
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600 tracking-tight">
              BalticMarket
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link 
              to="/add" 
              className="hidden sm:flex items-center text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-md transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Pievienot sludinājumu
            </Link>
            
            {user ? (
              <div className="flex items-center space-x-4 border-l border-slate-200 pl-6">
                {user.role === 'admin' && (
                  <Link 
                    to="/admin"
                    className="flex items-center text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    title="Admin Panelis"
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </Link>
                )}
                <Link 
                  to="/chat"
                  className="relative flex items-center text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
                  title="Ziņojumi"
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/profile"
                  className="flex items-center text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
                >
                  <User className="w-4 h-4 mr-1.5" />
                  {user.name || user.phone}
                  {user.is_verified && (
                    <ShieldCheck className="w-4 h-4 ml-1 text-green-500" title="Verificēts lietotājs" />
                  )}
                  <span className="ml-2 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {user.points} p.
                  </span>
                </Link>
                <button 
                  onClick={signOut} 
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Iziet"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center border-l border-slate-200 pl-6">
                <Link 
                  to="/login" 
                  className="flex items-center text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors"
                >
                  <User className="w-5 h-5 mr-1.5" />
                  Ienākt
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
