/**
 * Native browser SoundFont 2 (.sf2) RIFF parser and Web Audio Bank 128 (GM Percussion) extractor.
 * Supports loading any standard .sf2 file (FluidR3_GM, GeneralUser GS, MuseScore, custom kits)
 * without external dependencies.
 */

export interface Sf2DrumZone {
  note: number;
  buffer: AudioBuffer;
  playbackRate: number;
  exclusiveClass: number;
  pan: number; // -1 to 1
  gainScale: number;
  releaseSec: number;
}

export interface Sf2KitPreset {
  presetName: string;
  bank: number;
  program: number;
  zones: Map<number, Sf2DrumZone>;
}

interface RawPreset {
  name: string;
  program: number;
  bank: number;
  bagIndex: number;
}

interface RawBag {
  genIndex: number;
}

interface RawGen {
  oper: number;
  amount: number; // signed 16-bit or packed two bytes
  uAmount: number;
}

interface RawInst {
  name: string;
  bagIndex: number;
}

interface RawSampleHeader {
  name: string;
  start: number;
  end: number;
  sampleRate: number;
  originalPitch: number;
  pitchCorrection: number;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    const ch = bytes[offset + i];
    if (ch === 0) break;
    out += String.fromCharCode(ch);
  }
  return out.trim();
}

export function parseSf2PercussionKits(
  arrayBuffer: ArrayBuffer,
  audioCtx: AudioContext
): Sf2KitPreset[] {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);

  if (arrayBuffer.byteLength < 12) {
    throw new Error('File is too small to be a valid .sf2 SoundFont.');
  }

  const riffId = readAscii(bytes, 0, 4);
  const sfbkId = readAscii(bytes, 8, 4);
  if (riffId !== 'RIFF' || sfbkId !== 'sfbk') {
    throw new Error('Invalid SoundFont2 file: missing RIFF/sfbk header.');
  }

  let smplOffset = 0;
  let smplLength = 0;
  const subchunks = new Map<string, { offset: number; size: number }>();

  let pos = 12;
  while (pos + 8 <= arrayBuffer.byteLength) {
    const id = readAscii(bytes, pos, 4);
    const size = view.getUint32(pos + 4, true);
    const dataStart = pos + 8;

    if (id === 'LIST' && dataStart + 4 <= arrayBuffer.byteLength) {
      const listType = readAscii(bytes, dataStart, 4);
      let innerPos = dataStart + 4;
      const listEnd = Math.min(arrayBuffer.byteLength, dataStart + size);
      while (innerPos + 8 <= listEnd) {
        const subId = readAscii(bytes, innerPos, 4);
        const subSize = view.getUint32(innerPos + 4, true);
        const subStart = innerPos + 8;
        if (listType === 'sdta' && subId === 'smpl') {
          smplOffset = subStart;
          smplLength = subSize;
        } else if (listType === 'pdta') {
          subchunks.set(subId, { offset: subStart, size: subSize });
        }
        innerPos = subStart + subSize + (subSize % 2);
      }
    }

    pos = dataStart + size + (size % 2);
  }

  if (!smplLength || !subchunks.has('phdr') || !subchunks.has('shdr')) {
    throw new Error('SoundFont2 file is missing required sample or preset tables.');
  }

  // Parse phdr (38 bytes per record)
  const phdrChunk = subchunks.get('phdr')!;
  const phdrCount = Math.floor(phdrChunk.size / 38);
  const phdrs: RawPreset[] = [];
  for (let i = 0; i < phdrCount; i++) {
    const o = phdrChunk.offset + i * 38;
    phdrs.push({
      name: readAscii(bytes, o, 20),
      program: view.getUint16(o + 20, true),
      bank: view.getUint16(o + 22, true),
      bagIndex: view.getUint16(o + 24, true),
    });
  }

  // Parse pbag (4 bytes per record)
  const pbagChunk = subchunks.get('pbag')!;
  const pbagCount = Math.floor(pbagChunk.size / 4);
  const pbags: RawBag[] = [];
  for (let i = 0; i < pbagCount; i++) {
    const o = pbagChunk.offset + i * 4;
    pbags.push({ genIndex: view.getUint16(o, true) });
  }

  // Parse pgen (4 bytes per record)
  const pgenChunk = subchunks.get('pgen')!;
  const pgenCount = Math.floor(pgenChunk.size / 4);
  const pgens: RawGen[] = [];
  for (let i = 0; i < pgenCount; i++) {
    const o = pgenChunk.offset + i * 4;
    pgens.push({
      oper: view.getUint16(o, true),
      amount: view.getInt16(o + 2, true),
      uAmount: view.getUint16(o + 2, true),
    });
  }

  // Parse inst (22 bytes per record)
  const instChunk = subchunks.get('inst')!;
  const instCount = Math.floor(instChunk.size / 22);
  const insts: RawInst[] = [];
  for (let i = 0; i < instCount; i++) {
    const o = instChunk.offset + i * 22;
    insts.push({
      name: readAscii(bytes, o, 20),
      bagIndex: view.getUint16(o + 20, true),
    });
  }

  // Parse ibag (4 bytes per record)
  const ibagChunk = subchunks.get('ibag')!;
  const ibagCount = Math.floor(ibagChunk.size / 4);
  const ibags: RawBag[] = [];
  for (let i = 0; i < ibagCount; i++) {
    const o = ibagChunk.offset + i * 4;
    ibags.push({ genIndex: view.getUint16(o, true) });
  }

  // Parse igen (4 bytes per record)
  const igenChunk = subchunks.get('igen')!;
  const igenCount = Math.floor(igenChunk.size / 4);
  const igens: RawGen[] = [];
  for (let i = 0; i < igenCount; i++) {
    const o = igenChunk.offset + i * 4;
    igens.push({
      oper: view.getUint16(o, true),
      amount: view.getInt16(o + 2, true),
      uAmount: view.getUint16(o + 2, true),
    });
  }

  // Parse shdr (46 bytes per record)
  const shdrChunk = subchunks.get('shdr')!;
  const shdrCount = Math.floor(shdrChunk.size / 46);
  const shdrs: RawSampleHeader[] = [];
  for (let i = 0; i < shdrCount; i++) {
    const o = shdrChunk.offset + i * 46;
    shdrs.push({
      name: readAscii(bytes, o, 20),
      start: view.getUint32(o + 20, true),
      end: view.getUint32(o + 24, true),
      sampleRate: view.getUint32(o + 36, true),
      originalPitch: bytes[o + 40],
      pitchCorrection: view.getInt8(o + 41),
    });
  }

  // Decode sample slice to AudioBuffer cache
  const decodedBufferCache = new Map<number, AudioBuffer>();
  const getSampleBuffer = (sampleId: number): AudioBuffer | null => {
    if (decodedBufferCache.has(sampleId)) return decodedBufferCache.get(sampleId)!;
    const hdr = shdrs[sampleId];
    if (!hdr || hdr.end <= hdr.start || hdr.sampleRate < 4000) return null;

    const length = hdr.end - hdr.start;
    const byteOffset = smplOffset + hdr.start * 2;
    if (byteOffset + length * 2 > smplOffset + smplLength) return null;

    const buf = audioCtx.createBuffer(1, length, hdr.sampleRate);
    const channel = buf.getChannelData(0);
    for (let i = 0; i < length; i++) {
      channel[i] = view.getInt16(byteOffset + i * 2, true) / 32768;
    }
    decodedBufferCache.set(sampleId, buf);
    return buf;
  };

  // Extract Bank 128 percussion presets (excluding terminal EOP record)
  const kits: Sf2KitPreset[] = [];
  for (let pIdx = 0; pIdx < phdrs.length - 1; pIdx++) {
    const preset = phdrs[pIdx];
    if (preset.bank !== 128) continue;

    const zones = new Map<number, Sf2DrumZone>();
    const pBagStart = preset.bagIndex;
    const pBagEnd = phdrs[pIdx + 1]?.bagIndex ?? pbags.length - 1;

    for (let b = pBagStart; b < pBagEnd; b++) {
      const gStart = pbags[b]?.genIndex ?? 0;
      const gEnd = pbags[b + 1]?.genIndex ?? pgens.length;

      let instId: number | null = null;
      let presetCoarseTune = 0;
      let presetFineTune = 0;
      let presetAtten = 0;

      for (let g = gStart; g < gEnd; g++) {
        const gen = pgens[g];
        if (!gen) continue;
        if (gen.oper === 41) instId = gen.uAmount; // instrument
        else if (gen.oper === 51) presetCoarseTune = gen.amount;
        else if (gen.oper === 52) presetFineTune = gen.amount;
        else if (gen.oper === 48) presetAtten = gen.amount;
      }

      if (instId === null || instId >= insts.length - 1) continue;

      const inst = insts[instId];
      const iBagStart = inst.bagIndex;
      const iBagEnd = insts[instId + 1]?.bagIndex ?? ibags.length - 1;

      // Global instrument zone (first bag if it has no sampleID generator 53)
      let globalExclusive = 0;
      let globalPan = 0;
      let globalCoarse = 0;
      let globalFine = 0;
      let globalAtten = 0;
      let globalReleaseSec = 0.6;

      for (let ib = iBagStart; ib < iBagEnd; ib++) {
        const igStart = ibags[ib]?.genIndex ?? 0;
        const igEnd = ibags[ib + 1]?.genIndex ?? igens.length;

        let sampleId: number | null = null;
        let keyLow = 0;
        let keyHigh = 127;
        let velHigh = 127;
        let exclusiveClass = globalExclusive;
        let rootKey = -1;
        let coarseTune = globalCoarse;
        let fineTune = globalFine;
        let pan = globalPan;
        let atten = globalAtten;
        let releaseSec = globalReleaseSec;

        for (let ig = igStart; ig < igEnd; ig++) {
          const gen = igens[ig];
          if (!gen) continue;
          switch (gen.oper) {
            case 53: // sampleID
              sampleId = gen.uAmount;
              break;
            case 43: // keyRange
              keyLow = gen.uAmount & 0xff;
              keyHigh = (gen.uAmount >> 8) & 0xff;
              break;
            case 44: // velRange
              velHigh = (gen.uAmount >> 8) & 0xff;
              break;
            case 57: // exclusiveClass
              exclusiveClass = gen.uAmount;
              break;
            case 58: // overridingRootKey
              rootKey = gen.amount;
              break;
            case 51: // coarseTune
              coarseTune = gen.amount;
              break;
            case 52: // fineTune
              fineTune = gen.amount;
              break;
            case 17: // pan (-500..500)
              pan = Math.max(-1, Math.min(1, gen.amount / 500));
              break;
            case 48: // initialAttenuation (centibels)
              atten = gen.amount;
              break;
            case 38: // releaseVolEnv (timecents)
              releaseSec = Math.max(0.05, Math.min(4, Math.pow(2, gen.amount / 1200)));
              break;
          }
        }

        if (sampleId === null) {
          // Global instrument zone
          if (ib === iBagStart) {
            globalExclusive = exclusiveClass;
            globalPan = pan;
            globalCoarse = coarseTune;
            globalFine = fineTune;
            globalAtten = atten;
            globalReleaseSec = releaseSec;
          }
          continue;
        }

        // Only keep loud/primary velocity layer if multi-layered
        if (velHigh < 64 && zones.has(keyLow)) continue;

        const buffer = getSampleBuffer(sampleId);
        const hdr = shdrs[sampleId];
        if (!buffer || !hdr) continue;

        const origPitch = rootKey >= 0 ? rootKey : hdr.originalPitch <= 127 ? hdr.originalPitch : 60;
        const totalAttenDb = (atten + presetAtten) / 10;
        const gainScale = Math.max(0.15, Math.min(1.4, Math.pow(10, -totalAttenDb / 20)));

        for (let k = Math.max(27, keyLow); k <= Math.min(87, keyHigh); k++) {
          const semitoneDiff =
            k - origPitch + coarseTune + presetCoarseTune + (fineTune + presetFineTune + hdr.pitchCorrection) / 100;
          const playbackRate = Math.pow(2, semitoneDiff / 12);

          zones.set(k, {
            note: k,
            buffer,
            playbackRate,
            exclusiveClass,
            pan,
            gainScale,
            releaseSec,
          });
        }
      }
    }

    if (zones.size > 0) {
      kits.push({
        presetName: preset.name || `Kit ${preset.program}`,
        bank: preset.bank,
        program: preset.program,
        zones,
      });
    }
  }

  kits.sort((a, b) => a.program - b.program);
  return kits;
}
