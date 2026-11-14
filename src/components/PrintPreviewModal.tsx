import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { GrooveDocument } from '../types/groove';
import { getSwingTimingSummary } from '../utils/grooveHelpers';
import { PercussionStaff } from './PercussionStaff';

interface PrintPreviewModalProps {
  isOpen: boolean;
  groove: GrooveDocument;
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  groove,
  onClose,
}) => {
  const [showCounting, setShowCounting] = useState(true);
  const [showDrumKey, setShowDrumKey] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Print Sheet Music Preview"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl print-sheet-container">
        {/* Screen Controls Header (Hidden on Print) */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Print Sheet Music
            </h2>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCounting}
                onChange={(e) => setShowCounting(e.target.checked)}
                className="accent-blue-600"
              />
              Beat Counting
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showDrumKey}
                onChange={(e) => setShowDrumKey(e.target.checked)}
                className="accent-blue-600"
              />
              PAS Drum Key
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
                className="accent-blue-600"
              />
              Performance Notes
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close print preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Engraved Printable Sheet Paper */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 print:p-0 print:bg-white">
          <div className="max-w-[900px] mx-auto bg-white text-slate-950 p-8 sm:p-10 rounded-lg border border-slate-200 print:border-none print:p-0 print:rounded-none shadow-xs">
            {/* Sheet Music Header */}
            <div className="text-center border-b border-slate-200 pb-5 mb-6">
              <h1 className="font-display text-2xl font-bold text-slate-950">
                {groove.title || 'Untitled Drum Groove'}
              </h1>
              <div className="mt-1.5 flex items-center justify-center gap-2 text-xs text-slate-600">
                <span>{groove.style}</span>
                <span aria-hidden="true">·</span>
                <span>{groove.composer}</span>
              </div>
            </div>

            {/* Tempo & Feel Marking */}
            <div className="flex items-center justify-between text-xs font-medium text-slate-800 mb-4">
              <div className="font-mono-tabular">
                ♩ = {groove.bpm} BPM
                {(() => {
                  const summary = getSwingTimingSummary(
                    groove.swing,
                    groove.bpm,
                    groove.timeSignature,
                    groove.subdivision
                  );
                  if (summary.clampedSwing === 0) return ' · Straight Feel';
                  const sign = summary.clampedSwing > 0 ? `+${summary.clampedSwing}%` : `${summary.clampedSwing}%`;
                  return ` · ${summary.label} ${sign}`;
                })()}
              </div>
              <div className="font-mono-tabular text-slate-500">
                {groove.timeSignature} · {groove.subdivision} subdivision · {groove.bars} bar
                {groove.bars > 1 ? 's' : ''}
              </div>
            </div>

            {/* Vector Staff */}
            <PercussionStaff
              groove={groove}
              activeStep={null}
              showCounting={showCounting}
              showDrumKey={showDrumKey}
              printMode={true}
            />

            {/* Optional Performance Notes */}
            {showNotes && groove.notes && (
              <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">Performance Notes: </span>
                {groove.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
