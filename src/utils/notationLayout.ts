import { DRUM_INSTRUMENTS } from '../data/instruments';
import { HitType, InstrumentId, StepGrid, SubdivisionId, TimeSignatureId } from '../types/groove';
import { getBeatGroupSizesInSteps, getStepsPerBar, TIME_SIGNATURES } from '../utils/grooveHelpers';

export interface StaffNoteEntry {
  instrumentId: InstrumentId;
  staffStep: number;
  notehead: 'oval' | 'x' | 'x-circle' | 'diamond' | 'triangle';
  hit: HitType;
  openArticulation?: boolean;
  xShift: number; // horizontal collision shift when adjacent steps share voice
}

export type RhythmicDuration = 'quarter' | 'dotted-quarter' | 'eighth' | 'dotted-eighth' | 'sixteenth';

export interface StaffSymbol {
  kind: 'note' | 'rest';
  voice: 'hands' | 'feet';
  stepIndex: number; // absolute step index inside the entire groove
  stepInBar: number;
  spanSteps: number; // how many grid steps this note/rest spans
  duration: RhythmicDuration;
  beamCount: number; // 0 = quarter, 1 = eighth, 2 = sixteenth
  entries: StaffNoteEntry[]; // empty for rest
  beamGroupId: number | null; // shared beat group ID for beaming
  isTriplet?: boolean;
}

export interface StaffBeatGroup {
  beatIndex: number;
  startStep: number;
  lengthSteps: number;
  isTriplet: boolean;
  handsSymbols: StaffSymbol[];
  feetSymbols: StaffSymbol[];
}

export interface StaffBarLayout {
  barIndex: number;
  startStep: number;
  stepsInBar: number;
  beats: StaffBeatGroup[];
  hasFeetHits: boolean;
}

/**
 * Maps a span of grid steps inside a beat to standard notation duration & beam count.
 */
function spanToDuration(spanSteps: number, subdivision: SubdivisionId, isCompound: boolean): {
  duration: RhythmicDuration;
  beamCount: number;
} {
  if (isCompound) {
    if (subdivision === '16th') {
      if (spanSteps >= 6) return { duration: 'dotted-quarter', beamCount: 0 };
      if (spanSteps >= 4) return { duration: 'quarter', beamCount: 0 };
      if (spanSteps === 3) return { duration: 'dotted-eighth', beamCount: 1 };
      if (spanSteps === 2) return { duration: 'eighth', beamCount: 1 };
      return { duration: 'sixteenth', beamCount: 2 };
    }
    // Compound 8th-note grid: 1 step = eighth, 2 = quarter, 3 = dotted-quarter
    if (spanSteps >= 3) return { duration: 'dotted-quarter', beamCount: 0 };
    if (spanSteps === 2) return { duration: 'quarter', beamCount: 0 };
    return { duration: 'eighth', beamCount: 1 };
  }

  if (subdivision === '16th') {
    if (spanSteps >= 4) return { duration: 'quarter', beamCount: 0 };
    if (spanSteps === 3) return { duration: 'dotted-eighth', beamCount: 1 };
    if (spanSteps === 2) return { duration: 'eighth', beamCount: 1 };
    return { duration: 'sixteenth', beamCount: 2 };
  }

  if (subdivision === '8th') {
    if (spanSteps >= 2) return { duration: 'quarter', beamCount: 0 };
    return { duration: 'eighth', beamCount: 1 };
  }

  // Triplet (3 eighth-note triplets per quarter beat)
  if (spanSteps >= 3) return { duration: 'quarter', beamCount: 0 };
  if (spanSteps === 2) return { duration: 'quarter', beamCount: 0 };
  return { duration: 'eighth', beamCount: 1 };
}

/**
 * Extracts active note entries for a given voice ('hands' | 'feet') at an absolute step.
 */
function getEntriesAtStep(steps: StepGrid, stepIndex: number, voice: 'hands' | 'feet'): StaffNoteEntry[] {
  const entries: StaffNoteEntry[] = [];
  for (const inst of DRUM_INSTRUMENTS) {
    if (inst.voice !== voice) continue;
    const hit = (steps[inst.id]?.[stepIndex] ?? 0) as HitType;
    if (hit > 0) {
      entries.push({
        instrumentId: inst.id,
        staffStep: inst.staffStep,
        notehead: inst.notehead,
        hit,
        openArticulation: inst.openArticulation,
        xShift: 0,
      });
    }
  }
  // Sort bottom-to-top by staffStep
  entries.sort((a, b) => a.staffStep - b.staffStep);
  // Offset adjacent seconds (staffStep diff <= 1) slightly so noteheads don't collide
  for (let i = 1; i < entries.length; i++) {
    if (Math.abs(entries[i].staffStep - entries[i - 1].staffStep) <= 1 && entries[i - 1].xShift === 0) {
      entries[i].xShift = 7;
    }
  }
  return entries;
}

/**
 * Collapses a beat's active hits into clean rhythmic symbols (notes + simplified rests).
 */
function buildVoiceBeatSymbols(
  steps: StepGrid,
  voice: 'hands' | 'feet',
  barStartStep: number,
  beatStartInBar: number,
  beatLen: number,
  subdivision: SubdivisionId,
  isCompound: boolean,
  beamGroupId: number,
  isTriplet: boolean,
  suppressEmptyBeatRest: boolean
): StaffSymbol[] {
  const hitsPerSlot: StaffNoteEntry[][] = [];
  let anyHitInBeat = false;
  for (let i = 0; i < beatLen; i++) {
    const absStep = barStartStep + beatStartInBar + i;
    const entries = getEntriesAtStep(steps, absStep, voice);
    if (entries.length > 0) anyHitInBeat = true;
    hitsPerSlot.push(entries);
  }

  if (!anyHitInBeat) {
    if (suppressEmptyBeatRest) return [];
    const { duration, beamCount } = spanToDuration(beatLen, subdivision, isCompound);
    return [
      {
        kind: 'rest',
        voice,
        stepIndex: barStartStep + beatStartInBar,
        stepInBar: beatStartInBar,
        spanSteps: beatLen,
        duration,
        beamCount,
        entries: [],
        beamGroupId: null,
        isTriplet,
      },
    ];
  }

  const symbols: StaffSymbol[] = [];
  let i = 0;
  while (i < beatLen) {
    const currentEntries = hitsPerSlot[i];
    if (currentEntries.length > 0) {
      // Measure how many consecutive silent slots follow this hit inside the beat
      let span = 1;
      while (i + span < beatLen && hitsPerSlot[i + span].length === 0) {
        // Keep clean binary rhythmic boundaries inside 4-slot beats (don't merge slot 1 across slot 2 if slot 0 wasn't start, e.g. syncopation!)
        if (beatLen === 4 && i === 1 && span === 1) break;
        if (beatLen === 4 && i === 0 && span === 3) {
          // Wait: hit on 0, silent on 1,2,3 -> whole beat quarter note (span 4)!
          span++;
          continue;
        }
        // In 6-slot compound beat (6/8 16ths), allow 2 (eighth) or 4 (quarter) or 6 (dotted-quarter)
        if (beatLen === 6 && i % 2 === 1 && span === 1) break;
        span++;
      }

      // Snap awkward 3-slot spans in 16th-note 4/4 if on beat start? Dotted-eighth (3) is valid!
      // Snap 2-slot span in 3-slot triplet? Keep 1-step triplet slots crisp unless entire beat is a single hit!
      if (isTriplet && i === 0 && span === 2) {
        // Quarter + eighth triplet or eighth + rest + eighth: keep span=1 + rest(1) for crystal-clear triplet reading!
        span = 1;
      }

      const { duration, beamCount } = spanToDuration(span, subdivision, isCompound);
      symbols.push({
        kind: 'note',
        voice,
        stepIndex: barStartStep + beatStartInBar + i,
        stepInBar: beatStartInBar + i,
        spanSteps: span,
        duration,
        beamCount,
        entries: currentEntries,
        beamGroupId: beamCount > 0 ? beamGroupId : null,
        isTriplet,
      });
      i += span;
    } else {
      // Leading or middle rest
      let restSpan = 1;
      while (i + restSpan < beatLen && hitsPerSlot[i + restSpan].length === 0) {
        // Collapse pairs on even subdivisions (0+1 -> eighth rest)
        if (beatLen === 4 && i === 0 && restSpan === 1 && hitsPerSlot[2].length > 0) {
          restSpan = 2;
          break;
        }
        if (beatLen === 4 && i === 1) break;
        restSpan++;
      }
      const { duration, beamCount } = spanToDuration(restSpan, subdivision, isCompound);
      symbols.push({
        kind: 'rest',
        voice,
        stepIndex: barStartStep + beatStartInBar + i,
        stepInBar: beatStartInBar + i,
        spanSteps: restSpan,
        duration,
        beamCount,
        entries: [],
        beamGroupId: null,
        isTriplet,
      });
      i += restSpan;
    }
  }

  return symbols;
}

export function computeStaffLayout(
  steps: StepGrid,
  timeSignature: TimeSignatureId,
  subdivision: SubdivisionId,
  bars: 1 | 2 | 4
): StaffBarLayout[] {
  const spec = TIME_SIGNATURES[timeSignature];
  const stepsPerBar = getStepsPerBar(timeSignature, subdivision);
  const beatSizes = getBeatGroupSizesInSteps(timeSignature, subdivision);
  const isTriplet = !spec.isCompound && subdivision === 'triplet';

  const result: StaffBarLayout[] = [];
  let globalBeamId = 1;

  for (let barIndex = 0; barIndex < bars; barIndex++) {
    const barStartStep = barIndex * stepsPerBar;

    // Check if Voice 2 (feet) has any hits in this bar
    let hasFeetHits = false;
    for (let s = 0; s < stepsPerBar; s++) {
      if (getEntriesAtStep(steps, barStartStep + s, 'feet').length > 0) {
        hasFeetHits = true;
        break;
      }
    }

    const beats: StaffBeatGroup[] = [];
    let cursorInBar = 0;

    beatSizes.forEach((beatLen, beatIndex) => {
      const handsSymbols = buildVoiceBeatSymbols(
        steps,
        'hands',
        barStartStep,
        cursorInBar,
        beatLen,
        subdivision,
        spec.isCompound,
        globalBeamId++,
        isTriplet,
        false
      );
      const feetSymbols = buildVoiceBeatSymbols(
        steps,
        'feet',
        barStartStep,
        cursorInBar,
        beatLen,
        subdivision,
        spec.isCompound,
        globalBeamId++,
        isTriplet,
        !hasFeetHits // Only suppress empty foot rests when the whole bar has zero foot activity
      );

      beats.push({
        beatIndex,
        startStep: barStartStep + cursorInBar,
        lengthSteps: beatLen,
        isTriplet,
        handsSymbols,
        feetSymbols,
      });

      cursorInBar += beatLen;
    });

    result.push({
      barIndex,
      startStep: barStartStep,
      stepsInBar: stepsPerBar,
      beats,
      hasFeetHits,
    });
  }

  return result;
}
