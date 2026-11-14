import React, { useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { DRUM_INSTRUMENTS } from '../data/instruments';
import {
  BrushMode,
  GrooveDocument,
  HitType,
  InstrumentId,
  MixerState,
  RoomParticipant,
} from '../types/groove';
import {
  cycleHitType,
  getBarCountLabels,
  getBeatGroupSizesInSteps,
  getStepsPerBar,
} from '../utils/grooveHelpers';

interface NotationGridProps {
  groove: GrooveDocument;
  mixer: MixerState;
  activeStep: number | null;
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
  onSetCell: (instrument: InstrumentId, step: number, hit: HitType) => void;
  onAuditionInstrument: (instrument: InstrumentId, hit?: HitType) => void;
  onToggleMute: (instrument: InstrumentId) => void;
  onToggleSolo: (instrument: InstrumentId) => void;
  onVolumeChange: (instrument: InstrumentId, volume: number) => void;
  onCellFocus?: (step: number | null, instrument: InstrumentId | null) => void;
  onCopyBarToAll?: (sourceBar: number) => void;
  onClearGrid: () => void;
  remoteParticipants: RoomParticipant[];
  selfId: string | null;
}

const BRUSH_ITEMS: { id: BrushMode; label: string; badge: string }[] = [
  { id: 'cycle', label: 'Cycle', badge: '↻' },
  { id: 'normal', label: 'Normal', badge: '●' },
  { id: 'accent', label: 'Accent', badge: '>' },
  { id: 'ghost', label: 'Ghost', badge: '(·)' },
  { id: 'flam', label: 'Flam', badge: 'fr' },
  { id: 'erase', label: 'Erase', badge: '×' },
];

export const NotationGrid: React.FC<NotationGridProps> = ({
  groove,
  mixer,
  activeStep,
  brushMode,
  onBrushModeChange,
  onSetCell,
  onAuditionInstrument,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onCellFocus,
  onCopyBarToAll,
  onClearGrid,
  remoteParticipants,
  selfId,
}) => {
  const [selectedBar, setSelectedBar] = useState<number>(0);
  const isPaintingRef = useRef(false);
  const paintTargetHitRef = useRef<HitType>(1);

  const stepsPerBar = getStepsPerBar(groove.timeSignature, groove.subdivision);
  const totalSteps = stepsPerBar * groove.bars;
  const countLabels = useMemo(
    () => getBarCountLabels(groove.timeSignature, groove.subdivision),
    [groove.timeSignature, groove.subdivision]
  );

  // Compute beat index per step in bar for clean alternating beat tinting
  const beatGroupPerStepInBar = useMemo(() => {
    const groups = getBeatGroupSizesInSteps(groove.timeSignature, groove.subdivision);
    const map: number[] = [];
    groups.forEach((size, beatIdx) => {
      for (let i = 0; i < size; i++) map.push(beatIdx);
    });
    return map;
  }, [groove.timeSignature, groove.subdivision]);

  const safeBar = Math.min(selectedBar, groove.bars - 1);
  // Show either all bars (if 1 or 2 bars fit cleanly) or allow switching / viewing all with horizontal scroll
  const showAllBars = groove.bars <= 2;
  const visibleStartStep = showAllBars ? 0 : safeBar * stepsPerBar;
  const visibleEndStep = showAllBars ? totalSteps : (safeBar + 1) * stepsPerBar;
  const visibleSteps = Array.from(
    { length: visibleEndStep - visibleStartStep },
    (_, i) => visibleStartStep + i
  );

  const anySolo = Object.values(mixer).some((m) => m.solo);

  const resolveNextHit = (current: HitType, shiftKey: boolean): HitType => {
    if (shiftKey) return current === 2 ? 0 : 2;
    switch (brushMode) {
      case 'cycle':
        return cycleHitType(current);
      case 'normal':
        return current === 1 ? 0 : 1;
      case 'accent':
        return current === 2 ? 0 : 2;
      case 'ghost':
        return current === 3 ? 0 : 3;
      case 'flam':
        return current === 4 ? 0 : 4;
      case 'erase':
        return 0;
    }
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    instId: InstrumentId,
    step: number,
    currentHit: HitType
  ) => {
    e.preventDefault();
    if (e.button === 2) {
      isPaintingRef.current = true;
      paintTargetHitRef.current = 0;
      onSetCell(instId, step, 0);
      return;
    }
    const nextHit = resolveNextHit(currentHit, e.shiftKey);
    isPaintingRef.current = true;
    paintTargetHitRef.current = nextHit;
    onSetCell(instId, step, nextHit);
    if (nextHit > 0) {
      onAuditionInstrument(instId, nextHit);
    }
  };

  const handlePointerEnter = (instId: InstrumentId, step: number) => {
    onCellFocus?.(step, instId);
    if (!isPaintingRef.current) return;
    onSetCell(instId, step, paintTargetHitRef.current);
  };

  const stopPainting = () => {
    isPaintingRef.current = false;
  };

  // Map remote cursors for fast lookup
  const remoteCursorMap = useMemo(() => {
    const map = new Map<string, RoomParticipant>();
    for (const p of remoteParticipants) {
      if (p.clientId === selfId) continue;
      if (p.activeInstrument && p.activeStep !== null) {
        map.set(`${p.activeInstrument}:${p.activeStep}`, p);
      }
    }
    return map;
  }, [remoteParticipants, selfId]);

  return (
    <section
      className="bg-(--studio-surface) border border-(--studio-border) rounded-xl overflow-hidden"
      onPointerUp={stopPainting}
      onPointerLeave={() => {
        stopPainting();
        onCellFocus?.(null, null);
      }}
    >
      {/* Grid Toolbar: Brush Mode + Bar Selector + Quick Pattern Actions */}
      <div className="px-4 py-2.5 border-b border-(--studio-border) flex flex-wrap items-center justify-between gap-3 bg-(--studio-surface-muted)">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            Stroke Tool
          </span>
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/75 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            {BRUSH_ITEMS.map((item) => {
              const active = brushMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onBrushModeChange(item.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="font-mono-tabular text-[11px] opacity-80">{item.badge}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {groove.bars > 2 && (
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/75 dark:bg-slate-800">
              {Array.from({ length: groove.bars }).map((_, bIdx) => (
                <button
                  key={bIdx}
                  type="button"
                  onClick={() => setSelectedBar(bIdx)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                    safeBar === bIdx
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Bar {bIdx + 1}
                </button>
              ))}
            </div>
          )}

          {groove.bars > 1 && onCopyBarToAll && (
            <button
              type="button"
              onClick={() => onCopyBarToAll(showAllBars ? 0 : safeBar)}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              title="Duplicate Bar 1 pattern across all bars"
            >
              Repeat Bar {showAllBars ? 1 : safeBar + 1}
            </button>
          )}

          <button
            type="button"
            onClick={onClearGrid}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Clear Pattern
          </button>
        </div>
      </div>

      {/* Scrollable Sequencer Matrix */}
      <div className="overflow-x-auto groove-scroll">
        <div className="min-w-[820px]">
          {/* Step Count Header Row */}
          <div className="flex items-center border-b border-(--studio-border) bg-(--studio-surface-muted)">
            <div className="w-[228px] shrink-0 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-(--studio-border) sticky left-0 z-10 bg-(--studio-surface-muted) flex items-center justify-between">
              <span>General MIDI Kit</span>
              <span className="font-mono-tabular text-[11px] text-slate-400">Ch 10</span>
            </div>

            <div
              className="flex-1 grid"
              style={{ gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(26px, 1fr))` }}
            >
              {visibleSteps.map((absStep) => {
                const stepInBar = absStep % stepsPerBar;
                const barNum = Math.floor(absStep / stepsPerBar) + 1;
                const isBarStart = stepInBar === 0;
                const isActive = activeStep === absStep;
                const label = countLabels[stepInBar] ?? '';
                const isBeatStart = /^\d+$/.test(label);

                return (
                  <div
                    key={absStep}
                    className={`h-8 flex flex-col items-center justify-center text-[11px] font-mono-tabular border-r ${
                      isBarStart && absStep !== visibleStartStep
                        ? 'border-l-2 border-l-slate-400 dark:border-l-slate-600'
                        : ''
                    } border-slate-100 dark:border-slate-800/80 ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : isBeatStart
                          ? 'text-slate-800 dark:text-slate-200 font-semibold'
                          : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isBarStart && groove.bars > 1 ? (
                      <span className="text-[10px] leading-none">
                        B{barNum}:{label}
                      </span>
                    ) : (
                      <span>{label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instrument Rows */}
          {DRUM_INSTRUMENTS.map((inst) => {
            const mix = mixer[inst.id];
            const isAudible = !mix.muted && (!anySolo || mix.solo);
            const rowHits = groove.steps[inst.id] || [];

            return (
              <div
                key={inst.id}
                className={`flex items-center border-b border-slate-100 dark:border-slate-800/70 last:border-b-0 transition-opacity ${
                  isAudible ? 'opacity-100' : 'opacity-50'
                }`}
              >
                {/* Sticky Instrument Control Column */}
                <div className="w-[228px] shrink-0 px-2.5 py-1.5 border-r border-(--studio-border) sticky left-0 z-10 bg-(--studio-surface) flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAuditionInstrument(inst.id, 1)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1 py-1 px-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    title={`Audition ${inst.name} (GM Note ${inst.gmNote})`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                        {inst.name}
                      </div>
                      <div className="text-[10px] font-mono-tabular text-slate-400 dark:text-slate-500">
                        GM {inst.gmNote}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleMute(inst.id)}
                      className={`w-6 h-6 text-[10px] font-semibold rounded border transition-colors ${
                        mix.muted
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Mute track"
                      aria-label={`Mute ${inst.name}`}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSolo(inst.id)}
                      className={`w-6 h-6 text-[10px] font-semibold rounded border transition-colors ${
                        mix.solo
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Solo track"
                      aria-label={`Solo ${inst.name}`}
                    >
                      S
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(mix.volume * 100)}
                      onChange={(e) => onVolumeChange(inst.id, Number(e.target.value) / 100)}
                      aria-label={`${inst.name} volume`}
                      className="w-10 accent-blue-600 cursor-pointer hidden sm:block"
                      title={`Volume: ${Math.round(mix.volume * 100)}%`}
                    />
                  </div>
                </div>

                {/* Step Cells */}
                <div
                  className="flex-1 grid"
                  style={{ gridTemplateColumns: `repeat(${visibleSteps.length}, minmax(26px, 1fr))` }}
                >
                  {visibleSteps.map((absStep) => {
                    const stepInBar = absStep % stepsPerBar;
                    const beatIdx = beatGroupPerStepInBar[stepInBar] ?? 0;
                    const isEvenBeat = beatIdx % 2 === 0;
                    const isBarStart = stepInBar === 0 && absStep !== visibleStartStep;
                    const hit = (rowHits[absStep] ?? 0) as HitType;
                    const isActiveStep = activeStep === absStep;
                    const remoteCursor = remoteCursorMap.get(`${inst.id}:${absStep}`);

                    return (
                      <button
                        key={absStep}
                        type="button"
                        onPointerDown={(e) => handlePointerDown(e, inst.id, absStep, hit)}
                        onPointerEnter={() => handlePointerEnter(inst.id, absStep)}
                        onContextMenu={(e) => e.preventDefault()}
                        aria-label={`${inst.name} step ${absStep + 1}, state ${hit}`}
                        style={
                          remoteCursor
                            ? { boxShadow: `inset 0 0 0 2px ${remoteCursor.color}` }
                            : undefined
                        }
                        className={`h-9 flex items-center justify-center border-r border-slate-100 dark:border-slate-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isBarStart ? 'border-l-2 border-l-slate-300 dark:border-l-slate-700' : ''
                        } ${
                          isActiveStep
                            ? 'bg-blue-500/15 dark:bg-blue-500/20'
                            : isEvenBeat
                              ? 'bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                              : 'bg-slate-50/75 dark:bg-slate-800/35 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <CellGlyph hit={hit} color={inst.defaultColor} isActive={isActiveStep} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiet Footer Hint */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Click or drag to paint strokes · Right-click to clear · Shift+Click for Accent (&gt;) · Space to Play/Stop
        </span>
        <span className="font-mono-tabular">
          {stepsPerBar} steps/bar · {totalSteps} total steps
        </span>
      </div>
    </section>
  );
};

const CellGlyph: React.FC<{ hit: HitType; color: string; isActive: boolean }> = ({
  hit,
  color,
  isActive,
}) => {
  if (hit === 0) {
    return (
      <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/80 pointer-events-none" />
    );
  }

  if (hit === 1) {
    // Normal hit
    return (
      <span
        className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-transform pointer-events-none ${
          isActive ? 'scale-110' : ''
        }`}
        style={{ backgroundColor: color }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
      </span>
    );
  }

  if (hit === 2) {
    // Accent hit
    return (
      <span
        className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-amber-400/80 pointer-events-none ${
          isActive ? 'scale-110' : ''
        }`}
        style={{ backgroundColor: color }}
        title="Accent"
      >
        &gt;
      </span>
    );
  }

  if (hit === 3) {
    // Ghost note
    return (
      <span
        className={`w-4 h-4 rounded-[4px] flex items-center justify-center border-2 text-[10px] font-mono-tabular font-semibold pointer-events-none ${
          isActive ? 'scale-110' : ''
        }`}
        style={{ borderColor: color, color }}
        title="Ghost Note"
      >
        g
      </span>
    );
  }

  // Flam (hit === 4)
  return (
    <span
      className={`w-5 h-4 rounded-[4px] flex items-center justify-center text-[10px] font-mono-tabular font-bold text-white pointer-events-none ${
        isActive ? 'scale-110' : ''
      }`}
      style={{ backgroundColor: color }}
      title="Flam"
    >
      fr
    </span>
  );
};
