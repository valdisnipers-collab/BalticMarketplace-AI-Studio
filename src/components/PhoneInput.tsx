import React, { useEffect, useMemo, useState } from 'react';
import { Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Baltic-only phone input. The platform targets LV/EE/LT users, so the
// country picker is intentionally small. A user types only the local
// digits and the component combines them with the dialling code into
// an E.164 string (e.g. `+37129469877`) for the parent.

type Country = 'LV' | 'EE' | 'LT';

interface CountryConfig {
  flag: string;
  dial: string;         // +371 (no trailing space)
  dialDigits: string;   // 371 (no plus, used for parsing incoming E.164)
  minDigits: number;
  maxDigits: number;
  placeholder: string;
}

const COUNTRIES: Record<Country, CountryConfig> = {
  LV: { flag: '🇱🇻', dial: '+371', dialDigits: '371', minDigits: 8, maxDigits: 8, placeholder: '20000000' },
  EE: { flag: '🇪🇪', dial: '+372', dialDigits: '372', minDigits: 7, maxDigits: 8, placeholder: '5000000' },
  LT: { flag: '🇱🇹', dial: '+370', dialDigits: '370', minDigits: 8, maxDigits: 8, placeholder: '60000000' },
};

const STORAGE_KEY = 'baltic_phone_country';

function readStoredCountry(): Country {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'LV' || v === 'EE' || v === 'LT') return v;
  } catch {
    // localStorage might throw in private mode
  }
  return 'LV';
}

// Best-effort parse: if parent passes an existing E.164, detect its
// country + local digits so the UI can display them.
function parseE164(e164: string): { country: Country | null; localDigits: string } {
  if (!e164 || !e164.startsWith('+')) return { country: null, localDigits: '' };
  const digits = e164.slice(1).replace(/\D/g, '');
  for (const [code, cfg] of Object.entries(COUNTRIES) as [Country, CountryConfig][]) {
    if (digits.startsWith(cfg.dialDigits)) {
      return { country: code, localDigits: digits.slice(cfg.dialDigits.length) };
    }
  }
  return { country: null, localDigits: '' };
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  id?: string;
}

export default function PhoneInput({
  value, onChange, disabled, autoFocus, required, id,
}: PhoneInputProps) {
  // Initial country: parsed from incoming value if any, else localStorage
  const initial = useMemo(() => {
    const parsed = parseE164(value);
    return parsed.country ?? readStoredCountry();
  }, [value]); // only runs on mount effectively; stable after first render

  const [country, setCountry] = useState<Country>(initial);
  const [localDigits, setLocalDigits] = useState<string>(() => parseE164(value).localDigits);

  // Keep parent in sync whenever country or local digits change. Emit a
  // complete E.164 only when the local digits satisfy the country's
  // length bounds; otherwise emit an empty string so <form required>
  // blocks submission.
  useEffect(() => {
    const cfg = COUNTRIES[country];
    if (localDigits.length >= cfg.minDigits && localDigits.length <= cfg.maxDigits) {
      onChange(`${cfg.dial}${localDigits}`);
    } else {
      onChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, localDigits]);

  function handleCountryChange(next: string) {
    if (next !== 'LV' && next !== 'EE' && next !== 'LT') return;
    setCountry(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip everything except digits — users may paste '+371 20 000 000'.
    const digits = e.target.value.replace(/\D/g, '');
    const cfg = COUNTRIES[country];
    setLocalDigits(digits.slice(0, cfg.maxDigits));
  }

  const cfg = COUNTRIES[country];

  return (
    <div className="flex gap-2">
      <Select value={country} onValueChange={handleCountryChange} disabled={disabled}>
        <SelectTrigger className="w-[7.5rem] shrink-0" aria-label="Valsts kods">
          <SelectValue>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-base leading-none">{cfg.flag}</span>
              <span className="font-mono">{cfg.dial}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(COUNTRIES) as [Country, CountryConfig][]).map(([code, c]) => (
            <SelectItem key={code} value={code}>
              <span className="inline-flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="font-medium">{code}</span>
                <span className="text-slate-500 font-mono">{c.dial}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Phone className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          value={localDigits}
          onChange={handleLocalChange}
          placeholder={cfg.placeholder}
          className="pl-10 font-mono tracking-wide"
        />
      </div>
    </div>
  );
}
