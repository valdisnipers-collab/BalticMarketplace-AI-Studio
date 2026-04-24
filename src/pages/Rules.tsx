import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ScrollText, ArrowLeft } from 'lucide-react';

export default function Rules() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Helmet>
        <title>Lietošanas noteikumi — BalticMarket</title>
      </Helmet>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#E64415] mb-6">
        <ArrowLeft className="w-4 h-4" />
        Atpakaļ uz sākumu
      </Link>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-[#E64415]">
          <ScrollText className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Lietošanas noteikumi</h1>
      </div>
      <p className="text-slate-600 leading-relaxed">
        Šeit drīzumā publicēsim pilnus BalticMarket platformas lietošanas noteikumus — sludinājumu publicēšanas
        nosacījumus, darījumu kārtību, atbildības limitus un strīdu izskatīšanu.
      </p>
      <p className="text-sm text-slate-400 mt-6">Saturs tiek gatavots.</p>
    </div>
  );
}
