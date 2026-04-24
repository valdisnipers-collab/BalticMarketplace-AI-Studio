import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useI18n } from '../components/I18nContext';
import { UserPlus, AlertCircle, Phone, KeyRound, Building2, User, Mail, Lock, ArrowLeft, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RegisterMethod = 'select' | 'email' | 'phone' | 'smart-id';

export default function Register() {
  const { t } = useI18n();
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('select');
  const [userType, setUserType] = useState<'c2c' | 'b2b'>('c2c');
  
  // Common fields
  const [name, setName] = useState('');
  
  // B2B specific fields
  const [companyName, setCompanyName] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');
  const [companyVat, setCompanyVat] = useState('');

  // Phone state
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'details' | 'code'>('details');
  const [simulated, setSimulated] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Smart-ID state
  const [personalCode, setPersonalCode] = useState('');
  const [country, setCountry] = useState('LV');
  const [smartIdSession, setSmartIdSession] = useState('');
  const [smartIdCode, setSmartIdCode] = useState('');
  const [smartIdStep, setSmartIdStep] = useState<'details' | 'polling'>('details');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const validateCommonFields = () => {
    if (name.length < 2) {
      setError('Lūdzu, ievadiet derīgu vārdu');
      return false;
    }
    if (userType === 'b2b' && (!companyName || !companyRegNumber)) {
      setError('Lūdzu, aizpildiet obligātos uzņēmuma datus');
      return false;
    }
    return true;
  };

  // --- Smart-ID Registration Handlers ---
  const handleSmartIdInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateCommonFields()) return;
    if (!personalCode) {
      setError('Lūdzu, ievadiet personas kodu');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/smart-id/register/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          personalCode, 
          country,
          name, 
          user_type: userType,
          company_name: userType === 'b2b' ? companyName : undefined,
          company_reg_number: userType === 'b2b' ? companyRegNumber : undefined,
          company_vat: userType === 'b2b' ? companyVat : undefined
        })
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
          const res = await fetch('/api/auth/smart-id/register/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sessionId: smartIdSession, 
              personalCode,
              name, 
              user_type: userType,
              company_name: userType === 'b2b' ? companyName : undefined,
              company_reg_number: userType === 'b2b' ? companyRegNumber : undefined,
              company_vat: userType === 'b2b' ? companyVat : undefined
            })
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
  }, [smartIdStep, smartIdSession, personalCode, name, userType, companyName, companyRegNumber, companyVat, navigate, signIn]);

  // --- Phone Registration Handlers ---
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateCommonFields()) return;

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
        body: JSON.stringify({ 
          phone, 
          code, 
          name, 
          user_type: userType,
          company_name: userType === 'b2b' ? companyName : undefined,
          company_reg_number: userType === 'b2b' ? companyRegNumber : undefined,
          company_vat: userType === 'b2b' ? companyVat : undefined
        })
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

  // --- Email Registration Handlers ---
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateCommonFields()) return;
    if (password.length < 6) {
      setError('Parolei jābūt vismaz 6 simbolus garai');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          user_type: userType,
          company_name: userType === 'b2b' ? companyName : undefined,
          company_reg_number: userType === 'b2b' ? companyRegNumber : undefined,
          company_vat: userType === 'b2b' ? companyVat : undefined,
          ref: refCode || undefined
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās reģistrēties');
      
      signIn(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderB2BFields = () => {
    if (userType !== 'b2b') return null;
    return (
      <>
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">Uzņēmuma nosaukums *</label>
          <Input
            id="companyName" type="text" required
            value={companyName} onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="companyRegNumber" className="block text-sm font-medium text-slate-700 mb-1">Reģistrācijas numurs *</label>
          <Input
            id="companyRegNumber" type="text" required
            value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="companyVat" className="block text-sm font-medium text-slate-700 mb-1">PVN numurs (neobligāti)</label>
          <Input
            id="companyVat" type="text"
            value={companyVat} onChange={(e) => setCompanyVat(e.target.value)}
          />
        </div>
      </>
    );
  };

  const renderCommonFields = () => (
    <div>
      <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
        {userType === 'b2b' ? 'Kontaktpersonas vārds, uzvārds *' : 'Vārds, uzvārds *'}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <User className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          id="name" type="text" required
          value={name} onChange={(e) => setName(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <div>
          {registerMethod !== 'select' && (
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                setRegisterMethod('select');
                setError('');
                setPhoneStep('details');
              }}
              className="mb-4 text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('auth.back')}
            </Button>
          )}
          <div className="mx-auto h-12 w-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <UserPlus className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Izveidot kontu
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Jau esi reģistrējies?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
              Ienākt profilā
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {registerMethod === 'select' && (
          <div className="mt-8 space-y-4">
            <Button
              variant="outline"
              onClick={() => setRegisterMethod('email')}
              className="w-full h-auto flex items-center justify-start p-4 border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center mr-4">
                  <Mail className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-slate-900">Ar e-pastu</div>
                  <div className="text-sm text-slate-500 font-normal">Reģistrēties ar e-pastu un paroli</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setRegisterMethod('phone')}
              className="w-full h-auto flex items-center justify-start p-4 border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center mr-4">
                  <Phone className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-slate-900">Ar telefona numuru</div>
                  <div className="text-sm text-slate-500 font-normal">Reģistrēties ar SMS kodu</div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setRegisterMethod('smart-id')}
              className="w-full h-auto flex items-center justify-start p-4 border-2 border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center mr-4">
                  <Fingerprint className="w-5 h-5 text-slate-600 group-hover:text-primary-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-slate-900">Ar Smart-ID</div>
                  <div className="text-sm text-slate-500 font-normal">Droša reģistrācija ar Smart-ID</div>
                </div>
              </div>
            </Button>
          </div>
        )}

        {registerMethod !== 'select' && (
          <div className="mt-8">
            <div className="flex rounded-lg shadow-sm p-1 bg-slate-100 mb-6">
              <Button
                type="button"
                variant={userType === 'c2c' ? 'default' : 'ghost'}
                onClick={() => setUserType('c2c')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                  userType === 'c2c' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-transparent'
                }`}
              >
                <User className="h-4 w-4 mr-2" />
                Privātpersona
              </Button>
              <Button
                type="button"
                variant={userType === 'b2b' ? 'default' : 'ghost'}
                onClick={() => setUserType('b2b')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center ${
                  userType === 'b2b' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-transparent'
                }`}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Uzņēmums
              </Button>
            </div>

            {registerMethod === 'email' && (
              <form className="space-y-6" onSubmit={handleEmailRegister}>
                <div className="space-y-4">
                  {renderB2BFields()}
                  {renderCommonFields()}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-pasts *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <Input
                        id="email" type="email" required
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Parole *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <Input
                        id="password" type="password" required minLength={6}
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Reģistrē...' : 'Reģistrēties'}
                </Button>
              </form>
            )}

            {registerMethod === 'phone' && (
              <>
                {phoneStep === 'details' ? (
                  <form className="space-y-6" onSubmit={handleRequestOTP}>
                    <div className="space-y-4">
                      {renderB2BFields()}
                      {renderCommonFields()}

                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                          Telefona numurs *
                        </label>
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
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !phone || !name}
                      className="w-full"
                    >
                      {loading ? 'Sūta SMS...' : 'Saņemt SMS kodu'}
                    </Button>
                  </form>
                ) : (
                  <form className="space-y-6" onSubmit={handleVerifyOTP}>
                    {simulated && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
                        <p className="text-sm text-blue-700">
                          <strong>Izstrādes režīms:</strong> SMS netika nosūtīta. Izmantojiet kodu <strong>123456</strong>.
                        </p>
                      </div>
                    )}
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
                        SMS Kods
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyRound className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                          id="code" type="text" required maxLength={6}
                          value={code} onChange={(e) => setCode(e.target.value)}
                          className="pl-10 text-center tracking-widest text-lg font-mono"
                          placeholder="000000"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-3">
                      <Button
                        type="submit"
                        disabled={loading || code.length < 4}
                        className="w-full"
                      >
                        {loading ? 'Pārbauda...' : 'Apstiprināt un reģistrēties'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPhoneStep('details')}
                        className="w-full"
                      >
                        Atgriezties
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {registerMethod === 'smart-id' && (
              <>
                {smartIdStep === 'details' ? (
                  <form className="space-y-6" onSubmit={handleSmartIdInit}>
                    <div className="space-y-4">
                      {renderB2BFields()}
                      {renderCommonFields()}

                      <div>
                        <label htmlFor="personalCode" className="block text-sm font-medium text-slate-700 mb-1">
                          Personas kods *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Fingerprint className="h-5 w-5 text-slate-400" />
                          </div>
                          <Input
                            id="personalCode" type="text" required
                            value={personalCode} onChange={(e) => setPersonalCode(e.target.value)}
                            className="pl-10"
                            placeholder="123456-12345"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading || !personalCode || !name}
                      className="w-full"
                    >
                      {loading ? 'Sazinās ar Smart-ID...' : 'Reģistrēties ar Smart-ID'}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                      <Fingerprint className="w-8 h-8 text-primary-600 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Apstipriniet Smart-ID lietotnē</h3>
                    <p className="text-sm text-slate-500">
                      Lūdzu, pārbaudiet savu viedtālruni un apstipriniet reģistrāciju.
                    </p>
                    <div className="text-4xl font-mono font-bold tracking-widest text-primary-600 py-4">
                      {smartIdCode}
                    </div>
                    <p className="text-xs text-slate-400">
                      Pārliecinieties, ka kods sakrīt ar to, ko redzat savā ierīcē.
                    </p>
                    <Button
                      variant="link"
                      onClick={() => setSmartIdStep('details')}
                      className="mt-4"
                    >
                      {t('auth.cancel')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
