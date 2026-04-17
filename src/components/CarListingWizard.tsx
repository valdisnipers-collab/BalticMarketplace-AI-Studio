import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, PlusCircle, Car, Gauge, Shield, Monitor, Palette, Camera, Tag, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CarMakeDropdown, CarModelDropdown } from './CarDropdown';
import { CAR_MAKES } from '../lib/carData';

// ─── Equipment Data ───────────────────────────────────────────────────────────

const EQUIPMENT_GROUPS = {
  'Drošība': [
    'ABS',
    'ESP (stabilitātes kontrole)',
    'Priekšējais gaisa spilvens',
    'Sānu gaisa spilveni',
    'Galvas gaisa spilveni',
    'Joslu maiņas brīdinājums',
    'Akls punkts (BSD)',
    'Aizmugures satiksmes brīdinājums',
    'Avārijas bremzēšana (AEB)',
    'Adaptīvais kruīza kontrols',
    'Joslas turēšanas asistents',
    'Noguruma brīdinājums',
    'Naktsvīzija',
    'Imobilaizers',
    'Centrālā slēdzene',
    'Bērnu slēdzene',
    'Signalizācija',
  ],
  'Komforts': [
    'Gaisa kondicionēšana',
    'Klimata kontrole (1 zona)',
    'Klimata kontrole (2 zonas)',
    'Sēdekļu apsilde priekšā',
    'Sēdekļu apsilde aizmugurē',
    'Sēdekļu ventilācija',
    'Elektriski regulējami sēdekļi',
    'Masāžas sēdekļi',
    'Ādas sēdekļi',
    'Panorāmas jumts',
    'Elektrisks aizmugures bagāžnieks',
    'Bezkontakta atslēga (Keyless)',
    'Start/Stop sistēma',
    'Apkures apsilde (Webasto)',
    'Stūres apsilde',
    'Vējstikla apsilde',
    'Parkošanās sensori priekšā',
    'Parkošanās sensori aizmugurē',
    'Atpakaļgaitas kamera',
    '360° kamera',
    'Automātiskā stāvvieta',
    'Kruīza kontrols',
    'Elektriski regulējami spoguļi',
    'Elektriski salocāmi spoguļi',
    'Augstuma regulēšana (pnevmatiskā)',
    'Pievares kontrole',
  ],
  'Multivide': [
    'AM/FM Radio',
    'CD/DVD atskaņotājs',
    'Iebūvētā navigācija',
    'Apple CarPlay',
    'Android Auto',
    'Bluetooth',
    'Brīvroku komplekts',
    'USB ports',
    'Induktīvā uzlāde',
    'Heads-Up displejs (HUD)',
    'Premium skaļruņu sistēma',
    'Digitālais radio (DAB+)',
    'Wi-Fi hotspot',
    'Aizmugures izklaides sistēma',
  ],
  'Āriene & Papildinājumi': [
    'Leģēta riteņu diski',
    '17" diski',
    '18" diski',
    '19"+ diski',
    'Jumta stieņi',
    'Piekabes āķis',
    'LED priekšējie lukturi',
    'Matrix LED lukturi',
    'Adaptīvie lukturi',
    'Xenon lukturi',
    'Miglas lukturi',
    'Tonēti stikli',
    'Rezerves ritenis',
    'Riepu spiediena kontrole (TPMS)',
    'Ziemas riepu komplekts',
    'Sporta piekare',
  ],
};

const STEP_ICONS = [Car, Gauge, Shield, Monitor, Camera, Tag, Eye];
const STEP_LABELS = ['Marka', 'Tehnika', 'Stāvoklis', 'Aprīkojums', 'Foto', 'Cena', 'Pārskats'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CarFormData {
  // Step 1 - Marka & Modelis
  make: string;
  model: string;
  year: string;
  version: string;

  // Step 2 - Tehniskie dati
  bodyType: string;
  fuelType: string;
  engineCc: string;
  powerKw: string;
  powerPs: string;
  transmission: string;
  drive: string;
  mileage: string;
  doors: string;
  seats: string;

  // Step 3 - Stāvoklis & Vēsture
  condition: string;
  firstRegistration: string;
  technicalInspection: string;
  previousOwners: string;
  serviceBook: string;
  accidentFree: string;
  color: string;
  colorMetallic: boolean;
  interiorColor: string;
  interiorMaterial: string;
  vin: string;

  // Step 4 - Aprīkojums
  equipment: string[];

  // Step 5 - Foto & Apraksts
  imageUrls: string[];
  description: string;

  // Step 6 - Cena
  price: string;
  saleType: string;
  auctionEndDate: string;
  reservePrice: string;
  priceNegotiable: boolean;
  vatDeductible: boolean;
  location: string;
  title: string;
}

interface CarListingWizardProps {
  onSubmit: (data: CarFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CarListingWizard({ onSubmit, isSubmitting, error }: CarListingWizardProps) {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinError, setVinError] = useState('');
  const [stepError, setStepError] = useState('');

  const [form, setForm] = useState<CarFormData>({
    make: '', model: '', year: '', version: '',
    bodyType: 'Sedans', fuelType: 'Benzīns', engineCc: '', powerKw: '', powerPs: '',
    transmission: 'Manuāla', drive: 'Priekšas (FWD)', mileage: '', doors: '4', seats: '5',
    condition: 'Lietots', firstRegistration: '', technicalInspection: '', previousOwners: '1',
    serviceBook: 'Jā', accidentFree: 'Jā', color: '', colorMetallic: false,
    interiorColor: '', interiorMaterial: 'Audums', vin: '',
    equipment: [],
    imageUrls: [], description: '',
    price: '', saleType: 'fixed', auctionEndDate: '', reservePrice: '',
    priceNegotiable: false, vatDeductible: false, location: '', title: '',
  });

  const set = (field: keyof CarFormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const toggleEquipment = (item: string) => {
    setForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(e => e !== item)
        : [...prev.equipment, item],
    }));
  };

  // ─── VIN Decode ─────────────────────────────────────────────────────────────

  const handleVinDecode = async () => {
    if (form.vin.length !== 17) {
      setVinError('VIN numuram jābūt tieši 17 simboliem');
      return;
    }
    setVinError('');
    setIsDecodingVin(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/ai/decode-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ vin: form.vin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setForm(prev => ({
        ...prev,
        make: data.make || prev.make,
        model: data.model || prev.model,
        year: data.year?.toString() || prev.year,
        bodyType: data.bodyType || prev.bodyType,
        fuelType: data.fuelType || prev.fuelType,
        engineCc: data.engineCc?.toString() || prev.engineCc,
        powerKw: data.powerKw?.toString() || prev.powerKw,
        transmission: data.transmission || prev.transmission,
        drive: data.drive || prev.drive,
        doors: data.doors?.toString() || prev.doors,
        seats: data.seats?.toString() || prev.seats,
        equipment: data.equipment?.length > 0 ? data.equipment : prev.equipment,
      }));
    } catch (err: any) {
      setVinError(err.message || 'VIN atšifrēšana neizdevās');
    } finally {
      setIsDecodingVin(false);
    }
  };

  // ─── Image Upload ────────────────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/upload/multiple', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Neizdevās augšupielādēt attēlus');
      setForm(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...data.urls] }));
    } catch (err: any) {
      setStepError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ─── AI Description ──────────────────────────────────────────────────────────

  const handleGenerateDescription = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          category: 'Transports',
          title: `${form.year} ${form.make} ${form.model}`,
          brand: form.make, model: form.model, year: form.year,
          engine: `${form.engineCc}cc ${form.fuelType}`, transmission: form.transmission,
          mileage: form.mileage, condition: form.condition, color: form.color,
          equipment: form.equipment.join(', '),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      set('description', data.description);
    } catch (err: any) {
      setStepError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── AI Price ────────────────────────────────────────────────────────────────

  const handleRecommendPrice = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/recommend-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          category: 'Transports', title: `${form.year} ${form.make} ${form.model}`,
          attributes: { brand: form.make, model: form.model, year: form.year, mileage: form.mileage, condition: form.condition },
        }),
      });
      const data = await res.json();
      if (res.ok && data.price) set('price', data.price.toString());
    } catch {
      // silently fail
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Navigation ──────────────────────────────────────────────────────────────

  const validate = (s: number): string => {
    if (s === 1 && !form.make) return 'Lūdzu, izvēlieties auto marku';
    if (s === 1 && !form.model) return 'Lūdzu, izvēlieties modeli';
    if (s === 1 && !form.year) return 'Lūdzu, ievadiet izlaiduma gadu';
    if (s === 2 && !form.mileage) return 'Lūdzu, ievadiet nobraukumu';
    if (s === 2 && !form.powerKw) return 'Lūdzu, ievadiet dzinēja jaudu';
    if (s === 5 && form.imageUrls.length === 0) return 'Lūdzu, pievienojiet vismaz vienu attēlu';
    if (s === 6 && !form.price) return 'Lūdzu, ievadiet cenu';
    if (s === 6 && !form.location) return 'Lūdzu, ievadiet atrašanās vietu';
    return '';
  };

  const nextStep = () => {
    const err = validate(step);
    if (err) { setStepError(err); return; }
    setStepError('');
    // Auto-generate title before final step
    if (step === 6 && !form.title) {
      setForm(prev => ({ ...prev, title: `${prev.year} ${prev.make} ${prev.model}${prev.version ? ` ${prev.version}` : ''}, ${prev.mileage ? Number(prev.mileage).toLocaleString() : ''}km` }));
    }
    setStep(s => Math.min(s + 1, 7));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => { setStepError(''); setStep(s => Math.max(s - 1, 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleFinalSubmit = () => {
    const finalTitle = form.title || `${form.year} ${form.make} ${form.model}${form.version ? ` ${form.version}` : ''}`;
    onSubmit({ ...form, title: finalTitle });
  };

  // ─── Progress Bar ─────────────────────────────────────────────────────────────

  const progressPct = ((step - 1) / 6) * 100;

  return (
    <div className="space-y-0">
      {/* Step indicators */}
      <div className="mb-10">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 rounded-full z-0" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#E64415] rounded-full z-0 transition-all duration-700" style={{ width: `${progressPct}%` }} />
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const Icon = STEP_ICONS[i];
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl border-2 font-bold transition-all duration-500 shadow-md
                  ${done ? 'bg-[#E64415] border-[#E64415] text-white' : active ? 'bg-white border-[#E64415] text-[#E64415] scale-110 shadow-lg shadow-[#E64415]/20' : 'bg-white border-slate-100 text-slate-300'}`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`hidden md:block text-[9px] font-bold uppercase tracking-wider transition-colors ${active ? 'text-[#E64415]' : done ? 'text-slate-500' : 'text-slate-300'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Errors */}
      <AnimatePresence>
        {(stepError || error) && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{stepError || error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 1 && <Step1Marka key="s1" form={form} set={set} />}
        {step === 2 && <Step2Tehnika key="s2" form={form} set={set} />}
        {step === 3 && <Step3Stavoklis key="s3" form={form} set={set} isDecodingVin={isDecodingVin} vinError={vinError} onVinDecode={handleVinDecode} />}
        {step === 4 && <Step4Aprikojums key="s4" form={form} toggleEquipment={toggleEquipment} isDecodingVin={isDecodingVin} onVinDecode={handleVinDecode} vinError={vinError} />}
        {step === 5 && <Step5Foto key="s5" form={form} set={set} isUploading={isUploading} isGenerating={isGenerating} onUpload={handleImageUpload} onGenerateDescription={handleGenerateDescription} />}
        {step === 6 && <Step6Cena key="s6" form={form} set={set} isGenerating={isGenerating} onRecommendPrice={handleRecommendPrice} />}
        {step === 7 && <Step7Parskats key="s7" form={form} set={set} />}
      </AnimatePresence>

      {/* Navigation */}
      <div className="pt-10 mt-10 border-t border-slate-100 flex justify-between gap-4">
        {step > 1 ? (
          <Button type="button" onClick={prevStep} variant="outline" className="flex-1 px-6 py-5 text-xs font-bold uppercase tracking-widest rounded-2xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Atpakaļ
          </Button>
        ) : <div className="flex-1" />}

        {step < 7 ? (
          <Button type="button" onClick={nextStep} className="flex-1 px-6 py-5 text-xs font-bold uppercase tracking-widest rounded-2xl bg-[#E64415] hover:bg-[#c93a10] shadow-lg shadow-[#E64415]/25">
            Tālāk <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button type="button" onClick={handleFinalSubmit} disabled={isSubmitting} className="flex-1 px-6 py-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/20">
            {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" /> : <><CheckCircle2 className="w-4 h-4 mr-2" />Publicēt sludinājumu</>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div key="sw" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-6">
      {children}
    </motion.div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{children}{required && <span className="text-[#E64415] ml-1">*</span>}</label>;
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#E64415]/30 appearance-none cursor-pointer">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Step 1 — Marka & Modelis
function Step1Marka({ form, set }: { form: CarFormData; set: (f: keyof CarFormData, v: any) => void }) {
  return (
    <StepWrap>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Marka un modelis</h2>
        <p className="text-sm text-slate-400">Izvēlieties auto ražotāju, modeli un izlaiduma gadu</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Marka</FieldLabel>
          <CarMakeDropdown value={form.make} onChange={v => { set('make', v); set('model', ''); }} />
        </div>
        <div>
          <FieldLabel required>Modelis</FieldLabel>
          <CarModelDropdown make={form.make} value={form.model} onChange={v => set('model', v)} />
        </div>
        <div>
          <FieldLabel required>Izlaiduma gads</FieldLabel>
          <select value={form.year} onChange={e => set('year', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#E64415]/30">
            <option value="">Gads...</option>
            {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Versija / Modifikācija</FieldLabel>
          <Input value={form.version} onChange={e => set('version', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Piem., 2.0 TDI Sport Line" />
        </div>
      </div>

      {form.make && form.model && form.year && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#E64415]/5 border border-[#E64415]/20 rounded-2xl p-4 flex items-center gap-3">
          <Car className="w-5 h-5 text-[#E64415]" />
          <span className="font-bold text-slate-800">{form.year} {form.make} {form.model}{form.version ? ` — ${form.version}` : ''}</span>
        </motion.div>
      )}
    </StepWrap>
  );
}

// Step 2 — Tehniskie dati
function Step2Tehnika({ form, set }: { form: CarFormData; set: (f: keyof CarFormData, v: any) => void }) {
  const syncPs = (kw: string) => {
    const ps = Math.round(parseFloat(kw) * 1.36);
    if (!isNaN(ps)) set('powerPs', ps.toString());
  };
  const syncKw = (ps: string) => {
    const kw = Math.round(parseFloat(ps) / 1.36);
    if (!isNaN(kw)) set('powerKw', kw.toString());
  };

  return (
    <StepWrap>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Tehniskie dati</h2>
        <p className="text-sm text-slate-400">Dzinējs, nobraukums un tehniskās specifikācijas</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Virsbūves tips</FieldLabel>
          <SelectField value={form.bodyType} onChange={v => set('bodyType', v)} options={['Sedans', 'Universāls', 'Apvidus (SUV)', 'Hečbeks', 'Kupeja', 'Kabriolets', 'Minivens', 'Pikaps', 'Furgons', 'Cits']} />
        </div>
        <div>
          <FieldLabel required>Degvielas tips</FieldLabel>
          <SelectField value={form.fuelType} onChange={v => set('fuelType', v)} options={['Benzīns', 'Dīzelis', 'Elektriskais', 'Hibrīds (PHEV)', 'Hibrīds (HEV)', 'Gāze (LPG)', 'Gāze (CNG)', 'Ūdeņradis']} />
        </div>
        <div>
          <FieldLabel>Dzinēja tilpums (cm³)</FieldLabel>
          <Input type="number" value={form.engineCc} onChange={e => set('engineCc', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Piem., 1968" />
        </div>
        <div>
          <FieldLabel required>Jauda (kW)</FieldLabel>
          <Input type="number" value={form.powerKw} onChange={e => { set('powerKw', e.target.value); syncPs(e.target.value); }}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Piem., 110" />
        </div>
        <div>
          <FieldLabel>Jauda (ZS)</FieldLabel>
          <Input type="number" value={form.powerPs} onChange={e => { set('powerPs', e.target.value); syncKw(e.target.value); }}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Aprēķināts automātiski" />
        </div>
        <div>
          <FieldLabel required>Nobraukums (km)</FieldLabel>
          <Input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Piem., 85000" />
        </div>
        <div>
          <FieldLabel required>Ātrumkārba</FieldLabel>
          <SelectField value={form.transmission} onChange={v => set('transmission', v)} options={['Manuāla', 'Automāts', 'Robots (DSG/CVT)', 'Pusautomāts']} />
        </div>
        <div>
          <FieldLabel required>Piedziņa</FieldLabel>
          <SelectField value={form.drive} onChange={v => set('drive', v)} options={['Priekšas (FWD)', 'Aizmugures (RWD)', 'Pilnpiedziņa (4x4/AWD)']} />
        </div>
        <div>
          <FieldLabel>Durvju skaits</FieldLabel>
          <SelectField value={form.doors} onChange={v => set('doors', v)} options={['2', '3', '4', '5', '6+']} />
        </div>
        <div>
          <FieldLabel>Sēdvietu skaits</FieldLabel>
          <SelectField value={form.seats} onChange={v => set('seats', v)} options={['2', '4', '5', '6', '7', '8+']} />
        </div>
      </div>
    </StepWrap>
  );
}

// Step 3 — Stāvoklis & Vēsture
function Step3Stavoklis({ form, set, isDecodingVin, vinError, onVinDecode }: {
  form: CarFormData; set: (f: keyof CarFormData, v: any) => void;
  isDecodingVin: boolean; vinError: string; onVinDecode: () => void;
}) {
  return (
    <StepWrap>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Stāvoklis un vēsture</h2>
        <p className="text-sm text-slate-400">Reģistrācija, stāvoklis un VIN automātiskajai aizpildei</p>
      </div>

      {/* VIN AI block */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">AI Auto-aizpilde no VIN</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Ievadiet VIN numuru un AI automātiski aizpildīs tehniskos datus un aprīkojumu</p>
        <div className="flex gap-3">
          <Input
            value={form.vin}
            onChange={e => set('vin', e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))}
            maxLength={17}
            className="flex-1 px-4 py-3 bg-slate-700 border-slate-600 text-white font-mono font-bold tracking-widest rounded-xl h-auto placeholder:text-slate-500 focus-visible:ring-[#E64415]"
            placeholder="WVWZZZ1KZ..." />
          <Button type="button" onClick={onVinDecode} disabled={isDecodingVin || form.vin.length !== 17}
            className="px-5 bg-[#E64415] hover:bg-[#c93a10] rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            {isDecodingVin ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" /> : <><Sparkles className="w-3 h-3 mr-2" />Atšifrēt</>}
          </Button>
        </div>
        <div className="flex justify-between mt-2">
          <span className={`text-[10px] ${form.vin.length === 17 ? 'text-emerald-400' : 'text-slate-500'}`}>{form.vin.length}/17 simboli</span>
          {vinError && <span className="text-[10px] text-red-400">{vinError}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <FieldLabel required>Stāvoklis</FieldLabel>
          <SelectField value={form.condition} onChange={v => set('condition', v)} options={['Jauns', 'Lietots', 'Bojāts', 'Rezerves daļām']} />
        </div>
        <div>
          <FieldLabel required>Bez avārijām</FieldLabel>
          <SelectField value={form.accidentFree} onChange={v => set('accidentFree', v)} options={['Jā', 'Nē', 'Nav zināms']} />
        </div>
        <div>
          <FieldLabel>Pirmā reģistrācija</FieldLabel>
          <Input type="month" value={form.firstRegistration} onChange={e => set('firstRegistration', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto" />
        </div>
        <div>
          <FieldLabel>ТО (ТI) derīgs līdz</FieldLabel>
          <Input type="month" value={form.technicalInspection} onChange={e => set('technicalInspection', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto" />
        </div>
        <div>
          <FieldLabel>Iepriekšējo īpašnieku sk.</FieldLabel>
          <SelectField value={form.previousOwners} onChange={v => set('previousOwners', v)} options={['1', '2', '3', '4', '5+']} />
        </div>
        <div>
          <FieldLabel>Apkopes grāmata</FieldLabel>
          <SelectField value={form.serviceBook} onChange={v => set('serviceBook', v)} options={['Jā', 'Nē', 'Daļēja']} />
        </div>
        <div>
          <FieldLabel required>Ārējā krāsa</FieldLabel>
          <Input value={form.color} onChange={e => set('color', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Piem., Metāliski melna" />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FieldLabel>Krāsa</FieldLabel>
            <SelectField value={form.colorMetallic ? 'Metālika' : 'Parastā'} onChange={v => set('colorMetallic', v === 'Metālika')} options={['Parastā', 'Metālika', 'Pērļu/Speciālā']} />
          </div>
        </div>
        <div>
          <FieldLabel>Salona krāsa</FieldLabel>
          <Input value={form.interiorColor} onChange={e => set('interiorColor', e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
            placeholder="Piem., Melns" />
        </div>
        <div>
          <FieldLabel>Salona materiāls</FieldLabel>
          <SelectField value={form.interiorMaterial} onChange={v => set('interiorMaterial', v)} options={['Audums', 'Āda', 'Ādas imitācija', 'Kombinēts', 'Alcantara', 'Velūrs']} />
        </div>
      </div>
    </StepWrap>
  );
}

// Step 4 — Aprīkojums
function Step4Aprikojums({ form, toggleEquipment, isDecodingVin, onVinDecode, vinError }: {
  form: CarFormData; toggleEquipment: (item: string) => void;
  isDecodingVin: boolean; onVinDecode: () => void; vinError: string;
}) {
  const groupIcons: Record<string, React.ElementType> = {
    'Drošība': Shield, 'Komforts': Gauge, 'Multivide': Monitor, 'Āriene & Papildinājumi': Palette,
  };

  return (
    <StepWrap>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Aprīkojums</h2>
          <p className="text-sm text-slate-400">Atzīmējiet visas automašīnas opcijas</p>
        </div>
        {form.vin.length === 17 && (
          <Button type="button" onClick={onVinDecode} disabled={isDecodingVin} size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
            {isDecodingVin ? <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white mr-2" /> : <Sparkles className="w-3 h-3 mr-2 text-amber-400" />}
            AI no VIN
          </Button>
        )}
      </div>

      {form.equipment.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
          <span className="text-xs font-bold text-emerald-700">{form.equipment.length} opcijas izvēlētas</span>
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(EQUIPMENT_GROUPS).map(([group, items]) => {
          const Icon = groupIcons[group] || Shield;
          return (
            <div key={group}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{group}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map(item => {
                  const checked = form.equipment.includes(item);
                  return (
                    <div key={item} onClick={() => toggleEquipment(item)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-200 select-none
                        ${checked ? 'border-[#E64415]/30 bg-[#E64415]/5' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                      <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                        ${checked ? 'border-[#E64415] bg-[#E64415]' : 'border-slate-300'}`}>
                        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${checked ? 'text-slate-900' : 'text-slate-500'}`}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </StepWrap>
  );
}

// Step 5 — Foto & Apraksts
function Step5Foto({ form, set, isUploading, isGenerating, onUpload, onGenerateDescription }: {
  form: CarFormData; set: (f: keyof CarFormData, v: any) => void;
  isUploading: boolean; isGenerating: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateDescription: () => void;
}) {
  return (
    <StepWrap>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Foto un apraksts</h2>
        <p className="text-sm text-slate-400">Pievienojiet augstas kvalitātes attēlus un aprakstu</p>
      </div>

      {/* Upload area */}
      <div>
        <FieldLabel required>Attēli (min. 1, ieteicami 8–15)</FieldLabel>
        <label className={`group flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
          ${isUploading ? 'opacity-50 pointer-events-none border-slate-200' : 'border-slate-200 hover:border-[#E64415]/40 hover:bg-[#E64415]/3'}`}>
          <div className="flex flex-col items-center gap-3">
            {isUploading
              ? <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#E64415]" />
              : <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-7 h-7 text-[#E64415]" />
                </div>}
            <p className="text-sm font-bold text-slate-700">Ievelciet attēlus vai <span className="text-[#E64415] underline">izvēlieties</span></p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">PNG, JPG — maks. 5MB</p>
          </div>
          <input type="file" className="hidden" accept="image/*" multiple onChange={onUpload} disabled={isUploading} />
        </label>
      </div>

      {form.imageUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <AnimatePresence>
            {form.imageUrls.map((url, i) => (
              <motion.div key={url} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="relative rounded-2xl overflow-hidden aspect-square bg-slate-100 group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-2 left-2"><span className="bg-[#E64415] text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">Galvenais</span></div>}
                <button type="button" onClick={() => set('imageUrls', form.imageUrls.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <PlusCircle className="w-5 h-5 text-red-500 rotate-45" />
                  </div>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Apraksts</FieldLabel>
          <Button type="button" onClick={onGenerateDescription} disabled={isGenerating || !form.make} size="sm"
            className="bg-indigo-900 hover:bg-indigo-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
            {isGenerating ? <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white mr-2" /> : <Sparkles className="w-3 h-3 mr-2 text-amber-400" />}
            AI apraksts
          </Button>
        </div>
        <textarea rows={7} value={form.description} onChange={e => set('description', e.target.value)}
          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-medium text-sm placeholder:text-slate-300 focus:ring-2 focus:ring-[#E64415]/30 outline-none leading-relaxed resize-none"
          placeholder="Aprakstiet auto stāvokli, vēsturi, unikālās iezīmes..." />
      </div>
    </StepWrap>
  );
}

// Step 6 — Cena
function Step6Cena({ form, set, isGenerating, onRecommendPrice }: {
  form: CarFormData; set: (f: keyof CarFormData, v: any) => void;
  isGenerating: boolean; onRecommendPrice: () => void;
}) {
  return (
    <StepWrap>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Cena un publicēšana</h2>
        <p className="text-sm text-slate-400">Nosakiet cenu un pārdošanas veidu</p>
      </div>

      {/* Sale type */}
      <div>
        <FieldLabel required>Pārdošanas veids</FieldLabel>
        <div className="grid grid-cols-2 gap-4">
          {[{ v: 'fixed', label: 'Fiksēta cena', icon: '🏷️' }, { v: 'auction', label: 'Izsole', icon: '🔨' }].map(({ v, label, icon }) => (
            <div key={v} onClick={() => set('saleType', v)}
              className={`p-5 rounded-2xl border-2 cursor-pointer text-center transition-all
                ${form.saleType === v ? 'border-[#E64415] bg-[#E64415]/5' : 'border-slate-100 hover:border-slate-200'}`}>
              <div className="text-2xl mb-2">{icon}</div>
              <span className={`text-sm font-bold ${form.saleType === v ? 'text-[#E64415]' : 'text-slate-600'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel required>{form.saleType === 'auction' ? 'Sākumcena (€)' : 'Cena (€)'}</FieldLabel>
          <Button type="button" onClick={onRecommendPrice} disabled={isGenerating || !form.make} size="sm"
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-[10px] font-bold uppercase tracking-wider rounded-full">
            <Sparkles className="w-3 h-3 mr-2 text-emerald-500" />AI ieteikt cenu
          </Button>
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-6 flex items-center text-2xl font-bold text-slate-300 pointer-events-none">€</span>
          <Input type="number" step="0.01" min="0" value={form.price} onChange={e => set('price', e.target.value)}
            className="w-full pl-14 px-6 py-6 bg-slate-50 border-none rounded-2xl text-3xl font-bold text-slate-900 placeholder:text-slate-200 h-auto focus-visible:ring-[#E64415]"
            placeholder="0" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {[{ field: 'priceNegotiable', label: 'Cena vienojama' }, { field: 'vatDeductible', label: 'PVN atskaitāms' }].map(({ field, label }) => (
          <label key={field} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form[field as keyof CarFormData] as boolean} onChange={e => set(field as keyof CarFormData, e.target.checked)}
              className="w-4 h-4 accent-[#E64415]" />
            <span className="text-sm font-medium text-slate-600">{label}</span>
          </label>
        ))}
      </div>

      {form.saleType === 'auction' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <FieldLabel required>Izsoles beigu datums</FieldLabel>
            <Input type="datetime-local" value={form.auctionEndDate} onChange={e => set('auctionEndDate', e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto" />
          </div>
          <div>
            <FieldLabel>Rezervācijas cena (€)</FieldLabel>
            <Input type="number" step="0.01" value={form.reservePrice} onChange={e => set('reservePrice', e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto" placeholder="0" />
          </div>
        </div>
      )}

      <div>
        <FieldLabel required>Atrašanās vieta</FieldLabel>
        <Input value={form.location} onChange={e => set('location', e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
          placeholder="Piem., Rīga, Latvija" />
      </div>

      <div>
        <FieldLabel>Sludinājuma virsraksts</FieldLabel>
        <Input value={form.title} onChange={e => set('title', e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl font-semibold text-sm h-auto"
          placeholder={`${form.year} ${form.make} ${form.model}`.trim() || 'Automātiski ģenerēts'} />
        <p className="text-[10px] text-slate-400 mt-1.5">Atstājiet tukšu automātiskajai ģenerācijai</p>
      </div>
    </StepWrap>
  );
}

// Step 7 — Pārskats
function Step7Parskats({ form, set }: { form: CarFormData; set: (f: keyof CarFormData, v: any) => void }) {
  const title = form.title || `${form.year} ${form.make} ${form.model}${form.version ? ` ${form.version}` : ''}`;

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );

  const Row = ({ label, value }: { label: string; value: string }) => value ? (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <span className="text-xs text-slate-800 font-bold">{value}</span>
    </div>
  ) : null;

  return (
    <StepWrap>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Pārskats</h2>
        <p className="text-sm text-slate-400">Pārbaudiet sludinājumu pirms publicēšanas</p>
      </div>

      {/* Main image preview */}
      {form.imageUrls.length > 0 && (
        <div className="rounded-2xl overflow-hidden aspect-video relative">
          <img src={form.imageUrls[0]} alt="" className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-4">
            <span className="bg-black/60 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {form.imageUrls.length} foto
            </span>
          </div>
        </div>
      )}

      {/* Title & price */}
      <div className="bg-[#E64415]/5 border border-[#E64415]/20 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xl font-bold text-[#E64415]">€ {Number(form.price).toLocaleString()}{form.priceNegotiable ? ' (vienojama)' : ''}</span>
          <span className="text-xs text-slate-500 font-medium">{form.location}</span>
        </div>
      </div>

      <Section label="Marka un modelis">
        <Row label="Marka" value={form.make} />
        <Row label="Modelis" value={form.model} />
        <Row label="Gads" value={form.year} />
        <Row label="Versija" value={form.version} />
      </Section>

      <Section label="Tehniskie dati">
        <Row label="Virsbūve" value={form.bodyType} />
        <Row label="Degviela" value={form.fuelType} />
        <Row label="Dzinēja tilpums" value={form.engineCc ? `${form.engineCc} cm³` : ''} />
        <Row label="Jauda" value={form.powerKw ? `${form.powerKw} kW (${form.powerPs} ZS)` : ''} />
        <Row label="Ātrumkārba" value={form.transmission} />
        <Row label="Piedziņa" value={form.drive} />
        <Row label="Nobraukums" value={form.mileage ? `${Number(form.mileage).toLocaleString()} km` : ''} />
        <Row label="Durvis / Sēdvietas" value={`${form.doors} / ${form.seats}`} />
      </Section>

      <Section label="Stāvoklis">
        <Row label="Stāvoklis" value={form.condition} />
        <Row label="Bez avārijām" value={form.accidentFree} />
        <Row label="Krāsa" value={`${form.color}${form.colorMetallic ? ' (metālika)' : ''}`} />
        <Row label="Salons" value={`${form.interiorColor} ${form.interiorMaterial}`} />
        <Row label="Pirmā reģ." value={form.firstRegistration} />
        <Row label="ТI derīgs" value={form.technicalInspection} />
        <Row label="Iepr. īpašnieki" value={form.previousOwners} />
        <Row label="Apk. grāmata" value={form.serviceBook} />
      </Section>

      {form.equipment.length > 0 && (
        <Section label={`Aprīkojums (${form.equipment.length} opcijas)`}>
          <div className="flex flex-wrap gap-2">
            {form.equipment.map(e => (
              <span key={e} className="bg-slate-100 text-slate-700 text-xs font-medium px-3 py-1 rounded-full">{e}</span>
            ))}
          </div>
        </Section>
      )}

      {form.description && (
        <Section label="Apraksts">
          <p className="text-sm text-slate-600 leading-relaxed">{form.description}</p>
        </Section>
      )}

      {/* Terms */}
      <div className="bg-amber-50 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
          Publicējot sludinājumu, jūs apliecināt, ka visa sniegtā informācija ir patiesa un precīza, un piekrītat mūsu <span className="font-bold underline cursor-pointer">Lietošanas noteikumiem</span>.
        </p>
      </div>
    </StepWrap>
  );
}
