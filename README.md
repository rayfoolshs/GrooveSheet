# GrooveSheet — Drum Groove Editor & Percussion Staff Studio

**Created by Ray Foo**

**GrooveSheet** is a real-time collaborative web application for writing, playing, generating, and printing drum grooves. It pairs an interactive **PAS Percussion Notation Staff**, a **Logic-style Smart Drummer Studio**, and a **multi-dynamic step sequencer grid** with **General MIDI SoundFont (`.sf2`) playback**, **Standard MIDI (`.mid`) export/import**, **real-time WebSocket jam/compose rooms**, and **print-ready sheet music**.

---

## Key Features

### 1. Interactive PAS Percussion Staff Notation (`SVG`)
- **Direct Staff Editing**: Hover over any beat and staff line/space to preview a ghost notehead; **left-click** to add or cycle notes (`Normal`, `Accent >`, `Ghost (·)`, `Flam`), **right-click** to erase, and **Shift + Click** to place an accent directly.
- **Shared Staff Positions (`Alt Voices`)**: Toggle **Alt Voices (Open HH / Bell / X-Stick)** or hold **Alt + Click** to place Open Hi-Hat (`o`), Ride Bell (`◇`), or Cross-Stick (`×`) directly on the staff.
- **Dual-Voice Engraving**: Hands (stems up) and Feet (stems down) are automatically grouped and beamed per beat with collapsed rests, triplet numerals (`3`), augmentation dots, percussion clef, stacked time signatures, and multi-bar systems (`1`, `2`, or `4` bars).

### 2. Logic-Style Smart Drummer Studio
- **6 Session Drummer Personas**: *Mason* (Rock), *Maya* (Funk), *Julian* (Jazz Swing), *Devon* (Boom Bap Hip-Hop), *Mateo* (Afro-Cuban & Bossa), and *Chloe* (Pop).
- **2D Performance XY Pad**: Drag across **Simple ↔ Complex** (X-axis) and **Soft ↔ Loud** (Y-axis) to shape syncopation, ghost-note density, and dynamics in real time.
- **Granular Kit Controls**: Configure Cymbal surface (`Hi-Hat`, `Ride`, `Ride Bell`, `Off`), Pattern Density (`1–4`), `Open HH Lift`, `Crash on Beat 1`, `Cowbell Pulse`, Snare Style (`Backbeat`, `Half-Time`, `Cross-Stick`, `Syncopated`), `Ghost Notes`, `Flams`, Kick Style & Density (`1–4`), `Fills` (`0–100%`), `Swing` (`0–66%`), and deterministic variations (`New Variation`).
- Every adjustment updates the live staff, step grid, playback, and `.mid` export immediately.

### 3. Multi-Dynamic Step Notation Grid
- **13 General MIDI Channel 10 Drum Voices** (`GM 36–56`): Crash, Ride, Ride Bell, Hi-Hat Open, Hi-Hat Closed, Cowbell, High Tom, Mid Tom, Snare, Cross-Stick, Floor Tom, Bass Drum (Kick), and Pedal Hi-Hat.
- **5 Dynamic States per Step**: Off, Normal (`vel 100`), Accent (`vel 127`), Ghost (`vel 38`), and Flam (`vel 112` + 20ms grace note).
- **Expressive Editing**: Pointer drag-painting, stroke brush tools (`Cycle`, `Normal`, `Accent`, `Ghost`, `Flam`, `Erase`), bar duplication, Undo/Redo (`Ctrl+Z` / `Ctrl+Y`), and per-track Audition, Mute (`M`), Solo (`S`), and Volume faders.

### 4. General MIDI SoundFont (`.sf2`) & Web Audio Engine
- **Sample-Accurate Lookahead Scheduler**: Uses `AudioContext.currentTime` lookahead scheduling (`22ms` polling, `100ms` lookahead) for tight timing, swing micro-timing, 1-bar count-in, tap tempo, and metronome click.
- **Built-in GM SoundFont Kits**: Defaults to **FluidR3 GM: Standard Kit** (`Bank 128 · Prog 0`) and includes **FluidR3 Room**, **FluidR3 Power**, **FluidR3 Electronic**, **Chaos Standard**, **JC Live Acoustic**, plus an offline **Built-in Web Audio Synth** fallback.
- **Custom `.sf2` File Support**: Load any standard SoundFont 2 (`.sf2`) file in the browser via **MIDI & Map** to extract and play its Bank 128 percussion presets natively, complete with **Hi-Hat Choke Group** (`Closed`/`Pedal` chokes `Open Hi-Hat`).
- **External Web MIDI Output**: Route live Channel 10 MIDI events to connected hardware drum modules or virtual DAW ports when supported by the browser.

### 5. Meters, Library, MIDI Export/Import, Print & Collaboration
- **Meters & Subdivisions**: `4/4`, `3/4`, `5/4`, `6/8`, `7/8`, and `12/8` with `16th Notes`, `8th Notes`, and `8th Triplets`.
- **Groove Library**: 14 curated grooves across Rock, Funk, Shuffle, Jazz, Latin/Afro-Cuban, Hip-Hop, Odd Meters, and Rudiments, plus custom groove saving/deletion.
- **Standard MIDI (`.mid`) & JSON**: Spec-compliant SMF Format 0 `.mid` export (`480 PPQN`, Channel 10, tempo/meter meta events, swing, flams, dynamic velocities, and `1×–8×` loop repeats) plus `.mid` and `.json` file import.
- **Print Sheet Music**: Dedicated Print Preview modal and `@media print` vector layout with optional beat counting, PAS Drum Key legend, and performance notes.
- **Real-Time Collaboration**: Share `?room=<code >` links over WebSockets for synchronized multi-user editing, live participant presence, and remote cell cursor highlights.
- **Continuous Light-to-Dark Theme Slider**: Smooth `0%–100%` luminance slider (`Light`, `Soft`, `Dusk`, `Dark`) defaulting to **Dark at 50%**.

---

## Quick Start

### Prerequisites
- **Node.js** `20+`
- **npm**

### Install & Run (Development)
```bash
npm install
npm run dev
```
The Express + Vite + WebSocket server runs at **`http://localhost:3000`**.

### Production Build & Start
```bash
npm run build
npm run start
```

### Typecheck / Lint
```bash
npm run lint
```

---

## Project Structure

```text
├── index.html                        # HTML entry point & Google Fonts (Outfit, Plus Jakarta Sans, JetBrains Mono)
├── metadata.json                     # App metadata
├── package.json                      # Dependencies and npm scripts
├── server.ts                         # Express HTTP server, WebSocket room sync (/ws), Library API & SoundFont cache
├── vite.config.ts                    # Vite + React + Tailwind v4 configuration
├── docs/
│   └── SOUNDFONT_AND_MIDI.md         # Detailed SoundFont (.sf2), Web MIDI, and SMF (.mid) reference
└── src/
    ├── App.tsx                       # Main studio layout, transport, theme slider & state orchestration
    ├── index.css                     # Tailwind v4 setup, CSS theme variables & @media print rules
    ├── main.tsx                      # React root mount
    ├── audio/
    │   ├── drumEngine.ts             # Web Audio lookahead scheduler, GM SoundFont loader & synth fallback
    │   └── soundfont2.ts             # Native RIFF SoundFont2 (.sf2) parser & Bank 128 kit extractor
    ├── components/
    │   ├── GrooveLibraryModal.tsx    # Searchable preset & custom groove library modal
    │   ├── MidiGuideModal.tsx        # SoundFont selector, .sf2 uploader, Web MIDI routing & GM map
    │   ├── NotationGrid.tsx          # Interactive multi-dynamic step sequencer matrix
    │   ├── PercussionStaff.tsx       # Interactive SVG PAS percussion staff engraver
    │   ├── PrintPreviewModal.tsx     # Print-ready sheet music preview modal
    │   ├── ShareSessionModal.tsx     # Real-time WebSocket room manager & MIDI/JSON import/export
    │   └── SmartDrummerPanel.tsx     # Logic-style Smart Drummer XY pad & kit settings panel
    ├── data/
    │   ├── grooveLibrary.ts          # 14 curated preset grooves across 7 styles
    │   └── instruments.ts            # PAS staff steps, notehead shapes & GM Channel 10 note mapping
    ├── hooks/
    │   └── useCollaboration.ts       # Auto-reconnecting WebSocket client & delta sync hook
    ├── types/
    │   └── groove.ts                 # Core TypeScript domain & WebSocket protocol types
    └── utils/
        ├── grooveHelpers.ts          # Meter math, beat grouping, swing offsets & grid resizing
        ├── midiExport.ts             # Standard MIDI File (SMF Format 0) binary exporter & importer
        ├── notationLayout.ts         # Dual-voice beat beaming & rhythmic rest collapsing engine
        └── smartDrummer.ts           # Algorithmic Smart Drummer groove & fill generator
```

---

## Keyboard Shortcuts & Gestures

| Action | Shortcut / Gesture |
| --- | --- |
| Play / Stop Transport | `Space` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` (or `Cmd+Z` / `Cmd+Shift+Z`) |
| Add / Cycle Stroke (Grid or Staff) | `Left-Click` (or drag across Grid cells) |
| Erase Cell / Staff Note | `Right-Click` |
| Direct Accent Hit (`>`) | `Shift + Left-Click` |
| Alternate Staff Voice (`Open HH`, `Ride Bell`, `Cross-Stick`) | `Alt + Left-Click` or toggle **Alt Voices** |

---

## General MIDI Channel 10 & PAS Staff Mapping

| Instrument | GM Note | PAS Staff Position | Notehead | Voice |
| --- | --- | --- | --- | --- |
| Cowbell | `56` | Above ledger line (`B5`) | Triangle | Hands (Up) |
| Crash Cymbal | `49` | Ledger line above staff (`A5`) | Circled X | Hands (Up) |
| Hi-Hat (Closed) | `42` | Space above line 5 (`G5`) | X | Hands (Up) |
| Hi-Hat (Open) | `46` | Space above line 5 (`G5`) + `o` | X | Hands (Up) |
| Ride Cymbal | `51` | Top line / Line 5 (`F5`) | X | Hands (Up) |
| Ride Bell | `53` | Top line / Line 5 (`F5`) | Diamond | Hands (Up) |
| High Tom | `48` | 4th space (`E5`) | Oval | Hands (Up) |
| Mid Tom | `45` | 4th line (`D5`) | Oval | Hands (Up) |
| Snare Drum | `38` | 3rd space (`C5`) | Oval | Hands (Up) |
| Cross-Stick / Rim | `37` | 3rd space (`C5`) | X | Hands (Up) |
| Floor Tom | `43` | 2nd space (`A4`) | Oval | Hands (Up) |
| Bass Drum (Kick) | `36` | 1st space (`F4`) | Oval | Feet (Down) |
| Hi-Hat (Pedal) | `44` | Space below line 1 (`D4`) | X | Feet (Down) |

---

## Server API & WebSocket Endpoints

| Endpoint | Method / Protocol | Purpose |
| --- | --- | --- |
| `/api/health` | `GET` | Server health and active room count |
| `/api/library` | `GET`, `POST` | List or save custom user grooves |
| `/api/library/:id` | `DELETE` | Delete a custom saved groove |
| `/api/rooms/:roomId` | `GET` | Fetch authoritative room groove state |
| `/api/soundfont/drum/:kit/:note` | `GET` | Cached General MIDI SoundFont drum sample loader |
| `/ws` | `WebSocket` | Real-time room collaboration (`join`, `cell:set`, `meta:update`, `groove:load`, `cursor:focus`, `presence:rename`) |

---

## Credits

**GrooveSheet** — Created by **Ray Foo**.

