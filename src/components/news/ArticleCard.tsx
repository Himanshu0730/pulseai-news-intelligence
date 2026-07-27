import React, { useState } from 'react';
import { Bookmark, Clock, ExternalLink, Sparkles, Filter, ShieldCheck, Scale } from 'lucide-react';
import { useBookmarks } from '../../context/BookmarkContext';
import { useLanguage } from '../../context/LanguageContext';
import { Article } from '../../types';
import { api } from '../../api/client';

interface ArticleCardProps {
  article: Article & {
    explanationTag?: string;
    personalizationScore?: number;
  };
  onSelectArticle: (article: Article) => void;
  onRequestSummary: (article: Article) => void;
  onCompareCoverage?: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSelectArticle,
  onRequestSummary,
  onCompareCoverage,
}) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  const bookmarked = isBookmarked(article.id);

  const logInteraction = (topic?: string) => {
    if (topic) {
      api.post('/users/interaction', { topic }).catch(() => {});
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

  return (
    <div className="group bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-2xs hover:shadow-md">
      <div>
        {/* Explanation Tag (Subtle Personalization Indicator) */}
        {article.explanationTag && (
          <div className="mb-3 px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/60 text-[11px] font-medium text-sky-800 dark:text-sky-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <Filter className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="truncate">{article.explanationTag}</span>
            </span>
            {article.personalizationScore && (
              <span className="font-mono text-[10px] font-bold opacity-80 shrink-0">
                {article.personalizationScore}%
              </span>
            )}
          </div>
        )}

        {/* Thumbnail Image */}
        <div
          onClick={handleCardClick}
          className="relative w-full h-44 sm:h-48 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-950 mb-3 cursor-pointer"
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

        {/* Publisher & Published Time with Source Intelligence Badges */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
              {article.source?.name || 'Publisher'}
            </span>
            {article.sourceType === 'PRIMARY' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                Official
              </span>
            )}
            {article.sourceType === 'FACT_CHECK' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shrink-0">
                Fact Check
              </span>
            )}
            {article.sourceType === 'VIDEO' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shrink-0">
                Video
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

        {/* Article Title Headline */}
        <h3
          onClick={handleCardClick}
          className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 cursor-pointer mb-2 leading-snug"
        >
          {article.title}
        </h3>

        {/* Article Description */}
        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed font-sans">
          {article.description}
        </p>
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
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
            <span>{t('aiSummaryBtn')}</span>
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
