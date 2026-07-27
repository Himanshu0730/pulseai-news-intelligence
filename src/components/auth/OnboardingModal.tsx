import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const CATEGORIES = [
  { id: 'AI & ML', label: 'catAI', icon: '🤖' },
  { id: 'Technology', label: 'catTech', icon: '💻' },
  { id: 'Business', label: 'catBusiness', icon: '💼' },
  { id: 'Science', label: 'catScience', icon: '🔬' },
  { id: 'World', label: 'catWorld', icon: '🌐' },
  { id: 'Health', label: 'catHealth', icon: '🏥' },
  { id: 'Climate', label: 'catClimate', icon: '🌱' },
  { id: 'Finance', label: 'catFinance', icon: '📈' },
  { id: 'Entertainment', label: 'catEntertainment', icon: '🎬' },
  { id: 'Sports', label: 'catSports', icon: '⚽' },
  { id: 'Politics', label: 'catPolitics', icon: '🏛️' },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [selected, setSelected] = useState<string[]>(['Technology', 'AI & ML', 'Business', 'Science']);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const toggleCategory = (catId: string) => {
    setSelected((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
    setErrorMsg('');
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      setErrorMsg(t('selectMinThree'));
      return;
    }

    setIsSaving(true);
    try {
      if (token) {
        await api.put('/users/interests', { interests: selected });
      } else {
        localStorage.setItem('guest_interests', JSON.stringify(selected));
      }
      setIsSaving(false);
      onComplete();
    } catch (err) {
      console.error('Error saving onboarding interests', err);
      setIsSaving(false);
      // Proceed gracefully
      onComplete();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-serif font-bold">{t('onboardingTitle')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-sans">{t('onboardingSub')}</p>
          </div>

          {/* Category Pill Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isChecked = selected.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  type="button"
                  className={`p-3 rounded-xl text-left border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-200 font-semibold shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm">{cat.icon}</span>
                    <span>{t(cat.label)}</span>
                  </span>
                  {isChecked && <Check className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-500 text-center font-medium">{errorMsg}</p>
          )}

          {/* Footer Save Button */}
          <div className="pt-2 flex flex-col space-y-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>{isSaving ? t('saving') : t('saveInterests')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>You can adjust these choices anytime from your profile settings</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
