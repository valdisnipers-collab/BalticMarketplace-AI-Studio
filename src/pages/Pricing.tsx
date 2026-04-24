import { Helmet } from 'react-helmet-async';
import { motion } from 'motion/react';
import { Check, Building2, Target, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';

const PLANS = [
  {
    id: 'free',
    name: 'Bezmaksas',
    description: 'Privātpersonām un retiem pārdevējiem.',
    priceMonthly: 0,
    features: [
      'Līdz 5 aktīviem sludinājumiem',
      'AI sludinājumu vednis',
      'Droša SafePay sistēma',
      'Reāllaika čats',
      'Standarta uzticamības rādītājs',
    ],
    cta: 'Pašreizējais plāns',
    priceId: null as string | null,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'PRO Pārdevējs',
    description: 'Profesionāliem pārdevējiem un uzņēmumiem.',
    priceMonthly: 29.99,
    features: [
      'Neierobežots sludinājumu skaits',
      'AI auto-atbildētājs čatā',
      'Padziļināta analītika',
      'Verificēta uzņēmuma zīmīte',
      '50% atlaide izcelšanai',
    ],
    cta: 'Pāriet uz PRO',
    priceId: 'price_pro_monthly',
    highlight: true,
    icon: Building2,
  },
  {
    id: 'sniper',
    name: 'Sniper Access',
    description: 'Pircējiem, kuri grib labākos darījumus pirmie.',
    priceMonthly: 12.99,
    features: [
      '15 min agrīna piekļuve sludinājumiem',
      'Reāllaika paziņojumi',
      'Ekskluzīva profila zīmīte',
      'Prioritārs atbalsts',
    ],
    cta: 'Ieslēgt Sniper',
    priceId: 'price_sniper_monthly',
    highlight: false,
    icon: Target,
  },
];

const POINTS_PACKAGES = [
  { points: 100, price: 1.0, discount: 0 },
  { points: 500, price: 4.5, discount: 10 },
  { points: 1000, price: 8.0, discount: 20 },
  { points: 5000, price: 35.0, discount: 30 },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function startCheckout(body: Record<string, unknown>) {
    if (!user) { navigate('/login'); return; }
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Neizdevās izveidot maksājuma sesiju');
    } catch (e) {
      console.error(e);
      alert('Radās kļūda. Mēģiniet vēlreiz.');
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <Helmet><title>Plāni un monetizācija | BalticMarket</title></Helmet>

      <section className="bg-white border-b border-slate-200 py-12">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-slate-900">
            Plāni un monetizācija
          </motion.h1>
          <p className="text-slate-500 mt-3">Izvēlies sev piemērotāko — vai pērc punktus sludinājumu izcelšanai.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 mt-12 grid md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`rounded-3xl p-6 border-2 ${plan.highlight ? 'border-[#E64415] bg-white shadow-xl' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {plan.icon ? <plan.icon className="w-5 h-5 text-[#E64415]" /> : null}
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
            </div>
            <p className="text-sm text-slate-500">{plan.description}</p>
            <div className="mt-4 mb-6">
              <span className="text-3xl font-bold text-slate-900">€{plan.priceMonthly.toFixed(2)}</span>
              <span className="text-slate-500">/mēnesī</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-[#E64415] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className={plan.highlight ? 'w-full bg-[#E64415] hover:bg-[#CC3A10] text-white' : 'w-full'}
              variant={plan.highlight ? 'default' : 'outline'}
              disabled={!plan.priceId}
              onClick={() => plan.priceId && startCheckout({ type: 'subscription', planId: plan.priceId })}
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </section>

      <section className="container mx-auto px-4 mt-16">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Coins className="w-6 h-6 text-[#E64415]" /> Punktu paketes
        </h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">Punkti tiek izmantoti sludinājumu izcelšanai un pacelšanai.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {POINTS_PACKAGES.map(p => (
            <div key={p.points} className="rounded-2xl bg-white border border-slate-200 p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{p.points}</p>
              <p className="text-xs uppercase text-slate-400">punkti</p>
              {p.discount > 0 && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">-{p.discount}%</p>
              )}
              <p className="mt-3 text-lg font-semibold">€{p.price.toFixed(2)}</p>
              <Button
                className="w-full mt-3"
                variant="outline"
                onClick={() => startCheckout({ type: 'points', amount: p.price, pointsAmount: p.points })}
              >
                Pirkt
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
