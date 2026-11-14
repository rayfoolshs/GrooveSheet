import React, { useMemo, useState } from 'react';
import { BookOpen, BookmarkPlus, Search, Trash2, X } from 'lucide-react';
import { GROOVE_LIBRARY } from '../data/grooveLibrary';
import { GrooveDocument, LibraryPreset } from '../types/groove';

interface GrooveLibraryModalProps {
  isOpen: boolean;
  currentGroove: GrooveDocument;
  customGrooves: LibraryPreset[];
  onClose: () => void;
  onSelectPreset: (preset: LibraryPreset) => void;
  onSaveCurrentToLibrary: (difficulty: LibraryPreset['difficulty'], description: string) => Promise<void>;
  onDeleteCustomGroove: (id: string) => Promise<void>;
}

export const GrooveLibraryModal: React.FC<GrooveLibraryModalProps> = ({
  isOpen,
  currentGroove,
  customGrooves,
  onClose,
  onSelectPreset,
  onSaveCurrentToLibrary,
  onDeleteCustomGroove,
}) => {
  const [search, setSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('All');
  const [savingOpen, setSavingOpen] = useState(false);
  const [saveDifficulty, setSaveDifficulty] = useState<LibraryPreset['difficulty']>('Intermediate');
  const [saveDescription, setSaveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const allPresets = useMemo(() => [...customGrooves, ...GROOVE_LIBRARY], [customGrooves]);

  const styles = useMemo(() => {
    const set = new Set<string>(['All']);
    if (customGrooves.length > 0) set.add('Saved');
    for (const p of allPresets) set.add(p.style);
    return Array.from(set);
  }, [allPresets, customGrooves.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPresets.filter((item) => {
      if (selectedStyle === 'Saved' && !item.isCustom) return false;
      if (selectedStyle !== 'All' && selectedStyle !== 'Saved' && item.style !== selectedStyle) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.style.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.timeSignature.toLowerCase().includes(q)
      );
    });
  }, [allPresets, search, selectedStyle]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveCurrentToLibrary(
        saveDifficulty,
        saveDescription.trim() || `${currentGroove.timeSignature} ${currentGroove.style} pattern at ${currentGroove.bpm} BPM`
      );
      setSavingOpen(false);
      setSaveDescription('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Groove Library"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[86vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Groove Library
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSavingOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Save Current Groove
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close library"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Current Groove Form */}
        {savingOpen && (
          <form
            onSubmit={handleSave}
            className="px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                Save &ldquo;{currentGroove.title}&rdquo; to Library
              </div>
              <div className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                {currentGroove.timeSignature} · {currentGroove.bpm} BPM · {currentGroove.bars} bar(s)
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="Optional performance notes or sticking tips..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={saveDifficulty}
                  onChange={(e) => setSaveDifficulty(e.target.value as LibraryPreset['difficulty'])}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSavingOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save to Library'}
              </button>
            </div>
          </form>
        )}

        {/* Search & Category Tabs */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search grooves by name, style, meter (e.g. Funk, 5/4, Shuffle)..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {styles.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setSelectedStyle(style)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedStyle === style
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No grooves match &ldquo;{search}&rdquo;. Try clearing your search filter.
            </div>
          ) : (
            filtered.map((preset) => (
              <div
                key={preset.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 transition-colors flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {preset.title}
                    </h3>
                    {preset.isCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomGroove(preset.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Delete saved groove"
                        aria-label={`Delete ${preset.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Clean unboxed metadata per design constitution */}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                    <span>{preset.style}</span>
                    <span aria-hidden="true">·</span>
                    <span>{preset.timeSignature}</span>
                    <span aria-hidden="true">·</span>
                    <span>{preset.bpm} BPM</span>
                    <span aria-hidden="true">·</span>
                    <span>{preset.bars} bar{preset.bars > 1 ? 's' : ''}</span>
                    <span aria-hidden="true">·</span>
                    <span>{preset.difficulty}</span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {preset.isCustom ? 'Saved in Studio' : preset.composer}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Load Groove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
