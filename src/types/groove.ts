export type TimeSignatureId = '4/4' | '3/4' | '5/4' | '6/8' | '7/8' | '12/8';

export type SubdivisionId = '16th' | '8th' | 'triplet';

/**
 * 0 = Off
 * 1 = Normal hit (velocity ~100)
 * 2 = Accent hit (velocity ~127, > articulation)
 * 3 = Ghost note (velocity ~38, parenthesized notehead)
 * 4 = Flam (velocity ~112 + grace note)
 */
export type HitType = 0 | 1 | 2 | 3 | 4;

export type BrushMode = 'cycle' | 'normal' | 'accent' | 'ghost' | 'flam' | 'erase';

export type InstrumentId =
  | 'crash'
  | 'ride'
  | 'rideBell'
  | 'hihatOpen'
  | 'hihatClosed'
  | 'tomHigh'
  | 'tomMid'
  | 'snare'
  | 'crossStick'
  | 'tomFloor'
  | 'kick'
  | 'hihatPedal'
  | 'cowbell';

export type NoteheadShape = 'oval' | 'x' | 'x-circle' | 'diamond' | 'triangle';

export interface DrumInstrumentSpec {
  id: InstrumentId;
  name: string;
  shortName: string;
  gmNote: number;
  gmName: string;
  /**
   * Staff position in half-steps from bottom line (line 1 = E4 = 0):
   * 0 = bottom line (E4)
   * 1 = 1st space (F4) -> Kick
   * 2 = 2nd line (G4)
   * 3 = 2nd space (A4) -> Floor Tom
   * 4 = 3rd line (B4)
   * 5 = 3rd space (C5) -> Snare / Cross-Stick
   * 6 = 4th line (D5) -> Mid Tom
   * 7 = 4th space (E5) -> High Tom
   * 8 = 5th/top line (F5) -> Ride / Ride Bell
   * 9 = space above top line (G5) -> Hi-Hat (Closed / Open)
   * 10 = ledger line above staff (A5) -> Crash Cymbal
   * -1 = space below bottom line (D4) -> Pedal Hi-Hat
   */
  staffStep: number;
  notehead: NoteheadShape;
  voice: 'hands' | 'feet';
  chokeGroup?: 'hihat';
  openArticulation?: boolean;
  defaultColor: string;
}

export type StepGrid = Record<InstrumentId, HitType[]>;

export interface GrooveDocument {
  id: string;
  title: string;
  composer: string;
  style: string;
  notes?: string;
  bpm: number;
  timeSignature: TimeSignatureId;
  subdivision: SubdivisionId;
  bars: 1 | 2 | 4;
  swing: number; // -66 to +66 (%): negative = forward/early, 0 = straight, positive = swing/shuffle
  steps: StepGrid;
  updatedAt: number;
}

export interface LibraryPreset extends GrooveDocument {
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  isCustom?: boolean;
}

export interface TrackMixState {
  muted: boolean;
  solo: boolean;
  volume: number; // 0 to 1
}

export type MixerState = Record<InstrumentId, TrackMixState>;

export interface RoomParticipant {
  clientId: string;
  name: string;
  color: string;
  activeStep: number | null;
  activeInstrument: InstrumentId | null;
  joinedAt: number;
}

export interface TimeSignatureSpec {
  id: TimeSignatureId;
  numerator: number;
  denominator: number;
  isCompound: boolean;
  /** Number of visual beat groupings per bar */
  beatGroups: number[];
}

export type WsClientMessage =
  | { type: 'join'; roomId: string; name: string; initialGroove?: GrooveDocument }
  | { type: 'cell:set'; instrument: InstrumentId; step: number; hit: HitType }
  | { type: 'meta:update'; patch: Partial<Pick<GrooveDocument, 'title' | 'composer' | 'style' | 'notes' | 'bpm' | 'timeSignature' | 'subdivision' | 'bars' | 'swing'>> }
  | { type: 'groove:load'; groove: GrooveDocument }
  | { type: 'cursor:focus'; step: number | null; instrument: InstrumentId | null }
  | { type: 'presence:rename'; name: string };

export type WsServerMessage =
  | { type: 'room:state'; roomId: string; groove: GrooveDocument; participants: RoomParticipant[]; selfId: string }
  | { type: 'cell:set'; instrument: InstrumentId; step: number; hit: HitType; byClientId: string }
  | { type: 'meta:update'; groove: GrooveDocument; byClientId: string }
  | { type: 'groove:load'; groove: GrooveDocument; byClientId: string }
  | { type: 'presence:list'; participants: RoomParticipant[] }
  | { type: 'cursor:focus'; clientId: string; step: number | null; instrument: InstrumentId | null }
  | { type: 'error'; message: string };
