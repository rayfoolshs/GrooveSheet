import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Minus,
  Moon,
  Play,
  Plus,
  Printer,
  Redo2,
  Repeat,
  Square,
  Sun,
  Undo2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BUILTIN_SOUNDFONT_KITS, drumEngine, SoundFontKitId } from './audio/drumEngine';
import { GrooveLibraryModal } from './components/GrooveLibraryModal';
import { MidiGuideModal } from './components/MidiGuideModal';
import { NotationGrid } from './components/NotationGrid';
import { PercussionStaff, StaffHoverInfo } from './components/PercussionStaff';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { ShareSessionModal } from './components/ShareSessionModal';
import { SmartDrummerPanel } from './components/SmartDrummerPanel';
import { SwingShuffleBar } from './components/SwingShuffleBar';
import { UserManual } from './components/UserManual';
import { GROOVE_LIBRARY } from './data/grooveLibrary';
import { createDefaultMixer } from './data/instruments';
import { useCollaboration } from './hooks/useCollaboration';
import {
  BrushMode,
  GrooveDocument,
  HitType,
  InstrumentId,
  LibraryPreset,
  MixerState,
  SubdivisionId,
  TimeSignatureId,
} from './types/groove';
import {
  cloneGrid,
  createEmptyGrid,
  getStepsPerBar,
  resizeStepGrid,
} from './utils/grooveHelpers';
import { downloadMidiFile, parseMidiFileToGroove } from './utils/midiExport';
import {
  buildSmartGrooveDocument,
  DRUMMER_PERSONAS,
  SmartDrummerConfig,
  SmartDrummerGenre,
} from './utils/smartDrummer';

const LOCAL_CUSTOM_STORAGE_KEY = 'groovesheet_custom_library_v1';
const LOCAL_NAME_KEY = 'groovesheet_musician_name';

function createInitialGroove(): GrooveDocument {
  const first = GROOVE_LIBRARY[1]; // 16th-Note Funk with Snare Ghosts
  return {
    id: `session-${Date.now()}`,
    title: first.title,
    composer: first.composer,
    style: first.style,
    notes: first.notes,
    bpm: first.bpm,
    timeSignature: first.timeSignature,
    subdivision: first.subdivision,
    bars: first.bars,
    swing: first.swing,
    steps: cloneGrid(first.steps),
    updatedAt: Date.now(),
  };
}

function createInitialSmartConfig(): SmartDrummerConfig {
  const funk = DRUMMER_PERSONAS[1];
  return {
    enabled: true,
    ...funk.defaults,
    variationSeed: 1,
  };
}

const LOCAL_THEME_TONE_KEY = 'groovesheet_theme_tone';

function lerpHex(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function getToneLabel(tone: number): string {
  if (tone < 25) return 'Light';
  if (tone < 50) return 'Soft';
  if (tone < 75) return 'Dusk';
  return 'Dark';
}

export default function App() {
  // Continuous Light (0) to Dark (100) studio tone slider (defaults to Dark at 50%)
  const [themeTone, setThemeTone] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_THEME_TONE_KEY);
    const parsed = saved !== null ? Number(saved) : 50;
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 50;
  });

  // Core Groove Document + Undo/Redo Stacks
  const [groove, setGroove] = useState<GrooveDocument>(createInitialGroove);
  const undoStackRef = useRef<GrooveDocument[]>([]);
  const redoStackRef = useRef<GrooveDocument[]>([]);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });

  // Smart Drummer Studio State
  const [smartDrummerOpen, setSmartDrummerOpen] = useState<boolean>(true);
  const [smartConfig, setSmartConfig] = useState<SmartDrummerConfig>(createInitialSmartConfig);

  // Audio & Transport State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [metronomeVolume, setMetronomeVolume] = useState(0.65);
  const [mixer, setMixer] = useState<MixerState>(createDefaultMixer);
  const [brushMode, setBrushMode] = useState<BrushMode>('cycle');
  const [showStaffCounting, setShowStaffCounting] = useState(true);
  const [useAltStaffVoices, setUseAltStaffVoices] = useState(false);
  const [staffHoverInfo, setStaffHoverInfo] = useState<StaffHoverInfo | null>(null);

  // Tap Tempo Tracking
  const tapTimesRef = useRef<number[]>([]);

  // Modals
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // General MIDI SoundFont State
  const [activeSoundFont, setActiveSoundFont] = useState<SoundFontKitId>('fluid-standard');
  const [soundfontStatus, setSoundfontStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('loading');
  const [customSf2Name, setCustomSf2Name] = useState<string | null>(null);
  const [customSf2Presets, setCustomSf2Presets] = useState<{ program: number; presetName: string }[]>([]);
  const [activeCustomProgram, setActiveCustomProgram] = useState(0);

  // Custom Library
  const [customGrooves, setCustomGrooves] = useState<LibraryPreset[]>([]);

  // Real-time Collaboration Room from URL `?room=`
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('room');
    return r && r.trim() ? r.trim() : null;
  });

  const [musicianName, setMusicianName] = useState<string>(() => {
    return localStorage.getItem(LOCAL_NAME_KEY) || 'Drummer';
  });

  const grooveRef = useRef(groove);
  grooveRef.current = groove;

  // Sync continuous Light-to-Dark theme variables & .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    const isDark = themeTone >= 50;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');

    if (!isDark) {
      const u = themeTone / 49;
      root.style.setProperty('--studio-bg', lerpHex('#f8fafc', '#d5dce6', u));
      root.style.setProperty('--studio-surface', lerpHex('#ffffff', '#e4e9f0', u));
      root.style.setProperty('--studio-surface-muted', lerpHex('#f1f5f9', '#dbe1ea', u));
      root.style.setProperty('--studio-border', lerpHex('#e2e8f0', '#b8c2d1', u));
    } else {
      const u = (themeTone - 50) / 50;
      root.style.setProperty('--studio-bg', lerpHex('#1e293b', '#06090f', u));
      root.style.setProperty('--studio-surface', lerpHex('#263348', '#0d131f', u));
      root.style.setProperty('--studio-surface-muted', lerpHex('#2f3f58', '#141c2b', u));
      root.style.setProperty('--studio-border', lerpHex('#3d4f6b', '#1e293b', u));
    }

    localStorage.setItem(LOCAL_THEME_TONE_KEY, String(themeTone));
  }, [themeTone]);

  // Preload default General MIDI FluidR3 Standard SoundFont kit on mount
  const handleSelectSoundFont = useCallback(async (kitId: SoundFontKitId) => {
    setActiveSoundFont(kitId);
    if (kitId === 'synth') {
      await drumEngine.loadSoundFontKit('synth');
      setSoundfontStatus('idle');
      return;
    }
    if (kitId === 'custom-sf2') {
      await drumEngine.loadSoundFontKit('custom-sf2');
      setSoundfontStatus('ready');
      return;
    }
    setSoundfontStatus('loading');
    const res = await drumEngine.loadSoundFontKit(kitId);
    setSoundfontStatus(res.ok && res.loadedCount > 0 ? 'ready' : 'fallback');
  }, []);

  const handleUploadSf2File = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const res = await drumEngine.loadCustomSf2File(buffer);
    setCustomSf2Name(file.name.replace(/\.sf2$/i, ''));
    setCustomSf2Presets(res.presets);
    setActiveCustomProgram(res.presets[0]?.program ?? 0);
    setActiveSoundFont('custom-sf2');
    setSoundfontStatus('ready');
  }, []);

  const handleSelectCustomProgram = useCallback((program: number) => {
    drumEngine.selectCustomSf2Preset(program);
    setActiveCustomProgram(program);
    setActiveSoundFont('custom-sf2');
    setSoundfontStatus('ready');
  }, []);

  useEffect(() => {
    void handleSelectSoundFont('fluid-standard');
  }, [handleSelectSoundFont]);

  // Load saved custom grooves from server + localStorage fallback
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CUSTOM_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setCustomGrooves(parsed);
      }
    } catch {
      // ignore
    }

    fetch('/api/library')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          setCustomGrooves(data.items);
          localStorage.setItem(LOCAL_CUSTOM_STORAGE_KEY, JSON.stringify(data.items));
        }
      })
      .catch(() => {
        // offline/local fallback already loaded
      });
  }, []);

  // Push audio engine reactive state whenever groove/mixer/transport changes
  useEffect(() => {
    drumEngine.updateState({
      groove,
      mixer,
      loop: loopEnabled,
      metronome: metronomeEnabled,
      metronomeVolume,
      countIn: countInEnabled,
    });
  }, [groove, mixer, loopEnabled, metronomeEnabled, metronomeVolume, countInEnabled]);

  // History helper
  const pushUndoSnapshot = useCallback((snapshot: GrooveDocument) => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-39),
      { ...snapshot, steps: cloneGrid(snapshot.steps) },
    ];
    redoStackRef.current = [];
    setHistoryCounts({ undo: undoStackRef.current.length, redo: 0 });
  }, []);

  // Remote WebSocket Handlers
  const handleRemoteGrooveReplace = useCallback((next: GrooveDocument) => {
    setGroove({ ...next, steps: cloneGrid(next.steps) });
  }, []);

  const handleRemoteCellSet = useCallback(
    (instrument: InstrumentId, step: number, hit: HitType) => {
      setGroove((prev) => {
        const row = prev.steps[instrument];
        if (!row || step < 0 || step >= row.length) return prev;
        const nextRow = [...row];
        nextRow[step] = hit;
        return {
          ...prev,
          steps: { ...prev.steps, [instrument]: nextRow },
          updatedAt: Date.now(),
        };
      });
    },
    []
  );

  const collab = useCollaboration({
    roomId,
    musicianName,
    getLatestGroove: () => grooveRef.current,
    onRemoteGrooveReplace: handleRemoteGrooveReplace,
    onRemoteCellSet: handleRemoteCellSet,
  });

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previous = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [
      ...redoStackRef.current,
      { ...grooveRef.current, steps: cloneGrid(grooveRef.current.steps) },
    ];
    setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
    setGroove(previous);
    collab.emitGrooveLoad(previous);
  }, [collab]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [
      ...undoStackRef.current,
      { ...grooveRef.current, steps: cloneGrid(grooveRef.current.steps) },
    ];
    setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
    setGroove(next);
    collab.emitGrooveLoad(next);
  }, [collab]);

  // Transport Controls
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      drumEngine.stop();
      setIsPlaying(false);
      setActiveStep(null);
      setCountInBeat(null);
    } else {
      setIsPlaying(true);
      drumEngine.start({
        onStepChange: (step, countIn) => {
          setActiveStep(step);
          setCountInBeat(countIn);
        },
        onStop: () => {
          setIsPlaying(false);
          setActiveStep(null);
          setCountInBeat(null);
        },
      });
    }
  }, [isPlaying]);

  // Global Keyboard Shortcuts (Space = Play/Stop, Ctrl+Z/Y = Undo/Redo)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay, handleUndo, handleRedo]);

  // Cell mutation
  const handleSetCell = useCallback(
    (instrument: InstrumentId, step: number, hit: HitType) => {
      setGroove((prev) => {
        const row = prev.steps[instrument];
        if (!row || row[step] === hit) return prev;
        pushUndoSnapshot(prev);
        const nextRow = [...row];
        nextRow[step] = hit;
        return {
          ...prev,
          steps: { ...prev.steps, [instrument]: nextRow },
          updatedAt: Date.now(),
        };
      });
      collab.emitCellSet(instrument, step, hit);
    },
    [collab, pushUndoSnapshot]
  );

  // Metadata & Meter updates
  const updateGrooveMeta = useCallback(
    (
      patch: Partial<
        Pick<
          GrooveDocument,
          'title' | 'composer' | 'style' | 'notes' | 'bpm' | 'timeSignature' | 'subdivision' | 'bars' | 'swing'
        >
      >
    ) => {
      setGroove((prev) => {
        const nextTimeSig = patch.timeSignature ?? prev.timeSignature;
        const nextSub = patch.subdivision ?? prev.subdivision;
        const nextBars = patch.bars ?? prev.bars;

        const structureChanged =
          nextTimeSig !== prev.timeSignature ||
          nextSub !== prev.subdivision ||
          nextBars !== prev.bars;

        if (structureChanged) pushUndoSnapshot(prev);

        const nextSteps = structureChanged
          ? resizeStepGrid(
              prev.steps,
              prev.timeSignature,
              prev.subdivision,
              prev.bars,
              nextTimeSig,
              nextSub,
              nextBars
            )
          : prev.steps;

        return {
          ...prev,
          ...patch,
          steps: nextSteps,
          updatedAt: Date.now(),
        };
      });
      if (patch.swing !== undefined) {
        const nextSwing = patch.swing;
        setSmartConfig((prev) => ({ ...prev, swing: nextSwing }));
      }
      collab.emitMetaUpdate(patch);
    },
    [collab, pushUndoSnapshot]
  );

  // Smart Drummer handlers
  const applySmartConfig = useCallback(
    (nextConfig: SmartDrummerConfig, customBpm?: number, customSub?: SubdivisionId) => {
      setSmartConfig(nextConfig);
      setGroove((prev) => {
        pushUndoSnapshot(prev);
        const base: GrooveDocument = {
          ...prev,
          bpm: customBpm ?? prev.bpm,
          subdivision: customSub ?? prev.subdivision,
        };
        const generated = buildSmartGrooveDocument(base, nextConfig);
        collab.emitGrooveLoad(generated);
        return generated;
      });
    },
    [collab, pushUndoSnapshot]
  );

  const handleSelectSmartPersona = (genre: SmartDrummerGenre) => {
    const persona = DRUMMER_PERSONAS.find((p) => p.id === genre);
    if (!persona) return;
    const nextConfig: SmartDrummerConfig = {
      enabled: true,
      ...persona.defaults,
      variationSeed: smartConfig.variationSeed,
    };
    applySmartConfig(nextConfig, persona.defaultBpm, persona.defaultSubdivision);
  };

  const handleChangeSmartConfig = (patch: Partial<SmartDrummerConfig>) => {
    const keys = Object.keys(patch);
    if (keys.length === 1 && patch.swing !== undefined) {
      updateGrooveMeta({ swing: patch.swing });
      return;
    }
    const nextConfig: SmartDrummerConfig = { ...smartConfig, ...patch };
    applySmartConfig(nextConfig);
  };

  const handleRegenerateVariation = () => {
    const nextConfig: SmartDrummerConfig = {
      ...smartConfig,
      variationSeed: smartConfig.variationSeed + 1,
    };
    applySmartConfig(nextConfig);
  };

  // Tap Tempo
  const handleTapTempo = () => {
    const now = performance.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 2200);
    taps.push(now);
    tapTimesRef.current = taps;
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.max(40, Math.min(240, Math.round(60000 / avgMs)));
      updateGrooveMeta({ bpm: newBpm });
    }
  };

  // Copy Bar to All
  const handleCopyBarToAll = (sourceBar: number) => {
    setGroove((prev) => {
      pushUndoSnapshot(prev);
      const spb = getStepsPerBar(prev.timeSignature, prev.subdivision);
      const nextSteps = cloneGrid(prev.steps);
      const srcStart = sourceBar * spb;
      for (const row of Object.values(nextSteps)) {
        const patternSlice = row.slice(srcStart, srcStart + spb);
        for (let b = 0; b < prev.bars; b++) {
          for (let s = 0; s < spb; s++) {
            row[b * spb + s] = patternSlice[s] ?? 0;
          }
        }
      }
      const next = { ...prev, steps: nextSteps, updatedAt: Date.now() };
      collab.emitGrooveLoad(next);
      return next;
    });
  };

  const handleClearGrid = () => {
    setGroove((prev) => {
      pushUndoSnapshot(prev);
      const total = getStepsPerBar(prev.timeSignature, prev.subdivision) * prev.bars;
      const next: GrooveDocument = {
        ...prev,
        steps: createEmptyGrid(total),
        updatedAt: Date.now(),
      };
      collab.emitGrooveLoad(next);
      return next;
    });
  };

  const handleLoadPreset = (preset: LibraryPreset) => {
    pushUndoSnapshot(grooveRef.current);
    const loaded: GrooveDocument = {
      id: `session-${Date.now()}`,
      title: preset.title,
      composer: preset.composer,
      style: preset.style,
      notes: preset.notes,
      bpm: preset.bpm,
      timeSignature: preset.timeSignature,
      subdivision: preset.subdivision,
      bars: preset.bars,
      swing: preset.swing,
      steps: cloneGrid(preset.steps),
      updatedAt: Date.now(),
    };
    setGroove(loaded);
    collab.emitGrooveLoad(loaded);
  };

  const handleSaveCustomGroove = async (
    difficulty: LibraryPreset['difficulty'],
    description: string
  ) => {
    const payload: LibraryPreset = {
      ...groove,
      id: `custom-${Date.now()}`,
      difficulty,
      description,
      steps: cloneGrid(groove.steps),
      isCustom: true,
    };

    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.item) {
          setCustomGrooves((prev) => {
            const next = [data.item, ...prev];
            localStorage.setItem(LOCAL_CUSTOM_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
          return;
        }
      }
    } catch {
      // Fallback to localStorage below
    }

    setCustomGrooves((prev) => {
      const next = [payload, ...prev];
      localStorage.setItem(LOCAL_CUSTOM_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteCustomGroove = async (id: string) => {
    try {
      await fetch(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    setCustomGrooves((prev) => {
      const next = prev.filter((g) => g.id !== id);
      localStorage.setItem(LOCAL_CUSTOM_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Room URL Sync
  const handleStartOrJoinRoom = (newRoomId: string) => {
    setRoomId(newRoomId);
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoomId);
    window.history.replaceState({}, '', url.toString());
  };

  const handleLeaveRoom = () => {
    setRoomId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  const handleChangeName = (name: string) => {
    setMusicianName(name);
    localStorage.setItem(LOCAL_NAME_KEY, name);
    collab.emitRename(name);
  };

  // Export / Import JSON & MIDI
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(groove, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = groove.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'groove';
    a.href = url;
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as GrooveDocument;
    if (!parsed || !parsed.steps || !parsed.timeSignature) {
      throw new Error('Invalid GrooveSheet JSON file.');
    }
    pushUndoSnapshot(grooveRef.current);
    const loaded: GrooveDocument = {
      ...parsed,
      id: `imported-${Date.now()}`,
      steps: cloneGrid(parsed.steps),
      updatedAt: Date.now(),
    };
    setGroove(loaded);
    collab.emitGrooveLoad(loaded);
  };

  const handleImportMidiFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const imported = parseMidiFileToGroove(buf, file.name);
    pushUndoSnapshot(grooveRef.current);
    setGroove(imported);
    collab.emitGrooveLoad(imported);
  };

  const staffSectionRef = useRef<HTMLElement | null>(null);
  const gridSectionRef = useRef<HTMLElement | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-(--studio-bg) text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* 0. Official User Manual reference strip — very top of the app, collapsed by default */}
      <UserManual />

      {/* 1. Strict 3-Zone Top Bar Contract */}
      <header className="bg-(--studio-surface) border-b border-(--studio-border) px-4 sm:px-6 h-14 flex items-center justify-between gap-8 no-print">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          GrooveSheet
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => staffSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Notation Staff
          </button>
          <button
            type="button"
            onClick={() => setSmartDrummerOpen((v) => !v)}
            className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              smartDrummerOpen ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
            }`}
          >
            Smart Drummer
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Groove Library
          </button>
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Print Sheet
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            MIDI &amp; Map
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Users className="w-3.5 h-3.5" />
            {roomId ? `Room: ${roomId} (${collab.participants.length || 1})` : 'Share Session'}
          </button>
        </div>
      </header>

      {/* 2. Studio Transport & Musical Parameters Deck */}
      <div className="bg-(--studio-surface) border-b border-(--studio-border) px-4 sm:px-6 py-2.5 sticky top-0 z-30 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Play/Stop, Loop, Count-In, Metronome, BPM */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlay}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {countInBeat !== null ? `Count ${countInBeat}` : isPlaying ? 'Stop' : 'Play'}
            </button>

            <button
              type="button"
              onClick={() => setLoopEnabled((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                loopEnabled
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle Loop Playback"
            >
              <Repeat className="w-3.5 h-3.5" />
              Loop
            </button>

            <button
              type="button"
              onClick={() => setCountInEnabled((v) => !v)}
              className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                countInEnabled
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="1-Bar Count-In Before Playback"
            >
              Count-In
            </button>

            {/* Metronome */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => setMetronomeEnabled((v) => !v)}
                className={`inline-flex items-center gap-1 px-1.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  metronomeEnabled
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                title="Toggle Metronome Click"
              >
                {metronomeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                Click
              </button>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(metronomeVolume * 100)}
                onChange={(e) => setMetronomeVolume(Number(e.target.value) / 100)}
                aria-label="Metronome click volume"
                className="w-12 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Tempo Control */}
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => updateGrooveMeta({ bpm: Math.max(40, groove.bpm - 2) })}
                className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                aria-label="Decrease BPM"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                min={40}
                max={240}
                value={groove.bpm}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) updateGrooveMeta({ bpm: Math.max(40, Math.min(240, v)) });
                }}
                aria-label="Tempo BPM"
                className="w-11 text-center text-xs font-mono-tabular font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-0.5">BPM</span>
              <button
                type="button"
                onClick={() => updateGrooveMeta({ bpm: Math.min(240, groove.bpm + 2) })}
                className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                aria-label="Increase BPM"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleTapTempo}
                className="ml-1 px-2 py-0.5 text-[11px] font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                title="Tap rhythmically to set tempo"
              >
                Tap
              </button>
            </div>
          </div>

          {/* Right: Meter, Subdivision, Bars, Swing, Undo/Redo, Export, Print, Theme */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={groove.timeSignature}
              onChange={(e) => updateGrooveMeta({ timeSignature: e.target.value as TimeSignatureId })}
              aria-label="Time signature"
              className="px-2.5 py-1.5 text-xs font-mono-tabular font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
            >
              <option value="4/4">4/4</option>
              <option value="3/4">3/4</option>
              <option value="5/4">5/4</option>
              <option value="6/8">6/8</option>
              <option value="7/8">7/8</option>
              <option value="12/8">12/8</option>
            </select>

            <select
              value={groove.subdivision}
              onChange={(e) => updateGrooveMeta({ subdivision: e.target.value as SubdivisionId })}
              aria-label="Grid subdivision"
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
            >
              <option value="16th">16th Notes</option>
              <option value="8th">8th Notes</option>
              <option value="triplet">8th Triplets</option>
            </select>

            <select
              value={groove.bars}
              onChange={(e) => updateGrooveMeta({ bars: Number(e.target.value) as 1 | 2 | 4 })}
              aria-label="Number of bars"
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
            >
              <option value={1}>1 Bar</option>
              <option value={2}>2 Bars</option>
              <option value={4}>4 Bars</option>
            </select>

            <select
              value={activeSoundFont}
              onChange={(e) => void handleSelectSoundFont(e.target.value as SoundFontKitId)}
              aria-label="General MIDI SoundFont kit"
              title={
                soundfontStatus === 'loading'
                  ? 'Loading General MIDI SoundFont samples...'
                  : soundfontStatus === 'fallback'
                    ? 'Using built-in synth fallback'
                    : 'Active General MIDI SoundFont drum kit'
              }
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 max-w-[175px]"
            >
              {BUILTIN_SOUNDFONT_KITS.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {kit.label}
                </option>
              ))}
              {customSf2Name && (
                <option value="custom-sf2">.sf2: {customSf2Name}</option>
              )}
            </select>

            <div className="inline-flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyCounts.undo === 0}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35"
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyCounts.redo === 0}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 border-l border-slate-200 dark:border-slate-700"
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => downloadMidiFile(groove, 2)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              title="Export current groove as a Standard MIDI file (.mid)"
            >
              <Download className="w-3.5 h-3.5" />
              MIDI
            </button>

            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              title="Open Print Sheet Music Preview"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            {/* Continuous Light-to-Dark Mode Slider */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-(--studio-border) bg-(--studio-surface-muted)"
              title={`Studio Theme Tone: ${getToneLabel(themeTone)} (${themeTone}%)`}
            >
              <button
                type="button"
                onClick={() => setThemeTone(0)}
                className="p-0.5 text-amber-500 hover:text-amber-600 transition-colors"
                aria-label="Set full light mode"
                title="Full Light Mode (0%)"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={themeTone}
                onChange={(e) => setThemeTone(Number(e.target.value))}
                aria-label="Light to dark mode slider"
                className="w-20 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600"
                style={{
                  background: 'linear-gradient(to right, #f8fafc 0%, #94a3b8 50%, #0f172a 100%)',
                }}
              />
              <button
                type="button"
                onClick={() => setThemeTone(100)}
                className="p-0.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                aria-label="Set full dark mode"
                title="Full Dark Mode (100%)"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono-tabular text-slate-600 dark:text-slate-300 w-9 text-right">
                {getToneLabel(themeTone)}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Quick Nav Row */}
        <div className="flex md:hidden items-center gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto text-xs font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setSmartDrummerOpen((v) => !v)}
            className="whitespace-nowrap shrink-0 text-blue-600 dark:text-blue-400"
          >
            {smartDrummerOpen ? 'Hide Smart Drummer' : 'Smart Drummer'}
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="whitespace-nowrap shrink-0"
          >
            Groove Library
          </button>
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="whitespace-nowrap shrink-0"
          >
            Print Sheet
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="whitespace-nowrap shrink-0"
          >
            MIDI &amp; Map
          </button>
        </div>
      </div>

      {/* 3. Main Studio Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Groove Header & Real-time Collaborators Strip */}
        <div className="flex flex-wrap items-end justify-between gap-4 print-sheet-container">
          <div className="flex-1 min-w-[260px]">
            <input
              type="text"
              value={groove.title}
              onChange={(e) => updateGrooveMeta({ title: e.target.value })}
              aria-label="Groove title"
              className="w-full font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none py-0.5 transition-colors"
            />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="text"
                value={groove.style}
                onChange={(e) => updateGrooveMeta({ style: e.target.value })}
                aria-label="Groove style"
                className="w-32 bg-transparent hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus:underline"
              />
              <span aria-hidden="true">·</span>
              <input
                type="text"
                value={groove.composer}
                onChange={(e) => updateGrooveMeta({ composer: e.target.value })}
                aria-label="Composer name"
                className="w-40 bg-transparent hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus:underline"
              />
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                ♩ = {groove.bpm} · {groove.timeSignature} · {groove.bars} bar{groove.bars > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Real-time Room Presence + Smart Drummer Toggle */}
          <div className="flex items-center gap-3 flex-wrap no-print">
            {roomId && collab.participants.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                {collab.participants.map((p) => (
                  <span key={p.clientId} className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-medium">
                      {p.name}
                      {p.clientId === collab.selfId ? ' (You)' : ''}
                    </span>
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSmartDrummerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {smartDrummerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {smartDrummerOpen ? 'Collapse Smart Drummer' : 'Open Smart Drummer'}
            </button>
          </div>
        </div>

        {/* Dedicated Swing / Shuffle Timing Slider (All Instruments & Subdivisions) */}
        <SwingShuffleBar
          swing={groove.swing}
          bpm={groove.bpm}
          timeSignature={groove.timeSignature}
          subdivision={groove.subdivision}
          onChangeSwing={(swing) => updateGrooveMeta({ swing })}
        />

        {/* Focal Stage 1: Live Engraved PAS Percussion Staff */}
        <section
          ref={staffSectionRef}
          className="bg-(--studio-surface) border border-(--studio-border) rounded-xl p-4 sm:p-5 print-sheet-container"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 no-print">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                Percussion Staff Notation
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {staffHoverInfo
                  ? `· Step ${staffHoverInfo.step + 1} · ${staffHoverInfo.instrumentName}${
                      staffHoverInfo.currentHit > 0 ? ' (Click to cycle · Right-click to remove)' : ' (Click to add)'
                    }`
                  : '· Click anywhere on staff to add, cycle, or right-click to remove'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                title="Place Open Hi-Hat, Ride Bell, or Cross-Stick when clicking shared staff positions (or hold Alt)"
              >
                <input
                  type="checkbox"
                  checked={useAltStaffVoices}
                  onChange={(e) => setUseAltStaffVoices(e.target.checked)}
                  className="accent-blue-600"
                />
                Alt Voices (Open HH / Bell / X-Stick)
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStaffCounting}
                  onChange={(e) => setShowStaffCounting(e.target.checked)}
                  className="accent-blue-600"
                />
                Show Counting
              </label>
            </div>
          </div>

          <PercussionStaff
            groove={groove}
            activeStep={activeStep}
            brushMode={brushMode}
            useAltVoices={useAltStaffVoices}
            showCounting={showStaffCounting}
            onHoverChange={setStaffHoverInfo}
            onToggleStaffNote={(instrument, step, hit) => {
              handleSetCell(instrument, step, hit);
              if (hit > 0) {
                drumEngine.previewHit(instrument, hit);
              }
            }}
          />
        </section>

        {/* Focal Stage 2: Logic-Style Smart Drummer Studio */}
        {smartDrummerOpen && (
          <div className="no-print">
            <SmartDrummerPanel
              config={smartConfig}
              bpm={groove.bpm}
              onSelectPersona={handleSelectSmartPersona}
              onChangeConfig={handleChangeSmartConfig}
              onRegenerateVariation={handleRegenerateVariation}
              onExportMidi={() => downloadMidiFile(groove, 2)}
            />
          </div>
        )}

        {/* Focal Stage 3: Multi-Dynamic Step Notation Grid */}
        <div ref={(el) => { gridSectionRef.current = el; }} className="no-print">
          <NotationGrid
            groove={groove}
            mixer={mixer}
            activeStep={activeStep}
            brushMode={brushMode}
            onBrushModeChange={setBrushMode}
            onSetCell={handleSetCell}
            onAuditionInstrument={(inst, hit) => drumEngine.previewHit(inst, hit)}
            onToggleMute={(inst) =>
              setMixer((prev) => ({
                ...prev,
                [inst]: { ...prev[inst], muted: !prev[inst].muted },
              }))
            }
            onToggleSolo={(inst) =>
              setMixer((prev) => ({
                ...prev,
                [inst]: { ...prev[inst], solo: !prev[inst].solo },
              }))
            }
            onVolumeChange={(inst, volume) =>
              setMixer((prev) => ({
                ...prev,
                [inst]: { ...prev[inst], volume },
              }))
            }
            onCellFocus={(step, inst) => collab.emitCursorFocus(step, inst)}
            onCopyBarToAll={handleCopyBarToAll}
            onClearGrid={handleClearGrid}
            remoteParticipants={collab.participants}
            selfId={collab.selfId}
          />
        </div>
      </main>

      <footer className="no-print border-t border-(--studio-border) bg-(--studio-surface) px-4 sm:px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            GrooveSheet
          </span>
          <span>Created by Ray Foo</span>
        </div>
      </footer>

      {/* Modals */}
      <GrooveLibraryModal
        isOpen={libraryOpen}
        currentGroove={groove}
        customGrooves={customGrooves}
        onClose={() => setLibraryOpen(false)}
        onSelectPreset={handleLoadPreset}
        onSaveCurrentToLibrary={handleSaveCustomGroove}
        onDeleteCustomGroove={handleDeleteCustomGroove}
      />

      <PrintPreviewModal
        isOpen={printOpen}
        groove={groove}
        onClose={() => setPrintOpen(false)}
      />

      <ShareSessionModal
        isOpen={shareOpen}
        roomId={roomId}
        status={collab.status}
        musicianName={musicianName}
        participants={collab.participants}
        groove={groove}
        onClose={() => setShareOpen(false)}
        onStartOrJoinRoom={handleStartOrJoinRoom}
        onLeaveRoom={handleLeaveRoom}
        onChangeName={handleChangeName}
        onExportMidi={(repeats) => downloadMidiFile(groove, repeats)}
        onImportMidiFile={handleImportMidiFile}
        onExportJson={handleExportJson}
        onImportJsonFile={handleImportJsonFile}
      />

      <MidiGuideModal
        isOpen={guideOpen}
        activeSoundFont={activeSoundFont}
        soundfontStatus={soundfontStatus}
        customSf2Name={customSf2Name}
        customSf2Presets={customSf2Presets}
        activeCustomProgram={activeCustomProgram}
        onSelectSoundFont={(kitId) => void handleSelectSoundFont(kitId)}
        onUploadSf2File={handleUploadSf2File}
        onSelectCustomProgram={handleSelectCustomProgram}
        onClose={() => setGuideOpen(false)}
      />
    </div>
  );
}
