import { DRUM_INSTRUMENTS } from '../data/instruments';
import {
  GrooveDocument,
  HitType,
  InstrumentId,
  StepGrid,
  SubdivisionId,
  TimeSignatureId,
  TimeSignatureSpec,
} from '../types/groove';

export const TIME_SIGNATURES: Record<TimeSignatureId, TimeSignatureSpec> = {
  '4/4': { id: '4/4', numerator: 4, denominator: 4, isCompound: false, beatGroups: [1, 1, 1, 1] },
  '3/4': { id: '3/4', numerator: 3, denominator: 4, isCompound: false, beatGroups: [1, 1, 1] },
  '5/4': { id: '5/4', numerator: 5, denominator: 4, isCompound: false, beatGroups: [1, 1, 1, 1, 1] },
  '6/8': { id: '6/8', numerator: 6, denominator: 8, isCompound: true, beatGroups: [3, 3] },
  '7/8': { id: '7/8', numerator: 7, denominator: 8, isCompound: true, beatGroups: [2, 2, 3] },
  '12/8': { id: '12/8', numerator: 12, denominator: 8, isCompound: true, beatGroups: [3, 3, 3, 3] },
};

/**
 * Returns how many sequencer steps make up 1 bar for a given time signature + subdivision.
 */
export function getStepsPerBar(timeSignature: TimeSignatureId, subdivision: SubdivisionId): number {
  const spec = TIME_SIGNATURES[timeSignature];
  if (spec.isCompound) {
    // In /8 compound or asymmetric meters:
    // '8th' -> 1 step per eighth note (6, 7, 12)
    // '16th' -> 2 steps per eighth note (12, 14, 24)
    // 'triplet' -> falls back to eighth-note pulse (6, 7, 12) since compound already groups in 3s
    return subdivision === '16th' ? spec.numerator * 2 : spec.numerator;
  }
  // In /4 simple meters:
  const perBeat = subdivision === '16th' ? 4 : subdivision === '8th' ? 2 : 3;
  return spec.numerator * perBeat;
}

/**
 * Returns the visual beat boundaries (in steps) within a single bar for grid shading and staff beaming.
 */
export function getBeatGroupSizesInSteps(
  timeSignature: TimeSignatureId,
  subdivision: SubdivisionId
): number[] {
  const spec = TIME_SIGNATURES[timeSignature];
  if (spec.isCompound) {
    const mult = subdivision === '16th' ? 2 : 1;
    return spec.beatGroups.map((g) => g * mult);
  }
  const perBeat = subdivision === '16th' ? 4 : subdivision === '8th' ? 2 : 3;
  return spec.beatGroups.map(() => perBeat);
}

/**
 * Returns human counting syllables ("1", "e", "&", "a", etc.) for each step inside one bar.
 */
export function getBarCountLabels(
  timeSignature: TimeSignatureId,
  subdivision: SubdivisionId
): string[] {
  const spec = TIME_SIGNATURES[timeSignature];
  const labels: string[] = [];

  if (spec.isCompound) {
    // Compound /8 meters
    if (subdivision === '16th') {
      for (let i = 1; i <= spec.numerator; i++) {
        labels.push(String(i), '&');
      }
    } else {
      for (let i = 1; i <= spec.numerator; i++) {
        labels.push(String(i));
      }
    }
    return labels;
  }

  // Simple /4 meters
  for (let beat = 1; beat <= spec.numerator; beat++) {
    if (subdivision === '16th') {
      labels.push(String(beat), 'e', '&', 'a');
    } else if (subdivision === '8th') {
      labels.push(String(beat), '&');
    } else {
      labels.push(String(beat), 'trip', 'let');
    }
  }
  return labels;
}

/**
 * Returns step duration in seconds and signed off-beat timing shift (in seconds)
 * for all instruments at stepInBar:
 * - swingPercent < 0 nudges off-beat notes forward (earlier)
 * - swingPercent === 0 gives straight quantized timing
 * - swingPercent > 0 nudges off-beat notes backward (later) for swing/shuffle feel
 */
export function getStepTimingOffsetSeconds(
  stepInBar: number,
  bpm: number,
  timeSignature: TimeSignatureId,
  subdivision: SubdivisionId,
  swingPercent: number
): { stepDurationSec: number; swingDelaySec: number } {
  const spec = TIME_SIGNATURES[timeSignature];
  const quarterSec = 60 / bpm;

  let stepDurationSec: number;
  if (spec.isCompound) {
    stepDurationSec = subdivision === '16th' ? quarterSec / 4 : quarterSec / 2;
  } else {
    const perBeat = subdivision === '16th' ? 4 : subdivision === '8th' ? 2 : 3;
    stepDurationSec = quarterSec / perBeat;
  }

  const clampedSwing = Math.max(-66, Math.min(66, swingPercent || 0));
  let swingDelaySec = 0;

  if (clampedSwing !== 0) {
    if (subdivision === 'triplet') {
      // In triplet beats (0 = downbeat, 1 = trip, 2 = let), keep downbeats locked
      // and nudge off-beat subdivisions forward (< 0) or backward (> 0).
      const beatSub = stepInBar % 3;
      if (beatSub === 2) {
        swingDelaySec = (clampedSwing / 66) * (stepDurationSec * 0.55);
      } else if (beatSub === 1) {
        swingDelaySec = (clampedSwing / 66) * (stepDurationSec * 0.28);
      }
    } else if (stepInBar % 2 === 1) {
      // Odd-indexed subdivisions ('e'/'a' in 16ths, '&' in 8ths):
      // -66% -> -0.60 * step, 0% -> straight, +50% -> ~triplet swing, +66% -> +0.60 * step shuffle
      const maxShift = stepDurationSec * 0.6;
      swingDelaySec = (clampedSwing / 66) * maxShift;
    }
  }

  return { stepDurationSec, swingDelaySec };
}

export function getSwingTimingSummary(
  swingPercent: number,
  bpm: number,
  timeSignature: TimeSignatureId,
  subdivision: SubdivisionId
): { clampedSwing: number; label: string; shiftMs: number } {
  const clampedSwing = Math.round(Math.max(-66, Math.min(66, swingPercent || 0)));
  const offBeatStep = subdivision === 'triplet' ? 2 : 1;
  const { swingDelaySec } = getStepTimingOffsetSeconds(
    offBeatStep,
    bpm,
    timeSignature,
    subdivision,
    clampedSwing
  );
  const shiftMs = Math.round(swingDelaySec * 1000);

  let label = 'Straight';
  if (clampedSwing <= -45) label = 'Hard Push';
  else if (clampedSwing < 0) label = 'Forward';
  else if (clampedSwing >= 56) label = 'Shuffle';
  else if (clampedSwing >= 22) label = 'Swing';
  else if (clampedSwing > 0) label = 'Pocket';

  return { clampedSwing, label, shiftMs };
}

export function createEmptyGrid(totalSteps: number): StepGrid {
  const grid = {} as StepGrid;
  for (const inst of DRUM_INSTRUMENTS) {
    grid[inst.id] = new Array<HitType>(totalSteps).fill(0);
  }
  return grid;
}

export function cloneGrid(steps: StepGrid): StepGrid {
  const next = {} as StepGrid;
  for (const inst of DRUM_INSTRUMENTS) {
    next[inst.id] = [...(steps[inst.id] || [])];
  }
  return next;
}

/**
 * Resizes a StepGrid cleanly when bars, timeSignature, or subdivision changes.
 * Preserves existing beats proportionally when subdivision doubles/halves, or preserves bar positions.
 */
export function resizeStepGrid(
  prevSteps: StepGrid,
  prevTimeSig: TimeSignatureId,
  prevSub: SubdivisionId,
  prevBars: 1 | 2 | 4,
  nextTimeSig: TimeSignatureId,
  nextSub: SubdivisionId,
  nextBars: 1 | 2 | 4
): StepGrid {
  const prevStepsPerBar = getStepsPerBar(prevTimeSig, prevSub);
  const nextStepsPerBar = getStepsPerBar(nextTimeSig, nextSub);
  const nextTotal = nextStepsPerBar * nextBars;
  const result = createEmptyGrid(nextTotal);

  for (const inst of DRUM_INSTRUMENTS) {
    const oldArr = prevSteps[inst.id] || [];
    const newArr = result[inst.id];

    // If changing bars only (same timeSig and sub)
    if (prevTimeSig === nextTimeSig && prevSub === nextSub) {
      if (nextBars > prevBars && oldArr.length === prevStepsPerBar * prevBars) {
        // Repeat existing bars when expanding (musician-friendly bar duplication!)
        for (let i = 0; i < nextTotal; i++) {
          newArr[i] = oldArr[i % oldArr.length] ?? 0;
        }
      } else {
        for (let i = 0; i < Math.min(oldArr.length, nextTotal); i++) {
          newArr[i] = oldArr[i] ?? 0;
        }
      }
      continue;
    }

    // Proportional remap per bar when changing subdivision or time signature
    const barsToCopy = Math.min(prevBars, nextBars);
    for (let b = 0; b < barsToCopy; b++) {
      for (let s = 0; s < prevStepsPerBar; s++) {
        const val = oldArr[b * prevStepsPerBar + s] ?? 0;
        if (val === 0) continue;
        if (prevTimeSig === nextTimeSig) {
          // Map beat-fraction cleanly (e.g. 8th <-> 16th)
          const ratio = nextStepsPerBar / prevStepsPerBar;
          const targetIdx = Math.round(s * ratio);
          if (targetIdx < nextStepsPerBar) {
            newArr[b * nextStepsPerBar + targetIdx] = val;
          }
        } else if (s < nextStepsPerBar) {
          newArr[b * nextStepsPerBar + s] = val;
        }
      }
    }
    // Fill extra bars if bars also grew
    if (nextBars > barsToCopy) {
      const filledLen = barsToCopy * nextStepsPerBar;
      for (let i = filledLen; i < nextTotal; i++) {
        newArr[i] = newArr[i % filledLen] ?? 0;
      }
    }
  }

  return result;
}

export function cycleHitType(current: HitType): HitType {
  // Off -> Normal -> Accent -> Ghost -> Flam -> Off
  return ((current + 1) % 5) as HitType;
}

export function getVelocityForHit(hit: HitType): number {
  switch (hit) {
    case 2:
      return 127; // Accent
    case 1:
      return 100; // Normal
    case 4:
      return 112; // Flam primary stroke
    case 3:
      return 38; // Ghost note
    default:
      return 0;
  }
}

export function createBlankGroove(
  overrides?: Partial<Omit<GrooveDocument, 'steps'>>
): GrooveDocument {
  const timeSignature = overrides?.timeSignature ?? '4/4';
  const subdivision = overrides?.subdivision ?? '16th';
  const bars = overrides?.bars ?? 1;
  const totalSteps = getStepsPerBar(timeSignature, subdivision) * bars;

  return {
    id: overrides?.id ?? `groove-${Date.now()}`,
    title: overrides?.title ?? 'Untitled Groove',
    composer: overrides?.composer ?? 'Session Musician',
    style: overrides?.style ?? 'Custom',
    notes: overrides?.notes ?? '',
    bpm: overrides?.bpm ?? 100,
    timeSignature,
    subdivision,
    bars,
    swing: overrides?.swing ?? 0,
    steps: createEmptyGrid(totalSteps),
    updatedAt: Date.now(),
  };
}

export function hasAnyHits(steps: StepGrid): boolean {
  return Object.values(steps).some((row) => row.some((v) => v > 0));
}

export function sanitizeId(value: string): InstrumentId | null {
  const valid = DRUM_INSTRUMENTS.some((i) => i.id === value);
  return valid ? (value as InstrumentId) : null;
}
