import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink, Sparkles, ShieldAlert, ShieldCheck, Scale, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useBookmarks } from '../../context/BookmarkContext';
import { useLanguage } from '../../context/LanguageContext';
import { Article } from '../../types';
import { api } from '../../api/client';

interface ArticleCardProps {
  article: Article & {
    explanationTag?: string;
    personalizationScore?: number;
  };
  variant?: 'hero' | 'featured' | 'standard' | 'compact';
  onSelectArticle: (article: Article) => void;
  onRequestSummary: (article: Article) => void;
  onCompareCoverage?: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant = 'standard',
  onSelectArticle,
  onRequestSummary,
  onCompareCoverage,
}) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const [showPersonalizationPopup, setShowPersonalizationPopup] = useState(false);
  const [showInlineSummary, setShowInlineSummary] = useState(false);
  const bookmarked = isBookmarked(article.id);

  const logInteraction = (topic?: string) => {
    if (topic) {
      api.post('/news/interaction', { topic }).catch(() => {});
    }
  };

  const handleCardClick = () => {
    logInteraction(article.category);
    onSelectArticle(article);
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const past = new Date(dateStr).getTime();
      const now = Date.now();
      const diffMin = Math.floor((now - past) / (1000 * 60));

      if (diffMin < 1) return t('justNow');
      if (diffMin < 60) return `${diffMin}m ${t('ago')}`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ${t('ago')}`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${t('ago')}`;
    } catch {
      return t('justNow');
    }
  };

  const fallbackImages = [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  ];

  const imageSrc =
    imgError || !article.urlToImage
      ? fallbackImages[Math.abs(article.id.length) % fallbackImages.length]
      : article.urlToImage;

  const misinfo = article.misinformationRisk;

  /* HERO VARIANT */
  if (variant === 'hero') {
    return (
      <div className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Image Canvas */}
          <div
            onClick={handleCardClick}
            className="lg:col-span-6 relative h-64 sm:h-80 lg:h-auto overflow-hidden cursor-pointer bg-slate-950"
          >
            <img
              src={imageSrc}
              alt={article.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 lg:hidden" />
            
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-bold uppercase tracking-wider shadow-md">
                ⚡ Breaking Story
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold border border-white/20">
                {article.category || 'General'}
              </span>
            </div>

            {article.readTimeMinutes && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-xs font-medium border border-white/10">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.readTimeMinutes} {t('minRead')}</span>
              </div>
            )}
          </div>

          {/* Editorial Headline & Brief Column */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              {/* Publisher & Metadata */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3 font-ui">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {article.source?.name || 'Publisher'}
                  </span>
                  {article.region === 'India' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      🇮🇳 India
                    </span>
                  )}
                  {article.credibilityScore && (
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {article.credibilityScore}% Trust
                    </span>
                  )}
                </div>
                <span>{formatTimeAgo(article.publishedAt)}</span>
              </div>

              {/* Title */}
              <h2
                onClick={handleCardClick}
                className="text-2xl sm:text-3xl font-editorial font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-tight cursor-pointer mb-4"
              >
                {article.title}
              </h2>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-ui line-clamp-3 mb-4">
                {article.description}
              </p>

              {/* Inline AI Quick Teaser */}
              <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 font-ui text-xs text-sky-950 dark:text-sky-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-[11px] text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    PulseAI Key Insight
                  </span>
                  <button
                    onClick={() => setShowInlineSummary(!showInlineSummary)}
                    className="hover:underline flex items-center gap-0.5 cursor-pointer text-sky-600 dark:text-sky-300"
                  >
                    <span>{showInlineSummary ? 'Hide' : 'Expand Preview'}</span>
                    {showInlineSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                {showInlineSummary ? (
                  <p className="pt-1 text-slate-700 dark:text-slate-300 leading-relaxed text-xs animate-fade-in">
                    {article.content || article.description}
                  </p>
                ) : (
                  <p className="line-clamp-2 text-slate-600 dark:text-slate-300">
                    {article.description}
                  </p>
                )}
              </div>
            </div>

            {/* Footer CTA Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 font-ui">
              <button
                onClick={handleCardClick}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Read Full Story</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestSummary(article);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Generate Full AI Briefing"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="hidden sm:inline">AI Briefing</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(article);
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    bookmarked
                      ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                  title={bookmarked ? 'Remove Bookmark' : t('saveArticle')}
                >
                  <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-rose-500' : ''}`} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  /* FEATURED / STANDARD CARD VARIANT */
  return (
    <div className="group h-full bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md">
      <div className="flex-1 flex flex-col">
        {/* Verification & Relevance Badges */}
        <div className="mb-3 flex flex-col gap-1.5">
          {article.explanationTag && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPersonalizationPopup(!showPersonalizationPopup);
                }}
                className="w-full text-left px-2.5 py-1 rounded-md bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 border border-sky-100 dark:border-sky-900/60 text-[11px] font-medium text-sky-800 dark:text-sky-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Info className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="font-bold">Why you're seeing this:</span>
                  <span className="truncate font-normal">{article.explanationTag}</span>
                </span>
              </button>

              {showPersonalizationPopup && (
                <div className="absolute left-0 top-full mt-1.5 z-20 w-72 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 animate-fade-in font-ui">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>Personalization Insight</span>
                    <span className="text-[10px] font-mono font-bold text-sky-600">Relevance</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 space-y-1 text-[11px]">
                    <p className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Matches your followed preferences
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> {article.explanationTag}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {misinfo && (
            <div
              className={`px-2.5 py-1 rounded-md border text-[11px] font-medium flex items-center justify-between ${
                misinfo.riskLevel === 'High Risk'
                  ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 text-rose-800 dark:text-rose-300'
                  : misinfo.riskLevel === 'Medium Risk'
                  ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                {misinfo.riskLevel === 'Low Risk' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span className="font-semibold">Verification: {misinfo.riskLevel}</span>
              </span>
            </div>
          )}
        </div>

        {/* Thumbnail Image */}
        <div
          onClick={handleCardClick}
          className="relative w-full h-44 sm:h-48 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950 mb-3 cursor-pointer shrink-0"
        >
          <img
            src={imageSrc}
            alt={article.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-800 dark:text-slate-200">
            {article.category || 'General'}
          </div>
          {article.readTimeMinutes && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{article.readTimeMinutes} {t('minRead')}</span>
            </div>
          )}
        </div>

        {/* Publisher & Time */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2 font-ui">
          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {article.source?.name || 'Publisher'}
            </span>
            {article.sourceType === 'PRIMARY' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                Primary
              </span>
            )}
            {article.region === 'India' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                🇮🇳 India
              </span>
            )}
          </div>
          <span>{formatTimeAgo(article.publishedAt)}</span>
        </div>

        {/* Headline Title */}
        <h3
          onClick={handleCardClick}
          className="text-base sm:text-lg font-editorial font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 cursor-pointer mb-2 leading-snug"
        >
          {article.title}
        </h3>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm line-clamp-2 mb-3 leading-relaxed font-ui flex-1">
          {article.description}
        </p>

        {/* Inline AI Summary Toggleable Block */}
        {showInlineSummary && (
          <div className="mb-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300 font-ui animate-fade-in">
            <span className="font-bold text-sky-700 dark:text-sky-400 block mb-1">
              ⚡ Quick AI Summary:
            </span>
            <p className="leading-relaxed">{article.content || article.description}</p>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2 font-ui">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              logInteraction(article.category);
              onRequestSummary(article);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-semibold border border-sky-200 dark:border-sky-800/60 transition-colors cursor-pointer"
            title="Generate AI Executive Summary"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>AI Briefing</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInlineSummary(!showInlineSummary);
            }}
            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer hidden sm:flex items-center gap-1"
            title="Quick Peek AI Summary"
          >
            <span>{showInlineSummary ? 'Hide' : 'Quick Peek'}</span>
          </button>

          {onCompareCoverage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompareCoverage(article);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
              title="Compare Multi-Outlet Coverage"
            >
              <Scale className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              logInteraction(article.category);
              toggleBookmark(article);
            }}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              bookmarked
                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60'
            }`}
            title={bookmarked ? 'Remove Bookmark' : t('saveArticle')}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-rose-500' : ''}`} />
          </button>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 transition-colors"
            title={t('readOriginal')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

