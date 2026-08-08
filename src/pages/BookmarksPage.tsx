import React, { useState } from 'react';
import { Bookmark as BookmarkIcon } from 'lucide-react';
import { ArticleCardSkeleton } from '../components/common/Skeleton';
import { AISummaryModal } from '../components/news/AISummaryModal';
import { ArticleCard } from '../components/news/ArticleCard';
import { ArticleDetailModal } from '../components/news/ArticleDetailModal';
import { useBookmarks } from '../context/BookmarkContext';
import { useLanguage } from '../context/LanguageContext';
import { AISummary, Article, Bookmark } from '../types';
import { api } from '../api/client';

export const BookmarksPage: React.FC = () => {
  const { bookmarks, isLoading } = useBookmarks();
  const { t } = useLanguage();
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedArticleDetail, setSelectedArticleDetail] = useState<Article | null>(null);

  const [summaryArticle, setSummaryArticle] = useState<Article | null>(null);
  const [summaryData, setSummaryData] = useState<AISummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

  // Convert Bookmark back into Article for ArticleCard & Modals
  const bookmarkToArticle = (b: Bookmark): Article => ({
    id: b.article_id || b.id,
    title: b.title,
    description: b.description,
    content: b.content,
    url: b.url,
    urlToImage: b.url_to_image,
    publishedAt: b.published_at,
    source: { name: b.source_name },
    category: b.category,
  });

  const categories = ['All', ...Array.from(new Set(bookmarks.map((b) => b.category || 'General')))];

  const filtered = filterCategory === 'All' ? bookmarks : bookmarks.filter((b) => (b.category || 'General') === filterCategory);

  const handleRequestSummary = async (article: Article) => {
    setSummaryArticle(article);
    setSummaryData(null);
    setIsSummaryLoading(true);

    try {
      const res = await api.post<{ summary: AISummary }>('/summaries/generate', {
        articleId: article.id,
        title: article.title,
        content: article.content || article.description,
        url: article.url,
      });
      setSummaryData(res.summary);
    } catch (err) {
      console.error('Failed to generate summary', err);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors duration-200 font-ui">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <BookmarkIcon className="w-5 h-5 fill-sky-600/20" />
              </div>
              <div>
                <h1 className="text-2xl font-editorial font-bold text-slate-900 dark:text-slate-100">{t('savedBookmarks')}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Access your saved offline reading list</p>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-sky-700 text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="mt-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
              <ArticleCardSkeleton />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto space-y-3 shadow-2xs">
              <BookmarkIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100">No Saved Bookmarks</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You haven't bookmarked any articles yet. Click the bookmark icon on any card in the news feed to save stories here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {filtered.map((b) => {
                const article = bookmarkToArticle(b);
                return (
                  <ArticleCard
                    key={b.id}
                    article={article}
                    onSelectArticle={setSelectedArticleDetail}
                    onRequestSummary={handleRequestSummary}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticleDetail}
        onClose={() => setSelectedArticleDetail(null)}
        onRequestSummary={handleRequestSummary}
      />

      {/* AI Summary Modal */}
      <AISummaryModal
        article={summaryArticle}
        summary={summaryData}
        isLoading={isSummaryLoading}
        onClose={() => setSummaryArticle(null)}
      />
    </div>
  );
};
