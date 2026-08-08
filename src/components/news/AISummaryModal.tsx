import React, { useState } from 'react';
import { Check, Clock, Copy, Sparkles, Tag, X } from 'lucide-react';
import { AISummary, Article } from '../../types';
import { SummarySkeleton } from '../common/Skeleton';
import { useLanguage } from '../../context/LanguageContext';

interface AISummaryModalProps {
  article: Article | null;
  summary: AISummary | null;
  isLoading: boolean;
  onClose: () => void;
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({ article, summary, isLoading, onClose }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'tldr' | 'points' | 'analysis'>('tldr');
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const isRtl = language === 'ur';

  const handleCopy = () => {
    if (!summary) return;
    const textToCopy = `PulseAI Intelligence Summary: ${article.title}\n\nTL;DR: ${summary.tldr}\n\nKey Takeaways:\n${summary.key_points.map((p) => `• ${p}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-ui">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 ${
          isRtl ? 'text-right' : ''
        }`}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Gemini Intelligence Briefing
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">{article.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {isLoading ? (
            <SummarySkeleton />
          ) : summary ? (
            <>
              {/* Tab Bar */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setActiveTab('tldr')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'tldr'
                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Executive TL;DR
                </button>
                <button
                  onClick={() => setActiveTab('points')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'points'
                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Key Takeaways
                </button>
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'analysis'
                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Analysis & Sentiment
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'tldr' && (
                <div className="p-5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-editorial">
                  <p className="font-medium text-base">{summary.tldr}</p>
                </div>
              )}

              {activeTab === 'points' && (
                <ul className="space-y-2.5">
                  {summary.key_points.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'analysis' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Sentiment Tone
                    </span>
                    <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                      {summary.analysis.sentiment || 'Balanced'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Perspective Tone
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {summary.analysis.bias || 'Objective Reporting'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time Saved
                    </span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {summary.analysis.reading_time || '1 min AI summary'}
                    </span>
                  </div>

                  {summary.analysis.key_entities && summary.analysis.key_entities.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Key Subject Entities
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {summary.analysis.key_entities.map((entity, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs text-slate-700 dark:text-slate-300 font-semibold"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
              Unable to generate AI summary at this moment. Please try again.
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={handleCopy}
            disabled={!summary || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Briefing'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
