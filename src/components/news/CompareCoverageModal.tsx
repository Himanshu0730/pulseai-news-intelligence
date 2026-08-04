import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, HelpCircle, Layers, Scale, ShieldCheck, X } from 'lucide-react';
import { api } from '../../api/client';
import { Article } from '../../types';

interface CompareCoverageModalProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CoverageData {
  agreements: string[];
  differences: string[];
  primarySources: string[];
  uncertainties: string[];
}

export const CompareCoverageModal: React.FC<CompareCoverageModalProps> = ({
  article,
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<CoverageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && article) {
      setIsLoading(true);
      api.post<CoverageData>('/news/compare-coverage', { article })
        .then((res) => setData(res))
        .catch((err) => console.error('Coverage comparison error', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, article]);

  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-ui">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100">
                Cross-Source Coverage Comparison
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-outlet corroboration and evidence analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Snapshot */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Target Story:</span>
          </div>
          <p className="text-sm font-editorial font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
            {article.title}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span>Publisher: <strong className="text-slate-700 dark:text-slate-300">{article.source.name}</strong></span>
            <span>•</span>
            <span>Region: <strong className="text-slate-700 dark:text-slate-300">{article.region || 'India'}</strong></span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Analyzing multi-source reporting patterns...</p>
          </div>
        ) : data ? (
          <div className="space-y-4 text-xs sm:text-sm">
            
            {/* Agreement Section */}
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold uppercase text-xs tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Consensus & Shared Facts</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-slate-700 dark:text-slate-300 text-xs">
                {data.agreements.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Differences Section */}
            <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold uppercase text-xs tracking-wider">
                <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Reporting Angles & Focus Differences</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-slate-700 dark:text-slate-300 text-xs">
                {data.differences.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Primary Source Verification */}
            <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold uppercase text-xs tracking-wider">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Primary Source Availability</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-slate-700 dark:text-slate-300 text-xs">
                {data.primarySources.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Uncertainty & Unconfirmed Details */}
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold uppercase text-xs tracking-wider">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Unconfirmed Details & Open Questions</span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc text-slate-700 dark:text-slate-300 text-xs">
                {data.uncertainties.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

          </div>
        ) : null}

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            PulseAI Multi-Source Aggregation
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
};
