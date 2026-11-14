import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { SubdivisionId, TimeSignatureId } from '../types/groove';
import { getSwingTimingSummary } from '../utils/grooveHelpers';

interface SwingShuffleBarProps {
  swing: number;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  onChangeSwing: (swing: number) => void;
}

const SWING_PRESETS: { value: number; label: string; title: string }[] = [
  { value: -33, label: 'Forward', title: 'Nudge off-beats forward (-33%)' },
  { value: 0, label: 'Straight', title: 'Straight quantized feel (0%)' },
  { value: 50, label: 'Swing', title: 'Classic triplet swing (+50%)' },
  { value: 66, label: 'Shuffle', title: 'Hard dotted shuffle (+66%)' },
];

export const SwingShuffleBar: React.FC<SwingShuffleBarProps> = ({
  swing,
  bpm,
  timeSignature,
  subdivision,
  onChangeSwing,
}) => {
  const { clampedSwing, label, shiftMs } = getSwingTimingSummary(
    swing,
    bpm,
    timeSignature,
    subdivision
  );

  const signedPct = clampedSwing > 0 ? `+${clampedSwing}%` : `${clampedSwing}%`;
  const signedMs = shiftMs > 0 ? `+${shiftMs} ms` : `${shiftMs} ms`;

  return (
    <section
      className="bg-(--studio-surface) border border-(--studio-border) rounded-xl px-4 py-3 no-print"
      aria-label="Swing and Shuffle timing control"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Label & scope */}
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                Swing / Shuffle
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                · All Instruments
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nudge off-beats forward (early) or backward (late) from straight grid
            </p>
          </div>
        </div>

        {/* Center: Bipolar Slider with Straight 0% Center Detent */}
        <div className="flex-1 min-w-[240px] max-w-md">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span>Forward (-66%)</span>
            <button
              type="button"
              onClick={() => onChangeSwing(0)}
              className="font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Snap to Straight (0%)"
            >
              Straight (0%)
            </button>
            <span>Shuffle (+66%)</span>
          </div>

          <div className="relative flex items-center">
            {/* Center 0% detent tick */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-px h-3.5 bg-slate-400 dark:bg-slate-500 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="range"
              min={-66}
              max={66}
              step={1}
              value={clampedSwing}
              onChange={(e) => onChangeSwing(Number(e.target.value))}
              onDoubleClick={() => onChangeSwing(0)}
              aria-label="Swing and Shuffle timing offset for all instruments"
              aria-valuetext={`${signedPct} ${label}, off-beat shift ${signedMs}`}
              className="relative z-10 w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Right: Quick Feel Buttons + Tabular Offset Readout */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-(--studio-surface-muted) border border-(--studio-border)">
            {SWING_PRESETS.map((preset) => {
              const isSelected = clampedSwing === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChangeSwing(preset.value)}
                  title={preset.title}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="text-right min-w-[116px] font-mono-tabular">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              {signedPct} · {label}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Off-beat {signedMs}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
