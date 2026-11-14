import { HitType, InstrumentId, LibraryPreset, StepGrid, SubdivisionId, TimeSignatureId } from '../types/groove';
import { createEmptyGrid, getStepsPerBar } from '../utils/grooveHelpers';

/**
 * Compact ASCII pattern builder:
 * '.' = Off (0)
 * 'x' / 'o' = Normal (1)
 * '>' / 'X' = Accent (2)
 * 'g' / '(' = Ghost (3)
 * 'f' = Flam (4)
 */
function parsePatternString(pattern: string, expectedLen: number): HitType[] {
  const cleaned = pattern.replace(/\s+|\|/g, '');
  const out = new Array<HitType>(expectedLen).fill(0);
  for (let i = 0; i < Math.min(cleaned.length, expectedLen); i++) {
    const ch = cleaned[i];
    if (ch === 'x' || ch === 'o' || ch === '1') out[i] = 1;
    else if (ch === '>' || ch === 'X' || ch === '2') out[i] = 2;
    else if (ch === 'g' || ch === '(' || ch === '3') out[i] = 3;
    else if (ch === 'f' || ch === '4') out[i] = 4;
  }
  return out;
}

function buildPreset(config: {
  id: string;
  title: string;
  composer: string;
  style: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  notes?: string;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  bars: 1 | 2 | 4;
  swing: number;
  tracks: Partial<Record<InstrumentId, string>>;
}): LibraryPreset {
  const totalSteps = getStepsPerBar(config.timeSignature, config.subdivision) * config.bars;
  const steps: StepGrid = createEmptyGrid(totalSteps);
  for (const [instId, pat] of Object.entries(config.tracks)) {
    if (pat) {
      steps[instId as InstrumentId] = parsePatternString(pat, totalSteps);
    }
  }
  return {
    id: config.id,
    title: config.title,
    composer: config.composer,
    style: config.style,
    difficulty: config.difficulty,
    description: config.description,
    notes: config.notes,
    bpm: config.bpm,
    timeSignature: config.timeSignature,
    subdivision: config.subdivision,
    bars: config.bars,
    swing: config.swing,
    steps,
    updatedAt: Date.now(),
  };
}

export const GROOVE_LIBRARY: LibraryPreset[] = [
  buildPreset({
    id: 'preset-rock-pocket',
    title: 'Classic 8th-Note Rock Pocket',
    composer: 'Standard Repertoire',
    style: 'Rock',
    difficulty: 'Beginner',
    description: 'Driving eighth-note hi-hats with accented backbeats on 2 & 4 and a syncopated kick push into beat 4.',
    notes: 'Keep hi-hat accents on quarter-note downbeats for natural shoulder-to-tip phrasing.',
    bpm: 108,
    timeSignature: '4/4',
    subdivision: '16th',
    bars: 1,
    swing: 0,
    tracks: {
      hihatClosed: '> . x . | > . x . | > . x . | > . x .',
      snare:       '. . . . | > . . . | . . . . | > . . .',
      kick:        'x . . . | . . . . | x . x . | . . . .',
    },
  }),
  buildPreset({
    id: 'preset-funk-ghosts',
    title: '16th-Note Funk with Snare Ghosts',
    composer: 'Oakland Studio Tradition',
    style: 'Funk',
    difficulty: 'Intermediate',
    description: 'Tight 16th-note pocket with ghosted snare inner-beats, accented backbeats, and an open hi-hat lift on the & of 4.',
    notes: 'Play ghost notes under 1 inch off the head so the accented 2 & 4 backbeats snap.',
    bpm: 94,
    timeSignature: '4/4',
    subdivision: '16th',
    bars: 1,
    swing: 12,
    tracks: {
      hihatClosed: '> . x . | x . x . | x . x . | x . . .',
      hihatOpen:   '. . . . | . . . . | . . . . | . . x .',
      snare:       '. . . . | > . . g | . g . . | > . . g',
      kick:        'x . x . | . . . . | . . x . | . x . .',
    },
  }),
  buildPreset({
    id: 'preset-purdie-shuffle',
    title: 'Half-Time Triplet Shuffle',
    composer: 'Session Shuffle Study',
    style: 'Shuffle / Blues',
    difficulty: 'Intermediate',
    description: 'Classic half-time shuffle in 4/4 triplets with snare backbeat on beat 3 and triplet ghost-note weave.',
    notes: 'Maintain a relaxed Moeller bounce on the hi-hat skip strokes.',
    bpm: 88,
    timeSignature: '4/4',
    subdivision: 'triplet',
    bars: 1,
    swing: 0,
    tracks: {
      hihatClosed: '> . x | > . x | > . x | > . x',
      snare:       '. g . | . g . | > . . | . g .',
      kick:        'x . . | . . x | . . . | . . x',
    },
  }),
  buildPreset({
    id: 'preset-jazz-swing',
    title: 'Up-Tempo Jazz Ride & Feather Kick',
    composer: 'Jazz Combo Standard',
    style: 'Jazz',
    difficulty: 'Intermediate',
    description: 'Traditional spang-a-lang ride cymbal pattern in triplets, crisp pedal hi-hat on 2 & 4, and comping snare/kick.',
    notes: 'Feather the bass drum lightly on all four quarter notes or drop conversational comping hits.',
    bpm: 138,
    timeSignature: '4/4',
    subdivision: 'triplet',
    bars: 2,
    swing: 0,
    tracks: {
      ride:       'x . . | x . x | x . . | x . x | x . . | x . x | x . . | x . x',
      hihatPedal: '. . . | > . . | . . . | > . . | . . . | > . . | . . . | > . .',
      snare:      '. . . | . . g | . . . | . . . | . . x | . . . | . . g | . . x',
      kick:       'g . . | g . . | g . . | g . x | g . . | g . . | g . x | g . .',
    },
  }),
  buildPreset({
    id: 'preset-bossa-nova',
    title: 'Bossa Nova (Cross-Stick & Surdo Kick)',
    composer: 'Rio Acoustic Standard',
    style: 'Latin / Afro-Cuban',
    difficulty: 'Intermediate',
    description: 'Two-bar 3-2 clave cross-stick pattern over steady eighth-note hi-hats and classic dotted-quarter/eighth bass drum ostinato.',
    notes: 'Keep the cross-stick warm and woody; the bass drum emulates the Brazilian surdo.',
    bpm: 122,
    timeSignature: '4/4',
    subdivision: '8th',
    bars: 2,
    swing: 0,
    tracks: {
      hihatClosed: 'x x x x | x x x x | x x x x | x x x x',
      crossStick:  'x . . x | . . x . | . . x . | x . . .',
      kick:        'x . . x | x . . x | x . . x | x . . x',
    },
  }),
  buildPreset({
    id: 'preset-songo-groove',
    title: 'Afro-Cuban Songo (Bell + Ghost Snare)',
    composer: 'Havana Fusion Study',
    style: 'Latin / Afro-Cuban',
    difficulty: 'Advanced',
    description: 'Syncopated bell ostinato paired with linear-style snare backbeats, ghost notes, floor tom accents, and tumbao kick.',
    bpm: 104,
    timeSignature: '4/4',
    subdivision: '16th',
    bars: 1,
    swing: 0,
    tracks: {
      cowbell:    'x . x . | . x . x | . x . . | x . x .',
      snare:      '. . . . | > . g . | . . . g | . > . .',
      tomFloor:   '. . . . | . . . . | . . x . | . . . .',
      kick:       '. . . x | . . x . | . . . x | . . x .',
      hihatPedal: 'x . . . | x . . . | x . . . | x . . .',
    },
  }),
  buildPreset({
    id: 'preset-boom-bap',
    title: '90s Boom Bap Hip-Hop Swing',
    composer: 'MPC Golden Era',
    style: 'Hip-Hop',
    difficulty: 'Beginner',
    description: 'Swung 16th-note pocket with punchy double kicks, crisp snare crack, and open hi-hat breath on the upbeat.',
    bpm: 90,
    timeSignature: '4/4',
    subdivision: '16th',
    bars: 2,
    swing: 38,
    tracks: {
      hihatClosed: 'x . x . | x . x . | x . x . | x . . . | x . x . | x . x . | x . x . | x . . .',
      hihatOpen:   '. . . . | . . . . | . . . . | . . x . | . . . . | . . . . | . . . . | . . x .',
      snare:       '. . . . | > . . . | . . . . | > . . g | . . . . | > . . . | . . . . | > . . .',
      kick:        'x . . x | . . . . | . x x . | . . . . | x . . x | . . . x | . . x . | . . . .',
    },
  }),
  buildPreset({
    id: 'preset-motown-four',
    title: 'Motown Four-on-the-Floor',
    composer: 'Detroit Hitsville',
    style: 'Soul / R&B',
    difficulty: 'Beginner',
    description: 'Driving quarter-note bass drum under tambourine-like 8th hi-hats and signature unison snare + flam accents.',
    bpm: 118,
    timeSignature: '4/4',
    subdivision: '8th',
    bars: 1,
    swing: 0,
    tracks: {
      hihatClosed: 'x x x x | x x x x',
      snare:       '. . x . | . . f .',
      kick:        'x . x . | x . x .',
    },
  }),
  buildPreset({
    id: 'preset-take-five',
    title: '5/4 Cool Jazz Ostinato',
    composer: 'West Coast Odd Meter',
    style: 'Odd Meter',
    difficulty: 'Intermediate',
    description: 'Classic 3+2 phrasing in 5/4 time with ride swing feel, pedal hi-hat on 2 & 4, and cross-stick accents.',
    notes: 'Think "1-2-3, 1-2" across the bar to internalize the 5/4 cycle.',
    bpm: 132,
    timeSignature: '5/4',
    subdivision: '8th',
    bars: 1,
    swing: 32,
    tracks: {
      ride:       'x . | x x | x . | x . | x x',
      hihatPedal: '. . | x . | . . | x . | . .',
      crossStick: '. . | . . | . . | > . | . .',
      kick:       'x . | . . | . x | . . | . .',
    },
  }),
  buildPreset({
    id: 'preset-seven-eight',
    title: '7/8 Fusion Groove (2+2+3)',
    composer: 'Progressive Workshop',
    style: 'Odd Meter',
    difficulty: 'Advanced',
    description: 'Asymmetric 2+2+3 pulse in 7/8 with Ride Bell accents marking the three macro-beats and syncopated snare.',
    bpm: 116,
    timeSignature: '7/8',
    subdivision: '16th',
    bars: 1,
    swing: 0,
    tracks: {
      rideBell:    '> . . . | > . . . | > . . . . .',
      hihatClosed: '. . x . | . . x . | . . x . x .',
      snare:       '. . . . | > . . g | . . > . . g',
      kick:        'x . . x | . . . . | x . . . . .',
    },
  }),
  buildPreset({
    id: 'preset-six-eight-ballad',
    title: '6/8 Soul & Gospel Ballad',
    composer: 'Slow Compound Groove',
    style: 'Soul / R&B',
    difficulty: 'Beginner',
    description: 'Lush 6/8 compound meter with gentle eighth-note hi-hats, solid backbeat on count 4, and melodic tom turnaround.',
    bpm: 72,
    timeSignature: '6/8',
    subdivision: '16th',
    bars: 2,
    swing: 0,
    tracks: {
      crash:       '> . . . . . | . . . . . . | . . . . . . | . . . . . .',
      hihatClosed: '. . x . x . | x . x . x . | x . x . x . | x . x . . .',
      snare:       '. . . . . . | > . . . . g | . . . . . . | > . . . . .',
      tomHigh:     '. . . . . . | . . . . . . | . . . . . . | . . . x . .',
      tomFloor:    '. . . . . . | . . . . . . | . . . . . . | . . . . x .',
      kick:        'x . . . . x | . . x . . . | x . . . . x | . . . . . .',
    },
  }),
  buildPreset({
    id: 'preset-linear-gospel',
    title: 'Linear 16th-Note Gospel Fill Groove',
    composer: 'Modern Drum Lab',
    style: 'Funk',
    difficulty: 'Advanced',
    description: 'No two limbs strike simultaneously in beat 4 — clean single-stroke orchestration across snare, hi-hat, kick, and toms.',
    bpm: 98,
    timeSignature: '4/4',
    subdivision: '16th',
    bars: 1,
    swing: 0,
    tracks: {
      hihatClosed: '> . x . | . x x . | x . x . | . . . .',
      snare:       '. . . . | > . . g | . . . . | > . . .',
      tomHigh:     '. . . . | . . . . | . . . . | . x . .',
      tomFloor:    '. . . . | . . . . | . . . . | . . x .',
      kick:        'x . . x | . . . . | x . . x | . . . x',
    },
  }),
  buildPreset({
    id: 'preset-waltz-jazz',
    title: '3/4 Jazz Waltz',
    composer: 'Conservatory Rhythm Lab',
    style: 'Jazz',
    difficulty: 'Beginner',
    description: 'Swinging 3/4 jazz waltz featuring ride cymbal phrasing, pedal hi-hat on beat 2, and light snare conversation.',
    bpm: 136,
    timeSignature: '3/4',
    subdivision: 'triplet',
    bars: 2,
    swing: 0,
    tracks: {
      ride:       'x . . | x . x | x . . | x . . | x . x | x . .',
      hihatPedal: '. . . | > . . | . . . | . . . | > . . | . . .',
      snare:      '. . . | . . . | . . g | . . . | . . x | . . .',
      kick:       'x . . | . . . | . . . | x . . | . . . | . . x',
    },
  }),
  buildPreset({
    id: 'preset-paradiddle-groove',
    title: 'Paradiddle Groove Exercise (RLRR LRLL)',
    composer: 'Rudimental Curriculum',
    style: 'Rudiments',
    difficulty: 'Intermediate',
    description: 'Applies the single paradiddle sticking between hi-hat (R) and ghosted snare (L) with accented backbeats and kick anchor.',
    notes: 'Practice at 70 BPM first, gradually increasing tempo while keeping ghost notes relaxed.',
    bpm: 86,
    timeSignature: '4/4',
    subdivision: '16th',
    bars: 1,
    swing: 0,
    tracks: {
      hihatClosed: 'x . x x | . x . . | x . x x | . x . .',
      snare:       '. g . . | > . g g | . g . . | > . g g',
      kick:        'x . . . | . . . . | x . x . | . . . .',
    },
  }),
];
