import { Check } from 'lucide-react';
import React from 'react';
import { ALL_CATEGORIES, Category } from '../../types';

interface InterestSelectorProps {
  selectedInterests: string[];
  onChangeInterests: (interests: string[]) => void;
}

export const InterestSelector: React.FC<InterestSelectorProps> = ({
  selectedInterests,
  onChangeInterests,
}) => {
  const availableCategories = ALL_CATEGORIES.filter((c) => c !== 'All');

  const toggleInterest = (category: string) => {
    if (selectedInterests.includes(category)) {
      if (selectedInterests.length === 1) return; // Must keep at least 1
      onChangeInterests(selectedInterests.filter((c) => c !== category));
    } else {
      onChangeInterests([...selectedInterests, category]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Select Your Favorite Categories
        </label>
        <span className="text-[11px] text-slate-400">
          {selectedInterests.length} selected
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {availableCategories.map((cat) => {
          const isSelected = selectedInterests.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() => toggleInterest(cat)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-sm'
                  : 'bg-slate-950/60 hover:bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              <span>{cat}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-orange-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
