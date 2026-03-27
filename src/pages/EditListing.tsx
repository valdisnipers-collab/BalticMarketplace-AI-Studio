import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Pencil, Image as ImageIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORY_SCHEMAS, CATEGORY_NAMES } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EditListing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Neizdevās augšupielādēt attēlu');
      }

      const data = await res.json();
      setImageUrl(data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

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
        if (data.attributes) {
          try {
            const parsed = JSON.parse(data.attributes);
            setAttributes(parsed);
            if (parsed.subcategory) {
              setSubcategory(parsed.subcategory);
            } else {
              const subcats = Object.keys(CATEGORY_SCHEMAS[data.category]?.subcategories || {});
              if (subcats.length > 0) setSubcategory(subcats[0]);
            }
          } catch (e) {
            console.error("Failed to parse attributes", e);
          }
        } else {
          const subcats = Object.keys(CATEGORY_SCHEMAS[data.category]?.subcategories || {});
          if (subcats.length > 0) setSubcategory(subcats[0]);
        }
        setIsFetching(false);
      })
      .catch(err => {
        setError(err.message);
        setIsFetching(false);
      });
  }, [id]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const subcats = Object.keys(CATEGORY_SCHEMAS[newCategory]?.subcategories || {});
    const newSubcategory = subcats.length > 0 ? subcats[0] : '';
    setSubcategory(newSubcategory);
    
    const defaultAttrs: Record<string, string> = { subcategory: newSubcategory };
    const fields = CATEGORY_SCHEMAS[newCategory]?.subcategories[newSubcategory]?.fields || [];
    fields.forEach(f => {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        defaultAttrs[f.name] = f.options[0];
      } else {
        defaultAttrs[f.name] = '';
      }
    });
    setAttributes(defaultAttrs);
  };

  const handleSubcategoryChange = (newSubcategory: string) => {
    setSubcategory(newSubcategory);
    const defaultAttrs: Record<string, string> = { subcategory: newSubcategory };
    const fields = CATEGORY_SCHEMAS[category]?.subcategories[newSubcategory]?.fields || [];
    fields.forEach(f => {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        defaultAttrs[f.name] = f.options[0];
      } else {
        defaultAttrs[f.name] = '';
      }
    });
    setAttributes(defaultAttrs);
  };

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
          image_url: imageUrl,
          attributes: { ...attributes, subcategory }
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

  const currentFields = CATEGORY_SCHEMAS[category]?.subcategories[subcategory]?.fields || [];
  const subcategories = Object.keys(CATEGORY_SCHEMAS[category]?.subcategories || {});

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
                  <Input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Kategorija un Cena */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                      Kategorija *
                    </label>
                    <div className="relative">
                      <select
                        id="category"
                        required
                        value={category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      >
                        {CATEGORY_NAMES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1">
                      Cena (€) *
                    </label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Apakškategorija */}
                {subcategories.length > 0 && (
                  <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-slate-700 mb-1">
                      Apakškategorija *
                    </label>
                    <div className="relative">
                      <select
                        id="subcategory"
                        required
                        value={subcategory}
                        onChange={(e) => handleSubcategoryChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      >
                        {subcategories.map(subcat => (
                          <option key={subcat} value={subcat}>{subcat}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic Attributes */}
                {currentFields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    {currentFields.map(field => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          {field.label}
                        </label>
                        {field.type === 'select' ? (
                          <div className="relative">
                            <select
                              value={attributes[field.name] || ''}
                              onChange={(e) => setAttributes({...attributes, [field.name]: e.target.value})}
                              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            >
                              <option value="">Izvēlieties...</option>
                              {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        ) : (
                          <Input
                            type={field.type === 'number' ? 'number' : 'text'}
                            placeholder={field.placeholder}
                            value={attributes[field.name] || ''}
                            onChange={(e) => setAttributes({...attributes, [field.name]: e.target.value})}
                            className="w-full"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attēls</label>
                  <div className="space-y-4">
                    {/* File Upload */}
                    <div className="flex items-center justify-center w-full">
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {isUploading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-2"></div>
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                          )}
                          <p className="mb-2 text-sm text-slate-500">
                            <span className="font-semibold">Noklikšķiniet, lai augšupielādētu</span>
                          </p>
                          <p className="text-xs text-slate-500">PNG, JPG, GIF (Max 5MB)</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>

                    <div className="flex items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">vai ievadiet URL</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* URL Input */}
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <Input
                        id="imageUrl"
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full pl-10"
                        placeholder="https://piemers.lv/bilde.jpg"
                      />
                    </div>

                    {/* Preview */}
                    {imageUrl && (
                      <div className="mt-4 relative rounded-lg overflow-hidden h-48 bg-slate-100 border border-slate-200">
                        <img 
                          src={imageUrl} 
                          alt="Priekšskatījums" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Kļūda+ielādējot+attēlu';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? 'Saglabā...' : 'Saglabāt izmaiņas'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
