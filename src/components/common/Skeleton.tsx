import React from 'react';

export const ArticleCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between animate-pulse">
      <div>
        <div className="w-full h-48 bg-slate-800 rounded-lg mb-4" />
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-20 bg-slate-800 rounded-full" />
          <div className="h-4 w-24 bg-slate-800 rounded" />
        </div>
        <div className="h-6 bg-slate-800 rounded w-5/6 mb-2" />
        <div className="h-6 bg-slate-800 rounded w-2/3 mb-4" />
        <div className="h-4 bg-slate-800 rounded w-full mb-2" />
        <div className="h-4 bg-slate-800 rounded w-4/5" />
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
        <div className="h-8 w-28 bg-slate-800 rounded-lg" />
        <div className="h-8 w-8 bg-slate-800 rounded-lg" />
      </div>
    </div>
  );
};

export const SummarySkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse p-4 bg-slate-900 border border-slate-800 rounded-xl">
      <div className="h-6 bg-slate-800 rounded w-1/3" />
      <div className="h-16 bg-slate-800 rounded-lg w-full" />
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-800 rounded w-5/6" />
        <div className="h-4 bg-slate-800 rounded w-4/5" />
      </div>
    </div>
  );
};
