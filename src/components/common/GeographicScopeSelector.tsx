import React from 'react';
import { Globe, MapPin } from 'lucide-react';

export type GeoScope = 'india' | 'world' | 'all';

interface GeographicScopeSelectorProps {
  currentScope: GeoScope;
  onScopeChange: (scope: GeoScope) => void;
  className?: string;
}

export const GeographicScopeSelector: React.FC<GeographicScopeSelectorProps> = ({
  currentScope,
  onScopeChange,
  className = '',
}) => {
  const scopes: Array<{ id: GeoScope; label: string; icon: string; desc: string }> = [
    { id: 'india', label: 'India', icon: '🇮🇳', desc: 'National, Regional & State Coverage' },
    { id: 'world', label: 'World', icon: '🌍', desc: 'Global & Geopolitical News' },
    { id: 'all', label: 'All', icon: '🌐', desc: 'Balanced India & Global Feed' },
  ];

  return (
    <div className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs ${className}`}>
      {scopes.map((s) => {
        const isActive = currentScope === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onScopeChange(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200/80 dark:border-slate-700/80 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
            title={s.desc}
          >
            <span className="text-sm leading-none">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};
