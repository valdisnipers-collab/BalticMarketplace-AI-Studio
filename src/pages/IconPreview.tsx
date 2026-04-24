// Dev-only icon preview page. Mounted by App.tsx conditionally via
// `import.meta.env.DEV`, so production builds strip the route entirely.

import * as Icons from '../components/icons/ExtendedIcons';

export default function IconPreview() {
  const entries = Object.entries(Icons).filter(
    ([, value]) => typeof value === 'function',
  ) as Array<[string, React.ComponentType<{ className?: string }>]>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Extended icons preview</h1>
      <p className="text-sm text-slate-500 mb-6">Tikai izstrādes režīmā. Šī lapa nav pieejama produkcijā.</p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {entries.map(([name, Icon]) => (
          <div key={name} className="rounded-xl bg-white border border-slate-200 p-4 text-center">
            <div className="flex items-center justify-center h-12 text-[#E64415]">
              <Icon className="w-8 h-8" />
            </div>
            <p className="text-[11px] text-slate-600 mt-2 truncate">{name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
