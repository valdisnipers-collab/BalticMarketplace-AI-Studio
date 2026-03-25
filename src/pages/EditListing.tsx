import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Pencil, Image as ImageIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

const categories = [
  'Transports',
  'Nekustamais īpašums',
  'Elektronika',
  'Darbs un pakalpojumi',
  'Mājai un dārzam',
  'Cits'
];

export default function EditListing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [imageUrl, setImageUrl] = useState('');
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Aizsargāts ceļš - ja nav ielogojies, sūta uz login lapu
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Ielādējam esošos datus
  useEffect(() => {
    if (!id) return;

    fetch(`/api/listings/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Sludinājums nav atrasts');
        return res.json();
      })
      .then(data => {
        setTitle(data.title);
        setDescription(data.description || '');
        setPrice(data.price.toString());
        setCategory(data.category);
        setImageUrl(data.image_url || '');
        setIsFetching(false);
      })
      .catch(err => {
        setError(err.message);
        setIsFetching(false);
      });
  }, [id]);

  if (loading || isFetching) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price),
          category,
          image_url: imageUrl
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Neizdevās atjaunināt sludinājumu');
      }

      // Pēc veiksmīgas atjaunināšanas atgriežamies uz profilu
      navigate('/profile');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/profile" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atpakaļ uz profilu
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
        >
          <div className="px-6 py-8 sm:p-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="h-12 w-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <Pencil className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Rediģēt sludinājumu
                </h2>
                <p className="text-sm text-slate-500">
                  Atjaunini informāciju par savu preci vai pakalpojumu.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Virsraksts */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                    Sludinājuma virsraksts *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                {/* Kategorija un Cena */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                      Kategorija *
                    </label>
                    <select
                      id="category"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1">
                      Cena (€) *
                    </label>
                    <input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                </div>

                {/* Apraksts */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                    Apraksts
                  </label>
                  <textarea
                    id="description"
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>

                {/* Attēla URL */}
                <div>
                  <label htmlFor="imageUrl" className="block text-sm font-medium text-slate-700 mb-1">
                    Attēla saite (URL)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="imageUrl"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="appearance-none block w-full pl-10 px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Pievieno publisku saiti uz attēlu (piemēram, no Imgur).
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Saglabā...' : 'Saglabāt izmaiņas'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
