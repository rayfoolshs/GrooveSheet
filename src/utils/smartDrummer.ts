import {
  GrooveDocument,
  HitType,
  InstrumentId,
  StepGrid,
  SubdivisionId,
  TimeSignatureId,
} from '../types/groove';
import { createEmptyGrid, getStepsPerBar, TIME_SIGNATURES } from './grooveHelpers';

export type SmartDrummerGenre =
  | 'rock'
  | 'funk'
  | 'jazz'
  | 'hiphop'
  | 'latin'
  | 'pop';

export type TimekeeperSurface = 'hihat' | 'ride' | 'rideBell' | 'none';
export type SnareStyle = 'backbeat' | 'halftime' | 'crossStick' | 'syncopated';
export type KickStyle = 'standard' | 'syncopated' | 'fourOnFloor' | 'sparse';

export interface SmartDrummerConfig {
  enabled: boolean;
  genre: SmartDrummerGenre;
  /** X-axis: 0 (Simple) to 100 (Complex) */
  complexity: number;
  /** Y-axis: 0 (Soft) to 100 (Loud) */
  intensity: number;
  /** Timekeeper cymbal */
  cymbal: TimekeeperSurface;
  cymbalPattern: 1 | 2 | 3 | 4; // 1: sparse/quarter, 2: steady 8th, 3: driven/accented, 4: busy 16th
  openHiHatLift: boolean;
  crashOnOne: boolean;
  snareStyle: SnareStyle;
  ghostNotes: boolean;
  flams: boolean;
  kickStyle: KickStyle;
  kickDensity: 1 | 2 | 3 | 4;
  cowbell: boolean;
  /** 0 to 100: end-of-phrase tom/snare fill probability & length */
  fills: number;
  /** 0 to 66: swing feel */
  swing: number;
  /** Seed for deterministic rhythmic variations */
  variationSeed: number;
}

export interface GenrePersonaSpec {
  id: SmartDrummerGenre;
  name: string;
  roleLabel: string;
  defaultBpm: number;
  defaultSubdivision: SubdivisionId;
  defaults: Omit<SmartDrummerConfig, 'enabled' | 'variationSeed'>;
}

export const DRUMMER_PERSONAS: GenrePersonaSpec[] = [
  {
    id: 'rock',
    name: 'Mason',
    roleLabel: 'Classic & Modern Rock',
    defaultBpm: 112,
    defaultSubdivision: '16th',
    defaults: {
      genre: 'rock',
      complexity: 42,
      intensity: 68,
      cymbal: 'hihat',
      cymbalPattern: 2,
      openHiHatLift: true,
      crashOnOne: true,
      snareStyle: 'backbeat',
      ghostNotes: false,
      flams: false,
      kickStyle: 'standard',
      kickDensity: 2,
      cowbell: false,
      fills: 35,
      swing: 0,
    },
  },
  {
    id: 'funk',
    name: 'Maya',
    roleLabel: '16th-Note Pocket & Ghost Funk',
    defaultBpm: 96,
    defaultSubdivision: '16th',
    defaults: {
      genre: 'funk',
      complexity: 68,
      intensity: 58,
      cymbal: 'hihat',
      cymbalPattern: 4,
      openHiHatLift: true,
      crashOnOne: false,
      snareStyle: 'syncopated',
      ghostNotes: true,
      flams: false,
      kickStyle: 'syncopated',
      kickDensity: 3,
      cowbell: false,
      fills: 40,
      swing: 12,
    },
  },
  {
    id: 'jazz',
    name: 'Julian',
    roleLabel: 'Acoustic Jazz Swing',
    defaultBpm: 136,
    defaultSubdivision: 'triplet',
    defaults: {
      genre: 'jazz',
      complexity: 55,
      intensity: 45,
      cymbal: 'ride',
      cymbalPattern: 3,
      openHiHatLift: false,
      crashOnOne: false,
      snareStyle: 'syncopated',
      ghostNotes: true,
      flams: false,
      kickStyle: 'sparse',
      kickDensity: 2,
      cowbell: false,
      fills: 25,
      swing: 0,
    },
  },
  {
    id: 'hiphop',
    name: 'Devon',
    roleLabel: 'Boom Bap & Neo-Soul Swing',
    defaultBpm: 90,
    defaultSubdivision: '16th',
    defaults: {
      genre: 'hiphop',
      complexity: 52,
      intensity: 64,
      cymbal: 'hihat',
      cymbalPattern: 2,
      openHiHatLift: true,
      crashOnOne: false,
      snareStyle: 'backbeat',
      ghostNotes: true,
      flams: false,
      kickStyle: 'syncopated',
      kickDensity: 3,
      cowbell: false,
      fills: 20,
      swing: 38,
    },
  },
  {
    id: 'latin',
    name: 'Mateo',
    roleLabel: 'Afro-Cuban & Bossa',
    defaultBpm: 114,
    defaultSubdivision: '16th',
    defaults: {
      genre: 'latin',
      complexity: 62,
      intensity: 60,
      cymbal: 'rideBell',
      cymbalPattern: 3,
      openHiHatLift: false,
      crashOnOne: false,
      snareStyle: 'crossStick',
      ghostNotes: true,
      flams: false,
      kickStyle: 'syncopated',
      kickDensity: 2,
      cowbell: true,
      fills: 30,
      swing: 0,
    },
  },
  {
    id: 'pop',
    name: 'Chloe',
    roleLabel: 'Indie & Four-on-the-Floor Pop',
    defaultBpm: 118,
    defaultSubdivision: '16th',
    defaults: {
      genre: 'pop',
      complexity: 36,
      intensity: 62,
      cymbal: 'hihat',
      cymbalPattern: 2,
      openHiHatLift: false,
      crashOnOne: true,
      snareStyle: 'backbeat',
      ghostNotes: false,
      flams: true,
      kickStyle: 'fourOnFloor',
      kickDensity: 2,
      cowbell: false,
      fills: 30,
      swing: 0,
    },
  },
];

// Deterministic pseudo-random helper so sliders stay predictable for a given variationSeed
function hash(seed: number, step: number, salt: number): number {
  let x = (seed * 374761393 + step * 668265263 + salt * 1274126177) | 0;
  x = ((x ^ (x >> 13)) * 1274126177) | 0;
  return ((x ^ (x >> 16)) >>> 0) / 4294967295;
}

function hitForIntensity(intensity: number, accentBias = 0): HitType {
  const score = intensity + accentBias;
  if (score >= 76) return 2; // Accent
  if (score <= 22) return 3; // Ghost
  return 1; // Normal
}

/**
 * Algorithmically composes a musically grounded drum groove from Smart Drummer XY + kit parameters.
 */
export function generateSmartDrummerSteps(
  config: SmartDrummerConfig,
  timeSignature: TimeSignatureId,
  subdivision: SubdivisionId,
  bars: 1 | 2 | 4
): StepGrid {
  const stepsPerBar = getStepsPerBar(timeSignature, subdivision);
  const totalSteps = stepsPerBar * bars;
  const steps = createEmptyGrid(totalSteps);
  const spec = TIME_SIGNATURES[timeSignature];

  const comp = config.complexity / 100; // 0..1
  const inten = config.intensity; // 0..100
  const seed = config.variationSeed;

  const perBeat = spec.isCompound
    ? subdivision === '16th'
      ? 6
      : 3
    : subdivision === '16th'
      ? 4
      : subdivision === '8th'
        ? 2
        : 3;

  // Helper to place a hit safely
  const setHit = (inst: InstrumentId, step: number, hit: HitType) => {
    if (step >= 0 && step < totalSteps && hit > 0) {
      steps[inst][step] = hit;
    }
  };

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * stepsPerBar;
    const isLastBar = bar === bars - 1;

    // 1. Crash on Beat 1 of Bar 1 (or bar 1 & 3 on 4-bar phrase)
    if (config.crashOnOne && (bar === 0 || (bars === 4 && bar === 2 && comp > 0.5))) {
      setHit('crash', barStart, inten >= 65 ? 2 : 1);
    }

    // 2. Timekeeper (Hi-Hat / Ride / Ride Bell)
    if (config.cymbal !== 'none') {
      const cymbalInst: InstrumentId =
        config.cymbal === 'hihat'
          ? 'hihatClosed'
          : config.cymbal === 'rideBell'
            ? 'rideBell'
            : 'ride';

      for (let s = 0; s < stepsPerBar; s++) {
        const abs = barStart + s;
        // Skip crash collision on step 0 of bar 0 if crashOnOne
        if (config.crashOnOne && bar === 0 && s === 0) continue;

        const beatSub = s % perBeat;
        const isBeatDownbeat = beatSub === 0;
        const isEighthSpot =
          subdivision === '16th' ? s % 2 === 0 : subdivision === 'triplet' ? beatSub === 0 || beatSub === 2 : true;

        let place = false;
        let accentBias = 0;

        if (config.genre === 'jazz' && subdivision === 'triplet') {
          // Classic Jazz Ride Spang-a-Lang: beat 1, 2, 2-let, 3, 4, 4-let
          const beatIdx = Math.floor(s / 3);
          if (beatSub === 0) {
            place = true;
            accentBias = beatIdx % 2 === 1 ? 10 : -5;
          } else if (beatSub === 2 && (beatIdx % 2 === 1 || config.cymbalPattern >= 3)) {
            place = true;
            accentBias = -12;
          }
        } else {
          switch (config.cymbalPattern) {
            case 1: // Quarter notes
              place = isBeatDownbeat;
              accentBias = 8;
              break;
            case 2: // Steady 8th notes
              place = isEighthSpot;
              accentBias = isBeatDownbeat ? 10 : -10;
              break;
            case 3: // Driven / Syncopated 8ths + occasional 16th push
              place = isEighthSpot || (subdivision === '16th' && comp > 0.55 && hash(seed, s, 11) < comp * 0.45);
              accentBias = isBeatDownbeat ? 14 : -8;
              break;
            case 4: // Busy 16ths / full subdivision
              place = true;
              accentBias = isBeatDownbeat ? 15 : beatSub === 2 ? 0 : -18;
              break;
          }
        }

        if (place) {
          // Open hi-hat lift on final '&' of the bar or upbeat of beat 4
          const openLiftStep = stepsPerBar - (subdivision === '16th' ? 2 : 1);
          if (
            config.cymbal === 'hihat' &&
            config.openHiHatLift &&
            s === openLiftStep
          ) {
            setHit('hihatOpen', abs, hitForIntensity(inten, 5));
          } else {
            setHit(cymbalInst, abs, hitForIntensity(inten, accentBias));
          }
        }
      }
    }

    // Jazz / Latin Pedal Hi-Hat on 2 & 4
    if (config.genre === 'jazz' || (config.cymbal !== 'hihat' && comp > 0.35)) {
      if (!spec.isCompound) {
        for (let b = 1; b < spec.numerator; b += 2) {
          setHit('hihatPedal', barStart + b * perBeat, inten > 65 ? 2 : 1);
        }
      }
    }

    // 3. Snare / Cross-Stick
    const snareInst: InstrumentId = config.snareStyle === 'crossStick' ? 'crossStick' : 'snare';
    const backbeatSteps: number[] = [];

    if (spec.isCompound) {
      // In 6/8 or 12/8, backbeats fall on macro-beat 2 (and 4)
      let acc = 0;
      const mult = subdivision === '16th' ? 2 : 1;
      spec.beatGroups.forEach((grp, idx) => {
        if (idx % 2 === 1) backbeatSteps.push(acc);
        acc += grp * mult;
      });
    } else if (config.snareStyle === 'halftime') {
      const midBeat = Math.floor(spec.numerator / 2);
      backbeatSteps.push(midBeat * perBeat);
    } else {
      for (let b = 1; b < spec.numerator; b += 2) {
        backbeatSteps.push(b * perBeat);
      }
    }

    for (const bs of backbeatSteps) {
      const useFlam = config.flams && (bs >= Math.floor(stepsPerBar / 2) || hash(seed, bs, 21) < 0.45);
      const hit: HitType = useFlam ? 4 : inten >= 40 ? 2 : 1;
      setHit(snareInst, barStart + bs, hit);
    }

    // Syncopated snare & ghost notes
    if (config.snareStyle === 'syncopated' || config.ghostNotes) {
      for (let s = 0; s < stepsPerBar; s++) {
        if (backbeatSteps.includes(s)) continue;
        const abs = barStart + s;
        if (subdivision === '16th') {
          // Classic funk/soul ghost slots: 'a' of 1, 'e' & 'a' of 2/3/4
          const isGhostSlot = s % 4 === 3 || s % 4 === 1;
          if (config.ghostNotes && isGhostSlot && hash(seed, s + bar * 7, 33) < 0.25 + comp * 0.55) {
            setHit('snare', abs, 3); // Ghost!
          } else if (
            config.snareStyle === 'syncopated' &&
            s % 4 === 2 &&
            s > perBeat &&
            hash(seed, s, 37) < comp * 0.45
          ) {
            setHit(snareInst, abs, 1);
          }
        } else if (subdivision === 'triplet') {
          // Triplet skip ghost note
          if (config.ghostNotes && s % 3 === 1 && hash(seed, s + bar * 5, 39) < 0.25 + comp * 0.45) {
            setHit('snare', abs, 3);
          }
        }
      }
    }

    // 4. Kick Drum
    const kickSteps = new Set<number>();
    kickSteps.add(0); // Always anchor Beat 1 unless very sparse jazz
    if (config.genre === 'jazz' && config.kickStyle === 'sparse') {
      kickSteps.delete(0);
      if (inten > 30) kickSteps.add(0);
    }

    if (config.kickStyle === 'fourOnFloor') {
      if (!spec.isCompound) {
        for (let b = 0; b < spec.numerator; b++) {
          kickSteps.add(b * perBeat);
        }
      }
    } else if (config.kickStyle === 'standard') {
      if (!spec.isCompound && spec.numerator >= 4) {
        kickSteps.add(2 * perBeat);
      } else if (spec.isCompound) {
        kickSteps.add(0);
      }
    } else if (config.kickStyle === 'syncopated') {
      if (!spec.isCompound && spec.numerator >= 4) {
        if (subdivision === '16th') {
          kickSteps.add(2 * perBeat + 2); // '&' of 3
          if (config.kickDensity >= 2) kickSteps.add(3); // 'a' of 1
          if (config.kickDensity >= 3) kickSteps.add(2 * perBeat); // 3
        } else if (subdivision === '8th') {
          kickSteps.add(2 * perBeat + 1);
        }
      }
    }

    // Complexity + KickDensity extra syncopations
    const extraKickProb = (config.kickDensity - 1) * 0.16 + comp * 0.28;
    for (let s = 1; s < stepsPerBar; s++) {
      if (backbeatSteps.includes(s)) continue;
      if (s % perBeat === 0 && config.kickStyle === 'sparse') continue;
      if (hash(seed, s + bar * 13, 51) < extraKickProb) {
        // Avoid crowded 3 consecutive 16th kicks
        if (!kickSteps.has(s - 1)) {
          kickSteps.add(s);
        }
      }
    }

    for (const ks of kickSteps) {
      const hit: HitType =
        config.genre === 'jazz' && config.kickStyle === 'sparse' && ks % perBeat === 0
          ? 3 // Feather kick!
          : inten >= 78 && ks === 0
            ? 2
            : 1;
      setHit('kick', barStart + ks, hit);
    }

    // 5. Optional Cowbell (Latin/Rock)
    if (config.cowbell) {
      for (let s = 0; s < stepsPerBar; s += perBeat) {
        setHit('cowbell', barStart + s, s === 0 ? 2 : 1);
        if (comp > 0.5 && s + Math.floor(perBeat / 2) < stepsPerBar) {
          if (hash(seed, s, 63) < 0.55) {
            setHit('cowbell', barStart + s + Math.floor(perBeat / 2), 1);
          }
        }
      }
    }

    // 6. End-of-Phrase Fills on the final beat of the last bar!
    if (isLastBar && config.fills > 15) {
      const fillThreshold = config.fills / 100;
      const fillTrigger = hash(seed, bar, 91);
      if (fillTrigger <= fillThreshold + 0.2) {
        const fillLength =
          config.fills >= 75
            ? Math.min(stepsPerBar, perBeat * 2)
            : perBeat;
        const fillStart = stepsPerBar - fillLength;

        // Clear hi-hat/ride during fill so the fill breathes naturally
        for (let s = fillStart; s < stepsPerBar; s++) {
          const abs = barStart + s;
          steps.hihatClosed[abs] = 0;
          steps.hihatOpen[abs] = 0;
          steps.ride[abs] = 0;
          steps.rideBell[abs] = 0;
          steps.snare[abs] = 0;
        }

        // Descending tom + snare fill
        const fillCycle: InstrumentId[] = ['snare', 'tomHigh', 'tomMid', 'tomFloor'];
        for (let i = 0; i < fillLength; i++) {
          const abs = barStart + fillStart + i;
          // Leave occasional breathing space if fills < 55
          if (config.fills < 55 && i % 2 === 1 && hash(seed, i, 99) < 0.4) continue;
          const phase = Math.floor((i / fillLength) * fillCycle.length);
          const inst = fillCycle[Math.min(fillCycle.length - 1, phase)];
          const hit: HitType = i === fillLength - 1 || i === 0 ? 2 : 1;
          setHit(inst, abs, hit);
        }
      }
    }
  }

  return steps;
}

export function buildSmartGrooveDocument(
  base: GrooveDocument,
  config: SmartDrummerConfig
): GrooveDocument {
  const persona = DRUMMER_PERSONAS.find((p) => p.id === config.genre) ?? DRUMMER_PERSONAS[0];
  const steps = generateSmartDrummerSteps(
    config,
    base.timeSignature,
    base.subdivision,
    base.bars
  );

  return {
    ...base,
    title: `${persona.name} — ${persona.roleLabel}`,
    composer: `Smart Drummer (${persona.name})`,
    style: persona.roleLabel,
    swing: config.swing,
    steps,
    updatedAt: Date.now(),
  };
}
