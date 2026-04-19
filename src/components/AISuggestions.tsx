import { useState, useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';

interface Suggestion {
  field: string;
  suggestion: string;
}

interface AISuggestionsProps {
  title: string;
  category: string;
  description: string;
  attributes: Record<string, any>;
}

const DEBOUNCE_MS = 3000;

const FIELD_LABELS: Record<string, string> = {
  title: 'Virsraksts',
  description: 'Apraksts',
  price: 'Cena',
  images: 'Foto',
  location: 'Atrašanās vieta',
  attributes: 'Detaļas',
};

export function AISuggestions({ title, category, description, attributes }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!title && !description) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/listings/ai-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, category, description, attributes }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setDismissed(new Set());
      } catch {}
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [title, description, category]);

  const visible = suggestions.filter((_, i) => !dismissed.has(i));

  if (!loading && visible.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-100 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-violet-700">AI ieteikumi</span>
        {loading && <span className="text-xs text-violet-400 animate-pulse">Analizē...</span>}
      </div>

      {loading && visible.length === 0 && (
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-2 bg-violet-200 rounded animate-pulse flex-1" />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {visible.map((s, i) => (
          <div key={i} className="flex items-start gap-2 bg-white/70 rounded-lg p-2.5">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded mr-1.5">
                {FIELD_LABELS[s.field] || s.field}
              </span>
              <span className="text-xs text-slate-600">{s.suggestion}</span>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, suggestions.indexOf(s)]))}
              className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
