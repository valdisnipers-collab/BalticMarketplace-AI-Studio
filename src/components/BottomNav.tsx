import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, PlusCircle, MessageCircle, User } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: '/', icon: Home, label: 'Sākums' },
    { path: '/profile', icon: Heart, label: 'Favorīti', state: { activeTab: 'favorites' } },
    { path: '/add', icon: PlusCircle, label: 'Pievienot', isPrimary: true },
    { path: '/chat', icon: MessageCircle, label: 'Čats' },
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
              className={`flex flex-col items-center justify-center w-16 h-full ${
                isActive ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-6 h-6 mb-1 ${isActive ? 'fill-primary-50' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
