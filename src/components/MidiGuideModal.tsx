import React, { useEffect, useRef, useState } from 'react';
import { FileAudio, Music, X } from 'lucide-react';
import { BUILTIN_SOUNDFONT_KITS, drumEngine, SoundFontKitId } from '../audio/drumEngine';
import { DRUM_INSTRUMENTS } from '../data/instruments';

interface MidiGuideModalProps {
  isOpen: boolean;
  activeSoundFont: SoundFontKitId;
  soundfontStatus: 'idle' | 'loading' | 'ready' | 'fallback';
  customSf2Name: string | null;
  customSf2Presets: { program: number; presetName: string }[];
  activeCustomProgram: number;
  onSelectSoundFont: (kitId: SoundFontKitId) => void;
  onUploadSf2File: (file: File) => Promise<void>;
  onSelectCustomProgram: (program: number) => void;
  onClose: () => void;
}

export const MidiGuideModal: React.FC<MidiGuideModalProps> = ({
  isOpen,
  activeSoundFont,
  soundfontStatus,
  customSf2Name,
  customSf2Presets,
  activeCustomProgram,
  onSelectSoundFont,
  onUploadSf2File,
  onSelectCustomProgram,
  onClose,
}) => {
  const sf2InputRef = useRef<HTMLInputElement | null>(null);
  const [sf2Error, setSf2Error] = useState<string | null>(null);
  const [midiState, setMidiState] = useState<{
    checked: boolean;
    supported: boolean;
    outputs: { id: string; name: string }[];
    selectedId: string;
  }>({
    checked: false,
    supported: false,
    outputs: [],
    selectedId: '',
  });

  useEffect(() => {
    if (!isOpen || midiState.checked) return;
    void drumEngine.initWebMidi().then((res) => {
      setMidiState({
        checked: true,
        supported: res.supported,
        outputs: res.outputs,
        selectedId: '',
      });
    });
  }, [isOpen, midiState.checked]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="General MIDI SoundFont and Notation Guide"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Music className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              General MIDI SoundFont &amp; Map
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* General MIDI SoundFont Bank */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                General MIDI Drum SoundFont (.sf2 Bank 128)
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                {soundfontStatus === 'loading'
                  ? 'Loading SoundFont samples...'
                  : soundfontStatus === 'ready'
                    ? 'SoundFont Ready'
                    : soundfontStatus === 'fallback'
                      ? 'Offline Synth Fallback Active'
                      : 'Built-in Synth'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={activeSoundFont}
                onChange={(e) => onSelectSoundFont(e.target.value as SoundFontKitId)}
                aria-label="Select General MIDI SoundFont Kit"
                className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {BUILTIN_SOUNDFONT_KITS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label} ({k.bankLabel})
                  </option>
                ))}
                {customSf2Name && (
                  <option value="custom-sf2">Custom .sf2: {customSf2Name}</option>
                )}
              </select>

              <button
                type="button"
                onClick={() => sf2InputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <FileAudio className="w-3.5 h-3.5" />
                Load Custom .sf2
              </button>

              <input
                ref={sf2InputRef}
                type="file"
                accept=".sf2"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setSf2Error(null);
                  try {
                    await onUploadSf2File(file);
                  } catch (err) {
                    setSf2Error(err instanceof Error ? err.message : 'Failed to load .sf2 SoundFont.');
                  }
                }}
              />
            </div>

            {activeSoundFont === 'custom-sf2' && customSf2Presets.length > 1 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-300">Bank 128 Preset:</span>
                <select
                  value={activeCustomProgram}
                  onChange={(e) => onSelectCustomProgram(Number(e.target.value))}
                  className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {customSf2Presets.map((p) => (
                    <option key={p.program} value={p.program}>
                      Prog {p.program}: {p.presetName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {sf2Error && <div className="text-xs text-red-600 dark:text-red-400">{sf2Error}</div>}
          </div>

          {/* Hardware / DAW Web MIDI Routing */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              External Web MIDI Hardware / DAW Output (Channel 10)
            </div>
            {midiState.supported ? (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={midiState.selectedId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setMidiState((prev) => ({ ...prev, selectedId: id }));
                    drumEngine.setMidiOutput(id || null);
                  }}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="">Built-in Audio Engine Only</option>
                  {midiState.outputs.map((out) => (
                    <option key={out.id} value={out.id}>
                      {out.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {midiState.outputs.length === 0
                    ? 'No external MIDI devices detected.'
                    : `${midiState.outputs.length} MIDI output port(s) available.`}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                External Web MIDI hardware output is unavailable in this browser context; SoundFont playback runs locally via Web Audio.
              </p>
            )}
          </div>

          {/* PAS Drum Map Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
              PAS Percussion Notation &amp; General MIDI Channel 10 Mapping
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-2 font-medium">Instrument</th>
                    <th className="px-3 py-2 font-medium">GM Note</th>
                    <th className="px-3 py-2 font-medium">Notehead</th>
                    <th className="px-3 py-2 font-medium">Voice &amp; Stem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {DRUM_INSTRUMENTS.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {inst.name}
                      </td>
                      <td className="px-3 py-2 font-mono-tabular text-slate-600 dark:text-slate-400">
                        {inst.gmNote} ({inst.gmName})
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 capitalize">
                        {inst.notehead === 'x-circle' ? 'Circled X' : inst.notehead}
                        {inst.openArticulation ? ' + Open (o)' : ''}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {inst.voice === 'hands' ? 'Hands (Stem Up)' : 'Feet (Stem Down)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Studio Shortcuts &amp; Gestures
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Play / Stop Transport</span>
                <kbd className="font-mono-tabular font-semibold">Space</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Undo / Redo Edit</span>
                <kbd className="font-mono-tabular font-semibold">Ctrl+Z / Ctrl+Y</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Direct Accent Hit</span>
                <kbd className="font-mono-tabular font-semibold">Shift + Click</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex justify-between">
                <span>Erase Cell</span>
                <kbd className="font-mono-tabular font-semibold">Right-Click</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
