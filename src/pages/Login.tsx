import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { LogIn, AlertCircle, Phone, KeyRound, Mail, Lock, Fingerprint, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

type AuthMethod = 'select' | 'email' | 'phone' | 'smart-id';

export default function Login() {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('select');
  
  // Phone state
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'code'>('phone');
  const [simulated, setSimulated] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Smart-ID state
  const [personalCode, setPersonalCode] = useState('');
  const [country, setCountry] = useState('LV');
  const [smartIdSession, setSmartIdSession] = useState('');
  const [smartIdCode, setSmartIdCode] = useState('');
  const [smartIdStep, setSmartIdStep] = useState<'init' | 'polling'>('init');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signIn } = useAuth();

  // --- Phone Auth Handlers ---
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās nosūtīt SMS');
      if (data.simulated) setSimulated(true);
      setPhoneStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nepareizs kods');
      signIn(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Email Auth Handlers ---
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nepareizs e-pasts vai parole');
      signIn(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Smart-ID Auth Handlers ---
  const handleSmartIdInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/smart-id/login/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalCode, country })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās uzsākt Smart-ID');
      
      setSmartIdSession(data.sessionId);
      setSmartIdCode(data.verificationCode);
      setSmartIdStep('polling');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (smartIdStep === 'polling' && smartIdSession) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/auth/smart-id/login/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: smartIdSession, personalCode })
          });
          const data = await res.json();
          if (res.ok && data.status === 'OK') {
            clearInterval(interval);
            signIn(data.token, data.user);
            navigate('/');
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [smartIdStep, smartIdSession, personalCode, navigate, signIn]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative"
      >
        {authMethod !== 'select' && (
          <button 
            onClick={() => setAuthMethod('select')}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        <div>
          <div className="mx-auto h-12 w-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Ienākt profilā
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Vai{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
              izveido jaunu kontu
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {authMethod === 'select' && (
          <div className="mt-8 space-y-4">
            <button
              onClick={() => setAuthMethod('phone')}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-slate-900">Telefona numurs</p>
                  <p className="text-xs text-slate-500">Ātrā ienākšana ar SMS kodu</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setAuthMethod('email')}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-slate-900">E-pasts un parole</p>
                  <p className="text-xs text-slate-500">Klasiskā ienākšana</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setAuthMethod('smart-id')}
              className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    Smart-ID
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                      Ieteicams uzņēmumiem
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Droša ienākšana ar Smart-ID</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {authMethod === 'email' && (
          <form className="mt-8 space-y-6" onSubmit={handleEmailLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-pasts</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email" type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="tavs@epasts.lv"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Parole</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password" type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Ienāk...' : 'Ienākt'}
            </button>
          </form>
        )}

        {authMethod === 'phone' && (
          phoneStep === 'phone' ? (
            <form className="mt-8 space-y-6" onSubmit={handleRequestOTP}>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Telefona numurs</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="phone" type="tel" required
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="+371 20000000"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading || !phone}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sūta SMS...' : 'Saņemt SMS kodu'}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
              {simulated && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Izstrādes režīms:</strong> SMS netika nosūtīta. Izmantojiet kodu <strong>123456</strong>.
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">SMS Kods</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="code" type="text" required
                    value={code} onChange={(e) => setCode(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-center tracking-widest text-lg font-mono"
                    placeholder="000000" maxLength={6}
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <button
                  type="submit" disabled={loading || code.length < 4}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Pārbauda...' : 'Apstiprināt un ienākt'}
                </button>
                <button
                  type="button" onClick={() => setPhoneStep('phone')}
                  className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  Mainīt telefona numuru
                </button>
              </div>
            </form>
          )
        )}

        {authMethod === 'smart-id' && (
          smartIdStep === 'init' ? (
            <form className="mt-8 space-y-6" onSubmit={handleSmartIdInit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valsts</label>
                  <select
                    value={country} onChange={(e) => setCountry(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="LV">Latvija</option>
                    <option value="EE">Igaunija</option>
                    <option value="LT">Lietuva</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Personas kods</label>
                  <input
                    type="text" required
                    value={personalCode} onChange={(e) => setPersonalCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="123456-12345"
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading || !personalCode}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sazinās ar Smart-ID...' : 'Ienākt ar Smart-ID'}
              </button>
            </form>
          ) : (
            <div className="mt-8 space-y-6 text-center">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-600 mb-2">Tavs Smart-ID kontroles kods ir:</p>
                <p className="text-4xl font-mono font-bold text-primary-600 tracking-widest">{smartIdCode}</p>
              </div>
              <p className="text-sm text-slate-600">
                Lūdzu, atver Smart-ID lietotni savā viedtālrunī un apstiprini pieprasījumu, pārliecinoties, ka kodi sakrīt.
              </p>
              <div className="flex justify-center pt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
              <button
                type="button" onClick={() => setSmartIdStep('init')}
                className="mt-4 text-sm text-primary-600 hover:text-primary-500"
              >
                Atcelt
              </button>
            </div>
          )
        )}

      </motion.div>
    </div>
  );
}
