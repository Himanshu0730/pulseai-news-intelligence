import React from 'react';

export const ArticleCardSkeleton: React.FC = () => {
  return (
    <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between animate-pulse shadow-2xs">
      <div className="flex-1">
        <div className="w-full h-44 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4" />
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-5/6 mb-2" />
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-2/3 mb-4" />
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2" />
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
};

export const HeroArticleSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 animate-pulse shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-3">
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-11/12" />
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mt-3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-11/12" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
          <div className="pt-3 flex gap-2">
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
        <div className="md:col-span-1">
          <div className="w-full h-48 md:h-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const StoryClusterSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse shadow-2xs">
      {/* Header Badge & Sources */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Cluster Title */}
      <div className="space-y-2">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-11/12" />
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
      </div>

      {/* RAG Briefing box skeleton */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    </div>
  );
};

export const TrendingSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 animate-pulse shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>

      {/* Topic Chips */}
      <div className="space-y-2">
        <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Trending Items */}
      <div className="space-y-4 pt-2">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2">
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ViralSignalsSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
      {[1, 2, 3].map((idx) => (
        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
};

export const SummarySkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
      <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg w-full" />
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5" />
      </div>
    </div>
  );
};

interface SmartSkeletonFeedProps {
  mode?: 'stories' | 'articles';
  statusText?: string;
}

export const SmartSkeletonFeed: React.FC<SmartSkeletonFeedProps> = ({
  mode = 'stories',
  statusText = 'Syncing real-time intelligence feed...',
}) => {
  return (
    <div className="space-y-6">
      {/* Smart Status Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 rounded-xl text-xs text-sky-700 dark:text-sky-300 font-medium animate-pulse">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>{statusText}</span>
        </div>
        <span className="font-mono text-[10px] uppercase opacity-75">Multi-Source RAG</span>
      </div>

      {mode === 'stories' ? (
        <div className="space-y-5">
          <StoryClusterSkeleton />
          <StoryClusterSkeleton />
          <StoryClusterSkeleton />
        </div>
      ) : (
        <div className="space-y-6">
          <HeroArticleSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
            <ArticleCardSkeleton />
          </div>
        </div>
      )}
    </div>
  );
};

