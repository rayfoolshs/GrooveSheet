import { DrumInstrumentSpec, InstrumentId, MixerState } from '../types/groove';

/**
 * Percussive Arts Society (PAS) Drum Set Staff Notation & General MIDI Channel 10 Map
 * Ordered top-to-bottom visually from cymbals down to feet, matching how drummers read a chart.
 */
export const DRUM_INSTRUMENTS: DrumInstrumentSpec[] = [
  {
    id: 'crash',
    name: 'Crash Cymbal',
    shortName: 'Crash',
    gmNote: 49,
    gmName: 'Crash Cymbal 1',
    staffStep: 10, // Ledger line above staff (A5)
    notehead: 'x-circle',
    voice: 'hands',
    defaultColor: '#D97706',
  },
  {
    id: 'ride',
    name: 'Ride Cymbal',
    shortName: 'Ride',
    gmNote: 51,
    gmName: 'Ride Cymbal 1',
    staffStep: 8, // Top line (F5)
    notehead: 'x',
    voice: 'hands',
    defaultColor: '#0284C7',
  },
  {
    id: 'rideBell',
    name: 'Ride Bell',
    shortName: 'R.Bell',
    gmNote: 53,
    gmName: 'Ride Bell',
    staffStep: 8, // Top line (F5) with diamond notehead
    notehead: 'diamond',
    voice: 'hands',
    defaultColor: '#0369A1',
  },
  {
    id: 'hihatOpen',
    name: 'Hi-Hat (Open)',
    shortName: 'HH Open',
    gmNote: 46,
    gmName: 'Open Hi-Hat',
    staffStep: 9, // Space above top line (G5) + 'o' above
    notehead: 'x',
    voice: 'hands',
    chokeGroup: 'hihat',
    openArticulation: true,
    defaultColor: '#0D9488',
  },
  {
    id: 'hihatClosed',
    name: 'Hi-Hat (Closed)',
    shortName: 'HH Clsd',
    gmNote: 42,
    gmName: 'Closed Hi-Hat',
    staffStep: 9, // Space above top line (G5)
    notehead: 'x',
    voice: 'hands',
    chokeGroup: 'hihat',
    defaultColor: '#0F766E',
  },
  {
    id: 'cowbell',
    name: 'Cowbell',
    shortName: 'Cowbell',
    gmNote: 56,
    gmName: 'Cowbell',
    staffStep: 11, // Above ledger line (B5)
    notehead: 'triangle',
    voice: 'hands',
    defaultColor: '#B45309',
  },
  {
    id: 'tomHigh',
    name: 'High Tom',
    shortName: 'Hi Tom',
    gmNote: 48,
    gmName: 'Hi-Mid Tom',
    staffStep: 7, // 4th space (E5)
    notehead: 'oval',
    voice: 'hands',
    defaultColor: '#4F46E5',
  },
  {
    id: 'tomMid',
    name: 'Mid Tom',
    shortName: 'Mid Tom',
    gmNote: 45,
    gmName: 'Low Tom',
    staffStep: 6, // 4th line (D5)
    notehead: 'oval',
    voice: 'hands',
    defaultColor: '#4338CA',
  },
  {
    id: 'snare',
    name: 'Snare Drum',
    shortName: 'Snare',
    gmNote: 38,
    gmName: 'Acoustic Snare',
    staffStep: 5, // 3rd space (C5)
    notehead: 'oval',
    voice: 'hands',
    defaultColor: '#2563EB',
  },
  {
    id: 'crossStick',
    name: 'Cross-Stick / Rim',
    shortName: 'X-Stick',
    gmNote: 37,
    gmName: 'Side Stick',
    staffStep: 5, // 3rd space (C5) with X notehead
    notehead: 'x',
    voice: 'hands',
    defaultColor: '#1D4ED8',
  },
  {
    id: 'tomFloor',
    name: 'Floor Tom',
    shortName: 'Flr Tom',
    gmNote: 43,
    gmName: 'High Floor Tom',
    staffStep: 3, // 2nd space (A4)
    notehead: 'oval',
    voice: 'hands',
    defaultColor: '#6D28D9',
  },
  {
    id: 'kick',
    name: 'Bass Drum (Kick)',
    shortName: 'Kick',
    gmNote: 36,
    gmName: 'Bass Drum 1',
    staffStep: 1, // 1st space (F4), stems down
    notehead: 'oval',
    voice: 'feet',
    defaultColor: '#DC2626',
  },
  {
    id: 'hihatPedal',
    name: 'Hi-Hat (Pedal)',
    shortName: 'HH Foot',
    gmNote: 44,
    gmName: 'Pedal Hi-Hat',
    staffStep: -1, // Space below bottom line (D4), stems down
    notehead: 'x',
    voice: 'feet',
    chokeGroup: 'hihat',
    defaultColor: '#0F766E',
  },
];

export const INSTRUMENT_BY_ID: Record<InstrumentId, DrumInstrumentSpec> = DRUM_INSTRUMENTS.reduce(
  (acc, inst) => {
    acc[inst.id] = inst;
    return acc;
  },
  {} as Record<InstrumentId, DrumInstrumentSpec>
);

export const GM_NOTE_TO_INSTRUMENT: Record<number, InstrumentId> = {
  35: 'kick', // Acoustic Bass Drum -> Kick
  36: 'kick',
  37: 'crossStick',
  38: 'snare',
  40: 'snare', // Electric Snare -> Snare
  41: 'tomFloor',
  42: 'hihatClosed',
  43: 'tomFloor',
  44: 'hihatPedal',
  45: 'tomMid',
  46: 'hihatOpen',
  47: 'tomMid',
  48: 'tomHigh',
  49: 'crash',
  50: 'tomHigh',
  51: 'ride',
  52: 'crash',
  53: 'rideBell',
  55: 'crash',
  56: 'cowbell',
  57: 'crash',
  59: 'ride',
};

export function createDefaultMixer(): MixerState {
  return DRUM_INSTRUMENTS.reduce((acc, inst) => {
    acc[inst.id] = {
      muted: false,
      solo: false,
      volume: inst.id === 'cowbell' ? 0.72 : 0.88,
    };
    return acc;
  }, {} as MixerState);
}
