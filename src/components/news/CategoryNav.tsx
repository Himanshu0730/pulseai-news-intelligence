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
    <div className="w-full overflow-x-auto no-scrollbar py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-w-max">
        {ALL_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const translationKey = CATEGORY_TRANSLATION_MAP[cat] || cat;
          const label = t(translationKey, cat);

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
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
