import { SlidersHorizontal, User as UserIcon, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { InterestSelector } from './InterestSelector';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSaveSuccess }) => {
  const { user, updateInterests } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || ['Technology', 'AI & ML', 'Business']);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateInterests(selectedInterests);
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to update user interests', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Personalize Your Feed</h3>
              <p className="text-xs text-slate-400">Tailor PulseAI news algorithm to your interests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border border-orange-500/30"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-100">{user.name}</h4>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          {/* Interest Selector */}
          <InterestSelector
            selectedInterests={selectedInterests}
            onChangeInterests={setSelectedInterests}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-orange-400 hover:bg-orange-300 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save & Refresh Feed'}
          </button>
        </div>
      </div>
    </div>
  );
};
