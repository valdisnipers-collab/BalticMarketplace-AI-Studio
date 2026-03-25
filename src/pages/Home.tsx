import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Search, Car, Home as HomeIcon, Smartphone, Briefcase, Sofa, MoreHorizontal, Clock, MapPin, Image as ImageIcon, X, Heart } from 'lucide-react';
import { motion } from 'motion/react';

const categories = [
  { name: 'Transports', icon: Car, color: 'bg-blue-100 text-blue-600 border-blue-200' },
  { name: 'Nekustamais īpašums', icon: HomeIcon, color: 'bg-green-100 text-green-600 border-green-200' },
  { name: 'Elektronika', icon: Smartphone, color: 'bg-purple-100 text-purple-600 border-purple-200' },
  { name: 'Darbs un pakalpojumi', icon: Briefcase, color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { name: 'Mājai un dārzam', icon: Sofa, color: 'bg-rose-100 text-rose-600 border-rose-200' },
  { name: 'Cits', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  author_name: string;
}

export default function Home() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  
  // Filtrēšanas stāvokļi
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch listings", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('auth_token');
      fetch('/api/users/me/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then((data: Listing[]) => {
        setFavorites(new Set(data.map(item => item.id)));
      })
      .catch(err => console.error("Failed to fetch favorites", err));
    } else {
      setFavorites(new Set());
    }
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, listingId: number) => {
    e.preventDefault(); // Prevent navigating to listing details
    if (!user) {
      alert('Lūdzu, ienāc sistēmā, lai pievienotu favorītiem!');
      return;
    }

    const token = localStorage.getItem('auth_token');
    const isFavorite = favorites.has(listingId);

    try {
      if (isFavorite) {
        await fetch(`/api/favorites/${listingId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await fetch(`/api/favorites/${listingId}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setFavorites(prev => {
          const next = new Set(prev);
          next.add(listingId);
          return next;
        });
      }
    } catch (error) {
      console.error("Error toggling favorite", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('lv-LV', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Filtrēšanas loģika
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (listing.description && listing.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? listing.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section - Kompakts ar vietu pārklājumam */}
      <div className="bg-primary-700 pt-12 pb-28 sm:pt-16 sm:pb-36 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight">
            Atrodi visu nepieciešamo
          </h1>
          <p className="text-base sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto font-medium">
            Pērc, pārdod un mainies ar precēm ātri un droši.
          </p>
          
          {/* Search Bar */}
          <motion.form 
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
              }
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl p-2 flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="flex-grow flex items-center pl-4 w-full">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ko tu meklē? (piem., BMW, dzīvoklis Rīgā...)" 
                className="w-full py-3 px-4 text-slate-700 focus:outline-none text-base sm:text-lg placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <button type="submit" className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors shadow-sm">
              Meklēt
            </button>
          </motion.form>
        </motion.div>
      </div>

      {/* Categories Section - Uzpeldējošs (Overlapping) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-20 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <motion.div 
                key={cat.name} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                className={`bg-white rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group
                  ${isSelected 
                    ? 'ring-2 ring-primary-500 border-transparent transform -translate-y-1 sm:-translate-y-2' 
                    : 'border border-slate-100 hover:border-primary-300 hover:shadow-xl hover:-translate-y-1'
                  }`}
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-2 sm:mb-4 border transition-transform duration-300
                  ${isSelected ? 'bg-primary-100 text-primary-600 border-primary-200 scale-110' : cat.color}
                  ${!isSelected && 'group-hover:scale-110'}
                `}>
                  <cat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`text-xs sm:text-sm font-semibold text-center transition-colors
                  ${isSelected ? 'text-primary-700' : 'text-slate-700 group-hover:text-primary-600'}
                `}>
                  {cat.name}
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      
      {/* Listings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {selectedCategory ? `Sludinājumi: ${selectedCategory}` : searchQuery ? 'Meklēšanas rezultāti' : 'Jaunākie sludinājumi'}
          </h2>
          
          {(selectedCategory || searchQuery) && (
            <button 
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Notīrīt filtrus
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Nekas netika atrasts</h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto">
              Mēģini mainīt meklēšanas vārdus vai noņemt kategorijas filtru, lai redzētu vairāk rezultātu.
            </p>
            {!selectedCategory && !searchQuery && (
              <Link to="/add" className="mt-6 inline-block bg-primary-600 text-white font-medium hover:bg-primary-700 px-6 py-2.5 rounded-lg transition-colors shadow-sm">
                Pievieno pirmo sludinājumu!
              </Link>
            )}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {filteredListings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <Link 
                  to={`/listing/${listing.id}`}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-primary-300 transition-all group flex flex-col h-full"
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {listing.image_url ? (
                      <img 
                        src={listing.image_url} 
                        alt={listing.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-12 h-12 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 shadow-sm">
                      {listing.category}
                    </div>
                    <button 
                      onClick={(e) => toggleFavorite(e, listing.id)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
                    >
                      <Heart 
                        className={`w-4 h-4 ${favorites.has(listing.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} 
                      />
                    </button>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {listing.title}
                    </h3>
                    <p className="text-xl font-extrabold text-primary-600 mb-4">
                      € {listing.price.toFixed(2)}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {formatDate(listing.created_at)}
                      </div>
                      <div className="font-medium truncate max-w-[100px]">
                        {listing.author_name}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
