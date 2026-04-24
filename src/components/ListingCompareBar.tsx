import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from './I18nContext';

interface CompareBarListing {
  id: number;
  title: string;
  image_url: string;
  price: number;
}

interface Props {
  selected: CompareBarListing[];
  onRemove: (id: number) => void;
  onClear: () => void;
  onCompare: () => void;
  loading: boolean;
}

export function ListingCompareBar({ selected, onRemove, onClear, onCompare, loading }: Props) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {selected.length >= 2 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Thumbnails */}
            <div className="flex items-center gap-2 flex-1 overflow-x-auto">
              <span className="text-xs font-semibold text-slate-400 shrink-0">
                {selected.length}/4
              </span>
              {selected.map((item) => (
                <div key={item.id} className="relative shrink-0 group">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#E64415] bg-slate-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Noņemt ${item.title}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                  <p className="text-[9px] text-slate-500 mt-0.5 w-12 truncate text-center">
                    €{item.price}
                  </p>
                </div>
              ))}
              {selected.length < 4 && (
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-slate-300 text-lg leading-none">+</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2"
              >
                {t('compare.bar.clear')}
              </button>
              <Button
                onClick={onCompare}
                disabled={loading}
                className="bg-[#E64415] hover:bg-[#CC3A10] text-white font-semibold gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scale className="w-4 h-4" />
                )}
                {t('compare.bar.evaluate')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
