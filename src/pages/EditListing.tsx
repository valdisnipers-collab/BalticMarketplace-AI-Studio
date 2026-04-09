import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { Pencil, Image as ImageIcon, AlertCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { parseImages } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle } from 'lucide-react';
import { CATEGORY_SCHEMAS, CATEGORY_NAMES } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EditListing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/upload/multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Neizdevās augšupielādēt attēlus');
      }

      const data = await res.json();
      setImageUrls(prev => [...prev, ...data.urls]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
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
        setLocation(data.location || '');
        setCategory(data.category);
        setImageUrls(parseImages(data.image_url));
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
          location,
          category,
          image_url: JSON.stringify(imageUrls),
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
                    <Select value={category} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Izvēlieties kategoriju" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_NAMES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                    Atrašanās vieta
                  </label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full"
                    placeholder="Pilsēta vai novads..."
                  />
                </div>

                {/* Apakškategorija */}
                {subcategories.length > 0 && (
                  <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-slate-700 mb-1">
                      Apakškategorija *
                    </label>
                    <Select value={subcategory} onValueChange={handleSubcategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Izvēlieties apakškategoriju" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map(subcat => (
                          <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          <Select 
                            value={attributes[field.name] || 'all'} 
                            onValueChange={(value) => setAttributes({...attributes, [field.name]: value === 'all' ? '' : value})}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Izvēlieties...">
                                {attributes[field.name] || 'Izvēlieties...'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Izvēlieties...</SelectItem>
                              {field.options?.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                {/* Attēli */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Attēli</label>
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
                          multiple
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>

                    {/* Preview Grid */}
                    {imageUrls.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                        <AnimatePresence>
                          {imageUrls.map((url, index) => (
                            <motion.div 
                              key={`${url}-${index}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 border border-slate-200 shadow-sm group"
                            >
                              <img 
                                src={url} 
                                alt={`Preview ${index + 1}`} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Invalid+Image';
                                }}
                              />
                              {index === 0 && (
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-primary-600 hover:bg-primary-700 text-white border-none shadow-md text-[9px] uppercase tracking-wider px-2 py-0.5">
                                    Galvenais
                                  </Badge>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="p-2 bg-white/90 backdrop-blur-md rounded-full shadow-xl hover:bg-red-50 text-red-500 transition-all transform hover:scale-110"
                                >
                                  <PlusCircle className="w-5 h-5 rotate-45" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
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
