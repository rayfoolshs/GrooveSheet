import { DRUM_INSTRUMENTS, INSTRUMENT_BY_ID } from '../data/instruments';
import {
  GrooveDocument,
  HitType,
  InstrumentId,
  MixerState,
} from '../types/groove';
import {
  getStepTimingOffsetSeconds,
  getStepsPerBar,
  getVelocityForHit,
  TIME_SIGNATURES,
} from '../utils/grooveHelpers';
import { parseSf2PercussionKits, Sf2DrumZone, Sf2KitPreset } from './soundfont2';

export type SoundFontKitId =
  | 'fluid-standard'
  | 'fluid-room'
  | 'fluid-power'
  | 'fluid-electronic'
  | 'chaos-standard'
  | 'jclive-standard'
  | 'custom-sf2'
  | 'synth';

export interface SoundFontKitSpec {
  id: Exclude<SoundFontKitId, 'custom-sf2'>;
  label: string;
  bankLabel: string;
}

export const BUILTIN_SOUNDFONT_KITS: SoundFontKitSpec[] = [
  { id: 'fluid-standard', label: 'FluidR3 GM: Standard Kit', bankLabel: 'Bank 128 · Prog 0' },
  { id: 'fluid-room', label: 'FluidR3 GM: Room Kit', bankLabel: 'Bank 128 · Prog 8' },
  { id: 'fluid-power', label: 'FluidR3 GM: Power Kit', bankLabel: 'Bank 128 · Prog 16' },
  { id: 'fluid-electronic', label: 'FluidR3 GM: Electronic Kit', bankLabel: 'Bank 128 · Prog 24' },
  { id: 'chaos-standard', label: 'Chaos GM: Standard Kit', bankLabel: 'Bank 128 · Prog 0' },
  { id: 'jclive-standard', label: 'JC Live GM: Acoustic Kit', bankLabel: 'Bank 128 · Prog 0' },
  { id: 'synth', label: 'Built-in Web Audio Synth', bankLabel: 'Zero-Download' },
];

export interface PlaybackCallbacks {
  onStepChange: (step: number | null, countInBeat: number | null) => void;
  onStop: () => void;
}

class DrumAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // SoundFont sample banks (by kitId -> note -> Sf2DrumZone)
  private activeKitId: SoundFontKitId = 'fluid-standard';
  private soundfontCache = new Map<string, Map<number, Sf2DrumZone>>();
  private loadingKits = new Set<string>();
  private customSf2Presets: Sf2KitPreset[] = [];
  private activeCustomProgram = 0;

  // Active Open Hi-Hat gain node for choke group
  private activeOpenHiHatGain: GainNode | null = null;

  // Scheduler state
  private isPlaying = false;
  private timerId: number | null = null;
  private nextNoteTime = 0;
  private currentStep = 0;
  private countInRemaining = 0;
  private countInTotal = 0;
  private loopEnabled = true;
  private metronomeEnabled = false;
  private metronomeVolume = 0.65;
  private countInEnabled = false;

  // Latest reactive references
  private groove: GrooveDocument | null = null;
  private mixer: MixerState | null = null;
  private callbacks: PlaybackCallbacks | null = null;

  // Optional Web MIDI output
  private midiOutput: MIDIOutput | null = null;
  private availableMidiOutputs: MIDIOutput[] = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -10;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.14;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = ctx.sampleRate * 1.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public async initWebMidi(): Promise<{ supported: boolean; outputs: { id: string; name: string }[] }> {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      return { supported: false, outputs: [] };
    }
    try {
      const access = await navigator.requestMIDIAccess();
      this.availableMidiOutputs = Array.from(access.outputs.values());
      return {
        supported: true,
        outputs: this.availableMidiOutputs.map((o) => ({
          id: o.id,
          name: o.name || 'MIDI Output',
        })),
      };
    } catch {
      return { supported: false, outputs: [] };
    }
  }

  public setMidiOutput(outputId: string | null): void {
    if (!outputId) {
      this.midiOutput = null;
      return;
    }
    this.midiOutput = this.availableMidiOutputs.find((o) => o.id === outputId) ?? null;
  }

  public getActiveKitId(): SoundFontKitId {
    return this.activeKitId;
  }

  public getCustomSf2Presets(): { program: number; presetName: string }[] {
    return this.customSf2Presets.map((p) => ({ program: p.program, presetName: p.presetName }));
  }

  public getActiveCustomProgram(): number {
    return this.activeCustomProgram;
  }

  public async loadSoundFontKit(kitId: SoundFontKitId): Promise<{ ok: boolean; loadedCount: number }> {
    this.activeKitId = kitId;
    if (kitId === 'synth' || kitId === 'custom-sf2') {
      return { ok: true, loadedCount: 0 };
    }

    if (this.soundfontCache.has(kitId)) {
      return { ok: true, loadedCount: this.soundfontCache.get(kitId)!.size };
    }
    if (this.loadingKits.has(kitId)) {
      return { ok: true, loadedCount: 0 };
    }

    this.loadingKits.add(kitId);
    const ctx = this.ensureContext();
    const zones = new Map<number, Sf2DrumZone>();

    const uniqueNotes = Array.from(new Set(DRUM_INSTRUMENTS.map((i) => i.gmNote)));
    await Promise.allSettled(
      uniqueNotes.map(async (note) => {
        const res = await fetch(`/api/soundfont/drum/${encodeURIComponent(kitId)}/${note}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          base64: string;
          originalPitch: number;
          coarseTune: number;
          fineTune: number;
        };
        if (!data.base64) return;

        const binStr = atob(data.base64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

        // WebAudioFont stores originalPitch in cents (e.g. 3600 = MIDI 36)
        const origMidi = data.originalPitch > 127 ? data.originalPitch / 100 : data.originalPitch;
        const semitoneDiff = note - origMidi + (data.coarseTune || 0) + (data.fineTune || 0) / 100;
        const playbackRate = Math.pow(2, semitoneDiff / 12);

        zones.set(note, {
          note,
          buffer,
          playbackRate: Number.isFinite(playbackRate) ? playbackRate : 1,
          exclusiveClass: note === 42 || note === 44 || note === 46 ? 1 : 0,
          pan: 0,
          gainScale: 1.0,
          releaseSec: note === 46 || note === 49 || note === 51 ? 1.2 : 0.4,
        });
      })
    );

    if (zones.size > 0) {
      this.soundfontCache.set(kitId, zones);
    }
    this.loadingKits.delete(kitId);
    return { ok: zones.size > 0, loadedCount: zones.size };
  }

  public async loadCustomSf2File(arrayBuffer: ArrayBuffer): Promise<{ presetName: string; presets: { program: number; presetName: string }[] }> {
    const ctx = this.ensureContext();
    const presets = parseSf2PercussionKits(arrayBuffer, ctx);
    if (presets.length === 0) {
      throw new Error('No General MIDI Bank 128 percussion kits were found in this .sf2 file.');
    }
    this.customSf2Presets = presets;
    this.activeCustomProgram = presets[0].program;
    this.activeKitId = 'custom-sf2';
    this.soundfontCache.set('custom-sf2', presets[0].zones);
    return {
      presetName: presets[0].presetName,
      presets: presets.map((p) => ({ program: p.program, presetName: p.presetName })),
    };
  }

  public selectCustomSf2Preset(program: number): void {
    const found = this.customSf2Presets.find((p) => p.program === program);
    if (!found) return;
    this.activeCustomProgram = found.program;
    this.activeKitId = 'custom-sf2';
    this.soundfontCache.set('custom-sf2', found.zones);
  }

  public updateState(params: {
    groove: GrooveDocument;
    mixer: MixerState;
    loop: boolean;
    metronome: boolean;
    metronomeVolume: number;
    countIn: boolean;
  }): void {
    this.groove = params.groove;
    this.mixer = params.mixer;
    this.loopEnabled = params.loop;
    this.metronomeEnabled = params.metronome;
    this.metronomeVolume = params.metronomeVolume;
    this.countInEnabled = params.countIn;
  }

  public start(callbacks: PlaybackCallbacks): void {
    if (!this.groove) return;
    const ctx = this.ensureContext();
    this.callbacks = callbacks;
    this.isPlaying = true;
    this.currentStep = 0;

    const spec = TIME_SIGNATURES[this.groove.timeSignature];
    if (this.countInEnabled) {
      this.countInTotal = spec.isCompound ? spec.beatGroups.length : spec.numerator;
      this.countInRemaining = this.countInTotal;
    } else {
      this.countInRemaining = 0;
      this.countInTotal = 0;
    }

    this.nextNoteTime = ctx.currentTime + 0.04;
    this.scheduleLoop();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.callbacks?.onStepChange(null, null);
    this.callbacks?.onStop();
  }

  public previewHit(instrument: InstrumentId, hit: HitType = 1): void {
    const ctx = this.ensureContext();
    if (this.activeKitId !== 'synth' && this.activeKitId !== 'custom-sf2' && !this.soundfontCache.has(this.activeKitId)) {
      void this.loadSoundFontKit(this.activeKitId);
    }
    const vel = Math.max(40, getVelocityForHit(hit === 0 ? 1 : hit));
    const now = ctx.currentTime + 0.005;
    if (hit === 4) {
      this.triggerInstrument(instrument, now - 0.022, 0.42);
      this.triggerInstrument(instrument, now, vel / 127);
    } else {
      this.triggerInstrument(instrument, now, vel / 127);
    }
    this.sendMidiNote(INSTRUMENT_BY_ID[instrument].gmNote, vel, now);
  }

  private scheduleLoop = (): void => {
    if (!this.isPlaying || !this.ctx || !this.groove) return;

    const baseLookaheadSec = 0.1;
    let earlySwingAllowanceSec = 0;
    if (this.groove.swing < 0) {
      const quarterSec = 60 / Math.max(40, this.groove.bpm);
      const maxStepSec = quarterSec / 2;
      earlySwingAllowanceSec = Math.abs(Math.max(-66, this.groove.swing) / 66) * maxStepSec * 0.65;
    }
    const effectiveLookaheadSec = baseLookaheadSec + earlySwingAllowanceSec;

    while (this.nextNoteTime < this.ctx.currentTime + effectiveLookaheadSec) {
      if (this.countInRemaining > 0) {
        this.scheduleCountInBeat();
      } else {
        this.scheduleStep();
      }
    }

    this.timerId = window.setTimeout(this.scheduleLoop, 22);
  };

  private scheduleCountInBeat(): void {
    if (!this.ctx || !this.groove) return;
    const spec = TIME_SIGNATURES[this.groove.timeSignature];
    const beatIndex = this.countInTotal - this.countInRemaining;
    const isDownbeat = beatIndex === 0;

    const scheduledTime = this.nextNoteTime;
    this.triggerMetronomeClick(scheduledTime, isDownbeat, Math.max(0.55, this.metronomeVolume));

    const delayMs = Math.max(0, (scheduledTime - this.ctx.currentTime) * 1000);
    const beatDisplay = beatIndex + 1;
    window.setTimeout(() => {
      if (this.isPlaying) {
        this.callbacks?.onStepChange(null, beatDisplay);
      }
    }, delayMs);

    const quarterSec = 60 / this.groove.bpm;
    const beatSec = spec.isCompound ? quarterSec * 1.5 : quarterSec;
    this.nextNoteTime += beatSec;
    this.countInRemaining--;
  }

  private scheduleStep(): void {
    if (!this.ctx || !this.groove || !this.mixer) return;

    const groove = this.groove;
    const stepsPerBar = getStepsPerBar(groove.timeSignature, groove.subdivision);
    const totalSteps = stepsPerBar * groove.bars;

    if (this.currentStep >= totalSteps) {
      if (this.loopEnabled) {
        this.currentStep = 0;
      } else {
        const stopDelayMs = Math.max(0, (this.nextNoteTime - this.ctx.currentTime) * 1000);
        this.isPlaying = false;
        window.setTimeout(() => {
          this.stop();
        }, stopDelayMs);
        return;
      }
    }

    const step = this.currentStep;
    const stepInBar = step % stepsPerBar;
    const { stepDurationSec, swingDelaySec } = getStepTimingOffsetSeconds(
      stepInBar,
      groove.bpm,
      groove.timeSignature,
      groove.subdivision,
      groove.swing
    );

    const safeHitTime = Math.max(this.ctx.currentTime + 0.002, this.nextNoteTime + swingDelaySec);

    // Determine solo state
    const anySolo = Object.values(this.mixer).some((m) => m.solo);

    // Trigger metronome on steady straight beat boundaries
    if (this.metronomeEnabled) {
      const spec = TIME_SIGNATURES[groove.timeSignature];
      let isBeatStart = false;
      if (spec.isCompound) {
        const mult = groove.subdivision === '16th' ? 2 : 1;
        let accum = 0;
        for (const grp of spec.beatGroups) {
          if (stepInBar === accum) {
            isBeatStart = true;
            break;
          }
          accum += grp * mult;
        }
      } else {
        const perBeat = groove.subdivision === '16th' ? 4 : groove.subdivision === '8th' ? 2 : 3;
        isBeatStart = stepInBar % perBeat === 0;
      }
      if (isBeatStart) {
        const safeClickTime = Math.max(this.ctx.currentTime + 0.002, this.nextNoteTime);
        this.triggerMetronomeClick(safeClickTime, stepInBar === 0, this.metronomeVolume);
      }
    }

    // Trigger all active drum instruments with the Swing/Shuffle timing shift
    for (const [instId, row] of Object.entries(groove.steps)) {
      const hit = (row[step] ?? 0) as HitType;
      if (hit === 0) continue;

      const id = instId as InstrumentId;
      const trackMix = this.mixer[id];
      if (trackMix) {
        if (trackMix.muted) continue;
        if (anySolo && !trackMix.solo) continue;
      }
      const vol = trackMix?.volume ?? 0.88;
      const midiVel = getVelocityForHit(hit);
      const gainScale = (midiVel / 127) * vol;

      if (hit === 4) {
        // Flam: grace note ~20ms prior
        const graceTime = Math.max(this.ctx.currentTime, safeHitTime - 0.021);
        this.triggerInstrument(id, graceTime, gainScale * 0.45);
        this.triggerInstrument(id, safeHitTime, gainScale);
        this.sendMidiNote(INSTRUMENT_BY_ID[id].gmNote, Math.round(midiVel * 0.45), graceTime);
        this.sendMidiNote(INSTRUMENT_BY_ID[id].gmNote, midiVel, safeHitTime);
      } else {
        this.triggerInstrument(id, safeHitTime, gainScale);
        this.sendMidiNote(INSTRUMENT_BY_ID[id].gmNote, midiVel, safeHitTime);
      }
    }

    // Visual playhead callback synced to scheduled audio time
    const visualDelayMs = Math.max(0, (safeHitTime - this.ctx.currentTime) * 1000);
    const stepSnapshot = step;
    window.setTimeout(() => {
      if (this.isPlaying) {
        this.callbacks?.onStepChange(stepSnapshot, null);
      }
    }, visualDelayMs);

    this.nextNoteTime += stepDurationSec;
    this.currentStep++;
  }

  private sendMidiNote(note: number, velocity: number, audioTime: number): void {
    if (!this.midiOutput || !this.ctx) return;
    const offsetMs = Math.max(0, (audioTime - this.ctx.currentTime) * 1000);
    const timestamp = performance.now() + offsetMs;
    const vel = Math.max(1, Math.min(127, Math.round(velocity)));
    // Channel 10 = 0x99 Note On, 0x89 Note Off
    this.midiOutput.send([0x99, note, vel], timestamp);
    this.midiOutput.send([0x89, note, 0], timestamp + 80);
  }

  private triggerMetronomeClick(time: number, isDownbeat: boolean, volume: number): void {
    if (!this.ctx || !this.compressor) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1560 : 1040, time);
    osc.frequency.exponentialRampToValueAtTime(isDownbeat ? 920 : 680, time + 0.035);

    const peak = Math.max(0.05, volume * (isDownbeat ? 0.45 : 0.28));
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(gain);
    gain.connect(this.compressor);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  private chokeOpenHiHat(time: number): void {
    if (this.activeOpenHiHatGain && this.ctx) {
      try {
        this.activeOpenHiHatGain.gain.cancelScheduledValues(time);
        this.activeOpenHiHatGain.gain.setValueAtTime(0.001, time + 0.015);
      } catch {
        // ignore if already stopped
      }
      this.activeOpenHiHatGain = null;
    }
  }

  private triggerInstrument(id: InstrumentId, time: number, level: number): void {
    if (!this.ctx || !this.compressor || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const dest = this.compressor;
    const lvl = Math.max(0.05, Math.min(1.25, level));

    // Play General MIDI SoundFont sample if loaded for the active kit
    if (this.activeKitId !== 'synth') {
      const bank = this.soundfontCache.get(this.activeKitId);
      const gmNote = INSTRUMENT_BY_ID[id].gmNote;
      const zone = bank?.get(gmNote);
      if (zone) {
        if (id === 'hihatClosed' || id === 'hihatPedal') {
          this.chokeOpenHiHat(time);
        }

        const src = ctx.createBufferSource();
        src.buffer = zone.buffer;
        src.playbackRate.setValueAtTime(zone.playbackRate, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(lvl * zone.gainScale * 1.15, time);

        if (id === 'hihatOpen') {
          this.chokeOpenHiHat(time);
          this.activeOpenHiHatGain = gain;
        }

        if (zone.pan !== 0 && typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(zone.pan, time);
          src.connect(gain);
          gain.connect(panner);
          panner.connect(dest);
        } else {
          src.connect(gain);
          gain.connect(dest);
        }

        src.start(time);
        return;
      }
    }

    switch (id) {
      case 'kick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, time);
        osc.frequency.exponentialRampToValueAtTime(52, time + 0.055);
        osc.frequency.exponentialRampToValueAtTime(36, time + 0.28);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(1.05 * lvl, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.34);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.36);

        // Beater transient
        const click = ctx.createOscillator();
        const clickGain = ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1900, time);
        click.frequency.exponentialRampToValueAtTime(180, time + 0.016);
        clickGain.gain.setValueAtTime(0.28 * lvl, time);
        clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
        click.connect(clickGain);
        clickGain.connect(dest);
        click.start(time);
        click.stop(time + 0.025);
        break;
      }

      case 'snare': {
        // Snare wires (filtered noise)
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 1100;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2600;
        bp.Q.value = 0.8;
        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.75 * lvl, time);
        nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.19);
        noise.connect(hp);
        hp.connect(bp);
        bp.connect(nGain);
        nGain.connect(dest);
        noise.start(time);
        noise.stop(time + 0.21);

        // Drum shell tone
        const body = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(215, time);
        body.frequency.exponentialRampToValueAtTime(125, time + 0.08);
        bodyGain.gain.setValueAtTime(0.55 * lvl, time);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        body.connect(bodyGain);
        bodyGain.connect(dest);
        body.start(time);
        body.stop(time + 0.14);
        break;
      }

      case 'crossStick': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const bp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(480, time);
        osc2.frequency.setValueAtTime(1420, time);
        bp.type = 'bandpass';
        bp.frequency.value = 1200;
        bp.Q.value = 2.5;
        gain.gain.setValueAtTime(0.65 * lvl, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
        osc1.connect(bp);
        osc2.connect(bp);
        bp.connect(gain);
        gain.connect(dest);
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.055);
        osc2.stop(time + 0.055);
        break;
      }

      case 'hihatClosed':
      case 'hihatPedal': {
        this.chokeOpenHiHat(time);
        this.triggerMetallicHiHat(
          time,
          id === 'hihatPedal' ? 0.075 : 0.055,
          id === 'hihatPedal' ? lvl * 0.72 : lvl * 0.62,
          id === 'hihatPedal' ? 5200 : 7200,
          false
        );
        break;
      }

      case 'hihatOpen': {
        this.chokeOpenHiHat(time);
        this.triggerMetallicHiHat(time, 0.42, lvl * 0.68, 6600, true);
        break;
      }

      case 'tomHigh':
      case 'tomMid':
      case 'tomFloor': {
        const pitchMap = {
          tomHigh: [240, 145],
          tomMid: [175, 102],
          tomFloor: [122, 68],
        }[id];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitchMap[0], time);
        osc.frequency.exponentialRampToValueAtTime(pitchMap[1], time + 0.19);
        gain.gain.setValueAtTime(0.82 * lvl, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + 0.3);

        // Stick attack
        const atk = ctx.createBufferSource();
        atk.buffer = this.noiseBuffer;
        const lp = ctx.createBiquadFilter();
        lp.type = 'bandpass';
        lp.frequency.value = pitchMap[0] * 5;
        const atkGain = ctx.createGain();
        atkGain.gain.setValueAtTime(0.18 * lvl, time);
        atkGain.gain.exponentialRampToValueAtTime(0.001, time + 0.022);
        atk.connect(lp);
        lp.connect(atkGain);
        atkGain.connect(dest);
        atk.start(time);
        atk.stop(time + 0.03);
        break;
      }

      case 'crash': {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3400;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.62 * lvl, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 1.25);
        noise.connect(hp);
        hp.connect(gain);
        gain.connect(dest);
        noise.start(time);
        noise.stop(time + 1.3);

        this.triggerMetallicCluster(time, 0.9, lvl * 0.28, 380);
        break;
      }

      case 'ride': {
        this.triggerMetallicCluster(time, 0.52, lvl * 0.36, 510);
        const ping = ctx.createOscillator();
        const pingGain = ctx.createGain();
        ping.type = 'triangle';
        ping.frequency.setValueAtTime(2420, time);
        pingGain.gain.setValueAtTime(0.22 * lvl, time);
        pingGain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        ping.connect(pingGain);
        pingGain.connect(dest);
        ping.start(time);
        ping.stop(time + 0.18);
        break;
      }

      case 'rideBell': {
        const ratios = [1, 1.48, 2.13];
        ratios.forEach((r, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1480 * r, time);
          gain.gain.setValueAtTime((idx === 0 ? 0.34 : 0.18) * lvl, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
          osc.connect(gain);
          gain.connect(dest);
          osc.start(time);
          osc.stop(time + 0.48);
        });
        break;
      }

      case 'cowbell': {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const bp = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(545, time);
        osc2.frequency.setValueAtTime(810, time);
        bp.type = 'bandpass';
        bp.frequency.value = 840;
        bp.Q.value = 1.8;
        gain.gain.setValueAtTime(0.42 * lvl, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        osc1.connect(bp);
        osc2.connect(bp);
        bp.connect(gain);
        gain.connect(dest);
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.2);
        osc2.stop(time + 0.2);
        break;
      }
    }
  }

  private triggerMetallicHiHat(
    time: number,
    decay: number,
    level: number,
    cutoffHz: number,
    isOpen: boolean
  ): void {
    if (!this.ctx || !this.compressor || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = cutoffHz;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, time);
    master.gain.linearRampToValueAtTime(level, time + 0.002);
    master.gain.exponentialRampToValueAtTime(0.001, time + decay);

    if (isOpen) {
      this.activeOpenHiHatGain = master;
    }

    // Metallic 6-partial square cluster + crisp noise air
    const ratios = [263, 400, 421, 474, 587, 845];
    ratios.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq * 1.45, time);
      const g = ctx.createGain();
      g.gain.value = 0.09;
      osc.connect(g);
      g.connect(hp);
      osc.start(time);
      osc.stop(time + decay + 0.02);
    });

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.55;
    noise.connect(nGain);
    nGain.connect(hp);
    noise.start(time);
    noise.stop(time + decay + 0.02);

    hp.connect(master);
    master.connect(this.compressor);
  }

  private triggerMetallicCluster(time: number, decay: number, level: number, baseFreq: number): void {
    if (!this.ctx || !this.compressor) return;
    const ctx = this.ctx;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    const ratios = [1, 1.48, 1.92, 2.53, 3.11, 3.85];
    ratios.forEach((r) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(baseFreq * r, time);
      const g = ctx.createGain();
      g.gain.value = 0.12;
      osc.connect(g);
      g.connect(hp);
      osc.start(time);
      osc.stop(time + decay + 0.03);
    });

    hp.connect(gain);
    gain.connect(this.compressor);
  }
}

export const drumEngine = new DrumAudioEngine();
