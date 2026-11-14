import React, { useRef, useState } from 'react';
import { Download, RefreshCw, Sliders, Sparkles } from 'lucide-react';
import {
  DRUMMER_PERSONAS,
  KickStyle,
  SmartDrummerConfig,
  SmartDrummerGenre,
  SnareStyle,
  TimekeeperSurface,
} from '../utils/smartDrummer';

interface SmartDrummerPanelProps {
  config: SmartDrummerConfig;
  bpm: number;
  onSelectPersona: (genre: SmartDrummerGenre) => void;
  onChangeConfig: (patch: Partial<SmartDrummerConfig>) => void;
  onRegenerateVariation: () => void;
  onExportMidi: () => void;
}

export const SmartDrummerPanel: React.FC<SmartDrummerPanelProps> = ({
  config,
  bpm,
  onSelectPersona,
  onChangeConfig,
  onRegenerateVariation,
  onExportMidi,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [draggingPad, setDraggingPad] = useState(false);

  const activePersona =
    DRUMMER_PERSONAS.find((p) => p.id === config.genre) ?? DRUMMER_PERSONAS[0];

  const updatePadFromPointer = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    // Y-axis: top = 100 (Loud), bottom = 0 (Soft)
    const yPct = Math.max(
      0,
      Math.min(100, Math.round((1 - (clientY - rect.top) / rect.height) * 100))
    );
    onChangeConfig({ complexity: xPct, intensity: yPct });
  };

  return (
    <section
      className="bg-(--studio-surface) border border-(--studio-border) rounded-xl overflow-hidden"
      aria-label="Smart Drummer Studio"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-(--studio-border) flex flex-wrap items-center justify-between gap-3 bg-(--studio-surface-muted)">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Smart Drummer Engine
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            · {activePersona.name} ({activePersona.roleLabel}) · {bpm} BPM
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerateVariation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New Variation
          </button>
          <button
            type="button"
            onClick={onExportMidi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Export MIDI (.mid)
          </button>
        </div>
      </div>

      {/* Main 3-Column Smart Drummer Deck: [1. Drummer Personas] — [2. XY Feel Pad] — [3. Kit & Groove Controls] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Column 1: Drummer Style / Persona Selector */}
        <div className="lg:col-span-3 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Session Drummer Style
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {DRUMMER_PERSONAS.map((persona) => {
              const selected = config.genre === persona.id;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => onSelectPersona(persona.id)}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500/60 text-slate-900 dark:text-white'
                      : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{persona.name}</span>
                    <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                      {persona.defaultBpm} BPM
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {persona.roleLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Interactive Logic-Style 2D XY Pad */}
        <div className="lg:col-span-4 p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Performance XY Pad
            </span>
            <span className="font-mono-tabular text-[11px] text-slate-600 dark:text-slate-300">
              Complex {config.complexity}% · Loud {config.intensity}%
            </span>
          </div>

          <div className="relative flex-1 min-h-[220px] flex items-center justify-center">
            <div
              ref={padRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDraggingPad(true);
                updatePadFromPointer(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (draggingPad) updatePadFromPointer(e.clientX, e.clientY);
              }}
              onPointerUp={() => setDraggingPad(false)}
              onPointerCancel={() => setDraggingPad(false)}
              className="relative w-full h-[224px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden cursor-crosshair select-none touch-none"
              role="slider"
              aria-label="Smart Drummer XY Pad for Complexity and Intensity"
              aria-valuetext={`Complexity ${config.complexity} percent, Intensity ${config.intensity} percent`}
            >
              {/* Subtle precision quadrant grid */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(100,116,139,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.14) 1px, transparent 1px)',
                  backgroundSize: '25% 25%',
                }}
              />
              {/* Center crosshairs */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300/80 dark:bg-slate-700/80 pointer-events-none" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300/80 dark:bg-slate-700/80 pointer-events-none" />

              {/* Axis Labels */}
              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none">
                Loud
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none">
                Soft
              </span>
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none">
                Simple
              </span>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-500 dark:text-slate-400 pointer-events-none">
                Complex
              </span>

              {/* Active Puck Crosshair Guides */}
              <div
                className="absolute top-0 bottom-0 w-px bg-blue-500/40 pointer-events-none"
                style={{ left: `${config.complexity}%` }}
              />
              <div
                className="absolute left-0 right-0 h-px bg-blue-500/40 pointer-events-none"
                style={{ top: `${100 - config.intensity}%` }}
              />

              {/* Draggable Puck */}
              <div
                className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-md flex items-center justify-center pointer-events-none transition-transform ${
                  draggingPad ? 'scale-110' : ''
                }`}
                style={{
                  left: `${config.complexity}%`,
                  top: `${100 - config.intensity}%`,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Fills & Swing Sliders directly under XY Pad */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Fills</span>
                <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                  {config.fills}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={config.fills}
                onChange={(e) => onChangeConfig({ fills: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
                aria-label="Smart Drummer Fill Amount"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Swing / Shuffle</span>
                <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
                  {config.swing > 0 ? `+${config.swing}%` : `${config.swing}%`}
                </span>
              </div>
              <input
                type="range"
                min={-66}
                max={66}
                value={config.swing}
                onChange={(e) => onChangeConfig({ swing: Number(e.target.value) })}
                onDoubleClick={() => onChangeConfig({ swing: 0 })}
                className="w-full accent-blue-600 cursor-pointer"
                aria-label="Smart Drummer Swing and Shuffle Feel"
              />
            </div>
          </div>
        </div>

        {/* Column 3: Kit Pieces & Groove Parameters */}
        <div className="lg:col-span-5 p-4 space-y-4">
          {/* Cymbals & Timekeeper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Cymbals &amp; Hi-Hat
              </span>
              <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                Pattern {config.cymbalPattern}/4
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                {(
                  [
                    { id: 'hihat', label: 'Hi-Hat' },
                    { id: 'ride', label: 'Ride' },
                    { id: 'rideBell', label: 'Bell' },
                    { id: 'none', label: 'Off' },
                  ] as { id: TimekeeperSurface; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeConfig({ cymbal: item.id })}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      config.cymbal === item.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                {([1, 2, 3, 4] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeConfig({ cymbalPattern: lvl })}
                    className={`w-7 py-1 text-xs font-mono-tabular font-semibold rounded-md transition-colors ${
                      config.cymbalPattern === lvl
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title={`Cymbal Pattern Density ${lvl}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.openHiHatLift}
                  onChange={(e) => onChangeConfig({ openHiHatLift: e.target.checked })}
                  className="accent-blue-600 rounded"
                />
                Open HH Lift
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.crashOnOne}
                  onChange={(e) => onChangeConfig({ crashOnOne: e.target.checked })}
                  className="accent-blue-600 rounded"
                />
                Crash on Beat 1
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.cowbell}
                  onChange={(e) => onChangeConfig({ cowbell: e.target.checked })}
                  className="accent-blue-600 rounded"
                />
                Cowbell Pulse
              </label>
            </div>
          </div>

          {/* Snare Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Snare &amp; Articulation
            </span>
            <div className="inline-flex flex-wrap rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              {(
                [
                  { id: 'backbeat', label: 'Backbeat' },
                  { id: 'halftime', label: 'Half-Time' },
                  { id: 'crossStick', label: 'Cross-Stick' },
                  { id: 'syncopated', label: 'Syncopated' },
                ] as { id: SnareStyle; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeConfig({ snareStyle: item.id })}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    config.snareStyle === item.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.ghostNotes}
                  onChange={(e) => onChangeConfig({ ghostNotes: e.target.checked })}
                  className="accent-blue-600 rounded"
                />
                Ghost Notes
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.flams}
                  onChange={(e) => onChangeConfig({ flams: e.target.checked })}
                  className="accent-blue-600 rounded"
                />
                Snare Flams
              </label>
            </div>
          </div>

          {/* Kick Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Bass Drum (Kick)
              </span>
              <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                Density {config.kickDensity}/4
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                {(
                  [
                    { id: 'standard', label: 'Standard' },
                    { id: 'syncopated', label: 'Syncopated' },
                    { id: 'fourOnFloor', label: '4-on-Floor' },
                    { id: 'sparse', label: 'Sparse' },
                  ] as { id: KickStyle; label: string }[]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeConfig({ kickStyle: item.id })}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      config.kickStyle === item.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                {([1, 2, 3, 4] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeConfig({ kickDensity: lvl })}
                    className={`w-7 py-1 text-xs font-mono-tabular font-semibold rounded-md transition-colors ${
                      config.kickDensity === lvl
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title={`Kick Density ${lvl}`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              All Smart Drummer adjustments update the live staff &amp; step grid below and export directly to General MIDI (.mid).
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
