interface ListingQualityMeterProps {
  title: string;
  description: string;
  imageCount: number;
  attributesFilled: number;
  price: number;
  location: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-400';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Lieliska kvalitāte';
  if (score >= 60) return 'Laba kvalitāte';
  if (score >= 40) return 'Vidēja kvalitāte';
  return 'Zema kvalitāte';
}

export function ListingQualityMeter({
  title, description, imageCount, attributesFilled, price, location
}: ListingQualityMeterProps) {
  let score = 0;
  const hints: string[] = [];

  if (title.length >= 40) score += 25;
  else if (title.length >= 20) { score += 15; hints.push('Pievieno vairāk detaļu virsrakstam'); }
  else if (title.length >= 10) { score += 8; hints.push('Paplašini virsrakstu — labāks virsraksts piesaista vairāk pircēju'); }
  else hints.push('Pievieno aprakstošu virsrakstu');

  if (description.length >= 300) score += 30;
  else if (description.length >= 150) { score += 20; hints.push('Paplašini aprakstu ar detaļām'); }
  else if (description.length >= 50) { score += 10; hints.push('Apraksts ir par īsu — detalizēts apraksts palielina pārdošanas iespējas'); }
  else hints.push('Pievieno detalizētu aprakstu');

  if (imageCount >= 5) score += 25;
  else if (imageCount >= 3) { score += 17; hints.push('Pievieno vairāk foto (ieteicami 5+)'); }
  else if (imageCount >= 1) { score += 8; hints.push('Pievieno vismaz 3 foto'); }
  else hints.push('Pievieno foto — sludinājumi ar foto pārdodas 3x ātrāk');

  if (attributesFilled >= 5) score += 10;
  else if (attributesFilled >= 2) { score += 5; hints.push('Aizpildi vairāk tehniskos datus'); }

  if (location.length > 2) score += 5;
  else hints.push('Pievieno atrašanās vietu');

  if (price > 0) score += 5;

  const finalScore = Math.min(100, score);
  const colorClass = getScoreColor(finalScore);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Sludinājuma kvalitāte</span>
        <span className="text-sm font-bold text-slate-900">{finalScore}/100</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${finalScore}%` }}
        />
      </div>
      <p className={`text-xs font-medium mb-2 ${
        finalScore >= 80 ? 'text-green-600' : finalScore >= 50 ? 'text-amber-600' : 'text-red-500'
      }`}>
        {getScoreLabel(finalScore)}
      </p>
      {hints.length > 0 && (
        <ul className="space-y-1">
          {hints.slice(0, 3).map((hint, i) => (
            <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
              <span className="text-amber-400 mt-0.5">•</span>
              {hint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
