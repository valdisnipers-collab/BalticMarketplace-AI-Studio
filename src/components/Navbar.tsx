import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PlusCircle, User, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, signOut } = useAuth();

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
                <Link 
                  to="/profile"
                  className="flex items-center text-sm font-medium text-slate-700 hover:text-primary-600 transition-colors"
                >
                  <User className="w-4 h-4 mr-1.5" />
                  {user.name || user.email}
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
