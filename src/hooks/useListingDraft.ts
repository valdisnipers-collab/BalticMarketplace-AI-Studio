import { useEffect, useRef, useCallback } from 'react';

const DEBOUNCE_MS = 2000;

export function useListingDraft(formData: Record<string, any>, isLoggedIn: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Canonical auth token key matches AuthContext.signIn(). Legacy 'token'
  // removed — persistence was silently broken for logged-in users.
  const token = localStorage.getItem('auth_token');

  const saveDraft = useCallback(async (data: Record<string, any>) => {
    if (!isLoggedIn || !token) return;
    try {
      await fetch('/api/listings/draft', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    } catch {}
  }, [isLoggedIn, token]);

  const clearDraft = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    try {
      await fetch('/api/listings/draft', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }, [isLoggedIn, token]);

  const loadDraft = useCallback(async (): Promise<Record<string, any> | null> => {
    if (!isLoggedIn || !token) return null;
    try {
      const res = await fetch('/api/listings/draft', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (!formData.title && !formData.description) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDraft(formData);
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formData, saveDraft]);

  return { saveDraft, clearDraft, loadDraft };
}
