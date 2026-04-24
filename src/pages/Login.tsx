import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { LogIn, AlertCircle, Phone, KeyRound, Mail, Lock, Fingerprint, ArrowLeft, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';

type AuthMethod = 'select' | 'email' | 'phone' | 'smart-id';

export default function Login() {
  const { t } = useI18n();
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

  // 2FA state — shown after any first-factor auth succeeds for a
  // user with TOTP enabled. We collect a 6-digit code or a recovery code.
  const [twoFaTempToken, setTwoFaTempToken] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaMode, setTwoFaMode] = useState<'code' | 'recovery'>('code');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle Google SSO callback redirects: /login?sso_token=... | sso_2fa=1&sso_temp=... | sso_error=...
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token');
    const sso2fa = searchParams.get('sso_2fa');
    const ssoTemp = searchParams.get('sso_temp');
    const ssoError = searchParams.get('sso_error');

    if (ssoError) {
      setError(ssoError);
      setSearchParams({}, { replace: true });
      return;
    }

    if (sso2fa === '1' && ssoTemp) {
      setTwoFaTempToken(ssoTemp);
      setTwoFaCode('');
      setTwoFaMode('code');
      setSearchParams({}, { replace: true });
      return;
    }

    if (ssoToken) {
      // Clear the token from the URL before doing anything else so it is not
      // kept in browser history.
      setSearchParams({}, { replace: true });
      (async () => {
        try {
          const meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${ssoToken}` },
          });
          const meData = await meRes.json();
          if (!meRes.ok || !meData.user) throw new Error(meData.error || 'Neizdevās ielādēt profilu');
          signIn(ssoToken, meData.user);
          navigate('/');
        } catch (err: any) {
          setError(err.message);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        body: JSON.stringify({ phone, code, mode: 'login' })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'NOT_REGISTERED') {
          // Offer a one-click path to registration with the phone prefilled.
          const goRegister = window.confirm(
            `${data.error}\n\nVai vēlaties reģistrēties ar šo numuru?`
          );
          if (goRegister) {
            navigate(`/register?method=phone&phone=${encodeURIComponent(phone)}`);
            return;
          }
        }
        throw new Error(data.error || 'Nepareizs kods');
      }
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
      if (data.requires2FA && data.tempToken) {
        setTwoFaTempToken(data.tempToken);
        setTwoFaCode('');
        setTwoFaMode('code');
        return;
      }
      signIn(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 2FA verify (shared between email and phone paths) ---
  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, string> = { tempToken: twoFaTempToken };
      if (twoFaMode === 'code') body.code = twoFaCode.replace(/\s/g, '');
      else body.recoveryCode = twoFaCode.trim();

      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setAuthMethod('select')}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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

        {twoFaTempToken && (
          <form className="mt-8 space-y-5" onSubmit={handle2FAVerify}>
            <div className="text-center">
              <div className="mx-auto h-10 w-10 bg-primary-100 text-[#E64415] rounded-full flex items-center justify-center">
                <KeyRound className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">Divfaktoru apstiprinājums</h3>
              <p className="mt-1 text-sm text-slate-600">
                {twoFaMode === 'code'
                  ? 'Ievadiet 6-ciparu kodu no authenticator lietotnes'
                  : 'Ievadiet vienu no jūsu rezerves kodiem'}
              </p>
            </div>
            <div>
              <Input
                type="text" required autoFocus autoComplete="one-time-code"
                value={twoFaCode}
                onChange={(e) => setTwoFaCode(e.target.value)}
                className="text-center tracking-widest text-lg font-mono"
                placeholder={twoFaMode === 'code' ? '000000' : 'XXXXX-XXXXX'}
                maxLength={twoFaMode === 'code' ? 6 : 12}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || twoFaCode.trim().length < 5}
              className="w-full bg-[#E64415] hover:bg-[#E64415]/90 text-white"
            >
              {loading ? 'Pārbauda...' : 'Apstiprināt'}
            </Button>
            <div className="flex justify-between text-xs">
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700"
                onClick={() => { setTwoFaTempToken(''); setTwoFaCode(''); }}
              >
                Atcelt
              </button>
              <button
                type="button"
                className="text-[#E64415] hover:underline"
                onClick={() => { setTwoFaMode(twoFaMode === 'code' ? 'recovery' : 'code'); setTwoFaCode(''); }}
              >
                {twoFaMode === 'code' ? 'Izmantot rezerves kodu' : 'Izmantot authenticator kodu'}
              </button>
            </div>
          </form>
        )}

        {!twoFaTempToken && authMethod === 'select' && (
          <div className="mt-8 space-y-4">
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all text-sm font-medium text-slate-900 no-underline"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Ienākt ar Google
            </a>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-slate-400">vai</span></div>
            </div>

            <Button
              variant="outline"
              onClick={() => setAuthMethod('phone')}
              className="w-full h-auto flex items-center justify-start p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-slate-900">Telefona numurs</p>
                  <p className="text-xs text-slate-500 font-normal">Ātrā ienākšana ar SMS kodu</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setAuthMethod('email')}
              className="w-full h-auto flex items-center justify-start p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-slate-900">E-pasts un parole</p>
                  <p className="text-xs text-slate-500 font-normal">Klasiskā ienākšana</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setAuthMethod('smart-id')}
              className="w-full h-auto flex items-center justify-start p-4 border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div className="ml-4 text-left">
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    Smart-ID
                    <Badge variant="secondary" className="bg-primary-100 text-primary-800 hover:bg-primary-200">
                      Ieteicams uzņēmumiem
                    </Badge>
                  </p>
                  <p className="text-xs text-slate-500 font-normal">Droša ienākšana ar Smart-ID</p>
                </div>
              </div>
            </Button>
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
                  <Input
                    id="email" type="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
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
                  <Input
                    id="password" type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-[#E64415] hover:underline">
                Aizmirsi paroli?
              </Link>
            </div>
            <Button
              type="submit" disabled={loading}
              className="w-full"
            >
              {loading ? 'Ienāk...' : 'Ienākt'}
            </Button>
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
                  <Input
                    id="phone" type="tel" required
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    placeholder="+371 20000000"
                  />
                </div>
              </div>
              <Button
                type="submit" disabled={loading || !phone}
                className="w-full"
              >
                {loading ? 'Sūta SMS...' : 'Saņemt SMS kodu'}
              </Button>
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
                  <Input
                    id="code" type="text" required
                    value={code} onChange={(e) => setCode(e.target.value)}
                    className="pl-10 text-center tracking-widest text-lg font-mono"
                    placeholder="000000" maxLength={6}
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-3">
                <Button
                  type="submit" disabled={loading || code.length < 4}
                  className="w-full"
                >
                  {loading ? 'Pārbauda...' : 'Apstiprināt un ienākt'}
                </Button>
                <Button
                  type="button" 
                  variant="outline"
                  onClick={() => setPhoneStep('phone')}
                  className="w-full"
                >
                  Mainīt telefona numuru
                </Button>
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
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Izvēlieties valsti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LV">Latvija</SelectItem>
                      <SelectItem value="EE">Igaunija</SelectItem>
                      <SelectItem value="LT">Lietuva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Personas kods</label>
                  <Input
                    type="text" required
                    value={personalCode} onChange={(e) => setPersonalCode(e.target.value)}
                    placeholder="123456-12345"
                  />
                </div>
              </div>
              <Button
                type="submit" disabled={loading || !personalCode}
                className="w-full"
              >
                {loading ? 'Sazinās ar Smart-ID...' : 'Ienākt ar Smart-ID'}
              </Button>
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
              <Button
                type="button" 
                variant="link"
                onClick={() => setSmartIdStep('init')}
                className="mt-4"
              >
                {t('auth.cancel')}
              </Button>
            </div>
          )
        )}

      </motion.div>
    </div>
  );
}
