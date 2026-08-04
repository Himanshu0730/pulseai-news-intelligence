import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { Article } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { TrendingSkeleton } from '../common/Skeleton';

interface TrendingSectionProps {
  articles: Article[];
  topics: string[];
  onSelectArticle: (article: Article) => void;
  onSelectTopic: (topic: string) => void;
  isLoading?: boolean;
}

export const TrendingSection: React.FC<TrendingSectionProps> = ({
  articles,
  topics,
  onSelectArticle,
  onSelectTopic,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  if (isLoading || (articles.length === 0 && topics.length === 0)) {
    return <TrendingSkeleton />;
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-2xs font-ui lg:h-[340px] lg:flex lg:flex-col">
      {/* Header */}
      <div className="flex-none flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Flame className="w-4 h-4 fill-amber-500" />
          </div>
          <h3 className="text-base font-editorial font-bold text-slate-900 dark:text-slate-100">
            Signal-Driven Trends
          </h3>
        </div>
        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
          Coverage Velocity
        </span>
      </div>

      {/* Hot Topics Chips */}
      <div className="flex-none">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
          High Velocity Themes
        </span>
        <div className="flex flex-wrap gap-1.5">
          {topics.map((topic, i) => (
            <button
              key={i}
              onClick={() => onSelectTopic(topic)}
              className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3 h-3 text-amber-500" />
              <span>{topic}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ranked Trending List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
          Highest Coverage Volume
        </span>
        <div className="space-y-1">
          {articles.slice(0, 4).map((article, index) => (
            <div
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className="group flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 w-4 text-center shrink-0 font-mono">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider block truncate mb-0.5">
                  {article.category || article.source?.name}
                </span>
                <h4 className="text-xs font-editorial font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-300 line-clamp-1 leading-snug">
                  {article.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
