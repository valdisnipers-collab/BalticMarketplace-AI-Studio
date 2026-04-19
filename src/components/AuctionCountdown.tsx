import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface AuctionCountdownProps {
  endDate: string;
  onExtended?: (newEndDate: string) => void;
}

function formatTime(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export function AuctionCountdown({ endDate, onExtended }: AuctionCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(new Date(endDate).getTime() - Date.now());
  const [currentEnd, setCurrentEnd] = useState(endDate);

  useEffect(() => {
    setCurrentEnd(endDate);
    setTimeLeft(new Date(endDate).getTime() - Date.now());
  }, [endDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(new Date(currentEnd).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [currentEnd]);

  const { days, hours, minutes, seconds } = formatTime(timeLeft);
  const isEnding = timeLeft > 0 && timeLeft < 3 * 60 * 1000;
  const isEnded = timeLeft <= 0;

  if (isEnded) {
    return (
      <div className="flex items-center gap-2 bg-slate-100 text-slate-500 rounded-xl px-4 py-2">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">Izsole ir beigusies</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl px-4 py-3 ${isEnding ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className={`w-4 h-4 ${isEnding ? 'text-red-500' : 'text-slate-500'}`} />
        <span className={`text-xs font-medium uppercase tracking-wide ${isEnding ? 'text-red-600' : 'text-slate-500'}`}>
          {isEnding ? 'Beidzas drīz!' : 'Laiks līdz beigām'}
        </span>
      </div>
      <div className="flex gap-3">
        {days > 0 && (
          <div className="text-center">
            <p className={`text-2xl font-bold tabular-nums ${isEnding ? 'text-red-600' : 'text-slate-900'}`}>{days}</p>
            <p className="text-xs text-slate-500">dienas</p>
          </div>
        )}
        <div className="text-center">
          <p className={`text-2xl font-bold tabular-nums ${isEnding ? 'text-red-600' : 'text-slate-900'}`}>{String(hours).padStart(2, '0')}</p>
          <p className="text-xs text-slate-500">stundas</p>
        </div>
        <div className={`text-2xl font-bold ${isEnding ? 'text-red-600' : 'text-slate-400'}`}>:</div>
        <div className="text-center">
          <p className={`text-2xl font-bold tabular-nums ${isEnding ? 'text-red-600' : 'text-slate-900'}`}>{String(minutes).padStart(2, '0')}</p>
          <p className="text-xs text-slate-500">minūtes</p>
        </div>
        <div className={`text-2xl font-bold ${isEnding ? 'text-red-600' : 'text-slate-400'}`}>:</div>
        <div className="text-center">
          <p className={`text-2xl font-bold tabular-nums ${isEnding ? 'text-red-600 animate-pulse' : 'text-slate-900'}`}>{String(seconds).padStart(2, '0')}</p>
          <p className="text-xs text-slate-500">sekundes</p>
        </div>
      </div>
    </div>
  );
}
