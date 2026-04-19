import { Shield, ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';

interface TrustScoreBadgeProps {
  score: number;
  isVerified?: boolean;
  compact?: boolean;
}

function getTrustLevel(score: number) {
  if (score >= 85) return { label: 'Augsti uzticams', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', Icon: ShieldCheck };
  if (score >= 65) return { label: 'Uzticams', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', Icon: Shield };
  if (score >= 40) return { label: 'Vidējs', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', Icon: ShieldAlert };
  return { label: 'Zems', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', Icon: ShieldOff };
}

export function TrustScoreBadge({ score, isVerified, compact = false }: TrustScoreBadgeProps) {
  const { label, color, bg, border, Icon } = getTrustLevel(score);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} ${bg} ${border} border px-2 py-0.5 rounded-full`}>
        <Icon className="w-3 h-3" />
        {score}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${bg} ${border} border rounded-xl px-3 py-2`}>
      <Icon className={`w-5 h-5 ${color}`} />
      <div>
        <p className={`text-sm font-semibold ${color}`}>{label}</p>
        <p className="text-xs text-slate-500">
          Uzticamības rādītājs: {score}/100
          {isVerified && ' · Smart-ID verificēts'}
        </p>
      </div>
    </div>
  );
}
