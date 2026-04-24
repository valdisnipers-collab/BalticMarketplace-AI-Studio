import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Neizdevās apstrādāt pieprasījumu');
        return;
      }
      setSubmitted(true);
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
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-slate-900 tracking-tight">
            Aizmirsi paroli?
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Ievadiet e-pastu, ar kuru reģistrējāties — nosūtīsim paroles atjaunošanas saiti.
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-md flex items-start">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <p className="font-semibold mb-1">Pieprasījums nosūtīts</p>
              <p>Ja konts ar šo e-pastu eksistē, esam nosūtījuši paroles atjaunošanas saiti. Pārbaudiet Jūsu pastkasti, tostarp spam mapi. Saite būs derīga 1 stundu.</p>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-pasts</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  id="email" type="email" required autoFocus
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="tavs@epasts.lv"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-[#E64415] hover:bg-[#E64415]/90 text-white"
            >
              {loading ? 'Sūta...' : 'Sūtīt atjaunošanas saiti'}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
