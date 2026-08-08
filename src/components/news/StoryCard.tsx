import React, { useState } from 'react';
import { Sparkles, Layers, ShieldCheck, ShieldAlert, Scale, ChevronRight, Clock, Info } from 'lucide-react';
import { StoryCluster, Article } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface StoryCardProps {
  cluster: StoryCluster;
  onOpenStory: (cluster: StoryCluster) => void;
  onCompareCoverage?: (article: Article) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ cluster, onOpenStory, onCompareCoverage }) => {
  const { t } = useLanguage();
  const [showPersonalizationInfo, setShowPersonalizationInfo] = useState(false);

  const rep = cluster.representativeArticle;
  const publishers = Array.from(
    new Set(cluster.articles.map((a) => a.source?.name).filter(Boolean))
  );

  const displayedPublishers = publishers.slice(0, 4);
  const remainingCount = Math.max(0, cluster.sourcesCount - displayedPublishers.length);

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

  const getTrendBadge = () => {
    if (cluster.sourcesCount >= 8) {
      return {
        label: 'Rapidly developing',
        bgColor: 'bg-rose-50 dark:bg-rose-950/80',
        textColor: 'text-rose-800 dark:text-rose-300',
        borderColor: 'border-rose-200 dark:border-rose-800',
      };
    }
    if (cluster.distinctPublisherCount >= 4) {
      return {
        label: 'Trending coverage',
        bgColor: 'bg-amber-50 dark:bg-amber-950/80',
        textColor: 'text-amber-800 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-800',
      };
    }
    if (cluster.distinctPublisherCount >= 2) {
      return {
        label: 'Multi-outlet',
        bgColor: 'bg-sky-50 dark:bg-sky-950/80',
        textColor: 'text-sky-800 dark:text-sky-300',
        borderColor: 'border-sky-200 dark:border-sky-800',
      };
    }
    return {
      label: 'Emerging story',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/80',
      textColor: 'text-emerald-800 dark:text-emerald-300',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    };
  };

  const badge = getTrendBadge();
  const misinfo = cluster.misinformationRisk || rep.misinformationRisk;

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between space-y-4 font-ui">
      <div>
        {/* Header Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}>
              {badge.label}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700">
              <Layers className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span>{cluster.sourcesCount} sources</span>
            </span>
            {cluster.region === 'India' && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold">
                🇮🇳 India
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {formatTimeAgo(cluster.latestUpdate || rep.publishedAt)}</span>
          </div>
        </div>

        {/* Relevance Tag */}
        {rep.explanationTag && (
          <div className="relative mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPersonalizationInfo(!showPersonalizationInfo);
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border border-sky-100 dark:border-sky-900/60 text-[11px] font-medium text-sky-800 dark:text-sky-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Info className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span className="font-semibold">Relevance:</span>
              <span className="truncate">{rep.explanationTag}</span>
            </button>

            {showPersonalizationInfo && (
              <div className="absolute left-0 top-full mt-1.5 z-20 w-72 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 animate-fade-in">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span>Relevance Context</span>
                  <span className="text-[10px] font-mono font-bold text-sky-600">Personalized</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300 space-y-1 text-[11px]">
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span> Matched to your followed topics
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">✓</span> {rep.explanationTag}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Story Cluster Headline */}
        <h2
          onClick={() => onOpenStory(cluster)}
          className="text-xl sm:text-2xl font-editorial font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors cursor-pointer mb-2.5 leading-snug"
        >
          {cluster.clusterTitle || rep.title}
        </h2>

        {/* Short Grounded Story Briefing Preview */}
        {cluster.summaryBriefing ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 mb-3">
            <div>
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block mb-0.5">
                What Happened
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed font-ui">
                {cluster.summaryBriefing.whatHappened}
              </p>
            </div>
            {cluster.summaryBriefing.whyItMatters && (
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Why It Matters
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-ui">
                  {cluster.summaryBriefing.whyItMatters}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed font-ui">
            {rep.description}
          </p>
        )}

        {/* Misinformation Risk Indicator */}
        {misinfo && (
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium mb-3 flex items-center justify-between ${
              misinfo.riskLevel === 'High Risk'
                ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                : 'bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {misinfo.riskLevel === 'Low Risk' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-bold">Verification: {misinfo.riskLevel}</span>
            </div>
          </div>
        )}

        {/* Multi-Outlet Sources Bar */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <span className="font-bold text-slate-800 dark:text-slate-200">Outlets:</span>
          {displayedPublishers.map((pub, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] font-semibold text-slate-800 dark:text-slate-200"
            >
              {pub}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
              +{remainingCount} more
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
        <button
          onClick={() => onOpenStory(cluster)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explore Story Briefing</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {onCompareCoverage && (
          <button
            onClick={() => onCompareCoverage(rep)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Compare Outlets</span>
          </button>
        )}
      </div>
    </div>
  );
};
