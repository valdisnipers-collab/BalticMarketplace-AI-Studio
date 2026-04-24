import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const navigate = useNavigate();

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const pwdValid = pwd.length >= 10 && pwd.length <= 200;
  const matches = pwd === pwd2;
  const canSubmit = !loading && token && pwdValid && matches;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: pwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Neizdevās atjaunot paroli');
        return;
      }
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Radās kļūda. Mēģiniet vēlāk.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Atpakaļ uz ienākšanu
        </Link>

        <div>
          <div className="mx-auto h-12 w-12 bg-primary-100 text-[#E64415] rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-slate-900 tracking-tight">
            Iestati jauno paroli
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Vismaz 10 simboli. Ieteicams izmantot passphrase (piemēram, 3 vārdus).
          </p>
        </div>

        {!token && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">Saite bez derīga token. Atveriet saiti no paroles atjaunošanas e-pasta.</p>
          </div>
        )}

        {done ? (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-start">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <p className="font-semibold mb-1">Parole atjaunota</p>
              <p>Tiec pāradresēts uz ienākšanas lapu...</p>
            </div>
          </div>
        ) : token ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="pwd" className="block text-sm font-medium text-slate-700 mb-1">Jaunā parole</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  id="pwd" type="password" required autoFocus autoComplete="new-password"
                  value={pwd} onChange={(e) => setPwd(e.target.value)}
                  className="pl-10"
                  placeholder="Vismaz 10 simboli"
                />
              </div>
              {pwd.length > 0 && !pwdValid && (
                <p className="text-xs text-red-600 mt-1">Parolei jābūt vismaz 10 simboliem garai</p>
              )}
            </div>

            <div>
              <label htmlFor="pwd2" className="block text-sm font-medium text-slate-700 mb-1">Apstiprini paroli</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  id="pwd2" type="password" required autoComplete="new-password"
                  value={pwd2} onChange={(e) => setPwd2(e.target.value)}
                  className="pl-10"
                  placeholder="Atkārto paroli"
                />
              </div>
              {pwd2.length > 0 && !matches && (
                <p className="text-xs text-red-600 mt-1">Paroles nesakrīt</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#E64415] hover:bg-[#E64415]/90 text-white disabled:opacity-50"
            >
              {loading ? 'Iestata paroli...' : 'Iestatīt paroli'}
            </Button>
          </form>
        ) : null}
      </motion.div>
    </div>
  );
}
