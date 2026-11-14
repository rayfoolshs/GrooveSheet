import { GM_NOTE_TO_INSTRUMENT, INSTRUMENT_BY_ID } from '../data/instruments';
import { GrooveDocument, HitType, InstrumentId, StepGrid } from '../types/groove';
import {
  createEmptyGrid,
  getStepsPerBar,
  getVelocityForHit,
  TIME_SIGNATURES,
} from '../utils/grooveHelpers';

function writeVarLen(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes: number[] = [];
  let v = value;
  while ((v >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (v & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function uint32BE(val: number): number[] {
  return [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
}

function uint16BE(val: number): number[] {
  return [(val >>> 8) & 0xff, val & 0xff];
}

interface RawMidiEvent {
  tick: number;
  order: number;
  bytes: number[];
}

/**
 * Generates a spec-compliant Standard MIDI File (SMF Format 0) on General MIDI Channel 10.
 */
export function buildMidiFileBytes(groove: GrooveDocument, repeatCount = 1): Uint8Array {
  const PPQN = 480;
  const spec = TIME_SIGNATURES[groove.timeSignature];
  const stepsPerBar = getStepsPerBar(groove.timeSignature, groove.subdivision);
  const totalPatternSteps = stepsPerBar * groove.bars;

  // Determine ticks per step
  let ticksPerStep: number;
  if (spec.isCompound) {
    // 1 eighth note = PPQN / 2 = 240 ticks
    ticksPerStep = groove.subdivision === '16th' ? PPQN / 4 : PPQN / 2;
  } else {
    const perBeat = groove.subdivision === '16th' ? 4 : groove.subdivision === '8th' ? 2 : 3;
    ticksPerStep = Math.round(PPQN / perBeat);
  }

  const events: RawMidiEvent[] = [];

  // Track Name Meta Event (FF 03)
  const nameBytes = Array.from(new TextEncoder().encode(groove.title || 'Drum Groove'));
  events.push({
    tick: 0,
    order: 0,
    bytes: [0xff, 0x03, ...writeVarLen(nameBytes.length), ...nameBytes],
  });

  // Set Tempo Meta Event (FF 51 03 tt tt tt) -> microseconds per quarter note
  const mpqn = Math.round(60_000_000 / Math.max(30, groove.bpm));
  events.push({
    tick: 0,
    order: 1,
    bytes: [0xff, 0x51, 0x03, (mpqn >>> 16) & 0xff, (mpqn >>> 8) & 0xff, mpqn & 0xff],
  });

  // Time Signature Meta Event (FF 58 04 nn dd cc bb)
  const denomPow = Math.round(Math.log2(spec.denominator));
  const clocksPerMetronome = spec.isCompound ? 36 : 24;
  events.push({
    tick: 0,
    order: 2,
    bytes: [0xff, 0x58, 0x04, spec.numerator, denomPow, clocksPerMetronome, 8],
  });

  const noteLenTicks = Math.max(24, Math.round(ticksPerStep * 0.65));

  for (let rep = 0; rep < repeatCount; rep++) {
    const repOffsetTicks = rep * totalPatternSteps * ticksPerStep;

    for (let step = 0; step < totalStepsOrLen(totalPatternSteps); step++) {
      const stepInBar = step % stepsPerBar;
      const clampedSwing = Math.max(-66, Math.min(66, groove.swing || 0));
      let swingTicks = 0;
      if (clampedSwing !== 0) {
        if (groove.subdivision === 'triplet') {
          const beatSub = stepInBar % 3;
          if (beatSub === 2) {
            swingTicks = Math.round((clampedSwing / 66) * ticksPerStep * 0.55);
          } else if (beatSub === 1) {
            swingTicks = Math.round((clampedSwing / 66) * ticksPerStep * 0.28);
          }
        } else if (stepInBar % 2 === 1) {
          swingTicks = Math.round((clampedSwing / 66) * ticksPerStep * 0.6);
        }
      }

      const baseTick = Math.max(0, repOffsetTicks + step * ticksPerStep + swingTicks);

      for (const [instId, row] of Object.entries(groove.steps)) {
        const hit = (row[step] ?? 0) as HitType;
        if (hit === 0) continue;

        const gmNote = INSTRUMENT_BY_ID[instId as InstrumentId]?.gmNote;
        if (!gmNote) continue;

        const vel = getVelocityForHit(hit);

        if (hit === 4) {
          // Flam grace note 20 ticks prior
          const graceTick = Math.max(0, baseTick - 20);
          events.push({
            tick: graceTick,
            order: 10,
            bytes: [0x99, gmNote, Math.max(24, Math.round(vel * 0.45))],
          });
          events.push({
            tick: graceTick + 30,
            order: 5,
            bytes: [0x89, gmNote, 0],
          });
        }

        events.push({
          tick: baseTick,
          order: 10,
          bytes: [0x99, gmNote, vel],
        });
        events.push({
          tick: baseTick + noteLenTicks,
          order: 5,
          bytes: [0x89, gmNote, 0],
        });
      }
    }
  }

  // Sort by tick, then Note Off before Note On at equal tick
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);

  const trackBytes: number[] = [];
  let prevTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - prevTick);
    prevTick = ev.tick;
    trackBytes.push(...writeVarLen(delta), ...ev.bytes);
  }

  // End of Track Meta Event (FF 2F 00)
  trackBytes.push(0x00, 0xff, 0x2f, 0x00);

  // Header Chunk: MThd, length 6, format 0, 1 track, PPQN
  const header = [
    0x4d, 0x54, 0x68, 0x64,
    ...uint32BE(6),
    ...uint16BE(0),
    ...uint16BE(1),
    ...uint16BE(PPQN),
  ];

  // Track Chunk: MTrk, length, data
  const trackChunk = [
    0x4d, 0x54, 0x72, 0x6b,
    ...uint32BE(trackBytes.length),
    ...trackBytes,
  ];

  return new Uint8Array([...header, ...trackChunk]);
}

function totalStepsOrLen(n: number): number {
  return n;
}

export function downloadMidiFile(groove: GrooveDocument, repeatCount = 2): void {
  const bytes = buildMidiFileBytes(groove, repeatCount);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (groove.title || 'drum-groove')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  a.href = url;
  a.download = `${safeName || 'drum-groove'}.mid`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Lightweight Standard MIDI File (.mid) importer for Channel 10 / GM Drum tracks.
 */
export function parseMidiFileToGroove(buffer: ArrayBuffer, fileName: string): GrooveDocument {
  const data = new Uint8Array(buffer);
  let pos = 0;

  const readUint32 = () => {
    const v = ((data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]) >>> 0;
    pos += 4;
    return v;
  };
  const readUint16 = () => {
    const v = (data[pos] << 8) | data[pos + 1];
    pos += 2;
    return v;
  };
  const readVarLen = () => {
    let val = 0;
    while (pos < data.length) {
      const b = data[pos++];
      val = (val << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return val;
  };

  // Validate MThd
  if (data[0] !== 0x4d || data[1] !== 0x54 || data[2] !== 0x68 || data[3] !== 0x64) {
    throw new Error('Not a valid Standard MIDI (.mid) file.');
  }
  pos = 4;
  const headerLen = readUint32();
  readUint16(); // format
  const numTracks = readUint16();
  const division = readUint16();
  pos = 8 + headerLen;

  const ppqn = division & 0x7fff || 480;
  let bpm = 110;
  let numerator = 4;
  let denominator = 4;
  const notes: { tick: number; note: number; velocity: number }[] = [];

  for (let t = 0; t < numTracks && pos < data.length - 8; t++) {
    const chunkId = String.fromCharCode(data[pos], data[pos + 1], data[pos + 2], data[pos + 3]);
    pos += 4;
    const chunkLen = readUint32();
    const trackEnd = Math.min(data.length, pos + chunkLen);

    if (chunkId !== 'MTrk') {
      pos = trackEnd;
      continue;
    }

    let absTick = 0;
    let runningStatus = 0;

    while (pos < trackEnd) {
      const delta = readVarLen();
      absTick += delta;
      if (pos >= trackEnd) break;

      let status = data[pos];
      if (status < 0x80) {
        status = runningStatus;
      } else {
        pos++;
        if (status < 0xf0) runningStatus = status;
      }

      if (status === 0xff) {
        const metaType = data[pos++];
        const len = readVarLen();
        if (metaType === 0x51 && len === 3 && pos + 2 < trackEnd) {
          const mpqn = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2];
          if (mpqn > 0) bpm = Math.max(40, Math.min(240, Math.round(60_000_000 / mpqn)));
        } else if (metaType === 0x58 && len >= 2 && pos + 1 < trackEnd) {
          numerator = data[pos];
          denominator = Math.pow(2, data[pos + 1]);
        }
        pos += len;
      } else if (status === 0xf0 || status === 0xf7) {
        const len = readVarLen();
        pos += len;
      } else {
        const eventType = status & 0xf0;
        const p1 = data[pos++];
        const p2 = eventType !== 0xc0 && eventType !== 0xd0 ? data[pos++] : 0;
        if (eventType === 0x90 && p2 > 0) {
          notes.push({ tick: absTick, note: p1, velocity: p2 });
        }
      }
    }

    pos = trackEnd;
  }

  // Match closest supported time signature
  const sigKey = `${numerator}/${denominator}`;
  const timeSignature = (sigKey in TIME_SIGNATURES ? sigKey : '4/4') as GrooveDocument['timeSignature'];
  const subdivision = '16th';
  const stepsPerBar = getStepsPerBar(timeSignature, subdivision);
  const spec = TIME_SIGNATURES[timeSignature];
  const ticksPerStep = spec.isCompound ? ppqn / 4 : ppqn / 4;

  const maxTick = notes.reduce((m, n) => Math.max(m, n.tick), 0);
  const estBars = Math.max(1, Math.ceil((maxTick + 1) / (stepsPerBar * ticksPerStep)));
  const bars: 1 | 2 | 4 = estBars > 2 ? 4 : estBars > 1 ? 2 : 1;
  const totalSteps = stepsPerBar * bars;
  const steps: StepGrid = createEmptyGrid(totalSteps);

  for (const n of notes) {
    const instId = GM_NOTE_TO_INSTRUMENT[n.note];
    if (!instId) continue;
    const stepIdx = Math.round(n.tick / ticksPerStep);
    if (stepIdx < 0 || stepIdx >= totalSteps) continue;

    let hit: HitType = 1;
    if (n.velocity >= 115) hit = 2;
    else if (n.velocity <= 52) hit = 3;
    steps[instId][stepIdx] = hit;
  }

  const cleanTitle = fileName.replace(/\.mid$/i, '').replace(/[-_]+/g, ' ').trim() || 'Imported MIDI Groove';

  return {
    id: `imported-${Date.now()}`,
    title: cleanTitle,
    composer: 'Imported MIDI',
    style: 'Imported',
    bpm,
    timeSignature,
    subdivision,
    bars,
    swing: 0,
    steps,
    updatedAt: Date.now(),
  };
}
