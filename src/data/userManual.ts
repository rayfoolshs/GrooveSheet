/**
 * Official GrooveSheet User Manual (Edition 2026.1).
 *
 * Content mirrors the printed A4 reference manual so the studio and the
 * PDF stay in sync. Rendered by `src/components/UserManual.tsx`.
 */

export type ManualBlock =
  | { kind: 'p'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'defs'; items: { term: string; description: string }[] }
  | { kind: 'callout'; title: string; body: string }
  | { kind: 'figure'; title: string; caption?: string; marks: { label: string; note: string }[] }
  | { kind: 'chips'; title: string; items: { label: string; value: string }[] }
  | { kind: 'table'; title?: string; columns: string[]; rows: string[][] };

export interface ManualChapter {
  id: string;
  number: string;
  title: string;
  readTime: string;
  lead: string;
  blocks: ManualBlock[];
}

export interface UserManual {
  edition: string;
  title: string;
  subtitle: string;
  creator: string;
  appUrl: string;
  intro: string;
  chapters: ManualChapter[];
}

export const USER_MANUAL: UserManual = {
  edition: 'Edition 2026.1',
  title: 'GrooveSheet',
  subtitle: 'Drum Groove Editor & Percussion Staff Studio',
  creator: 'Ray Foo',
  appUrl: 'https://rayfoolshs.github.io/GrooveSheet/',
  intro:
    'Official reference manual for the GrooveSheet studio: notation, sequencer, Smart Drummer, General MIDI, printing, file I/O, and real-time collaboration.',
  chapters: [
    {
      id: 'manual-chapter-01',
      number: '01',
      title: 'Studio Overview & Workspace Anatomy',
      readTime: '4 min read',
      lead: 'Understanding the dual-view notation canvas, document metadata, and continuous luminance theme.',
      blocks: [
        {
          kind: 'p',
          text: 'GrooveSheet bridges tactile step sequencing with live Percussive Arts Society (PAS) drum notation. Every click in the grid immediately engraves onto the musical staff, and every click on the staff updates the step matrix and audio engine.',
        },
        {
          kind: 'p',
          text: 'GrooveSheet is a browser-based drum groove studio designed for drummers, educators, session players, and arrangers. Unlike standard beatboxes that hide musical rhythms behind abstract boxes—or traditional notation programs that feel stiff during groove composition—GrooveSheet synchronizes both views in real time.',
        },
        {
          kind: 'p',
          text: 'When you open the studio, a default 16th-Note Funk pattern with snare ghost notes is loaded immediately so you can press Space to audition audio, toggle tracks, or begin engraving right away.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Top Studio Header',
              description:
                'Provides one-click access to Groove Library, Print Sheet, MIDI & Map, Share Session (or active Room status), and the Smart Drummer toggle.',
            },
            {
              term: 'Transport & Meter Ribbon',
              description:
                'Houses Play/Stop, Loop, 1-Bar Count-In, Metronome Click + Volume, Tempo BPM stepper & Tap Tempo, Time Signature, Grid Subdivision, Bar Count (1, 2, or 4 bars), SoundFont Selector, Undo/Redo, Quick MIDI Export, Quick Print, and the Continuous Theme Slider.',
            },
            {
              term: 'Groove Metadata Header',
              description:
                'Editable inline fields for Groove Title, Musical Style, and Composer name. These fields propagate directly to Printable Sheet Music headers and MIDI Track Name meta events.',
            },
            {
              term: 'Live Percussion Staff',
              description:
                'An interactive SVG engraving of your groove using dual-voice stems, beat beaming, and rest collapsing.',
            },
            {
              term: 'Interactive Step Matrix & Mixer',
              description:
                'A 13-row percussion sequencer with Brush Modes (Cycle, Normal, Accent, Ghost, Flam, Erase) and per-instrument Mute, Solo, and Volume controls.',
            },
          ],
        },
        {
          kind: 'callout',
          title: 'Continuous Light-to-Dark Luminance Slider',
          body: 'Rather than forcing a binary light/dark switch, GrooveSheet provides a smooth 0% to 100% Theme Tone slider in the top-right transport ribbon. At 0% ("Light"), the studio mimics crisp archival sheet paper suited for bright classrooms or stage stands. Sliding toward 50% ("Dusk", the default) and 100% ("Dark") shifts surfaces to low-glare slate tones calibrated for dimly lit practice rooms and studio desks.',
        },
        {
          kind: 'callout',
          title: 'Print Independence',
          body: 'Regardless of your on-screen Theme Tone setting (even at 100% Dark mode), Print Preview and @media print automatically switch to high-contrast black ink on pure white paper so sheet music prints cleanly without wasting toner.',
        },
      ],
    },
    {
      id: 'manual-chapter-02',
      number: '02',
      title: 'Transport, Meters, Subdivisions & Swing',
      readTime: '5 min read',
      lead: 'Sample-accurate lookahead timing, odd & compound meters, Tap Tempo, and bipolar micro-timing.',
      blocks: [
        {
          kind: 'p',
          text: 'GrooveSheet replaces jitter-prone browser timers with a Web Audio lookahead scheduler running at 22ms polling intervals and a 100ms lookahead window—ensuring rock-solid pocket even under heavy UI rendering.',
        },
        {
          kind: 'p',
          text: 'Timing integrity is paramount for drum practice. GrooveSheet schedules every drum hit, flam grace note, count-in click, and metronome tick directly against AudioContext.currentTime. You can start or stop playback anytime with the Spacebar.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Loop & 1-Bar Count-In',
              description:
                'Enable Loop to cycle seamlessly across 1, 2, or 4 bars. Toggle Count-In to hear a full bar of accented downbeat and subdivision clicks before step 1 triggers—ideal for practicing along on an acoustic or electronic kit.',
            },
            {
              term: 'Metronome & Independent Gain',
              description:
                'Toggle the built-in woodblock/click metronome independently of your drum kit, and balance its level with the inline Metronome Volume slider.',
            },
            {
              term: 'Tempo BPM & Tap Tempo',
              description:
                'Adjust tempo via the - / + steppers, direct numeric input, or click Tap rhythmically in time to calculate and lock in the BPM of a song you are listening to.',
            },
            {
              term: 'Non-Destructive Grid Resizing',
              description:
                'Switching between 1, 2, or 4 bars—or changing Time Signatures and Subdivisions—smartly preserves or extends existing pattern data without wiping your groove.',
            },
          ],
        },
        {
          kind: 'callout',
          title: 'Bipolar Swing / Shuffle Control (-66% to +66%)',
          body: 'Located directly beneath the transport bar, the Swing / Shuffle control applies proportional micro-timing offsets to off-beat subdivisions across all 13 drum instruments simultaneously, displaying the exact shift in milliseconds alongside the percentage. Positive values (+1% to +66%) push off-beats backward (late), moving smoothly from subtle 16th-note pocket (+12%) through classic triplet swing (+50%) up to hard dotted shuffle (+66%). Negative values (-1% to -66%) nudge off-beats forward (early) for rushed, pushing punk or experimental feels. Double-click the slider or click Straight (0%) to snap back to quantized time.',
        },
        {
          kind: 'figure',
          title: 'Bipolar Swing & Shuffle Micro-Timing (-66% to +66%)',
          caption: 'Off-beat displacement from early push through straight time to hard shuffle.',
          marks: [
            { label: 'Forward', note: '-33%' },
            { label: 'Straight', note: '0%' },
            { label: 'Triplet Swing', note: '+50%' },
            { label: 'Hard Shuffle', note: '+66%' },
          ],
        },
        {
          kind: 'table',
          title: 'Meter reference',
          columns: ['Meter', 'Type', 'Beat groups', 'Subdivision steps', 'Counting syllables'],
          rows: [
            ['4/4', 'Simple', '1 + 1 + 1 + 1 (4 quarters)', '16 steps (8 in 8th, 12 in triplet)', '1 e & a 2 e & a 3 e & a 4 e & a'],
            ['3/4', 'Simple', '1 + 1 + 1 (3 quarters)', '12 steps (6 in 8th, 9 in triplet)', '1 e & a 2 e & a 3 e & a'],
            ['5/4', 'Asymmetric', '3 + 2 or 5 quarter beats', '20 steps (10 in 8th, 15 in triplet)', '1 e & a 2 e & a 3 e & a 4 e & a 5 e & a'],
            ['6/8', 'Compound', '3 + 3 (2 dotted-quarter beams)', '12 steps (6 in 8th)', '1 & 2 & 3 & 4 & 5 & 6 &'],
            ['7/8', 'Asymmetric', '2 + 2 + 3 macro-beats', '14 steps (7 in 8th)', '1 & 2 & 3 & 4 & 5 & 6 & 7 &'],
            ['12/8', 'Compound', '3 + 3 + 3 + 3 (4 dotted-quarter beams)', '24 steps (12 in 8th)', '1-2-3 4-5-6 7-8-9 10-11-12'],
          ],
        },
      ],
    },
    {
      id: 'manual-chapter-03',
      number: '03',
      title: 'Interactive PAS Percussion Staff Engraving',
      readTime: '5 min read',
      lead: 'Engrave directly on the five-line staff with dual-voice beaming, rest collapsing, and alternate voices.',
      blocks: [
        {
          kind: 'p',
          text: 'GrooveSheet renders publication-grade Percussive Arts Society (PAS) notation in real time, complete with interactive SVG pointer hit-testing and live ghost notehead previews.',
        },
        {
          kind: 'p',
          text: 'Every drum voice is engraved onto a standard 5-line percussion staff using a neutral clef. Hovering your cursor anywhere over the staff displays a translucent ghost preview of the exact notehead, step position, and instrument name before you click.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Dual-Voice Engraving (Hands vs. Feet)',
              description:
                'Upper-body instruments (Cymbals, Cowbell, Toms, Snare, Cross-Stick) are engraved in Voice 1 with stems pointing UP and beat-grouped beams. Lower-body instruments (Bass Drum Kick and Pedal Hi-Hat) are engraved in Voice 2 with stems pointing DOWN.',
            },
            {
              term: 'Automatic Rest Collapsing & Foot Rest Suppression',
              description:
                'Empty subdivisions automatically collapse into clean musical rests (quarter, dotted eighth, eighth, sixteenth, or triplet rests). When an entire measure contains no foot hits, redundant whole-bar foot rests are suppressed for cleaner sight-reading.',
            },
            {
              term: 'Shared Staff Lines & Alt Voices',
              description:
                'Three staff positions host two distinct instruments differentiated by notehead or articulation: Space above Line 5 (Closed Hi-Hat vs. Open Hi-Hat o), Top Line 5 (Ride X vs. Ride Bell diamond), and 3rd Space (Snare oval vs. Cross-Stick X). Toggle "Alt Voices" above the staff or hold Alt + Left-Click to place the alternate sound directly.',
            },
            {
              term: 'Direct Staff Gestures',
              description:
                'Left-Click adds or applies your active Brush Mode; Shift + Left-Click places an immediate Accent (>); Right-Click erases any notehead cleanly.',
            },
          ],
        },
        {
          kind: 'chips',
          title: 'PAS 5-line percussion staff & General MIDI key',
          items: [
            { label: 'Cowbell', value: '56' },
            { label: 'Crash', value: '49' },
            { label: 'HH Open', value: '46' },
            { label: 'HH Closed', value: '42' },
            { label: 'Ride', value: '51' },
            { label: 'Ride Bell', value: '53' },
            { label: 'Hi Tom', value: '48' },
            { label: 'Mid Tom', value: '45' },
            { label: 'Snare', value: '38' },
            { label: 'Cross-Stick', value: '37' },
            { label: 'Floor Tom', value: '43' },
            { label: 'Kick', value: '36' },
            { label: 'HH Foot', value: '44' },
          ],
        },
      ],
    },
    {
      id: 'manual-chapter-04',
      number: '04',
      title: 'Step Sequencer Matrix, Brushes & Track Mixer',
      readTime: '4 min read',
      lead: 'Multi-dynamic stroke painting, drag gestures, hi-hat choke groups, and per-voice mixing.',
      blocks: [
        {
          kind: 'p',
          text: 'For fast pattern programming, the 13-row Step Matrix aligns every subdivision column vertically beneath its corresponding staff note, letting you paint dynamics across multiple instruments in seconds.',
        },
        {
          kind: 'p',
          text: 'Instruments are arranged vertically from highest physical kit position (Crash, Ride, Ride Bell, Open/Closed Hi-Hat, Cowbell) down through Toms and Snare to Kick and Pedal Hi-Hat—matching the exact vertical order of the musical staff above.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Click-and-Drag Painting',
              description:
                'Select a dedicated Brush Mode (Normal, Accent, Ghost, Flam, or Erase) and sweep horizontally across any row to paint hi-hat ostinatos, ghosted snare rolls, or four-on-the-floor kick lines in a single stroke.',
            },
            {
              term: 'Cycle Mode (Default)',
              description:
                'Clicking a cell in Cycle mode steps sequentially through Off -> Normal -> Accent -> Ghost -> Flam -> Off, ideal for fine-tuning individual hits without switching tools.',
            },
            {
              term: 'Hi-Hat Exclusive Choke Group',
              description:
                'To replicate acoustic hi-hat physics, triggering a Closed Hi-Hat (GM 42) or Pedal Hi-Hat (GM 44) immediately chokes any ringing Open Hi-Hat (GM 46) sustain.',
            },
            {
              term: 'Track Mixer (Mute, Solo & Volume)',
              description:
                'Click any instrument label to audition its sound immediately. Use the M (Mute) and S (Solo) buttons to isolate specific limbs (for example, Solo Kick + Snare to check pocket tightness), and adjust each row volume slider independently.',
            },
          ],
        },
        {
          kind: 'table',
          title: 'Brush modes & MIDI velocity',
          columns: ['Brush', 'Mark', 'MIDI velocity', 'Staff rendering', 'Behavior'],
          rows: [
            ['Cycle', '↻', 'Cycles 0 → 1 → 2 → 3 → 4 → 0', 'Cycles through Off, Normal, Accent, Ghost, Flam', 'Default smart paint mode. Repeated clicks step through all dynamic articulations.'],
            ['Normal', '●', 'MIDI Vel 100', 'Standard solid notehead', 'Paints standard full-bodied drum strokes across clicked or dragged steps.'],
            ['Accent', '>', 'MIDI Vel 127', 'Notehead with > articulation mark', 'Paints emphasized backbeats and cymbal crashes. Also accessible via Shift+Click.'],
            ['Ghost', '(·)', 'MIDI Vel 38', 'Parenthesized notehead (o)', 'Paints quiet, subtle inner-beat snare taps and feather kicks.'],
            ['Flam', 'fr', 'Grace 50 (-20 ticks) + Main 112', 'Slashed grace notehead linked to primary stroke', 'Schedules a tight double-stroke grace hit just ahead of the primary beat.'],
            ['Erase', '×', '0 (Off)', 'Removes notehead / collapses into rest', 'Clears hits on click or drag without needing Right-Click.'],
          ],
        },
      ],
    },
    {
      id: 'manual-chapter-05',
      number: '05',
      title: 'Smart Drummer Studio',
      readTime: '5 min read',
      lead: 'Algorithmic session drummer personas, 2D Complexity/Intensity XY pad, and end-of-phrase fills.',
      blocks: [
        {
          kind: 'p',
          text: 'Inspired by Logic Pro Drummer, GrooveSheet includes an algorithmic Smart Drummer engine that composes musical, human-feeling drum charts tailored to your time signature, bar length, and stylistic preferences.',
        },
        {
          kind: 'p',
          text: 'Toggle Smart Drummer from the header or workspace toolbar to reveal the session drummer console. Selecting any of the six personas loads curated stylistic defaults while immediately generating a fresh pattern into both the Step Matrix and Percussion Staff—ready for manual editing.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Interactive 2D XY Pad',
              description:
                'Drag the XY puck horizontally to dial rhythmic density from Simple (sparse backbone grooves) to Complex (syncopated inner-beats and busy kick/snare interplay), and vertically from Soft (ghosted, restrained dynamics) to Loud (accented crashes and forceful backbeats).',
            },
            {
              term: 'Timekeeper & Kit Arrangement Controls',
              description:
                'Customize the primary cymbal surface (Hi-Hat, Ride, Bell, or Off), Cymbal Pattern Density (Levels 1–4), Open Hi-Hat Lifts, Crash on Beat 1, Snare Style (Backbeat, Syncopated, Cross-Stick) with Ghost Notes & Flams, Kick Style & Density, and optional Cowbell ostinato.',
            },
            {
              term: 'Fills, Swing & Variation Seeding',
              description:
                'Dial in End-of-Phrase Fill Amount (0–100%) to insert tom/snare turnarounds at the end of 2-bar or 4-bar phrases. Click "New Variation" to roll a new deterministic rhythmic seed using your current parameters, or click "Export MIDI (.mid)" directly from the panel.',
            },
          ],
        },
        {
          kind: 'table',
          title: 'Session drummer personas',
          columns: ['Persona', 'Genre', 'Default signature', 'Style & arrangement'],
          rows: [
            ['Mason', 'Classic & Modern Rock', '112 BPM / 16th', 'Driving hi-hat, beat 1 crash, crisp backbeat snare, punchy standard kick.'],
            ['Maya', '16th-Note Pocket & Ghost Funk', '96 BPM / 16th', 'Dense 16th hi-hat, syncopated snare + ghost notes, open hi-hat lifts, +12% swing.'],
            ['Julian', 'Acoustic Jazz Swing', '136 BPM / Triplet', 'Ride cymbal spang-a-lang, syncopated snare comping, sparse feather kick.'],
            ['Devon', 'Boom Bap & Neo-Soul Swing', '90 BPM / 16th', 'Heavy +38% off-beat swing, double-kick pockets, ghost snare taps.'],
            ['Mateo', 'Afro-Cuban & Bossa', '114 BPM / 16th', 'Ride bell timekeeper, cross-stick clave, active cowbell layer, tumbao kick.'],
            ['Chloe', 'Indie & Four-on-the-Floor Pop', '118 BPM / 16th', 'Tight four-on-the-floor kick foundation, clean backbeat, controlled fills.'],
          ],
        },
      ],
    },
    {
      id: 'manual-chapter-06',
      number: '06',
      title: 'General MIDI, Custom SoundFonts (.sf2) & Web MIDI',
      readTime: '6 min read',
      lead: 'Bank 128 percussion kits, browser-side RIFF SoundFont2 parsing, and external hardware routing.',
      blocks: [
        {
          kind: 'p',
          text: 'GrooveSheet routes all 13 drum voices through standard General MIDI Channel 10 note numbers (36–56), supporting built-in SoundFonts, custom .sf2 file uploads, procedural synth fallback, and live Web MIDI output.',
        },
        {
          kind: 'p',
          text: 'Audio playback uses real General MIDI SoundFont samples cached via /api/soundfont/drum/:kit/:note. If your device is offline or an upstream sample cannot be reached, GrooveSheet transparently falls back to its built-in procedural Web Audio drum synthesizer with zero interruption.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Built-In SoundFont Kits',
              description:
                'Switch anytime from the transport dropdown or MIDI & Map modal between FluidR3 GM (Standard, Room, Power, Electronic), Chaos GM Standard, JC Live GM Acoustic, and Built-in Web Audio Synth.',
            },
            {
              term: 'Loading Custom .sf2 Files Locally',
              description:
                'Open MIDI & Map and click "Load Custom .sf2" to select any SoundFont 2 archive from your computer (such as GeneralUser_GS.sf2 or MuseScore_General.sf2). GrooveSheet parses the RIFF sfbk binary locally in your browser, extracts all Bank 128 percussion presets, decodes 16-bit PCM samples, and applies pitch correction, stereo panning, and Hi-Hat choke groups.',
            },
            {
              term: 'External Web MIDI Hardware / DAW Output',
              description:
                'In Chromium-based browsers supporting navigator.requestMIDIAccess, open MIDI & Map to select an external MIDI port (e-drum module, hardware drum machine, or virtual bus such as macOS IAC Driver or Windows loopMIDI). Live playback and auditions transmit synchronized Channel 10 MIDI notes.',
            },
          ],
        },
        {
          kind: 'table',
          title: 'Instrument map: General MIDI, staff position & voice',
          columns: ['Instrument', 'GM #', 'PAS staff position', 'Notehead', 'Voice'],
          rows: [
            ['Cowbell', '56', 'Above ledger line (B5)', 'Triangle', 'Hands (stems up)'],
            ['Crash Cymbal', '49', 'Ledger line above staff (A5)', 'Circled X', 'Hands (stems up)'],
            ['Hi-Hat (Open)', '46', 'Space above line 5 (G5) + o', 'X + open ring (o)', 'Hands (stems up)'],
            ['Hi-Hat (Closed)', '42', 'Space above line 5 (G5)', 'X', 'Hands (stems up)'],
            ['Ride Cymbal', '51', 'Top line / Line 5 (F5)', 'X', 'Hands (stems up)'],
            ['Ride Bell', '53', 'Top line / Line 5 (F5)', 'Diamond', 'Hands (stems up)'],
            ['High Tom', '48', '4th space (E5)', 'Oval', 'Hands (stems up)'],
            ['Mid Tom', '45', '4th line (D5)', 'Oval', 'Hands (stems up)'],
            ['Snare Drum', '38', '3rd space (C5)', 'Oval', 'Hands (stems up)'],
            ['Cross-Stick / Rim', '37', '3rd space (C5)', 'X', 'Hands (stems up)'],
            ['Floor Tom', '43', '2nd space (A4)', 'Oval', 'Hands (stems up)'],
            ['Bass Drum (Kick)', '36', '1st space (F4)', 'Oval', 'Feet (stems down)'],
            ['Hi-Hat (Pedal)', '44', 'Space below line 1 (D4)', 'X', 'Feet (stems down)'],
          ],
        },
      ],
    },
    {
      id: 'manual-chapter-07',
      number: '07',
      title: 'Groove Library, Print Sheet Music & File I/O',
      readTime: '5 min read',
      lead: '14 curated study presets, custom groove persistence, print-ready engraving, and SMF Format 0 MIDI.',
      blocks: [
        {
          kind: 'p',
          text: 'Load classic beats across seven genres, save your own patterns to the library, export clean vector sheet music PDFs, and move patterns seamlessly into any DAW via Standard MIDI Files.',
        },
        {
          kind: 'p',
          text: 'The Groove Library includes 14 curated grooves spanning Rock, Funk, Shuffle/Blues, Jazz, Latin/Afro-Cuban, Hip-Hop, Soul/R&B, Odd Meters (5/4 and 7/8), and Rudiments. Filter by style or search by keyword, and save your own creations as custom presets stored via the studio library API.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Print Sheet Music Preview',
              description:
                'Click Print Sheet to open a clean paper preview. Toggle Beat Counting syllables, the PAS Drum Key legend, and Performance Notes on or off before clicking Print / Save PDF.',
            },
            {
              term: 'Standard MIDI File (.mid) Export',
              description:
                'Exports spec-compliant SMF Format 0 at 480 PPQN on Channel 10, including Track Name, Tempo, and Time Signature meta events, dynamic velocities (127 Accent, 112 Main / 50 Grace Flam, 100 Normal, 38 Ghost), proportional swing tick offsets, and 1x / 2x / 4x / 8x loop repeats via Share Session.',
            },
            {
              term: 'MIDI (.mid) & JSON Import',
              description:
                'Inside Share Session, import existing .mid files (reading tempo, meter, and GM Channel 10 notes 35–59 into Accent/Normal/Ghost cells) or full .json GrooveDocument backups.',
            },
          ],
        },
        {
          kind: 'table',
          title: 'Curated groove library',
          columns: ['#', 'Preset title', 'Style', 'Level', 'Description'],
          rows: [
            ['1', 'Classic 8th-Note Rock Pocket', 'Rock', 'Beginner', 'Driving eighth-note hi-hats with accented backbeats on 2 & 4 and a syncopated kick push into beat 4.'],
            ['2', '16th-Note Funk with Snare Ghosts', 'Funk', 'Intermediate', 'Tight 16th-note pocket with ghosted snare inner-beats, accented backbeats, and an open hi-hat lift on the & of 4.'],
            ['3', 'Half-Time Triplet Shuffle', 'Shuffle / Blues', 'Intermediate', 'Classic half-time shuffle in 4/4 triplets with snare backbeat on beat 3 and triplet ghost-note weave.'],
            ['4', 'Up-Tempo Jazz Ride & Feather Kick', 'Jazz', 'Intermediate', 'Traditional spang-a-lang ride cymbal pattern in triplets, crisp pedal hi-hat on 2 & 4, and comping snare/kick.'],
            ['5', 'Bossa Nova (Cross-Stick & Surdo Kick)', 'Latin / Afro-Cuban', 'Intermediate', 'Two-bar 3-2 clave cross-stick pattern over steady eighth-note hi-hats and classic dotted-quarter/eighth bass drum ostinato.'],
            ['6', 'Afro-Cuban Songo (Bell + Ghost Snare)', 'Latin / Afro-Cuban', 'Advanced', 'Syncopated bell ostinato paired with linear-style snare backbeats, ghost notes, floor tom accents, and tumbao kick.'],
            ['7', '90s Boom Bap Hip-Hop Swing', 'Hip-Hop', 'Beginner', 'Swung 16th-note pocket with punchy double kicks, crisp snare crack, and open hi-hat breath on the upbeat.'],
            ['8', 'Motown Four-on-the-Floor', 'Soul / R&B', 'Beginner', 'Driving quarter-note bass drum under tambourine-like 8th hi-hats and signature unison snare + flam accents.'],
            ['9', '5/4 Cool Jazz Ostinato', 'Odd Meter', 'Intermediate', 'Classic 3+2 phrasing in 5/4 time with ride swing feel, pedal hi-hat on 2 & 4, and cross-stick accents.'],
            ['10', '7/8 Fusion Groove (2+2+3)', 'Odd Meter', 'Advanced', 'Asymmetric 2+2+3 pulse in 7/8 with Ride Bell accents marking the three macro-beats and syncopated snare.'],
            ['11', '6/8 Soul & Gospel Ballad', 'Soul / R&B', 'Beginner', 'Lush 6/8 compound meter with gentle eighth-note hi-hats, solid backbeat on count 4, and melodic tom turnaround.'],
            ['12', 'Linear 16th-Note Gospel Fill Groove', 'Funk', 'Advanced', 'No two limbs strike simultaneously in beat 4 — clean single-stroke orchestration across snare, hi-hat, kick, and toms.'],
            ['13', '3/4 Jazz Waltz', 'Jazz', 'Beginner', 'Swinging 3/4 jazz waltz featuring ride cymbal phrasing, pedal hi-hat on beat 2, and light snare conversation.'],
            ['14', 'Paradiddle Groove Exercise (RLRR LRLL)', 'Rudiments', 'Intermediate', 'Applies the single paradiddle sticking between hi-hat (R) and ghosted snare (L) with accented backbeats and kick anchor.'],
          ],
        },
      ],
    },
    {
      id: 'manual-chapter-08',
      number: '08',
      title: 'Real-Time Collaboration & Quick Reference',
      readTime: '4 min read',
      lead: 'WebSocket studio rooms, live cursor presence, keyboard shortcuts, and server API endpoints.',
      blocks: [
        {
          kind: 'p',
          text: 'Collaborate live with students, bandmates, or co-writers over WebSockets using shareable room URLs, and keep the complete shortcut reference within reach.',
        },
        {
          kind: 'p',
          text: 'Click Share Session in the top header to create or join a real-time studio room. GrooveSheet generates a shareable URL containing ?room=<code>. Anyone opening that link connects via WebSockets (/ws) to a server-authoritative groove session.',
        },
        {
          kind: 'defs',
          items: [
            {
              term: 'Live Presence & Remote Cursors',
              description:
                'Every participant receives a distinct color badge and can set their display name. As collaborators hover or edit cells in the matrix, remote focus highlights show exactly where each musician is working.',
            },
            {
              term: 'Auto-Reconnect State Sync',
              description:
                'If a participant briefly loses network connectivity, the collaboration hook automatically reconnects and synchronizes the authoritative server state without overwriting other players’ edits.',
            },
          ],
        },
        {
          kind: 'table',
          title: 'Keyboard shortcuts & gestures',
          columns: ['Action', 'Shortcut / gesture', 'Studio context'],
          rows: [
            ['Play / Stop Transport', 'Space', 'Global studio (outside text inputs)'],
            ['Undo Edit', 'Ctrl+Z / Cmd+Z', 'Grid, Staff & Metadata changes'],
            ['Redo Edit', 'Ctrl+Y / Cmd+Shift+Z', 'Grid, Staff & Metadata changes'],
            ['Add or Cycle Stroke', 'Left-Click (or drag on grid)', 'Step Matrix & Interactive Staff'],
            ['Erase Note / Step', 'Right-Click', 'Step Matrix & Interactive Staff'],
            ['Direct Accent Hit (>)', 'Shift + Left-Click', 'Step Matrix & Interactive Staff'],
            ['Alternate Staff Voice', 'Alt + Left-Click', 'Staff lines (Open HH, Ride Bell, Cross-Stick)'],
            ['Snap Swing to Straight (0%)', 'Double-click slider / click Straight (0%)', 'Swing / Shuffle bar'],
          ],
        },
        {
          kind: 'table',
          title: 'Server API & WebSocket endpoints',
          columns: ['Endpoint', 'Method', 'Purpose'],
          rows: [
            ['/api/health', 'GET', 'Server health check and active collaboration room count'],
            ['/api/library', 'GET / POST', 'Fetch or save custom user grooves'],
            ['/api/library/:id', 'DELETE', 'Delete a saved custom groove by ID'],
            ['/api/rooms/:roomId', 'GET', 'Retrieve authoritative room groove state'],
            ['/api/soundfont/drum/:kit/:note', 'GET', 'Cached General MIDI SoundFont drum sample loader'],
            ['/ws', 'WebSocket', 'Real-time room sync (join, cell:set, meta:update, groove:load, cursor:focus, presence:rename)'],
          ],
        },
      ],
    },
  ],
};
