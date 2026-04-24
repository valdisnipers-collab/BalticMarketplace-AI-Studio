import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { ShieldCheck, ShieldAlert, AlertCircle, CheckCircle2, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Stage = 'idle' | 'setup' | 'show-recovery' | 'disable';

export default function TwoFactorSettings() {
  const { user, updateUser } = useAuth();
  const [stage, setStage] = useState<Stage>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // setup-init payload
  const [pendingSecret, setPendingSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [setupCode, setSetupCode] = useState('');

  // recovery display
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // disable flow
  const [disableCode, setDisableCode] = useState('');

  const authHeader = () => {
    const t = localStorage.getItem('auth_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  async function beginSetup() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Neizdevās uzsākt 2FA');
      setPendingSecret(data.pendingSecret);
      setQrDataUrl(data.qrDataUrl);
      setSetupCode('');
      setStage('setup');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ pendingSecret, code: setupCode.replace(/\s/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nepareizs kods');
      setRecoveryCodes(data.recoveryCodes || []);
      setStage('show-recovery');
      setPendingSecret('');
      setQrDataUrl('');
      setSetupCode('');
      updateUser({ totp_enabled: true });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function beginDisable() {
    setError('');
    setDisableCode('');
    setStage('disable');
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ code: disableCode.replace(/\s/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nepareizs kods');
      updateUser({ totp_enabled: false });
      setStage('idle');
      setDisableCode('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateRecovery() {
    const code = window.prompt('Ievadiet 6-ciparu kodu no authenticator lietotnes, lai apstiprinātu rezerves kodu pārģenerēšanu:');
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/2fa/recovery-codes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ code: code.replace(/\s/g, '') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nepareizs kods');
      setRecoveryCodes(data.recoveryCodes || []);
      setStage('show-recovery');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyRecovery() {
    navigator.clipboard.writeText(recoveryCodes.join('\n')).catch(() => {});
  }

  function downloadRecovery() {
    const text = `BalticMarket — rezerves kodi (${new Date().toISOString().slice(0, 10)})\n\nKatrs kods der vienu reizi. Glabājiet drošā vietā.\n\n${recoveryCodes.join('\n')}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balticmarket-2fa-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  const isEnabled = !!user?.totp_enabled;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center uppercase tracking-tight">
        {isEnabled ? <ShieldCheck className="w-6 h-6 mr-3 text-emerald-600" /> : <ShieldAlert className="w-6 h-6 mr-3 text-amber-500" />}
        Divfaktoru apstiprināšana (2FA)
      </h2>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        Papildu drošība pie ienākšanas — pēc paroles ievadīšanas prasa 6-ciparu kodu no authenticator lietotnes (Google Authenticator, Authy, 1Password, iCloud Keychain u.c.). Ja zaudē telefonu, vari izmantot kādu no 8 rezerves kodiem.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {stage === 'idle' && !isEnabled && (
        <Button
          onClick={beginSetup}
          disabled={loading}
          className="bg-[#E64415] hover:bg-[#E64415]/90 text-white rounded-xl px-6 py-5 font-bold uppercase tracking-wider text-xs"
        >
          {loading ? 'Sagatavo...' : 'Ieslēgt 2FA'}
        </Button>
      )}

      {stage === 'idle' && isEnabled && (
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center bg-emerald-50 text-emerald-800 rounded-xl px-4 py-2 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 mr-2" /> 2FA ir aktīvs
          </div>
          <Button variant="outline" onClick={regenerateRecovery} disabled={loading}>
            Pārģenerēt rezerves kodus
          </Button>
          <Button variant="outline" onClick={beginDisable} className="text-red-600 hover:text-red-700">
            Atslēgt 2FA
          </Button>
        </div>
      )}

      {stage === 'setup' && (
        <form onSubmit={confirmSetup} className="space-y-5 max-w-md">
          <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
            <li>Atver authenticator lietotni telefonā</li>
            <li>Skenē QR kodu vai ievadi secret manuāli</li>
            <li>Ievadi 6-ciparu kodu zemāk, lai apstiprinātu</li>
          </ol>
          {qrDataUrl && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
              <img src={qrDataUrl} alt="2FA QR kods" className="w-56 h-56" />
              <p className="mt-3 text-xs text-slate-500">Ja nevari skenēt:</p>
              <code className="mt-1 text-xs font-mono text-slate-700 bg-slate-50 rounded px-2 py-1 break-all max-w-full">{pendingSecret}</code>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">6-ciparu kods</label>
            <Input
              type="text" required autoFocus autoComplete="one-time-code"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              maxLength={6}
              className="text-center tracking-widest text-lg font-mono"
              placeholder="000000"
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || setupCode.replace(/\s/g, '').length !== 6} className="bg-[#E64415] hover:bg-[#E64415]/90 text-white">
              {loading ? 'Aktivizē...' : 'Apstiprināt un aktivizēt'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setStage('idle')}>Atcelt</Button>
          </div>
        </form>
      )}

      {stage === 'show-recovery' && (
        <div className="space-y-4 max-w-md">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <p className="font-semibold mb-1">Saglabājiet rezerves kodus <strong>tagad</strong>.</p>
            <p>Tie parādās tikai vienreiz. Katrs kods der vienu pieslēgšanos, ja nav pieejams authenticator.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-4 font-mono text-sm">
            {recoveryCodes.map((code, i) => (
              <div key={i} className="text-slate-800">{code}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyRecovery}>
              <Copy className="w-4 h-4 mr-2" /> Kopēt
            </Button>
            <Button variant="outline" onClick={downloadRecovery}>
              <Download className="w-4 h-4 mr-2" /> Lejupielādēt .txt
            </Button>
            <Button onClick={() => setStage('idle')} className="bg-slate-900 hover:bg-slate-800 text-white ml-auto">
              Esmu saglabājis
            </Button>
          </div>
        </div>
      )}

      {stage === 'disable' && (
        <form onSubmit={confirmDisable} className="space-y-4 max-w-md">
          <p className="text-sm text-slate-700">
            Lai atslēgtu 2FA, ievadiet pašreizējo 6-ciparu kodu no authenticator lietotnes.
          </p>
          <Input
            type="text" required autoFocus autoComplete="one-time-code"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value)}
            maxLength={6}
            className="text-center tracking-widest text-lg font-mono"
            placeholder="000000"
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={loading || disableCode.replace(/\s/g, '').length !== 6} className="bg-red-600 hover:bg-red-700 text-white">
              {loading ? 'Atslēdz...' : 'Atslēgt 2FA'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setStage('idle')}>Atcelt</Button>
          </div>
        </form>
      )}
    </div>
  );
}
