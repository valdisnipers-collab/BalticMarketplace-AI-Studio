import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import { Plus, User, LogOut, MessageSquare, ShieldAlert, ShieldCheck, Coins, Bell, Globe, ChevronDown, Search, Heart, Star, Info, PlusCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";

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
  const navigate = useNavigate();
  const { user, signOut, token } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
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
    <nav className="sticky top-0 z-[100] bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <Link to="/" className="flex items-center space-x-3 group shrink-0">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#E64415] rounded-md flex items-center justify-center">
                  <span className="text-white font-black text-2xl italic">b</span>
                </div>
                <div className="ml-1 flex flex-col justify-center">
                  <span className="text-2xl font-bold tracking-tighter text-[#2D1152] leading-none">balticmarket</span>
                  <span className="text-[10px] font-medium text-slate-500 leading-none mt-0.5 hidden sm:block">Baltijas lielākais sludinājumu portāls</span>
                </div>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-base font-semibold text-slate-900 hover:bg-transparent hover:text-[#E64415] gap-1 px-2 group">
                    {t('home.search.button')} <ChevronDown className="w-4 h-4 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={20} className="w-[800px] p-0 overflow-hidden rounded-[32px] shadow-2xl border-none ring-1 ring-slate-200">
                  <div className="flex bg-white">
                    {/* Left Column - Visual/Featured */}
                    <div className="w-1/3 bg-slate-50/50 p-8 border-r border-slate-100">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Piedāvājums</h4>
                      <Link to="/search?highlighted=true" className="group/item block">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-sm">
                          <img 
                            src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=400" 
                            alt="Premium" 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          <div className="absolute bottom-3 left-3">
                            <Badge className="bg-[#E64415] text-white border-none font-bold text-[10px]">PREMIUM</Badge>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 group-hover/item:text-[#E64415] transition-colors">Skatīt labākos piedāvājumus</span>
                      </Link>
                    </div>

                    {/* Middle Column - Categories 1 */}
                    <div className="w-1/3 p-8">
                      <div className="mb-8">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{t('nav.auto')}</h4>
                        <ul className="space-y-3">
                          <li><Link to="/search?category=Transports&subcategory=Vieglie auto" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Vieglie auto</Link></li>
                          <li><Link to="/search?category=Transports&subcategory=Motocikli" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Motocikli</Link></li>
                          <li><Link to="/search?category=Transports&subcategory=Kravas auto" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Kravas auto</Link></li>
                          <li><Link to="/search?category=Transports&subcategory=Piekabes" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Piekabes</Link></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">{t('nav.realEstate')}</h4>
                        <ul className="space-y-3">
                          <li><Link to="/search?category=Īpašumi&subcategory=Dzīvokļi" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Dzīvokļi</Link></li>
                          <li><Link to="/search?category=Īpašumi&subcategory=Mājas" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Mājas</Link></li>
                          <li><Link to="/search?category=Īpašumi&subcategory=Zeme" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Zeme</Link></li>
                        </ul>
                      </div>
                    </div>

                    {/* Right Column - Categories 2 */}
                    <div className="w-1/3 p-8">
                      <div className="mb-8">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Elektronika</h4>
                        <ul className="space-y-3">
                          <li><Link to="/search?category=Elektronika&subcategory=Telefoni" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Telefoni</Link></li>
                          <li><Link to="/search?category=Elektronika&subcategory=Datori" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Datori</Link></li>
                          <li><Link to="/search?category=Elektronika&subcategory=Sadzīves tehnika" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Sadzīves tehnika</Link></li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Citi pakalpojumi</h4>
                        <ul className="space-y-3">
                          <li><Link to="/search?category=Darbs" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Darba vakances</Link></li>
                          <li><Link to="/search?category=Mājai" className="text-sm font-medium text-slate-700 hover:text-[#E64415] transition-colors block">Mājai un dārzam</Link></li>
                          <li><Link to="/search" className="text-sm font-semibold text-[#E64415] hover:underline transition-colors block">Visi sludinājumi →</Link></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-base font-semibold text-slate-900 hover:bg-transparent hover:text-[#E64415] gap-1 px-2 group">
                    {t('nav.sell')} <ChevronDown className="w-4 h-4 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={20} className="w-64 p-2 rounded-3xl shadow-2xl border-none ring-1 ring-slate-200">
                  <DropdownMenuItem onClick={() => navigate('/add')} className="rounded-2xl py-3 px-4 focus:bg-orange-50 focus:text-[#E64415]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-[#E64415]" />
                      </div>
                      <span className="font-semibold">{t('nav.addListing')}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile?tab=ads')} className="rounded-2xl py-3 px-4 focus:bg-orange-50 focus:text-[#E64415]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <PlusCircle className="w-4 h-4 text-slate-600" />
                      </div>
                      <span className="font-semibold">{t('profile.ads')}</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-base font-semibold text-slate-900 hover:bg-transparent hover:text-[#E64415] gap-1 px-2 group">
                    {t('nav.inform')} <ChevronDown className="w-4 h-4 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={20} className="w-64 p-2 rounded-3xl shadow-2xl border-none ring-1 ring-slate-200">
                  <DropdownMenuItem onClick={() => navigate('/help')} className="rounded-2xl py-3 px-4 focus:bg-orange-50 focus:text-[#E64415]">
                    <span className="font-semibold">Palīdzības centrs</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/rules')} className="rounded-2xl py-3 px-4 focus:bg-orange-50 focus:text-[#E64415]">
                    <span className="font-semibold">Lietošanas noteikumi</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/about')} className="rounded-2xl py-3 px-4 focus:bg-orange-50 focus:text-[#E64415]">
                    <span className="font-semibold">Par BalticMarket</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-3">
            <div className="flex items-center mr-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 text-slate-600 hover:text-[#E64415] font-semibold px-2">
                    <Globe className="w-5 h-5" />
                    <span className="hidden sm:inline">{lang}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={12} className="w-40">
                  {LANGUAGES.map((l) => (
                    <DropdownMenuItem 
                      key={l.code}
                      onClick={() => setLang(l.code as any)}
                      className={`cursor-pointer font-medium ${lang === l.code ? 'bg-primary-50 text-primary-700' : ''}`}
                    >
                      <span className="w-6 inline-block text-xs text-slate-400">{l.code}</span>
                      {l.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="relative" ref={notificationsRef}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-slate-600 hover:text-[#E64415] hover:bg-slate-50"
                >
                  <Bell className="w-6 h-6" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-[#E64415] text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-semibold text-slate-900 uppercase tracking-tight text-xs">{t('profile.notifications')}</h3>
                      {unreadNotificationsCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-bold text-[#E64415] hover:underline"
                        >
                          Atzīmēt visus
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
                              className={`p-4 transition-colors cursor-pointer ${notif.is_read ? 'bg-white' : 'bg-orange-50/30'}`}
                              onClick={() => markAsRead(notif.id)}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className={`text-sm font-semibold ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                                  {notif.title}
                                </h4>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className={`text-xs ${notif.is_read ? 'text-slate-500' : 'text-slate-700'}`}>
                                {notif.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/profile?tab=saved-searches">
                <Button variant="ghost" size="icon" className="text-slate-600 hover:text-[#E64415] hover:bg-slate-50">
                  <Star className="w-6 h-6" />
                </Button>
              </Link>

              <Link to="/profile?tab=favorites">
                <Button variant="ghost" size="icon" className="text-slate-600 hover:text-[#E64415] hover:bg-slate-50">
                  <Heart className="w-6 h-6" />
                </Button>
              </Link>
            </div>

            {user ? (
              <div className="flex items-center space-x-2 ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 p-1 pr-2 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200">
                      <div className="w-8 h-8 bg-[#2D1152] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {user.name?.[0] || 'U'}
                      </div>
                      <span className="hidden lg:block text-sm font-semibold text-slate-900">{user.name || user.phone}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={12} className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="flex items-center"><User className="w-4 h-4 mr-2" /> {t('nav.profile')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/chat')} className="flex items-center"><MessageSquare className="w-4 h-4 mr-2" /> {t('chat.title')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile?tab=wallet')} className="flex items-center"><Coins className="w-4 h-4 mr-2" /> {t('profile.wallet')}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600"><LogOut className="w-4 h-4 mr-2" /> {t('nav.logout')}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-2">
                <Link to="/login">
                  <Button className="bg-[#2D1152] hover:bg-[#1a0a30] text-white font-semibold px-6 rounded-lg h-10">
                    {t('nav.login')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
