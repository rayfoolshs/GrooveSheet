# Changelog

All notable architectural improvements, fixes, and features implemented in **GrooveSheet** are documented here.

## Studio Enhancements & Corrections

### Audio Timing & General MIDI SoundFonts
- **Web Audio Lookahead Scheduler**: Replaced jitter-prone `setInterval` audio triggers with a sample-accurate Web Audio `AudioContext.currentTime` lookahead scheduler (`22ms` polling, `100ms` lookahead window) supporting swing micro-timing, 1-bar count-in, and metronome click.
- **General MIDI SoundFont Engine**: Added cached playback for **FluidR3 GM** (`Standard`, `Room`, `Power`, `Electronic`), **Chaos GM**, and **JC Live GM** drum kits, with seamless fallback to the built-in Web Audio synthesizer when offline.
- **Native `.sf2` Parser (`src/audio/soundfont2.ts`)**: Added browser-side RIFF SoundFont2 parsing for Bank 128 percussion presets, supporting custom `.sf2` uploads with root-key pitch correction, stereo panning, and Hi-Hat exclusive choke groups.

### Percussion Notation Engraving & Interactive Editing
- **Interactive Staff Canvas**: Added direct SVG pointer hit-testing (`getScreenCTM().inverse()`) with live ghost notehead previews so musicians can add, cycle, accent (`Shift+Click`), erase (`Right-Click`), and place alternate voices (`Open HH`, `Ride Bell`, `Cross-Stick`) directly on the staff.
- **Dual-Voice Engraving & Rest Collapsing**: Separated Hands (stems up) and Feet (stems down) with beat-grouped beaming, automatic duration collapsing (quarter, dotted, eighth, sixteenth, triplet), and clean suppression of redundant whole-bar foot rests.
- **Compound & Asymmetric Meters**: Implemented proper beat groupings and counting labels for `4/4`, `3/4`, `5/4`, `6/8` (`3+3`), `7/8` (`2+2+3`), and `12/8` (`3+3+3+3`).

### Logic-Style Smart Drummer & MIDI Export
- **Smart Drummer Studio (`src/utils/smartDrummer.ts`, `SmartDrummerPanel.tsx`)**: Added 6 drummer personas, a draggable 2D **Simple ↔ Complex / Soft ↔ Loud** XY pad, granular cymbal/snare/kick controls, end-of-phrase fills, swing control, and deterministic variation seeding.
- **Standard MIDI File Export & Import (`src/utils/midiExport.ts`)**: Implemented spec-compliant SMF Format 0 `.mid` binary export (`480 PPQN`, Channel 10, tempo/time signature meta events, velocity dynamics `127/100/38`, flam grace notes, swing timing, and `1×–8×` repeats) as well as `.mid` import.

### Collaboration, Print & Theme Ergonomics
- **Real-Time WebSocket Rooms (`server.ts`, `useCollaboration.ts`)**: Added room-based `?room=` URL sharing with server-authoritative groove state, live participant presence, remote cursor focus highlights, and auto-reconnect state sync.
- **Print-First Sheet Music**: Added dedicated `@media print` rules and a customizable **Print Preview** modal (counting syllables, PAS Drum Key legend, and performance notes).
- **Continuous Light-to-Dark Slider**: Replaced binary theme switching with a continuous `0%–100%` luminance slider (`Light`, `Soft`, `Dusk`, `Dark`), defaulting to **Dark at 50%** on initial load.
