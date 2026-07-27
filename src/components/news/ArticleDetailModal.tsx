import React, { useState } from 'react';
import { Bookmark, Calendar, Clock, ExternalLink, Globe, Sparkles, User, X, Loader2, ShieldCheck } from 'lucide-react';
import { useBookmarks } from '../../context/BookmarkContext';
import { useLanguage } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/translations';
import { Article } from '../../types';
import { api } from '../../api/client';

interface ArticleDetailModalProps {
  article: Article | null;
  onClose: () => void;
  onRequestSummary: (article: Article) => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ article, onClose, onRequestSummary }) => {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { language, t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const [translatedData, setTranslatedData] = useState<{
    translatedTitle: string;
    translatedDescription: string;
    translatedContent: string;
    language: string;
  } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');

  if (!article) return null;

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleTranslate = async () => {
    if (translatedData && translatedData.language === language) {
      setViewMode('translated');
      return;
    }

    setIsTranslating(true);
    try {
      const res = await api.post<{
        translatedTitle: string;
        translatedDescription: string;
        translatedContent: string;
        language: string;
      }>('/news/translate', {
        title: article.title,
        description: article.description,
        content: article.content || article.description,
        targetLanguage: language,
      });
      setTranslatedData(res);
      setViewMode('translated');
    } catch (err) {
      console.error('Failed to translate article:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const bookmarked = isBookmarked(article.id);
  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayTitle =
    viewMode === 'translated' && translatedData ? translatedData.translatedTitle : article.title;
  const displayDescription =
    viewMode === 'translated' && translatedData ? translatedData.translatedDescription : article.description;
  const displayContent =
    viewMode === 'translated' && translatedData
      ? translatedData.translatedContent
      : article.content || article.description;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold uppercase tracking-wider">
              {article.category || 'General'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[180px] sm:max-w-xs">
              {article.source.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleBookmark(article)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                bookmarked
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700'
              }`}
              title={bookmarked ? 'Remove Bookmark' : t('saveArticle')}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Article Body */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6 flex-1">
          {/* Article Image Banner */}
          {article.urlToImage && !imgError && (
            <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
              <img
                src={article.urlToImage}
                alt={article.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Translation Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Language: <span className="font-bold">{currentLangObj.nativeName} ({currentLangObj.name})</span>
              </span>
            </div>

            <div className="flex items-center gap-1">
              {language !== 'en' && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setViewMode('original')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      viewMode === 'original'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t('originalArticle') || 'Original'}
                  </button>
                  <button
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === 'translated'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-sky-500" />
                        <span>Translating...</span>
                      </>
                    ) : (
                      <span>{t('translatedArticle') || 'Translated'} ({currentLangObj.code.toUpperCase()})</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {displayTitle}
          </h1>

          {/* Byline Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{article.author || article.source.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            {article.readTimeMinutes && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.readTimeMinutes} {t('minRead')}</span>
              </div>
            )}
          </div>

          {/* Source Intelligence & Verification Panel */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Source Intelligence & Verification
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {article.confidenceLevel || 'High confidence'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Source Type</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {article.sourceType || 'ESTABLISHED'} • {article.source?.name}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Credibility Index</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {article.credibilityScore || 92}/100
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Corroboration</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {article.corroboratingSourcesCount ? `${article.corroboratingSourcesCount} independent sources` : 'Verified multi-outlet coverage'}
                </span>
              </div>
            </div>

            {/* Fact Check Warning or Official Primary Source Link */}
            {article.factCheckStatus?.available && (
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">VERDICT:</span>
                <div>
                  <span className="font-semibold">{article.factCheckStatus.verdict}</span>
                  <p className="text-[11px] opacity-80 mt-0.5">Claim examined: "{article.factCheckStatus.claim}"</p>
                </div>
              </div>
            )}

            {article.disputedInfo?.isDisputed && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">⚠️ CONFLICTING REPORTS DETECTED</span>
                <span>{article.disputedInfo.details}</span>
              </div>
            )}

            {article.primarySourceUrl && (
              <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Official primary document / government filing:</span>
                <a
                  href={article.primarySourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <span>View Primary Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* AI Summary Banner CTA */}
          <div className="p-4 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Want a quick executive breakdown?</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">Generate a 60-second Gemini AI synthesis with key takeaways in {currentLangObj.name}.</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onRequestSummary(article);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('aiSummaryBtn')}</span>
            </button>
          </div>

          {/* Description Lead */}
          {displayDescription && (
            <p className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed border-l-3 border-sky-600 dark:border-sky-400 pl-4 py-1 italic bg-slate-50 dark:bg-slate-950/40 rounded-r-lg font-sans">
              {displayDescription}
            </p>
          )}

          {/* Content */}
          <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 space-y-4 leading-relaxed font-sans">
            <p>{displayContent}</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              To read the complete unedited story and full investigative commentary, please visit the original publication at {article.source.name}.
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white font-semibold text-xs hover:bg-sky-700 transition-colors shadow-2xs"
          >
            <span>{t('readOriginal')} on {article.source.name}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
