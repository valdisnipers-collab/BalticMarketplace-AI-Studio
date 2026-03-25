import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useState, useEffect } from 'react';

export default function BottomNav() {
  const location = useLocation();
  const { user, token } = useAuth();
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

  const navItems = [
    { path: '/', icon: Home, label: 'Sākums' },
    { path: '/profile', icon: Heart, label: 'Favorīti', state: { activeTab: 'favorites' } },
    { path: '/add', icon: PlusCircle, label: 'Pievienot', isPrimary: true },
    { path: '/chat', icon: MessageCircle, label: 'Čats', badge: unreadCount },
    { path: '/profile', icon: User, label: 'Profils' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path && (!item.state || location.state?.activeTab === item.state.activeTab);

          if (item.isPrimary) {
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="bg-primary-600 text-white p-3 rounded-full shadow-lg shadow-primary-600/30 border-4 border-slate-50">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium text-slate-600 mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link 
              key={item.label} 
              to={item.path}
              state={item.state}
              className={`relative flex flex-col items-center justify-center w-16 h-full ${
                isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-primary-50' : ''}`} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
