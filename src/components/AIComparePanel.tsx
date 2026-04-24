import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, TrendingUp, TrendingDown, Sparkles, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompareRanking {
  id: number;
  rank: number;
  verdict: string;
  priceVsMarket?: string;
  pros: string[];
  cons: string[];
  valueScore: number;
}

interface CompareResult {
  bestPickId: number;
  overallSummary: string;
  marketInsight?: string;
  rankings: CompareRanking[];
}

interface CompareBarListing {
  id: number;
  title: string;
  image_url: string;
  price: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: CompareResult | null;
  listings: CompareBarListing[];
}

export function AIComparePanel({ isOpen, onClose, result, listings }: Props) {
  const byId = Object.fromEntries(listings.map(l => [l.id, l]));
  const sorted = result ? [...result.rankings].sort((a, b) => a.rank - b.rank) : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl overflow-y-auto w-full sm:w-[420px]"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#E64415]" />
                <h2 className="text-base font-bold text-slate-900">AI Salīdzinājums</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Aizvērt salīdzinājumu"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Market insight from Google Search */}
              {result?.marketInsight && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 text-sm text-primary-800 flex gap-2">
                  <Globe className="w-4 h-4 shrink-0 mt-0.5 text-primary-500" />
                  <span>{result.marketInsight}</span>
                </div>
              )}

              {/* Overall summary */}
              {result?.overallSummary && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-800">
                  {result.overallSummary}
                </div>
              )}

              {/* Rankings */}
              {sorted.map((ranking) => {
                const listing = byId[ranking.id];
                const isBest = ranking.id === result?.bestPickId;
                return (
                  <div
                    key={ranking.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      isBest
                        ? 'border-[#E64415] bg-orange-50/40 ring-2 ring-[#E64415]/20'
                        : 'border-slate-200 bg-white'
                    )}
                  >
                    {/* Listing header row */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100">
                          {listing?.image_url ? (
                            <img
                              src={listing.image_url}
                              alt={listing?.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-200" />
                          )}
                        </div>
                        {isBest && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#E64415] rounded-full flex items-center justify-center shadow-sm">
                            <Trophy className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-400">#{ranking.rank}</span>
                          {isBest && (
                            <span className="text-[10px] font-bold text-[#E64415] uppercase tracking-wide">
                              Labākā izvēle
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                          {listing?.title || `Sludinājums #${ranking.id}`}
                        </p>
                        <p className="text-sm font-bold text-[#E64415]">
                          €{listing?.price?.toFixed(2)}
                        </p>
                      </div>
                      {/* Value score */}
                      <div className="shrink-0 text-right">
                        <div
                          className={cn(
                            'text-lg font-extrabold',
                            ranking.valueScore >= 70 ? 'text-emerald-600' :
                            ranking.valueScore >= 40 ? 'text-amber-500' : 'text-red-500'
                          )}
                        >
                          {ranking.valueScore}
                        </div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-wide">score</div>
                      </div>
                    </div>

                    {/* Verdict */}
                    <p className="text-xs text-slate-600 mb-2 italic">{ranking.verdict}</p>

                    {/* Price vs market */}
                    {ranking.priceVsMarket && (
                      <div className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2',
                        ranking.priceVsMarket.toLowerCase().includes('zem')
                          ? 'bg-emerald-100 text-emerald-700'
                          : ranking.priceVsMarket.toLowerCase().includes('virs')
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-600'
                      )}>
                        {ranking.priceVsMarket}
                      </div>
                    )}

                    {/* Pros & Cons */}
                    <div className="space-y-1.5">
                      {ranking.pros.map((pro, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-emerald-700">
                          <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{pro}</span>
                        </div>
                      ))}
                      {ranking.cons.map((con, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                          <TrendingDown className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{con}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
