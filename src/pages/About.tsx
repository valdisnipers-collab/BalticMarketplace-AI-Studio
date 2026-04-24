import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Info, ArrowLeft } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Helmet>
        <title>Par BalticMarket</title>
      </Helmet>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#E64415] mb-6">
        <ArrowLeft className="w-4 h-4" />
        Atpakaļ uz sākumu
      </Link>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#E64415]">
          <Info className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Par BalticMarket</h1>
      </div>
      <p className="text-slate-600 leading-relaxed">
        BalticMarket ir moderns Baltijas sludinājumu portāls ar AI atbalstītu meklēšanu, sludinājumu
        salīdzināšanu un reāla laika tirgus kontekstu. Veidojam vienkāršāko un drošāko veidu, kā Baltijā
        pirkt un pārdot — no transportlīdzekļiem līdz nekustamajiem īpašumiem.
      </p>
      <p className="text-sm text-slate-400 mt-6">Pilns satura apraksts drīzumā.</p>
    </div>
  );
}
