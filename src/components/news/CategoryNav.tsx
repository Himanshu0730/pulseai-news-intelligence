import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ALL_CATEGORIES, Category } from '../../types';

interface CategoryNavProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

const CATEGORY_TRANSLATION_MAP: Record<string, string> = {
  All: 'catAll',
  Technology: 'catTech',
  'AI & ML': 'catAI',
  Business: 'catBusiness',
  Science: 'catScience',
  World: 'catWorld',
  Health: 'catHealth',
  Climate: 'catClimate',
  Entertainment: 'catEntertainment',
  Sports: 'catSports',
  Finance: 'catFinance',
  Politics: 'catPolitics',
};

export const CategoryNav: React.FC<CategoryNavProps> = ({ selectedCategory, onSelectCategory }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md sticky top-16 z-20 font-ui">
      <div className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-w-max">
        {ALL_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const translationKey = CATEGORY_TRANSLATION_MAP[cat] || cat;
          const label = t(translationKey, cat);

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm scale-[1.02]'
                  : 'bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
