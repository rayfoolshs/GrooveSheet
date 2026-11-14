# SoundFont (`.sf2`), Web MIDI & SMF Export Reference

## 1. General MIDI SoundFont Playback

GrooveSheet routes all 13 drum rows through **General MIDI Channel 10** note numbers (`36–56`).

### Built-in Online SoundFont Kits
Selected from the toolbar dropdown or **MIDI & Map** modal:
- `fluid-standard` — **FluidR3 GM: Standard Kit** (`Bank 128 · Prog 0`) *(Default)*
- `fluid-room` — **FluidR3 GM: Room Kit** (`Bank 128 · Prog 8`)
- `fluid-power` — **FluidR3 GM: Power Kit** (`Bank 128 · Prog 16`)
- `fluid-electronic` — **FluidR3 GM: Electronic Kit** (`Bank 128 · Prog 24`)
- `chaos-standard` — **Chaos GM: Standard Kit** (`Bank 128 · Prog 0`)
- `jclive-standard` — **JC Live GM: Acoustic Kit** (`Bank 128 · Prog 0`)
- `synth` — **Built-in Web Audio Synth** (zero-download procedural synthesis)

Samples are requested from `/api/soundfont/drum/:kit/:note` and cached in server memory so repeated kit switches load immediately. If upstream samples are unreachable, playback falls back automatically to the built-in Web Audio drum synthesizer.

### Loading Custom `.sf2` SoundFont Files
1. Open **MIDI & Map** in the top navigation bar.
2. Click **Load Custom `.sf2`** and select any valid SoundFont 2 file (for example, `GeneralUser_GS.sf2` or `MuseScore_General.sf2`).
3. `src/audio/soundfont2.ts` parses the RIFF `sfbk` container locally in the browser, extracts all **Bank 128** percussion presets (`phdr`, `pbag`, `pgen`, `inst`, `ibag`, `igen`, `shdr`, `smpl`), decodes 16-bit PCM samples into Web Audio `AudioBuffer`s, and applies pitch correction, stereo panning, and Hi-Hat choke behavior.
4. If the `.sf2` file contains multiple percussion kits (e.g., Standard, Room, Power, Brush, Orchestra), use the **Bank 128 Preset** dropdown to switch between them.

---

## 2. Standard MIDI File (`.mid`) Export & Import

### Export Format (`SMF Format 0`)
- **Resolution**: `480 PPQN` (ticks per quarter note)
- **Channel**: Channel 10 (`0x99` Note On / `0x89` Note Off)
- **Meta Events**: Track Name (`FF 03`), Tempo (`FF 51 03`), Time Signature (`FF 58 04`)
- **Dynamic Velocities**:
  - Accent (`>`): `127`
  - Flam (`fr`): Grace note (`50`) at `-20` ticks + primary stroke (`112`)
  - Normal (`●`): `100`
  - Ghost (`g`): `38`
- **Swing**: Off-beat subdivisions are offset proportionally in ticks matching the studio Swing percentage (`0%–66%`).
- **Loop Repeats**: Export `1×` directly from the toolbar or `1× / 2× / 4× / 8×` loops via **Share Session → Download `.mid`**.

### Import Behavior
- Drag or select any `.mid` file in **Share Session → Import `.mid`**.
- Reads tempo (`FF 51`), time signature (`FF 58`), and Channel 10 / GM drum notes (`35–59`), mapping velocities into `Accent` (`>= 115`), `Normal`, and `Ghost` (`<= 52`) steps across `1`, `2`, or `4` bars.

---

## 3. External Web MIDI Hardware / DAW Output

In browsers supporting the **Web MIDI API** (`navigator.requestMIDIAccess`), open **MIDI & Map** and select an external MIDI port (hardware drum module, e-drum brain, or virtual loopback bus like IAC Driver / loopMIDI). Live playback and note auditions will transmit Channel 10 MIDI messages synchronized to the Web Audio scheduler.
