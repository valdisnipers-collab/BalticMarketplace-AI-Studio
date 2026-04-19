import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, User } from 'lucide-react';

interface AiCardSummary {
  summary: string;
  pros: string[];
  cons: string[];
  suited_for: string;
}

interface SmartExpandDrawerProps {
  listingId: number;
  isOpen: boolean;
}

export function SmartExpandDrawer({ listingId, isOpen }: SmartExpandDrawerProps) {
  const [data, setData] = useState<AiCardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!isOpen || fetched) return;
    setFetched(true);
    setLoading(true);
    fetch(`/api/listings/${listingId}/ai-card-summary`)
      .then(r => r.json())
      .then((d: AiCardSummary) => { setData(d); setLoading(false); })
      .catch(() => { setError('Neizdevās ielādēt kopsavilkumu'); setLoading(false); });
  }, [isOpen, listingId, fetched]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            {loading && (
              <div className="pt-3 space-y-2 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-2/3" />
              </div>
            )}
            {error && (
              <p className="pt-3 text-xs text-red-500">{error}</p>
            )}
            {data && (
              <div className="pt-3 space-y-3">
                <p className="text-xs text-slate-700 leading-relaxed">{data.summary}</p>
                <div className="space-y-1">
                  {data.pros.slice(0, 3).map((pro, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-slate-600">{pro}</span>
                    </div>
                  ))}
                  {data.cons.slice(0, 2).map((con, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-slate-600">{con}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200">
                  <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[11px] text-slate-500 italic">{data.suited_for}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
