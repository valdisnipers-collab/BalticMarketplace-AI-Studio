import { useState, useEffect } from 'react';

interface DraftRecoveryBannerProps {
  onRestore: (data: Record<string, any>) => void;
  onDiscard: () => void;
  isLoggedIn: boolean;
}

export function DraftRecoveryBanner({ onRestore, onDiscard, isLoggedIn }: DraftRecoveryBannerProps) {
  const [draft, setDraft] = useState<{ data: Record<string, any>; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!isLoggedIn || !token) { setLoading(false); return; }
    fetch('/api/listings/draft', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDraft(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isLoggedIn, token]);

  if (loading || !draft) return null;

  const updatedAt = new Date(draft.updated_at).toLocaleString('lv-LV');
  const draftData = typeof draft.data === 'string' ? JSON.parse(draft.data) : draft.data;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
      <div className="text-amber-500 mt-0.5">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          Tev ir nesaglabāts sludinājums
        </p>
        <p className="text-xs text-amber-600 mt-0.5">
          Pēdējo reizi saglabāts: {updatedAt}
          {draftData.title ? ` — "${draftData.title}"` : ''}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { onRestore(draftData); setDraft(null); }}
            className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Turpināt
          </button>
          <button
            onClick={() => {
              fetch('/api/listings/draft', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token || ''}` },
              }).catch(() => {});
              onDiscard();
              setDraft(null);
            }}
            className="text-xs px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
          >
            Sākt no jauna
          </button>
        </div>
      </div>
    </div>
  );
}
