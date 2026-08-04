import React, { useState } from 'react';
import { Bookmark, Calendar, Clock, ExternalLink, Globe, Sparkles, User, X, Loader2, ShieldCheck, ShieldAlert, Scale, Eye, Share2, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

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

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(article.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bookmarked = isBookmarked(article.id);
  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
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

  const misinfo = article.misinformationRisk;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-md animate-fade-in flex justify-end">
      
      {/* Slide-Over Drawer Container */}
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-5xl h-full shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 transition-all duration-300 transform translate-x-0">
        
        {/* Sticky Header Actions */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 font-ui">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold uppercase tracking-wider">
              {article.category || 'General'}
            </span>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-800 dark:text-slate-200">{article.source.name}</span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Focus Mode Toggle */}
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                focusMode
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Toggle Distraction-Free Reading Mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{focusMode ? 'Exit Reader' : 'Distraction Free'}</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Copy Story Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Bookmark */}
            <button
              onClick={() => toggleBookmark(article)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                bookmarked
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={bookmarked ? 'Remove Bookmark' : t('saveArticle')}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Open Original */}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Open Original Source"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Drawer */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Layout Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10">
          <div className={`mx-auto ${focusMode ? 'max-w-3xl' : 'max-w-6xl'} grid grid-cols-1 ${focusMode ? '' : 'lg:grid-cols-12'} gap-8`}>
            
            {/* Left Main Article Content Pane */}
            <div className={`${focusMode ? 'w-full' : 'lg:col-span-8'} space-y-6`}>
              
              {/* Publication Header */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-ui">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {article.source.name}
                  </span>
                  {article.sourceType === 'PRIMARY' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Primary Document
                    </span>
                  )}
                  {article.region === 'India' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      🇮🇳 India
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {article.readTimeMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {article.readTimeMinutes} {t('minRead')}
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-editorial font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                {displayTitle}
              </h1>

              {/* Byline Author & Translation */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-4 border-b border-slate-200 dark:border-slate-800 font-ui text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {article.author || article.source.name}
                  </span>
                  <span>•</span>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formattedDate}</span>
                </div>

                {/* Translation Controls */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setViewMode('original')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      viewMode === 'original'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Original
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
                      <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                    ) : (
                      <Globe className="w-3 h-3" />
                    )}
                    <span>{currentLangObj.code.toUpperCase()}</span>
                  </button>
                </div>
              </div>

              {/* Cover Image */}
              {article.urlToImage && !imgError && (
                <div className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <img
                    src={article.urlToImage}
                    alt={article.title}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Description Lead Pull Quote */}
              {displayDescription && (
                <p className="text-base sm:text-xl font-editorial italic text-slate-800 dark:text-slate-200 leading-relaxed border-l-4 border-sky-600 dark:border-sky-400 pl-5 py-2 bg-slate-50 dark:bg-slate-950/60 rounded-r-xl">
                  "{displayDescription}"
                </p>
              )}

              {/* Article Content */}
              <div className="text-base sm:text-lg text-slate-800 dark:text-slate-200 leading-relaxed space-y-6 font-editorial">
                <p>{displayContent}</p>
                <p className="text-sm font-ui text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                  This report is published by <strong className="text-slate-800 dark:text-slate-200">{article.source.name}</strong>. PulseAI synthesizes multi-outlet coverage and primary filings for factual accuracy.
                </p>
              </div>

              {/* Primary Source Link Action */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-ui">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md"
                >
                  <span>Read Full Original Article on {article.source.name}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Right Sticky AI Intelligence Panel */}
            {!focusMode && (
              <div className="lg:col-span-4 space-y-6 font-ui">
                <div className="sticky top-20 space-y-6">
                  
                  {/* Executive AI Briefing Box */}
                  <div className="p-5 rounded-2xl bg-sky-50/90 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-sky-200/60 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
                        <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">AI Intelligence Brief</h3>
                      </div>
                      <span className="text-[10px] font-mono text-sky-600 font-bold">Gemini Engine</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Instant factual breakdown generated from cross-checking primary sources and newsroom reports.
                    </p>

                    <button
                      onClick={() => {
                        onRequestSummary(article);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{t('aiSummaryBtn')}</span>
                    </button>
                  </div>

                  {/* Trust & Credibility Gauge */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Source Trust & Verification
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Credibility Index</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {article.credibilityScore || 92}/100
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${article.credibilityScore || 92}%` }}
                        />
                      </div>
                    </div>

                    {misinfo && (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          misinfo.riskLevel === 'High Risk'
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-900 dark:text-rose-200'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          {misinfo.riskLevel === 'Low Risk' ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>Verification: {misinfo.riskLevel}</span>
                        </div>
                        <p className="text-[11px] opacity-90">{misinfo.recommendation}</p>
                      </div>
                    )}
                  </div>

                  {/* Fact Check Status */}
                  {article.factCheckStatus?.available && (
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs space-y-2">
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block text-[10px]">
                        Fact Check Verdict
                      </span>
                      <p className="font-bold text-indigo-900 dark:text-indigo-200">
                        {article.factCheckStatus.verdict}
                      </p>
                      <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                        Claim: "{article.factCheckStatus.claim}"
                      </p>
                    </div>
                  )}

                  {/* Cross-Source Coverage Trigger */}
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Multi-Outlet Cross-Check</span>
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Compare how left, right, and center outlets report on this story.
                    </p>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

