interface Props {
  points: number;
}

const TIERS = [
  { min: 5000, label: 'Platinum', color: 'bg-slate-700 text-white' },
  { min: 1500, label: 'Gold', color: 'bg-amber-400 text-white' },
  { min: 500, label: 'Silver', color: 'bg-slate-400 text-white' },
  { min: 0, label: 'Bronze', color: 'bg-amber-700 text-white' },
] as const;

export default function LoyaltyBadge({ points }: Props) {
  const tier = TIERS.find(t => points >= t.min)!;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tier.color}`}>
      {tier.label}
    </span>
  );
}
