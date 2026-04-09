import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Plus, User, LogOut, MessageSquare, ShieldAlert, ShieldCheck, Coins, Bell, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const LANGUAGES = [
  { code: 'LV', name: 'Latviešu' },
  { code: 'LT', name: 'Lietuvių' },
  { code: 'EE', name: 'Eesti' },
  { code: 'EN', name: 'English' },
  { code: 'RU', name: 'Русский' }
];

export default function Navbar() {
  const { user, signOut, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentLang, setCurrentLang] = useState('LV');
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && token) {
      const fetchData = async () => {
        try {
          // Fetch unread messages
          const msgRes = await fetch('/api/messages/unread-count', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (msgRes.ok) {
            const data = await msgRes.json();
            setUnreadCount(data.count);
          }

          // Fetch notifications
          const notifRes = await fetch('/api/notifications', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (notifRes.ok) {
            const data = await notifRes.json();
            setNotifications(data);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
      const interval = setInterval(fetchData, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [user, token]);

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1 text-slate-600 hover:text-primary-600 font-bold">
                  <Globe className="w-4 h-4" />
                  <span>{currentLang}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem 
                    key={lang.code}
                    onClick={() => setCurrentLang(lang.code)}
                    className={`cursor-pointer font-medium ${currentLang === lang.code ? 'bg-primary-50 text-primary-700' : ''}`}
                  >
                    <span className="w-6 inline-block text-xs text-slate-400">{lang.code}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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

                <div className="relative" ref={notificationsRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-slate-500 hover:text-primary-600 relative transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm">Paziņojumi</h3>
                        {unreadNotificationsCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs font-bold text-primary-600 hover:text-primary-700"
                          >
                            Atzīmēt visus kā izlasītus
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-sm">
                            Nav jaunu paziņojumu
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {notifications.map(notif => (
                              <div 
                                key={notif.id} 
                                className={`p-4 transition-colors ${notif.is_read ? 'bg-white' : 'bg-primary-50/50'}`}
                                onClick={() => markAsRead(notif.id)}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className={`text-sm font-bold ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                                    {notif.title}
                                  </h4>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap ml-2">
                                    {new Date(notif.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className={`text-sm ${notif.is_read ? 'text-slate-500' : 'text-slate-700'}`}>
                                  {notif.message}
                                </p>
                                {notif.link && (
                                  <Link 
                                    to={notif.link}
                                    className="inline-block mt-2 text-xs font-bold text-primary-600 hover:text-primary-700"
                                    onClick={() => setShowNotifications(false)}
                                  >
                                    Skatīt vairāk →
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
                <Link to="/add" className={cn(buttonVariants({ variant: "default" }), "hidden sm:flex shadow-lg shadow-primary-600/20 uppercase tracking-wide")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Pievienot
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut} 
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Iziet"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className={cn(buttonVariants({ variant: "ghost" }), "text-sm font-bold tracking-wide text-slate-600 hover:text-primary-600 px-4 py-2 transition-colors uppercase")}>
                  Ienākt
                </Link>
                <Link to="/register" className={cn(buttonVariants({ variant: "default" }), "px-5 py-2.5 shadow-lg shadow-primary-600/20 uppercase tracking-wide")}>
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
