import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink, HelpCircle, History, Layers, Newspaper, RefreshCw, Scale, X } from 'lucide-react';
import { api } from '../../api/client';
import { Article } from '../../types';
import { CoverageData, normalizeCoverageData } from './coverageData';

interface CompareCoverageModalProps {
  article: Article | null;
  /** Additional articles covering the same story (e.g. a story cluster's members). */
  relatedArticles?: Article[];
  isOpen: boolean;
  onClose: () => void;
}

export const CompareCoverageModal: React.FC<CompareCoverageModalProps> = ({
  article,
  relatedArticles = [],
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<CoverageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadComparison = () => {
    if (!article) return;
    setIsLoading(true);
    setError(null);
    setData(null);
    api.post<CoverageData>('/news/compare-coverage', { article, articles: relatedArticles })
      .then((res) => setData(normalizeCoverageData(res)))
      .catch((err) => {
        console.error('Coverage comparison error', err);
        setError('The coverage comparison could not be generated right now.');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen && article) {
      loadComparison();
    }
  }, [isOpen, article, relatedArticles]);

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
                Earlier vs. latest reporting on this developing story
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
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Target Story:</span>
          </div>
          <p className="text-sm font-editorial font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
            {article.title}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Publisher: <strong className="text-slate-700 dark:text-slate-300">{article.source.name}</strong></span>
            <span>•</span>
            <span>Region: <strong className="text-slate-700 dark:text-slate-300">{article.region || 'Region unspecified'}</strong></span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Analyzing multi-source reporting patterns...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{error}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The comparison needs multiple recent reports on the same story to detect changes.
            </p>
            <button
              onClick={loadComparison}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        ) : data && data.sufficientCoverage ? (
          <div className="space-y-4 text-xs sm:text-sm">

            {/* Earlier Coverage */}
            <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold uppercase text-xs tracking-wider">
                <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Earlier Coverage</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {data.previousCoverage}
              </p>
            </div>

            {/* Latest Coverage */}
            <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2">
              <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-bold uppercase text-xs tracking-wider">
                <Newspaper className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Latest Coverage</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {data.latestCoverage}
              </p>
            </div>

            {/* What Changed */}
            <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold uppercase text-xs tracking-wider">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>What Changed</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {data.whatChanged}
              </p>
            </div>

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Read the original report
              </a>
            )}

          </div>
        ) : data ? (
          /* Honest insufficient-coverage state: fewer than 2 distinct sources. */
          <div className="p-6 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {data.message || 'Not enough independent coverage to compare yet.'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Compare Coverage needs at least two genuinely distinct reporting outlets covering the same story. As more
              independent sources report it, this comparison will populate automatically.
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Coverage comparison data is currently unavailable.
            </p>
          </div>
        )}

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
