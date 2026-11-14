import React, { useMemo, useState } from 'react';
import { INSTRUMENT_BY_ID } from '../data/instruments';
import { BrushMode, GrooveDocument, HitType, InstrumentId } from '../types/groove';
import { cycleHitType, getBarCountLabels, TIME_SIGNATURES } from '../utils/grooveHelpers';
import { computeStaffLayout, StaffBarLayout, StaffNoteEntry, StaffSymbol } from '../utils/notationLayout';

export interface StaffHoverInfo {
  step: number;
  instrumentId: InstrumentId;
  instrumentName: string;
  currentHit: HitType;
}

interface PercussionStaffProps {
  groove: GrooveDocument;
  activeStep: number | null;
  brushMode?: BrushMode;
  useAltVoices?: boolean;
  showCounting?: boolean;
  showDrumKey?: boolean;
  printMode?: boolean;
  onSelectStep?: (step: number) => void;
  onToggleStaffNote?: (instrument: InstrumentId, step: number, hit: HitType) => void;
  onHoverChange?: (info: StaffHoverInfo | null) => void;
}

const VALID_STAFF_STEPS = [-1, 1, 3, 5, 6, 7, 8, 9, 10, 11] as const;

function snapToValidStaffStep(rawStep: number): number {
  let best: number = VALID_STAFF_STEPS[0];
  let bestDist = Math.abs(rawStep - best);
  for (const s of VALID_STAFF_STEPS) {
    const d = Math.abs(rawStep - s);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function resolveInstrumentForStaffStep(
  staffStep: number,
  groove: GrooveDocument,
  step: number,
  useAlt: boolean
): InstrumentId {
  switch (staffStep) {
    case -1:
      return 'hihatPedal';
    case 1:
      return 'kick';
    case 3:
      return 'tomFloor';
    case 5: {
      if (useAlt) return 'crossStick';
      if ((groove.steps.crossStick?.[step] ?? 0) > 0 && (groove.steps.snare?.[step] ?? 0) === 0) {
        return 'crossStick';
      }
      return 'snare';
    }
    case 6:
      return 'tomMid';
    case 7:
      return 'tomHigh';
    case 8: {
      if (useAlt) return 'rideBell';
      if ((groove.steps.rideBell?.[step] ?? 0) > 0 && (groove.steps.ride?.[step] ?? 0) === 0) {
        return 'rideBell';
      }
      return 'ride';
    }
    case 9: {
      if (useAlt) return 'hihatOpen';
      if ((groove.steps.hihatOpen?.[step] ?? 0) > 0 && (groove.steps.hihatClosed?.[step] ?? 0) === 0) {
        return 'hihatOpen';
      }
      return 'hihatClosed';
    }
    case 10:
      return 'crash';
    case 11:
      return 'cowbell';
    default:
      return 'snare';
  }
}

function resolveNextStaffHit(current: HitType, brushMode: BrushMode, shiftKey: boolean): HitType {
  if (shiftKey) return current === 2 ? 0 : 2;
  switch (brushMode) {
    case 'cycle':
      return cycleHitType(current);
    case 'normal':
      return current === 1 ? 0 : 1;
    case 'accent':
      return current === 2 ? 0 : 2;
    case 'ghost':
      return current === 3 ? 0 : 3;
    case 'flam':
      return current === 4 ? 0 : 4;
    case 'erase':
      return 0;
  }
}

const LINE_GAP = 10;
const HALF_GAP = LINE_GAP / 2; // 5px per diatonic step

function stepToY(staffStep: number, bottomLineY: number): number {
  return bottomLineY - staffStep * HALF_GAP;
}

function renderNotehead(
  entry: StaffNoteEntry,
  x: number,
  y: number,
  inkColor: string
): React.ReactNode {
  const cx = x + entry.xShift;
  const isGhost = entry.hit === 3;
  const scale = isGhost ? 0.84 : 1;

  let head: React.ReactNode = null;
  if (entry.notehead === 'x' || entry.notehead === 'x-circle') {
    const r = 4.4 * scale;
    head = (
      <g>
        {entry.notehead === 'x-circle' && (
          <circle cx={cx} cy={y} r={r + 2.4} fill="none" stroke={inkColor} strokeWidth={1.3} />
        )}
        <line x1={cx - r} y1={y - r} x2={cx + r} y2={y + r} stroke={inkColor} strokeWidth={1.85} strokeLinecap="round" />
        <line x1={cx - r} y1={y + r} x2={cx + r} y2={y - r} stroke={inkColor} strokeWidth={1.85} strokeLinecap="round" />
      </g>
    );
  } else if (entry.notehead === 'diamond') {
    const r = 4.8 * scale;
    head = (
      <polygon
        points={`${cx},${y - r} ${cx + r},${y} ${cx},${y + r} ${cx - r},${y}`}
        fill="none"
        stroke={inkColor}
        strokeWidth={1.7}
      />
    );
  } else if (entry.notehead === 'triangle') {
    const r = 4.8 * scale;
    head = (
      <polygon
        points={`${cx},${y - r} ${cx + r},${y + r * 0.85} ${cx - r},${y + r * 0.85}`}
        fill="none"
        stroke={inkColor}
        strokeWidth={1.7}
      />
    );
  } else {
    head = (
      <ellipse
        cx={cx}
        cy={y}
        rx={5.3 * scale}
        ry={3.8 * scale}
        transform={`rotate(-18 ${cx} ${y})`}
        fill={inkColor}
      />
    );
  }

  return (
    <g key={`${entry.instrumentId}-${x}`}>
      {/* Ledger line for Crash / Cowbell */}
      {entry.staffStep >= 10 && (
        <line
          x1={cx - 9}
          y1={stepToY(10, y + entry.staffStep * HALF_GAP)}
          x2={cx + 9}
          y2={stepToY(10, y + entry.staffStep * HALF_GAP)}
          stroke={inkColor}
          strokeWidth={1.3}
        />
      )}
      {/* Ghost parentheses */}
      {isGhost && (
        <g stroke={inkColor} strokeWidth={1.2} fill="none">
          <path d={`M ${cx - 7.5} ${y - 5} Q ${cx - 10.5} ${y} ${cx - 7.5} ${y + 5}`} />
          <path d={`M ${cx + 7.5} ${y - 5} Q ${cx + 10.5} ${y} ${cx + 7.5} ${y + 5}`} />
        </g>
      )}
      {/* Flam grace note */}
      {entry.hit === 4 && (
        <g>
          <ellipse
            cx={cx - 10.5}
            cy={y + 1.5}
            rx={3.2}
            ry={2.3}
            transform={`rotate(-18 ${cx - 10.5} ${y + 1.5})`}
            fill={inkColor}
          />
          <line x1={cx - 7.8} y1={y + 1.5} x2={cx - 7.8} y2={y - 12} stroke={inkColor} strokeWidth={1.1} />
          <line x1={cx - 11.5} y1={y - 5} x2={cx - 4.5} y2={y - 10} stroke={inkColor} strokeWidth={1.1} />
          <path
            d={`M ${cx - 10.5} ${y + 5.5} Q ${cx - 5.5} ${y + 8.5} ${cx - 1.5} ${y + 4.5}`}
            fill="none"
            stroke={inkColor}
            strokeWidth={1.1}
          />
        </g>
      )}
      {/* Open hi-hat 'o' articulation */}
      {entry.openArticulation && (
        <circle cx={cx} cy={y - 10.5} r={3} fill="none" stroke={inkColor} strokeWidth={1.35} />
      )}
      {head}
    </g>
  );
}

function renderRest(duration: StaffSymbol['duration'], x: number, y: number, inkColor: string): React.ReactNode {
  if (duration === 'quarter' || duration === 'dotted-quarter') {
    return (
      <g>
        <path
          d={`M ${x - 2.5} ${y - 11} L ${x + 2.5} ${y - 5} L ${x - 2} ${y + 0.5} L ${x + 3} ${y + 6} C ${x - 1} ${y + 6.5} ${x - 3} ${y + 9} ${x + 0.5} ${y + 12}`}
          fill="none"
          stroke={inkColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {duration === 'dotted-quarter' && <circle cx={x + 6.5} cy={y - 2} r={1.8} fill={inkColor} />}
      </g>
    );
  }
  if (duration === 'eighth' || duration === 'dotted-eighth') {
    return (
      <g>
        <circle cx={x - 2} cy={y - 4.5} r={2.3} fill={inkColor} />
        <path
          d={`M ${x - 1.5} ${y - 4} Q ${x + 2} ${y - 2.5} ${x + 3.5} ${y - 6.5} L ${x - 1.5} ${y + 8}`}
          fill="none"
          stroke={inkColor}
          strokeWidth={1.65}
          strokeLinecap="round"
        />
        {duration === 'dotted-eighth' && <circle cx={x + 6.5} cy={y - 3} r={1.7} fill={inkColor} />}
      </g>
    );
  }
  // Sixteenth rest
  return (
    <g>
      <circle cx={x - 2} cy={y - 6.5} r={2.1} fill={inkColor} />
      <circle cx={x - 3.2} cy={y - 0.5} r={2.1} fill={inkColor} />
      <path
        d={`M ${x - 1.5} ${y - 6} Q ${x + 2} ${y - 4.5} ${x + 3.5} ${y - 8} L ${x - 2.5} ${y + 9}`}
        fill="none"
        stroke={inkColor}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </g>
  );
}

function renderFlag(x: number, stemTipY: number, dir: 'up' | 'down', beamCount: number, inkColor: string): React.ReactNode {
  if (beamCount <= 0) return null;
  const s = dir === 'up' ? 1 : -1;
  return (
    <g>
      <path
        d={`M ${x} ${stemTipY} C ${x + 7} ${stemTipY + 4 * s}, ${x + 9} ${stemTipY + 10 * s}, ${x + 4.5} ${stemTipY + 15 * s}`}
        fill="none"
        stroke={inkColor}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      {beamCount >= 2 && (
        <path
          d={`M ${x} ${stemTipY + 5.5 * s} C ${x + 7} ${stemTipY + 9.5 * s}, ${x + 9} ${stemTipY + 15.5 * s}, ${x + 4.5} ${stemTipY + 20 * s}`}
          fill="none"
          stroke={inkColor}
          strokeWidth={1.9}
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

export const PercussionStaff: React.FC<PercussionStaffProps> = ({
  groove,
  activeStep,
  brushMode = 'cycle',
  useAltVoices = false,
  showCounting = true,
  showDrumKey = false,
  printMode = false,
  onSelectStep,
  onToggleStaffNote,
  onHoverChange,
}) => {
  const [hoverTarget, setHoverTarget] = useState<{
    sysIdx: number;
    absStep: number;
    staffStep: number;
    instrumentId: InstrumentId;
    x: number;
    y: number;
  } | null>(null);
  const layout = useMemo(
    () => computeStaffLayout(groove.steps, groove.timeSignature, groove.subdivision, groove.bars),
    [groove.steps, groove.timeSignature, groove.subdivision, groove.bars]
  );

  const countLabels = useMemo(
    () => getBarCountLabels(groove.timeSignature, groove.subdivision),
    [groove.timeSignature, groove.subdivision]
  );

  const timeSpec = TIME_SIGNATURES[groove.timeSignature];

  // Group bars into systems: 1 bar -> 1 per row; 2 or 4 bars -> 2 bars per system
  const systems: StaffBarLayout[][] = useMemo(() => {
    if (groove.bars === 1) return [layout];
    const rows: StaffBarLayout[][] = [];
    for (let i = 0; i < layout.length; i += 2) {
      rows.push(layout.slice(i, i + 2));
    }
    return rows;
  }, [layout, groove.bars]);

  const inkColor = printMode ? '#000000' : 'currentColor';
  const mutedInk = printMode ? '#475569' : '#64748b';
  const staffLineColor = printMode ? '#334155' : 'rgba(100, 116, 139, 0.55)';
  const accentBlue = '#2563eb';

  const svgWidth = 1080;
  const leftMargin = 24;
  const rightMargin = 20;
  const clefTimeWidth = 72;
  const systemHeight = showCounting ? 148 : 132;

  return (
    <div className="w-full select-none">
      {systems.map((systemBars, sysIdx) => {
        const isFirstSystem = sysIdx === 0;
        const headerOffset = isFirstSystem ? clefTimeWidth : 34;
        const availableBarsWidth = svgWidth - leftMargin - rightMargin - headerOffset;
        const barWidth = availableBarsWidth / systemBars.length;
        const bottomLineY = 78; // Line 1 (E4)
        const topLineY = bottomLineY - 4 * LINE_GAP; // Line 5 (F5) = 38
        const handsBeamY = 14;
        const feetBeamY = 104;
        const isInteractive = !printMode && Boolean(onToggleStaffNote || onSelectStep);

        const computePointerTarget = (e: React.PointerEvent<SVGSVGElement>) => {
          const svg = e.currentTarget;
          const ctm = svg.getScreenCTM();
          if (!ctm) return null;
          const pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const svgPt = pt.matrixTransform(ctm.inverse());

          if (svgPt.y < 6 || svgPt.y > systemHeight - 16) return null;

          const relX = svgPt.x - (leftMargin + headerOffset);
          if (relX < -8 || relX > availableBarsWidth + 8) return null;

          const barLocalIdx = Math.min(
            systemBars.length - 1,
            Math.max(0, Math.floor(relX / barWidth))
          );
          const bar = systemBars[barLocalIdx];
          const barX = leftMargin + headerOffset + barLocalIdx * barWidth;
          const innerPadLeft = 18;
          const innerPadRight = 14;
          const usableWidth = barWidth - innerPadLeft - innerPadRight;
          const stepSpacing = usableWidth / bar.stepsInBar;

          const stepInBar = Math.min(
            bar.stepsInBar - 1,
            Math.max(0, Math.floor((svgPt.x - (barX + innerPadLeft)) / stepSpacing))
          );
          const absStep = bar.startStep + stepInBar;
          const cx = barX + innerPadLeft + (stepInBar + 0.5) * stepSpacing;

          const rawStep = Math.round((bottomLineY - svgPt.y) / HALF_GAP);
          const staffStep = snapToValidStaffStep(rawStep);
          const y = stepToY(staffStep, bottomLineY);
          const instrumentId = resolveInstrumentForStaffStep(
            staffStep,
            groove,
            absStep,
            useAltVoices || e.altKey
          );

          return { sysIdx, absStep, staffStep, instrumentId, x: cx, y };
        };

        return (
          <div key={sysIdx} className="print-system-block mb-1 last:mb-0">
            <svg
              viewBox={`0 0 ${svgWidth} ${systemHeight}`}
              className={`w-full h-auto overflow-visible text-slate-900 dark:text-slate-100 ${
                isInteractive ? 'cursor-crosshair' : ''
              }`}
              role="img"
              aria-label={`Percussion notation staff system ${sysIdx + 1}`}
              onPointerMove={
                isInteractive
                  ? (e) => {
                      const t = computePointerTarget(e);
                      setHoverTarget(t);
                      if (t) {
                        const inst = INSTRUMENT_BY_ID[t.instrumentId];
                        const cur = (groove.steps[t.instrumentId]?.[t.absStep] ?? 0) as HitType;
                        onHoverChange?.({
                          step: t.absStep,
                          instrumentId: t.instrumentId,
                          instrumentName: inst.name,
                          currentHit: cur,
                        });
                      } else {
                        onHoverChange?.(null);
                      }
                    }
                  : undefined
              }
              onPointerLeave={
                isInteractive
                  ? () => {
                      setHoverTarget(null);
                      onHoverChange?.(null);
                    }
                  : undefined
              }
              onPointerDown={
                isInteractive
                  ? (e) => {
                      const t = computePointerTarget(e);
                      if (!t) return;
                      e.preventDefault();
                      if (onToggleStaffNote) {
                        const cur = (groove.steps[t.instrumentId]?.[t.absStep] ?? 0) as HitType;
                        const nextHit: HitType =
                          e.button === 2 ? 0 : resolveNextStaffHit(cur, brushMode, e.shiftKey);
                        onToggleStaffNote(t.instrumentId, t.absStep, nextHit);
                      } else if (onSelectStep) {
                        onSelectStep(t.absStep);
                      }
                    }
                  : undefined
              }
              onContextMenu={isInteractive ? (e) => e.preventDefault() : undefined}
            >
              {/* 5 horizontal staff lines */}
              {[0, 2, 4, 6, 8].map((s) => {
                const y = stepToY(s, bottomLineY);
                return (
                  <line
                    key={s}
                    x1={leftMargin}
                    y1={y}
                    x2={svgWidth - rightMargin}
                    y2={y}
                    stroke={staffLineColor}
                    strokeWidth={1.1}
                  />
                );
              })}

              {/* Left system barline */}
              <line
                x1={leftMargin}
                y1={topLineY}
                x2={leftMargin}
                y2={bottomLineY}
                stroke={inkColor}
                strokeWidth={1.6}
              />

              {/* Percussion Clef (two vertical bars spanning lines 2..4) */}
              <g>
                <rect
                  x={leftMargin + 10}
                  y={stepToY(6, bottomLineY)}
                  width={3.8}
                  height={20}
                  fill={inkColor}
                  rx={0.5}
                />
                <rect
                  x={leftMargin + 17.5}
                  y={stepToY(6, bottomLineY)}
                  width={3.8}
                  height={20}
                  fill={inkColor}
                  rx={0.5}
                />
              </g>

              {/* Time Signature on first system */}
              {isFirstSystem && (
                <g
                  fill={inkColor}
                  textAnchor="middle"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
                >
                  <text x={leftMargin + 44} y={topLineY + 17} fontSize={21}>
                    {timeSpec.numerator}
                  </text>
                  <text x={leftMargin + 44} y={bottomLineY - 2} fontSize={21}>
                    {timeSpec.denominator}
                  </text>
                </g>
              )}

              {/* Render each bar in this system */}
              {systemBars.map((bar, barLocalIdx) => {
                const barX = leftMargin + headerOffset + barLocalIdx * barWidth;
                const innerPadLeft = 18;
                const innerPadRight = 14;
                const usableWidth = barWidth - innerPadLeft - innerPadRight;
                const stepSpacing = usableWidth / bar.stepsInBar;
                const isLastBarOverall =
                  sysIdx === systems.length - 1 && barLocalIdx === systemBars.length - 1;

                const stepX = (stepInBar: number) =>
                  barX + innerPadLeft + (stepInBar + 0.5) * stepSpacing;

                return (
                  <g key={bar.barIndex}>
                    {/* Bar number */}
                    {groove.bars > 1 && (
                      <text
                        x={barX + 4}
                        y={topLineY - 18}
                        fontSize={10}
                        fill={mutedInk}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {bar.barIndex + 1}
                      </text>
                    )}

                    {/* Clickable step zones + Active playhead highlight + Counting */}
                    {Array.from({ length: bar.stepsInBar }).map((_, sIdx) => {
                      const absStep = bar.startStep + sIdx;
                      const cx = stepX(sIdx);
                      const isActive = activeStep === absStep;
                      return (
                        <g
                          key={absStep}
                          onClick={onSelectStep ? () => onSelectStep(absStep) : undefined}
                          className={onSelectStep ? 'cursor-pointer' : undefined}
                        >
                          {isActive && !printMode && (
                            <rect
                              x={cx - Math.min(14, stepSpacing * 0.45)}
                              y={handsBeamY - 4}
                              width={Math.min(28, stepSpacing * 0.9)}
                              height={feetBeamY - handsBeamY + 16}
                              rx={4}
                              fill="rgba(37, 99, 235, 0.14)"
                              stroke="rgba(37, 99, 235, 0.45)"
                              strokeWidth={1}
                            />
                          )}
                          {onSelectStep && (
                            <rect
                              x={cx - stepSpacing / 2}
                              y={topLineY - 12}
                              width={stepSpacing}
                              height={bottomLineY - topLineY + 34}
                              fill="transparent"
                            />
                          )}
                          {showCounting && (
                            <text
                              x={cx}
                              y={systemHeight - 8}
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={/^\d+$/.test(countLabels[sIdx] || '') ? 600 : 400}
                              fill={
                                isActive && !printMode
                                  ? accentBlue
                                  : /^\d+$/.test(countLabels[sIdx] || '')
                                    ? inkColor
                                    : mutedInk
                              }
                              style={{ fontFamily: 'var(--font-mono)' }}
                            >
                              {countLabels[sIdx] ?? ''}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Beat-by-beat Voice 1 (Hands) & Voice 2 (Feet) Engraving */}
                    {bar.beats.map((beat) => {
                      // Voice 1 (Hands - stems UP)
                      const handNotes = beat.handsSymbols.filter((s) => s.kind === 'note');
                      const beamedHands = handNotes.filter((s) => s.beamGroupId !== null && s.beamCount > 0);
                      const hasHandBeam = beamedHands.length >= 2;

                      // Voice 2 (Feet - stems DOWN)
                      const footNotes = beat.feetSymbols.filter((s) => s.kind === 'note');
                      const beamedFeet = footNotes.filter((s) => s.beamGroupId !== null && s.beamCount > 0);
                      const hasFootBeam = beamedFeet.length >= 2;

                      return (
                        <g key={beat.beatIndex}>
                          {/* Hands: Rests & Notes */}
                          {beat.handsSymbols.map((sym, idx) => {
                            const x = stepX(sym.stepInBar);
                            if (sym.kind === 'rest') {
                              return (
                                <g key={`hr-${idx}`}>
                                  {renderRest(sym.duration, x, stepToY(5, bottomLineY), mutedInk)}
                                </g>
                              );
                            }

                            const maxStep = Math.max(...sym.entries.map((e) => e.staffStep));
                            const minStep = Math.min(...sym.entries.map((e) => e.staffStep));
                            const lowestY = stepToY(minStep, bottomLineY);
                            const highestY = stepToY(maxStep, bottomLineY);
                            const stemX = x + 4.8;
                            const stemTopY = hasHandBeam
                              ? handsBeamY
                              : Math.min(handsBeamY + 4, highestY - 26);

                            const hasAccent = sym.entries.some((e) => e.hit === 2);
                            const isDotted =
                              sym.duration === 'dotted-quarter' || sym.duration === 'dotted-eighth';

                            return (
                              <g key={`hn-${idx}`}>
                                {/* Stem up */}
                                <line
                                  x1={stemX}
                                  y1={lowestY}
                                  x2={stemX}
                                  y2={stemTopY}
                                  stroke={inkColor}
                                  strokeWidth={1.35}
                                />
                                {/* Flag if unbeamed 8th/16th */}
                                {!hasHandBeam &&
                                  sym.beamCount > 0 &&
                                  renderFlag(stemX, stemTopY, 'up', sym.beamCount, inkColor)}
                                {/* Accent wedge above stem */}
                                {hasAccent && (
                                  <path
                                    d={`M ${x - 4.5} ${stemTopY - 10} L ${x + 4.5} ${stemTopY - 7} L ${x - 4.5} ${stemTopY - 4}`}
                                    fill="none"
                                    stroke={inkColor}
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}
                                {/* Noteheads */}
                                {sym.entries.map((entry) =>
                                  renderNotehead(
                                    entry,
                                    x,
                                    stepToY(entry.staffStep, bottomLineY),
                                    inkColor
                                  )
                                )}
                                {/* Augmentation dot */}
                                {isDotted && (
                                  <circle cx={x + 9.5} cy={highestY - 2} r={1.8} fill={inkColor} />
                                )}
                              </g>
                            );
                          })}

                          {/* Hands Horizontal Beams */}
                          {hasHandBeam && (
                            <g>
                              {/* Primary 8th beam spanning first to last beamed note in beat */}
                              <line
                                x1={stepX(beamedHands[0].stepInBar) + 4.2}
                                y1={handsBeamY}
                                x2={stepX(beamedHands[beamedHands.length - 1].stepInBar) + 5.4}
                                y2={handsBeamY}
                                stroke={inkColor}
                                strokeWidth={3.4}
                              />
                              {/* Secondary 16th beams */}
                              {beamedHands.map((sym, idx) => {
                                if (sym.beamCount < 2) return null;
                                const next = beamedHands[idx + 1];
                                const prev = beamedHands[idx - 1];
                                const sx = stepX(sym.stepInBar) + 4.5;
                                if (next && next.beamCount >= 2 && next.stepInBar - sym.stepInBar === 1) {
                                  return (
                                    <line
                                      key={`hb2-${idx}`}
                                      x1={sx}
                                      y1={handsBeamY + 5.5}
                                      x2={stepX(next.stepInBar) + 5.1}
                                      y2={handsBeamY + 5.5}
                                      stroke={inkColor}
                                      strokeWidth={2.9}
                                    />
                                  );
                                }
                                if (prev && prev.beamCount >= 2 && sym.stepInBar - prev.stepInBar === 1) {
                                  return null; // already covered by previous segment
                                }
                                // Stub 16th beamlet
                                const dir = next ? 1 : -1;
                                return (
                                  <line
                                    key={`hb2s-${idx}`}
                                    x1={sx}
                                    y1={handsBeamY + 5.5}
                                    x2={sx + dir * Math.min(10, stepSpacing * 0.45)}
                                    y2={handsBeamY + 5.5}
                                    stroke={inkColor}
                                    strokeWidth={2.9}
                                  />
                                );
                              })}
                            </g>
                          )}

                          {/* Triplet '3' numeral */}
                          {beat.isTriplet && handNotes.length > 0 && (
                            <text
                              x={stepX(beat.startStep - bar.startStep + 1)}
                              y={handsBeamY - 5}
                              textAnchor="middle"
                              fontSize={10}
                              fontWeight={700}
                              fontStyle="italic"
                              fill={inkColor}
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              3
                            </text>
                          )}

                          {/* Feet: Rests & Notes */}
                          {beat.feetSymbols.map((sym, idx) => {
                            const x = stepX(sym.stepInBar);
                            if (sym.kind === 'rest') {
                              return (
                                <g key={`fr-${idx}`}>
                                  {renderRest(sym.duration, x, stepToY(1, bottomLineY) + 12, mutedInk)}
                                </g>
                              );
                            }

                            const maxStep = Math.max(...sym.entries.map((e) => e.staffStep));
                            const minStep = Math.min(...sym.entries.map((e) => e.staffStep));
                            const highestY = stepToY(maxStep, bottomLineY);
                            const lowestY = stepToY(minStep, bottomLineY);
                            const stemX = x - 4.8;
                            const stemBottomY = hasFootBeam
                              ? feetBeamY
                              : Math.max(feetBeamY - 4, lowestY + 22);

                            const hasAccent = sym.entries.some((e) => e.hit === 2);
                            const isDotted =
                              sym.duration === 'dotted-quarter' || sym.duration === 'dotted-eighth';

                            return (
                              <g key={`fn-${idx}`}>
                                <line
                                  x1={stemX}
                                  y1={highestY}
                                  x2={stemX}
                                  y2={stemBottomY}
                                  stroke={inkColor}
                                  strokeWidth={1.35}
                                />
                                {!hasFootBeam &&
                                  sym.beamCount > 0 &&
                                  renderFlag(stemX, stemBottomY, 'down', sym.beamCount, inkColor)}
                                {hasAccent && (
                                  <path
                                    d={`M ${x - 4.5} ${stemBottomY + 5} L ${x + 4.5} ${stemBottomY + 8} L ${x - 4.5} ${stemBottomY + 11}`}
                                    fill="none"
                                    stroke={inkColor}
                                    strokeWidth={1.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}
                                {sym.entries.map((entry) =>
                                  renderNotehead(
                                    entry,
                                    x,
                                    stepToY(entry.staffStep, bottomLineY),
                                    inkColor
                                  )
                                )}
                                {isDotted && (
                                  <circle cx={x + 8.5} cy={lowestY} r={1.8} fill={inkColor} />
                                )}
                              </g>
                            );
                          })}

                          {/* Feet Horizontal Beams */}
                          {hasFootBeam && (
                            <g>
                              <line
                                x1={stepX(beamedFeet[0].stepInBar) - 5.4}
                                y1={feetBeamY}
                                x2={stepX(beamedFeet[beamedFeet.length - 1].stepInBar) - 4.2}
                                y2={feetBeamY}
                                stroke={inkColor}
                                strokeWidth={3.4}
                              />
                              {beamedFeet.map((sym, idx) => {
                                if (sym.beamCount < 2) return null;
                                const next = beamedFeet[idx + 1];
                                const prev = beamedFeet[idx - 1];
                                const sx = stepX(sym.stepInBar) - 4.8;
                                if (next && next.beamCount >= 2 && next.stepInBar - sym.stepInBar === 1) {
                                  return (
                                    <line
                                      key={`fb2-${idx}`}
                                      x1={sx}
                                      y1={feetBeamY - 5.5}
                                      x2={stepX(next.stepInBar) - 4.2}
                                      y2={feetBeamY - 5.5}
                                      stroke={inkColor}
                                      strokeWidth={2.9}
                                    />
                                  );
                                }
                                if (prev && prev.beamCount >= 2 && sym.stepInBar - prev.stepInBar === 1) {
                                  return null;
                                }
                                const dir = next ? 1 : -1;
                                return (
                                  <line
                                    key={`fb2s-${idx}`}
                                    x1={sx}
                                    y1={feetBeamY - 5.5}
                                    x2={sx + dir * Math.min(10, stepSpacing * 0.45)}
                                    y2={feetBeamY - 5.5}
                                    stroke={inkColor}
                                    strokeWidth={2.9}
                                  />
                                );
                              })}
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Right Barline or Final Repeat Barline */}
                    {isLastBarOverall ? (
                      <g>
                        <circle cx={barX + barWidth - 13} cy={stepToY(5, bottomLineY)} r={2} fill={inkColor} />
                        <circle cx={barX + barWidth - 13} cy={stepToY(3, bottomLineY)} r={2} fill={inkColor} />
                        <line
                          x1={barX + barWidth - 6.5}
                          y1={topLineY}
                          x2={barX + barWidth - 6.5}
                          y2={bottomLineY}
                          stroke={inkColor}
                          strokeWidth={1.3}
                        />
                        <line
                          x1={barX + barWidth - 1.5}
                          y1={topLineY}
                          x2={barX + barWidth - 1.5}
                          y2={bottomLineY}
                          stroke={inkColor}
                          strokeWidth={3.5}
                        />
                      </g>
                    ) : (
                      <line
                        x1={barX + barWidth}
                        y1={topLineY}
                        x2={barX + barWidth}
                        y2={bottomLineY}
                        stroke={inkColor}
                        strokeWidth={1.4}
                      />
                    )}
                  </g>
                );
              })}

              {/* Interactive Hover Ghost Notehead Preview */}
              {!printMode && hoverTarget && hoverTarget.sysIdx === sysIdx && (
                <g className="pointer-events-none">
                  <line
                    x1={hoverTarget.x - 14}
                    y1={hoverTarget.y}
                    x2={hoverTarget.x + 14}
                    y2={hoverTarget.y}
                    stroke={accentBlue}
                    strokeOpacity={0.35}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                  <g opacity={0.55}>
                    {renderNotehead(
                      {
                        instrumentId: hoverTarget.instrumentId,
                        staffStep: hoverTarget.staffStep,
                        notehead: INSTRUMENT_BY_ID[hoverTarget.instrumentId].notehead,
                        hit:
                          brushMode === 'accent'
                            ? 2
                            : brushMode === 'ghost'
                              ? 3
                              : brushMode === 'flam'
                                ? 4
                                : 1,
                        openArticulation:
                          INSTRUMENT_BY_ID[hoverTarget.instrumentId].openArticulation,
                        xShift: 0,
                      },
                      hoverTarget.x,
                      hoverTarget.y,
                      brushMode === 'erase' ? '#dc2626' : accentBlue
                    )}
                  </g>
                </g>
              )}
            </svg>
          </div>
        );
      })}

      {/* Optional Drum Notation Legend (great for printouts & classrooms) */}
      {showDrumKey && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">PAS Drum Key:</span>
          <span>⊗ Crash (Above Line 5)</span>
          <span>× Hi-Hat (Space Above 5) · ○ Open</span>
          <span>× Ride / ◇ Bell (Line 5)</span>
          <span>● High/Mid/Floor Toms (Spaces 4, Line 4, Space 2)</span>
          <span>● Snare / × X-Stick (Space 3)</span>
          <span>● Kick (Space 1, Stem Down)</span>
          <span>× Pedal HH (Below Line 1)</span>
          <span>&gt; Accent · (●) Ghost · ♪● Flam</span>
        </div>
      )}
    </div>
  );
};
