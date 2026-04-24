import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import PhoneInput from './PhoneInput';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Stage = 'idle' | 'code-sent';

export default function PhoneLinkSettings() {
  const { user, updateUser } = useAuth();
  const [stage, setStage] = useState<Stage>('idle');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeader = () => {
    const t = localStorage.getItem('auth_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  async function requestCode() {
    setError('');
    setSuccess('');
    if (!phone) {
      setError('Lūdzu, ievadiet telefona numuru');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/link-phone/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās nosūtīt kodu');
      setStage('code-sent');
      setSuccess('SMS kods nosūtīts. Ievadiet to zemāk.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setError('');
    setSuccess('');
    if (!code || code.length < 4) {
      setError('Ievadiet SMS kodu');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/link-phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās apstiprināt kodu');
      updateUser({ phone: data.user.phone });
      setSuccess('Telefons veiksmīgi piesaistīts kontam.');
      setStage('idle');
      setPhone('');
      setCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function cancel() {
    setStage('idle');
    setCode('');
    setError('');
    setSuccess('');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center uppercase tracking-tight">
        <Phone className="w-6 h-6 mr-3 text-primary-600" />
        Telefona numurs
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        {user?.phone
          ? 'Jūsu kontam ir piesaistīts telefona numurs. Varat to mainīt, pievienojot jaunu.'
          : 'Pievienojiet telefona numuru, lai varētu ienākt sistēmā arī ar SMS.'}
      </p>

      {user?.phone && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Esošais numurs
            </div>
            <div className="text-sm font-mono text-emerald-900">{user.phone}</div>
          </div>
        </div>
      )}

      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
            {user?.phone ? 'Jauns telefona numurs' : 'Telefona numurs'}
          </label>
          <PhoneInput value={phone} onChange={setPhone} disabled={loading || stage === 'code-sent'} />
        </div>

        {stage === 'code-sent' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
              SMS kods
            </label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6 cipari"
              disabled={loading}
            />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {stage === 'idle' && (
            <Button
              type="button"
              onClick={requestCode}
              disabled={loading || !phone}
              className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs"
            >
              {loading ? 'Sūta...' : 'Sūtīt SMS kodu'}
            </Button>
          )}

          {stage === 'code-sent' && (
            <>
              <Button
                type="button"
                onClick={verifyCode}
                disabled={loading || code.length < 4}
                className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs"
              >
                {loading ? 'Pārbauda...' : 'Apstiprināt'}
              </Button>
              <Button
                type="button"
                onClick={cancel}
                disabled={loading}
                variant="outline"
                className="rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs"
              >
                Atcelt
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
