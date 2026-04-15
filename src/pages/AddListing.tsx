import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { PlusCircle, Image as ImageIcon, AlertCircle, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Info, Lock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORY_SCHEMAS, CATEGORY_NAMES } from '../lib/categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AddListing() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  
  // Form state
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Dynamic attributes state
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [saleType, setSaleType] = useState('fixed');
  const [auctionEndDate, setAuctionEndDate] = useState('');
  const [reservePrice, setReservePrice] = useState('');

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Reset subcategory when category changes
  useEffect(() => {
    const subcats = Object.keys(CATEGORY_SCHEMAS[category]?.subcategories || {});
    if (subcats.length > 0) {
      setSubcategory(subcats[0]);
    } else {
      setSubcategory('');
    }
  }, [category]);

  // Reset attributes when subcategory changes
  useEffect(() => {
    if (!subcategory) return;
    const defaultAttrs: Record<string, string> = { subcategory };
    const fields = CATEGORY_SCHEMAS[category]?.subcategories[subcategory]?.fields || [];
    fields.forEach(f => {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        defaultAttrs[f.name] = f.options[0];
      } else {
        defaultAttrs[f.name] = '';
      }
    });
    setAttributes(defaultAttrs);
  }, [subcategory, category]);

  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mb-4"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Authenticating...</span>
        </div>
      </div>
    );
  }

  const handleAttributeChange = (name: string, value: string) => {
    setAttributes(prev => ({ ...prev, [name]: value }));
  };

  const handleAIGenerateFromImage = async () => {
    if (imageUrls.length === 0) return;
    
    setIsGenerating(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/ai/generate-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl: imageUrls[0] })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās ģenerēt datus no attēla');
      
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.price) setPrice(data.price.toString());
      if (data.category && CATEGORY_NAMES.includes(data.category)) {
        setCategory(data.category);
      }
      
      // Move to step 3 if we are on step 1 or 2
      if (step < 3) setStep(3);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          title,
          ...attributes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās ģenerēt aprakstu');
      
      setDescription(data.description);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      nextStep();
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/listings', {
        method: 'POST',
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
          attributes: {
            ...attributes,
            saleType,
            ...(saleType === 'auction' && auctionEndDate ? { auctionEndDate } : {}),
            ...(saleType === 'auction' && reservePrice ? { reservePrice: parseFloat(reservePrice) } : {})
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Neizdevās pievienot sludinājumu');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !category) return;
    if (step === 2 && !subcategory) return;
    if (step === 3 && !title) {
      setError('Lūdzu, ievadiet sludinājuma virsrakstu');
      return;
    }
    setError('');
    setStep(prev => Math.min(prev + 1, 4));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentFields = CATEGORY_SCHEMAS[category]?.subcategories[subcategory]?.fields || [];
  const subcategories = Object.keys(CATEGORY_SCHEMAS[category]?.subcategories || {});

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-16 px-6 lg:px-8 selection:bg-primary-100 selection:text-primary-900">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <Badge variant="secondary" className="mb-6 uppercase tracking-wider text-[10px] px-4 py-2">
            <PlusCircle className="w-3 h-3 mr-2" />
            {t('add.title')}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            List your <span className="text-primary-600">Masterpiece</span>.
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto">
            Our curated marketplace ensures your items reach the right audience. Follow the steps to get started.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-16">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-slate-100 rounded-full z-0"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-primary-600 rounded-full z-0 transition-all duration-700 ease-in-out"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl border-2 font-bold transition-all duration-500 shadow-xl
                  ${step >= i ? 'bg-primary-900 border-primary-900 text-white scale-110' : 'bg-white border-slate-100 text-slate-300'}
                `}
              >
                {step > i ? <CheckCircle2 className="w-6 h-6 text-amber-400" /> : i}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span className={step >= 1 ? 'text-primary-900' : ''}>{t('add.step1')}</span>
            <span className={step >= 2 ? 'text-primary-900' : ''}>{t('add.step2')}</span>
            <span className={step >= 3 ? 'text-primary-900' : ''}>{t('add.step3')}</span>
            <span className={step >= 4 ? 'text-primary-900' : ''}>{t('add.step4')}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start"
              >
                <AlertCircle className="h-5 w-5 text-red-500 mr-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CATEGORY_NAMES.map(cat => (
                        <div 
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                            ${category === cat ? 'border-primary-900 bg-primary-50 shadow-inner' : 'border-slate-50 hover:border-primary-200 hover:bg-slate-50'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-bold uppercase tracking-tight ${category === cat ? 'text-primary-900' : 'text-slate-600'}`}>
                              {cat}
                            </span>
                            {category === cat && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {subcategories.map(subcat => (
                        <div 
                          key={subcat}
                          onClick={() => setSubcategory(subcat)}
                          className={`group p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                            ${subcategory === subcat ? 'border-primary-900 bg-primary-50 shadow-inner' : 'border-slate-50 hover:border-primary-200 hover:bg-slate-50'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-bold uppercase tracking-tight ${subcategory === subcat ? 'text-primary-900' : 'text-slate-600'}`}>
                              {subcat}
                            </span>
                            {subcategory === subcat && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Listing Title *</label>
                      <Input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary-600 text-slate-900 font-bold placeholder:text-slate-300 transition-all h-auto"
                        placeholder="e.g., 2024 Porsche 911 GT3 RS"
                      />
                    </div>

                    {currentFields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {currentFields.map(field => (
                          <div key={field.name} className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{field.label}</label>
                            {field.type === 'select' ? (
                              <Select 
                                value={attributes[field.name] || ''} 
                                onValueChange={(value) => handleAttributeChange(field.name, value)}
                              >
                                <SelectTrigger className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 text-slate-900 font-bold transition-all h-auto">
                                  <SelectValue placeholder="Izvēlieties..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={field.type}
                                value={attributes[field.name] || ''}
                                onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary-600 text-slate-900 font-bold placeholder:text-slate-300 transition-all h-auto"
                                placeholder={field.placeholder}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                        <Button
                          type="button"
                          onClick={handleGenerateDescription}
                          disabled={isGenerating || !title}
                          className="group bg-indigo-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg hover:bg-indigo-800 transition-all"
                          size="sm"
                        >
                          {isGenerating ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Sparkles className="w-3 h-3 mr-2 text-amber-400 group-hover:rotate-12 transition-transform" />
                          )}
                          AI CURATOR ASSIST
                        </Button>
                      </div>
                      <textarea
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-600 text-slate-900 font-medium placeholder:text-slate-300 transition-all leading-relaxed"
                        placeholder="Describe the condition, history, and unique features..."
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visual Assets</label>
                      <div className="grid grid-cols-1 gap-6">
                        {/* File Upload */}
                        <div className="flex items-center justify-center w-full">
                          <label className={`group flex flex-col items-center justify-center w-full h-48 border-2 border-slate-100 border-dashed rounded-3xl cursor-pointer bg-slate-50 hover:bg-slate-100/50 hover:border-primary-200 transition-all duration-500 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {isUploading ? (
                                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-600 mb-4"></div>
                              ) : (
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                  <ImageIcon className="w-8 h-8 text-primary-600" />
                                </div>
                              )}
                              <p className="mb-2 text-sm text-slate-900 font-bold uppercase tracking-tight">
                                Drop images here or <span className="text-primary-600 underline">browse</span>
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">High-resolution PNG, JPG (Max 5MB)</p>
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
                          <div className="space-y-4 mt-4">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                onClick={handleAIGenerateFromImage}
                                disabled={isGenerating}
                                className="group bg-indigo-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg hover:bg-indigo-800 transition-all"
                                size="sm"
                              >
                                {isGenerating ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                ) : (
                                  <Sparkles className="w-3 h-3 mr-2 text-amber-400 group-hover:rotate-12 transition-transform" />
                                )}
                                AUTO-FILL WITH AI
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
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
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div 
                    key="step4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-10"
                  >
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Model</label>
                      <div className="grid grid-cols-2 gap-6">
                        <div 
                          onClick={() => setSaleType('fixed')}
                          className={`p-8 rounded-3xl border-2 cursor-pointer text-center transition-all duration-300
                            ${saleType === 'fixed' ? 'border-primary-900 bg-primary-50 shadow-inner' : 'border-slate-50 hover:border-primary-200'}
                          `}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${saleType === 'fixed' ? 'bg-primary-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Lock className="w-6 h-6" />
                          </div>
                          <span className={`font-bold uppercase tracking-tight ${saleType === 'fixed' ? 'text-primary-900' : 'text-slate-600'}`}>Fixed Price</span>
                        </div>
                        <div 
                          onClick={() => setSaleType('auction')}
                          className={`p-8 rounded-3xl border-2 cursor-pointer text-center transition-all duration-300
                            ${saleType === 'auction' ? 'border-primary-900 bg-primary-50 shadow-inner' : 'border-slate-50 hover:border-primary-200'}
                          `}
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${saleType === 'auction' ? 'bg-primary-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <span className={`font-bold uppercase tracking-tight ${saleType === 'auction' ? 'text-primary-900' : 'text-slate-600'}`}>Auction</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {saleType === 'auction' ? 'Starting Bid (€) *' : 'Listing Price (€) *'}
                        </label>
                        <Button
                          type="button"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('auth_token');
                              const res = await fetch('/api/recommend-price', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ category, title, attributes })
                              });
                              const data = await res.json();
                              if (res.ok && data.price) {
                                setPrice(data.price.toString());
                              } else {
                                alert(data.error || 'Neizdevās noteikt ieteicamo cenu');
                              }
                            } catch (err) {
                              alert('Kļūda sazinoties ar serveri');
                            }
                          }}
                          disabled={!title || !category}
                          className="group bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm transition-all"
                          size="sm"
                        >
                          <Sparkles className="w-3 h-3 mr-2 text-emerald-500 group-hover:rotate-12 transition-transform" />
                          AI IETEIKT CENU
                        </Button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none">
                          <span className="text-2xl font-bold text-slate-300">€</span>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full pl-16 px-8 py-6 bg-slate-50 border-none rounded-3xl focus-visible:ring-2 focus-visible:ring-primary-600 text-4xl font-bold text-primary-950 placeholder:text-slate-200 transition-all h-auto"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {saleType === 'auction' && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Auction End Date & Time *
                          </label>
                          <Input
                            type="datetime-local"
                            required
                            value={auctionEndDate}
                            onChange={(e) => setAuctionEndDate(e.target.value)}
                            className="w-full px-8 py-6 bg-slate-50 border-none rounded-3xl focus-visible:ring-2 focus-visible:ring-primary-600 text-xl font-bold text-primary-950 transition-all h-auto"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Reserve Price (€) (Optional)
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-8 flex items-center pointer-events-none">
                              <span className="text-2xl font-bold text-slate-300">€</span>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={reservePrice}
                              onChange={(e) => setReservePrice(e.target.value)}
                              className="w-full pl-16 px-8 py-6 bg-slate-50 border-none rounded-3xl focus-visible:ring-2 focus-visible:ring-primary-600 text-4xl font-bold text-primary-950 placeholder:text-slate-200 transition-all h-auto"
                              placeholder="0.00"
                            />
                          </div>
                          <p className="text-xs text-slate-500">If the auction ends below this price, you are not obligated to sell.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</label>
                      <Input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary-600 text-slate-900 font-medium placeholder:text-slate-300 transition-all"
                        placeholder="City, Region..."
                      />
                    </div>

                    <div className="bg-amber-50 rounded-3xl p-6 flex items-start space-x-4">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5" />
                      </div>
                      <div className="text-xs text-amber-900 font-medium leading-relaxed">
                        By publishing, you agree to our <span className="font-bold underline">Seller Guidelines</span> and confirm that all information provided is accurate and authentic.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-12 mt-12 border-t border-slate-100 flex justify-between gap-6">
                {step > 1 ? (
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="flex-1 px-8 py-6 text-xs font-bold uppercase tracking-widest rounded-2xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-3" />
                    {t('add.back')}
                  </Button>
                ) : (
                  <div className="flex-1"></div>
                )}

                {step < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 px-8 py-6 text-xs font-bold uppercase tracking-widest rounded-2xl shadow-xl shadow-primary-900/20"
                  >
                    {t('add.next')}
                    <ArrowRight className="w-4 h-4 ml-3" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-8 py-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-3" />
                        {t('add.submit')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
            Nordic Horizon Curator System v2.6
          </p>
        </div>
      </div>
    </div>
  );
}
