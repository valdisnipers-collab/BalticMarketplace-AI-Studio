import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Gift, Copy, Check } from 'lucide-react';

export default function ReferralWidget() {
  const { token } = useAuth() as any;
  const [code, setCode] = useState('');
  const [uses, setUses] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/users/me/referral', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.code) { setCode(d.code); setUses(d.uses); } });
  }, [token]);

  const link = `${window.location.origin}/register?ref=${code}`;

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!code) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-[#E64415]" />
        <h3 className="font-semibold text-slate-900 text-sm">Uzaicini draugu</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Tu un draugs katrs saņemsiet <strong>+50 punktus</strong> pēc reģistrācijas.
        Jau uzaicināti: <strong>{uses}</strong>
      </p>
      <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
        <code className="text-xs text-slate-700 flex-1 truncate">{link}</code>
        <button onClick={copy} className="shrink-0 text-slate-400 hover:text-[#E64415] transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
