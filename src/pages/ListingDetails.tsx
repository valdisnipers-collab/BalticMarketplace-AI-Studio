import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, User, Mail, Image as ImageIcon } from 'lucide-react';

interface ListingDetails {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  created_at: string;
  author_name: string;
  author_email: string;
}

export default function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Sludinājums nav atrasts');
        return res.json();
      })
      .then(data => {
        setListing(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('lv-LV', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Kaut kas nogāja greizi</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Link to="/" className="text-primary-600 font-medium hover:text-primary-700 flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atpakaļ uz sākumlapu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atpakaļ uz visiem sludinājumiem
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Attēls */}
            <div className="bg-slate-100 aspect-square md:aspect-auto md:h-full relative flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
              {listing.image_url ? (
                <img 
                  src={listing.image_url} 
                  alt={listing.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <ImageIcon className="w-16 h-16 opacity-20 mb-2" />
                  <span className="text-sm font-medium">Nav pievienots attēls</span>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 shadow-sm">
                {listing.category}
              </div>
            </div>

            {/* Informācija */}
            <div className="p-6 sm:p-8 flex flex-col">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 leading-tight">
                  {listing.title}
                </h1>
                <p className="text-3xl font-extrabold text-primary-600">
                  € {listing.price.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center space-x-4 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-100">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {formatDate(listing.created_at)}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1.5" />
                  Latvija
                </div>
              </div>

              <div className="mb-8 flex-grow">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Apraksts</h3>
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {listing.description || "Pārdevējs nav pievienojis aprakstu."}
                </p>
              </div>

              {/* Pārdevēja informācija */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mt-auto">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Pārdevēja informācija</h3>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mr-3">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{listing.author_name}</p>
                    <p className="text-sm text-slate-500">Reģistrēts lietotājs</p>
                  </div>
                </div>
                
                <a 
                  href={`mailto:${listing.author_email}?subject=Par sludinājumu: ${listing.title}`}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Sazināties ar pārdevēju
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
