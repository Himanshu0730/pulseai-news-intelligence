import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Calendar,
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StoryCluster, Article } from '../../types';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

interface StoryDetailModalProps {
  cluster: StoryCluster | null;
  onClose: () => void;
}

export const StoryDetailModal: React.FC<StoryDetailModalProps> = ({ cluster, onClose }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'briefing' | 'sources' | 'timeline' | 'evidence'>('briefing');
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [dynamicBriefing, setDynamicBriefing] = useState<any | null>(cluster?.summaryBriefing || null);

  if (!cluster) return null;

  const rep = cluster.representativeArticle;
  const articles = cluster.articles && cluster.articles.length > 0 ? cluster.articles : [rep];
  const misinfo = cluster.misinformationRisk || rep.misinformationRisk;

  const handleGenerateBriefing = async () => {
    setIsGeneratingBriefing(true);
    try {
      const res = await api.post<any>('/news/rag/briefing', { cluster });
      setDynamicBriefing(res.briefing || res);
    } catch (err) {
      console.error('Error generating grounded story briefing:', err);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const briefing = dynamicBriefing || cluster.summaryBriefing;

  const formatTimeAgo = (dateStr: string) => {
    try {
      const past = new Date(dateStr).getTime();
      const now = Date.now();
      const diffMin = Math.floor((now - past) / (1000 * 60));
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-md animate-fade-in flex justify-end">
      
      {/* Drawer Container */}
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-5xl h-full shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 transition-all duration-300">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 font-ui">
          <div className="flex items-center gap-3 truncate max-w-2xl">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  Story Intelligence Cluster
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                  {cluster.sourcesCount} Outlets
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-editorial font-bold text-slate-900 dark:text-slate-100 truncate">
                {cluster.clusterTitle || rep.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto font-ui">
          <button
            onClick={() => setActiveTab('briefing')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'briefing'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Briefing & Synthesis</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sources'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Outlet Reporting ({articles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Story Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>RAG Evidence Inspector</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1">
          
          {/* TAB 1: AI BRIEFING & ANALYSIS */}
          {activeTab === 'briefing' && (
            <div className="space-y-6 font-ui">
              
              {/* Misinformation Risk Banner */}
              {misinfo && (
                <div
                  className={`p-4 rounded-xl border space-y-2 ${
                    misinfo.riskLevel === 'High Risk'
                      ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                      {misinfo.riskLevel === 'Low Risk' ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span>Verification Assessment: {misinfo.riskLevel}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold opacity-80">
                      Corroborating Outlets: {misinfo.corroboratingSourcesCount || cluster.distinctPublisherCount}
                    </span>
                  </div>
                  <p className="text-xs font-semibold">{misinfo.recommendation}</p>
                </div>
              )}

              {/* AI Briefing Card */}
              <div className="p-6 rounded-2xl bg-sky-50/50 dark:bg-slate-950/80 border border-sky-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-sky-200/60 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Grounded AI Executive Briefing
                    </h3>
                  </div>
                  <button
                    onClick={handleGenerateBriefing}
                    disabled={isGeneratingBriefing}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isGeneratingBriefing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Regenerate Briefing</span>
                      </>
                    )}
                  </button>
                </div>

                {briefing ? (
                  <div className="space-y-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    
                    {/* What Happened */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block">
                        What Happened
                      </span>
                      <p className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-editorial text-base text-slate-900 dark:text-slate-100">
                        {briefing.whatHappened || rep.description}
                      </p>
                    </div>

                    {/* Why It Matters */}
                    {briefing.whyItMatters && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Why It Matters
                        </span>
                        <p className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-editorial text-base text-slate-800 dark:text-slate-200">
                          {briefing.whyItMatters}
                        </p>
                      </div>
                    )}

                    {/* Confirmed Facts & Uncertainties Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-ui">
                      {/* Confirmed Facts */}
                      <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Confirmed Facts</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                          {(briefing.confirmedFacts || [rep.title]).map((fact: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                              <span>{fact}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Uncertainties */}
                      <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                          <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span>What Remains Uncertain</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                          {(briefing.uncertainties && briefing.uncertainties.length > 0
                            ? briefing.uncertainties
                            : ['Implementation timeline and exact long-term economic trajectory remain under evaluation.']
                          ).map((unc: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                              <span>{unc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Click "Regenerate Briefing" to compile a 60-second grounded RAG overview across all {articles.length} articles.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: COVERAGE & SOURCES */}
          {activeTab === 'sources' && (
            <div className="space-y-4 font-ui">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Multi-Outlet Coverage ({articles.length} Reporting Outlets)
                </h3>
                <span className="text-xs text-slate-500">
                  Unique Publishers: {cluster.distinctPublisherCount}
                </span>
              </div>

              <div className="space-y-3">
                {articles.map((art, idx) => (
                  <div
                    key={art.id || idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {art.source?.name || 'Publisher'}
                        </span>
                        {art.sourceType === 'PRIMARY' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Official Primary
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatTimeAgo(art.publishedAt)}
                        </span>
                      </div>
                      <h4 className="text-sm font-editorial font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {art.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {art.description}
                      </p>
                    </div>

                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Read Original</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: STORY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 font-ui">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Chronological Reporting Evolution
                </h3>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-200 dark:before:bg-sky-900">
                {articles
                  .slice()
                  .sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
                  .map((art, i) => (
                    <div key={art.id || i} className="relative space-y-1">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-sky-600 ring-4 ring-white dark:ring-slate-900" />
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(art.publishedAt).toLocaleString()}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">• {art.source?.name}</span>
                      </div>
                      <h4 className="text-sm font-editorial font-bold text-slate-900 dark:text-slate-100">
                        {art.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {art.description}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: RAG EVIDENCE INSPECTOR */}
          {activeTab === 'evidence' && (
            <div className="space-y-4 font-ui">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Supporting RAG Evidence Citations
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {articles.map((art, idx) => (
                  <div
                    key={art.id || idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-mono font-bold text-xs">
                        Citation #{idx + 1}
                      </span>
                      <span className="text-xs text-slate-500">{art.source?.name} • {formatTimeAgo(art.publishedAt)}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      "{art.title}"
                    </h4>

                    <p className="text-xs text-slate-700 dark:text-slate-300 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 italic font-editorial text-sm">
                      "{art.description || art.content || 'Excerpt from published report.'}"
                    </p>

                    <div className="flex justify-end pt-1">
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span>Open Source Article</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex items-center justify-between font-ui">
          <a
            href={rep.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors shadow-sm"
          >
            <span>Read Lead Article on {rep.source?.name}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            Close Story
          </button>
        </div>
      </div>
    </div>
  );
};
