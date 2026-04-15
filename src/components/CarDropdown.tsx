import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Star } from 'lucide-react';
import { CAR_MAKES, CAR_MODELS_GROUPED, TOP_CAR_MAKES, CarModelGroup } from '../lib/carData';
import { cn } from '@/lib/utils';

interface CarMakeDropdownProps {
  value: string;
  onChange: (make: string) => void;
  placeholder?: string;
}

interface CarModelDropdownProps {
  make: string;
  value: string;
  onChange: (model: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// ─── Make Dropdown ────────────────────────────────────────────────────────────

export function CarMakeDropdown({ value, onChange, placeholder = 'Jebkura' }: CarMakeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search.trim()
    ? CAR_MAKES.filter(m => m.toLowerCase().includes(search.toLowerCase()))
    : CAR_MAKES;

  const topFiltered = search.trim()
    ? []
    : TOP_CAR_MAKES;

  const select = (make: string) => {
    onChange(make);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full h-12 bg-slate-50 border-2 rounded-xl px-4 text-sm font-semibold flex items-center justify-between transition-colors outline-none",
          open ? "border-[#E64415]" : "border-slate-100 hover:border-slate-200"
        )}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>{value || placeholder}</span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 h-9">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Meklēt marku..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="shrink-0">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {/* Any option */}
            <button
              type="button"
              onClick={() => select('')}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50",
                !value ? "font-bold text-[#E64415]" : "text-slate-500"
              )}
            >
              {placeholder}
            </button>

            {/* Top makes */}
            {topFiltered.length > 0 && (
              <>
                <div className="px-4 py-1.5 flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Populārākās</span>
                </div>
                {topFiltered.map(make => (
                  <button
                    key={make}
                    type="button"
                    onClick={() => select(make)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-orange-50 hover:text-[#E64415]",
                      value === make ? "text-[#E64415] bg-orange-50" : "text-slate-700"
                    )}
                  >
                    {make}
                  </button>
                ))}
                <div className="mx-4 border-t border-slate-100 my-1" />
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visas markas</span>
                </div>
              </>
            )}

            {/* All makes */}
            {filtered.map(make => (
              <button
                key={make}
                type="button"
                onClick={() => select(make)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-orange-50 hover:text-[#E64415]",
                  value === make ? "text-[#E64415] bg-orange-50 font-semibold" : "text-slate-700"
                )}
              >
                {make}
              </button>
            ))}

            {filtered.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">Nav atrasts</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Model Dropdown ───────────────────────────────────────────────────────────

export function CarModelDropdown({ make, value, onChange, placeholder = 'Jebkurš', disabled }: CarModelDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    setOpen(false);
    setSearch('');
    setExpandedGroups(new Set());
  }, [make]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const groups: CarModelGroup[] = CAR_MODELS_GROUPED[make] ?? [];

  const filteredGroups: CarModelGroup[] = search.trim()
    ? groups
        .map(g => ({
          ...g,
          models: g.models.filter(m => m.toLowerCase().includes(search.toLowerCase())),
        }))
        .filter(g => g.models.length > 0 || g.group.toLowerCase().includes(search.toLowerCase()))
    : groups;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const select = (model: string) => {
    onChange(model);
    setOpen(false);
    setSearch('');
  };

  const isSearching = search.trim().length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full h-12 bg-slate-50 border-2 rounded-xl px-4 text-sm font-semibold flex items-center justify-between transition-colors outline-none",
          disabled ? "opacity-50 cursor-not-allowed" : open ? "border-[#E64415]" : "border-slate-100 hover:border-slate-200"
        )}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>{value || placeholder}</span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
              className="p-0.5 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 h-9">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Meklēt modeli..."
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="shrink-0">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Any option */}
            <button
              type="button"
              onClick={() => select('')}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50",
                !value ? "font-bold text-[#E64415]" : "text-slate-500"
              )}
            >
              {placeholder}
            </button>

            {groups.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">Nav modeļu</p>
            )}

            {/* Grouped models */}
            {filteredGroups.map(g => (
              <div key={g.group}>
                {/* Group header — clickable to expand/collapse, unless searching */}
                <button
                  type="button"
                  onClick={() => isSearching ? select(g.group) : toggleGroup(g.group)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm font-bold transition-colors flex items-center justify-between",
                    value === g.group ? "text-[#E64415] bg-orange-50" : "text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <span>{g.group}</span>
                  {!isSearching && (
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-slate-400 transition-transform shrink-0",
                      expandedGroups.has(g.group) ? "rotate-180" : ""
                    )} />
                  )}
                </button>

                {/* Models inside group */}
                {(isSearching || expandedGroups.has(g.group)) && g.models.map(model => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => select(model)}
                    className={cn(
                      "w-full text-left pl-8 pr-4 py-2 text-sm transition-colors hover:bg-orange-50 hover:text-[#E64415]",
                      value === model ? "text-[#E64415] bg-orange-50 font-semibold" : "text-slate-600"
                    )}
                  >
                    {model}
                  </button>
                ))}
              </div>
            ))}

            {filteredGroups.length === 0 && search.trim() && (
              <p className="text-center text-sm text-slate-400 py-6">Nav atrasts</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
