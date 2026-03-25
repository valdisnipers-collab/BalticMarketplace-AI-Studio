import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { PlusCircle, Image as ImageIcon, AlertCircle, Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const categories = [
  'Transports',
  'Nekustamais īpašums',
  'Elektronika',
  'Darbs un pakalpojumi',
  'Mājai un dārzam',
  'Cits'
];

const categoryFields: Record<string, { name: string, label: string, type: string, options?: string[], placeholder?: string }[]> = {
  'Transports': [
    { name: 'brand', label: 'Marka/Ražotājs', type: 'text', placeholder: 'Piem., BMW, Audi' },
    { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., 320i, A4' },
    { name: 'year', label: 'Izlaiduma gads', type: 'number', placeholder: 'Piem., 2015' },
    { name: 'mileage', label: 'Nobraukums (km)', type: 'number', placeholder: 'Piem., 150000' },
    { name: 'engine', label: 'Dzinējs', type: 'text', placeholder: 'Piem., 2.0 Dīzelis' },
    { name: 'transmission', label: 'Ātrumkārba', type: 'select', options: ['Manuāla', 'Automāts'] },
    { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
  ],
  'Nekustamais īpašums': [
    { name: 'type', label: 'Īpašuma tips', type: 'select', options: ['Dzīvoklis', 'Māja', 'Zeme', 'Komerctelpas'] },
    { name: 'action', label: 'Darījuma veids', type: 'select', options: ['Pārdod', 'Izīrē', 'Pērk', 'Īrē'] },
    { name: 'area', label: 'Platība (m²)', type: 'number', placeholder: 'Piem., 55' },
    { name: 'rooms', label: 'Istabu skaits', type: 'number', placeholder: 'Piem., 2' },
    { name: 'floor', label: 'Stāvs', type: 'text', placeholder: 'Piem., 3/5' },
    { name: 'location', label: 'Atrašanās vieta', type: 'text', placeholder: 'Piem., Rīga, Centrs' },
  ],
  'Elektronika': [
    { name: 'brand', label: 'Ražotājs', type: 'text', placeholder: 'Piem., Apple, Samsung' },
    { name: 'model', label: 'Modelis', type: 'text', placeholder: 'Piem., iPhone 13' },
    { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots (Kā jauns)', 'Lietots', 'Bojāts'] },
  ],
  'Darbs un pakalpojumi': [
    { name: 'type', label: 'Tips', type: 'select', options: ['Piedāvā darbu', 'Meklē darbu', 'Piedāvā pakalpojumu', 'Meklē pakalpojumu'] },
    { name: 'experience', label: 'Pieredze', type: 'text', placeholder: 'Piem., 3 gadi' },
    { name: 'location', label: 'Atrašanās vieta', type: 'text', placeholder: 'Piem., Attālināti vai Rīga' },
  ],
  'Mājai un dārzam': [
    { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
  ],
  'Cits': [
    { name: 'condition', label: 'Stāvoklis', type: 'select', options: ['Jauns', 'Lietots', 'Bojāts'] },
  ]
};

export default function AddListing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);
  
  // Form state
  const [category, setCategory] = useState(categories[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Dynamic attributes state
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [saleType, setSaleType] = useState('fixed');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Reset attributes when category changes
  useEffect(() => {
    const defaultAttrs: Record<string, string> = {};
    const fields = categoryFields[category] || [];
    fields.forEach(f => {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        defaultAttrs[f.name] = f.options[0];
      } else {
        defaultAttrs[f.name] = '';
      }
    });
    setAttributes(defaultAttrs);
  }, [category]);

  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleAttributeChange = (name: string, value: string) => {
    setAttributes(prev => ({ ...prev, [name]: value }));
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
    if (step < 3) {
      setStep(step + 1);
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
          category,
          image_url: imageUrl,
          attributes: {
            ...attributes,
            saleType
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
    if (step === 2 && !title) {
      setError('Lūdzu, ievadiet sludinājuma virsrakstu');
      return;
    }
    setError('');
    setStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const currentFields = categoryFields[category] || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary-600 rounded-full z-0 transition-all duration-300"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
            
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold transition-colors duration-300
                  ${step >= i ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-300 text-slate-400'}
                `}
              >
                {step > i ? <CheckCircle2 className="w-6 h-6" /> : i}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs font-medium text-slate-500">
            <span>Kategorija</span>
            <span>Detaļas</span>
            <span>Cena</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="h-12 w-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {step === 1 && "Izvēlies kategoriju"}
                  {step === 2 && "Sludinājuma detaļas"}
                  {step === 3 && "Cena un publicēšana"}
                </h2>
                <p className="text-sm text-slate-500">
                  {step === 1 && "Kādai kategorijai atbilst tavs sludinājums?"}
                  {step === 2 && "Aizpildi informāciju un ļauj AI uzrakstīt aprakstu."}
                  {step === 3 && "Norādi cenu un pārdošanas veidu."}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {categories.map(cat => (
                        <div 
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all
                            ${category === cat ? 'border-primary-600 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}
                          `}
                        >
                          <span className={`font-medium ${category === cat ? 'text-primary-700' : 'text-slate-700'}`}>
                            {cat}
                          </span>
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Virsraksts *</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Piem., Pārdodu mazlietotu velosipēdu"
                      />
                    </div>

                    {currentFields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentFields.map(field => (
                          <div key={field.name}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
                            {field.type === 'select' ? (
                              <select
                                value={attributes[field.name] || ''}
                                onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 bg-white"
                              >
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type}
                                value={attributes[field.name] || ''}
                                onChange={(e) => handleAttributeChange(field.name, e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                placeholder={field.placeholder}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">Apraksts</label>
                        <button
                          type="button"
                          onClick={handleGenerateDescription}
                          disabled={isGenerating}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1.5" />
                          )}
                          Ģenerēt ar AI
                        </button>
                      </div>
                      <textarea
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Apraksti preces stāvokli, īpašības un citu svarīgu informāciju..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Attēla saite (URL)</label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="w-full pl-10 px-4 py-3 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                          placeholder="https://piemers.lv/bilde.jpg"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Pārdošanas veids</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          onClick={() => setSaleType('fixed')}
                          className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all
                            ${saleType === 'fixed' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-700'}
                          `}
                        >
                          <span className="font-medium">Fiksēta cena</span>
                        </div>
                        <div 
                          onClick={() => setSaleType('auction')}
                          className={`p-4 rounded-xl border-2 cursor-pointer text-center transition-all
                            ${saleType === 'auction' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-700'}
                          `}
                        >
                          <span className="font-medium">Izsole</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {saleType === 'auction' ? 'Sākuma cena (€) *' : 'Cena (€) *'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-xl font-bold"
                        placeholder="0.00"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-8 mt-8 border-t border-slate-200 flex justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Atpakaļ
                  </button>
                ) : (
                  <div></div>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Tālāk
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-8 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Publicē...' : 'Publicēt sludinājumu'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
