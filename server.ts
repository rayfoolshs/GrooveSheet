import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import type {
  GrooveDocument,
  HitType,
  InstrumentId,
  LibraryPreset,
  RoomParticipant,
  WsClientMessage,
  WsServerMessage,
} from './src/types/groove';
import { GROOVE_LIBRARY } from './src/data/grooveLibrary';
import { cloneGrid, resizeStepGrid } from './src/utils/grooveHelpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const CUSTOM_LIBRARY_FILE = '/tmp/groovesheet-custom-library.json';

const PARTICIPANT_COLORS = [
  '#2563EB',
  '#DC2626',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#4F46E5',
];

interface ClientEntry {
  ws: WebSocket;
  participant: RoomParticipant;
}

interface RoomState {
  roomId: string;
  groove: GrooveDocument;
  clients: Map<string, ClientEntry>;
  lastActiveAt: number;
}

const rooms = new Map<string, RoomState>();

function loadCustomLibrary(): LibraryPreset[] {
  try {
    if (fs.existsSync(CUSTOM_LIBRARY_FILE)) {
      const raw = fs.readFileSync(CUSTOM_LIBRARY_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore corrupt temp cache
  }
  return [];
}

function saveCustomLibrary(items: LibraryPreset[]): void {
  try {
    fs.writeFileSync(CUSTOM_LIBRARY_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch {
    // ignore write failures in restricted environments
  }
}

let customLibrary: LibraryPreset[] = loadCustomLibrary();

function createDefaultRoomGroove(): GrooveDocument {
  const first = GROOVE_LIBRARY[0];
  return {
    id: `room-groove-${Date.now()}`,
    title: first.title,
    composer: first.composer,
    style: first.style,
    notes: first.notes,
    bpm: first.bpm,
    timeSignature: first.timeSignature,
    subdivision: first.subdivision,
    bars: first.bars,
    swing: first.swing,
    steps: cloneGrid(first.steps),
    updatedAt: Date.now(),
  };
}

function getOrCreateRoom(roomId: string, initialGroove?: GrooveDocument): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      groove: initialGroove
        ? { ...initialGroove, steps: cloneGrid(initialGroove.steps), updatedAt: Date.now() }
        : createDefaultRoomGroove(),
      clients: new Map(),
      lastActiveAt: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastRoom(room: RoomState, msg: WsServerMessage, excludeClientId?: string): void {
  const payload = JSON.stringify(msg);
  for (const [cid, entry] of room.clients.entries()) {
    if (excludeClientId && cid === excludeClientId) continue;
    if (entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.send(payload);
    }
  }
}

function getParticipantsList(room: RoomState): RoomParticipant[] {
  return Array.from(room.clients.values()).map((c) => c.participant);
}

// Periodically clean up empty stale rooms (> 6 hours idle)
setInterval(() => {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [id, room] of rooms.entries()) {
    if (room.clients.size === 0 && room.lastActiveAt < cutoff) {
      rooms.delete(id);
    }
  }
}, 15 * 60 * 1000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // REST API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.get('/api/library', (_req, res) => {
    res.json({ items: customLibrary });
  });

  app.post('/api/library', (req, res) => {
    const body = req.body as Partial<LibraryPreset>;
    if (!body || !body.title || !body.steps) {
      res.status(400).json({ error: 'Invalid groove payload' });
      return;
    }

    const entry: LibraryPreset = {
      id: body.id && body.id.startsWith('custom-') ? body.id : `custom-${Date.now()}`,
      title: String(body.title).slice(0, 80),
      composer: String(body.composer || 'Session Musician').slice(0, 60),
      style: String(body.style || 'Custom').slice(0, 40),
      notes: body.notes ? String(body.notes).slice(0, 400) : '',
      difficulty: body.difficulty === 'Beginner' || body.difficulty === 'Advanced' ? body.difficulty : 'Intermediate',
      description: String(body.description || `${body.timeSignature || '4/4'} groove at ${body.bpm || 100} BPM`),
      bpm: Number(body.bpm) || 100,
      timeSignature: body.timeSignature || '4/4',
      subdivision: body.subdivision || '16th',
      bars: body.bars === 2 || body.bars === 4 ? body.bars : 1,
      swing: Math.max(-66, Math.min(66, Number(body.swing) || 0)),
      steps: cloneGrid(body.steps),
      updatedAt: Date.now(),
      isCustom: true,
    };

    const existingIdx = customLibrary.findIndex((g) => g.id === entry.id);
    if (existingIdx >= 0) {
      customLibrary[existingIdx] = entry;
    } else {
      customLibrary = [entry, ...customLibrary].slice(0, 50);
    }
    saveCustomLibrary(customLibrary);
    res.json({ item: entry });
  });

  app.delete('/api/library/:id', (req, res) => {
    const id = req.params.id;
    customLibrary = customLibrary.filter((g) => g.id !== id);
    saveCustomLibrary(customLibrary);
    res.json({ ok: true });
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({
      roomId: room.roomId,
      groove: room.groove,
      participants: getParticipantsList(room),
    });
  });

  // General MIDI SoundFont Drum Sample Cache & Proxy
  const SOUNDFONT_KIT_SUFFIXES: Record<string, string> = {
    'fluid-standard': '0_FluidR3_GM_sf2_file',
    'fluid-room': '8_FluidR3_GM_sf2_file',
    'fluid-power': '16_FluidR3_GM_sf2_file',
    'fluid-electronic': '24_FluidR3_GM_sf2_file',
    'chaos-standard': '0_Chaos_sf2_file',
    'jclive-standard': '0_JCLive_sf2_file',
  };

  interface CachedSoundFontNote {
    base64: string;
    originalPitch: number;
    coarseTune: number;
    fineTune: number;
  }

  const soundfontNoteCache = new Map<string, CachedSoundFontNote>();

  app.get('/api/soundfont/drum/:kit/:note', async (req, res) => {
    const kit = String(req.params.kit);
    const note = Number(req.params.note);
    const suffix = SOUNDFONT_KIT_SUFFIXES[kit];

    if (!suffix || !Number.isInteger(note) || note < 27 || note > 87) {
      res.status(400).json({ error: 'Invalid SoundFont kit or MIDI note' });
      return;
    }

    const cacheKey = `${kit}:${note}`;
    const cached = soundfontNoteCache.get(cacheKey);
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.json(cached);
      return;
    }

    try {
      const upstreamUrl = `https://surikov.github.io/webaudiofontdata/sound/128${note}_${suffix}.js`;
      const upstream = await fetch(upstreamUrl);
      if (!upstream.ok) {
        res.status(404).json({ error: 'SoundFont note not found upstream' });
        return;
      }

      const jsText = await upstream.text();
      const fileMatch = jsText.match(/file\s*:\s*'([^']+)'/);
      if (!fileMatch || !fileMatch[1]) {
        res.status(502).json({ error: 'Invalid upstream SoundFont payload' });
        return;
      }

      const origPitchMatch = jsText.match(/originalPitch\s*:\s*(-?\d+)/);
      const coarseMatch = jsText.match(/coarseTune\s*:\s*(-?\d+)/);
      const fineMatch = jsText.match(/fineTune\s*:\s*(-?\d+)/);

      const payload: CachedSoundFontNote = {
        base64: fileMatch[1],
        originalPitch: origPitchMatch ? Number(origPitchMatch[1]) : note * 100,
        coarseTune: coarseMatch ? Number(coarseMatch[1]) : 0,
        fineTune: fineMatch ? Number(fineMatch[1]) : 0,
      };

      soundfontNoteCache.set(cacheKey, payload);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.json(payload);
    } catch {
      res.status(502).json({ error: 'Unable to fetch SoundFont sample' });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const clientId = `c-${Math.random().toString(36).slice(2, 10)}`;
    let currentRoom: RoomState | null = null;

    ws.on('message', (raw) => {
      let msg: WsClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as WsClientMessage;
      } catch {
        return;
      }

      if (msg.type === 'join') {
        const cleanRoomId = String(msg.roomId || 'studio')
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(0, 32) || 'studio';

        // Remove from previous room if switching
        if (currentRoom) {
          currentRoom.clients.delete(clientId);
          broadcastRoom(currentRoom, {
            type: 'presence:list',
            participants: getParticipantsList(currentRoom),
          });
        }

        const room = getOrCreateRoom(cleanRoomId, msg.initialGroove);
        currentRoom = room;
        room.lastActiveAt = Date.now();

        const color = PARTICIPANT_COLORS[room.clients.size % PARTICIPANT_COLORS.length];
        const participant: RoomParticipant = {
          clientId,
          name: String(msg.name || `Musician ${room.clients.size + 1}`).slice(0, 32),
          color,
          activeStep: null,
          activeInstrument: null,
          joinedAt: Date.now(),
        };

        room.clients.set(clientId, { ws, participant });

        // Send authoritative room state to the joining client
        const initPayload: WsServerMessage = {
          type: 'room:state',
          roomId: room.roomId,
          groove: room.groove,
          participants: getParticipantsList(room),
          selfId: clientId,
        };
        ws.send(JSON.stringify(initPayload));

        // Notify everyone else of updated participant list
        broadcastRoom(
          room,
          {
            type: 'presence:list',
            participants: getParticipantsList(room),
          },
          clientId
        );
        return;
      }

      if (!currentRoom) return;
      currentRoom.lastActiveAt = Date.now();

      if (msg.type === 'cell:set') {
        const inst = msg.instrument as InstrumentId;
        const step = Number(msg.step);
        const hit = Number(msg.hit) as HitType;
        if (!currentRoom.groove.steps[inst] || step < 0 || step >= currentRoom.groove.steps[inst].length) {
          return;
        }
        if (hit < 0 || hit > 4) return;

        currentRoom.groove.steps[inst][step] = hit;
        currentRoom.groove.updatedAt = Date.now();

        broadcastRoom(
          currentRoom,
          {
            type: 'cell:set',
            instrument: inst,
            step,
            hit,
            byClientId: clientId,
          },
          clientId
        );
      } else if (msg.type === 'meta:update') {
        const g = currentRoom.groove;
        const p = msg.patch;
        const prevTimeSig = g.timeSignature;
        const prevSub = g.subdivision;
        const prevBars = g.bars;

        const nextTimeSig = p.timeSignature ?? g.timeSignature;
        const nextSub = p.subdivision ?? g.subdivision;
        const nextBars = p.bars ?? g.bars;

        const resizedSteps =
          nextTimeSig !== prevTimeSig || nextSub !== prevSub || nextBars !== prevBars
            ? resizeStepGrid(g.steps, prevTimeSig, prevSub, prevBars, nextTimeSig, nextSub, nextBars)
            : g.steps;

        currentRoom.groove = {
          ...g,
          title: p.title !== undefined ? String(p.title).slice(0, 80) : g.title,
          composer: p.composer !== undefined ? String(p.composer).slice(0, 60) : g.composer,
          style: p.style !== undefined ? String(p.style).slice(0, 40) : g.style,
          notes: p.notes !== undefined ? String(p.notes).slice(0, 400) : g.notes,
          bpm: p.bpm !== undefined ? Math.max(40, Math.min(240, Number(p.bpm))) : g.bpm,
          swing: p.swing !== undefined ? Math.max(-66, Math.min(66, Number(p.swing))) : g.swing,
          timeSignature: nextTimeSig,
          subdivision: nextSub,
          bars: nextBars,
          steps: resizedSteps,
          updatedAt: Date.now(),
        };

        broadcastRoom(
          currentRoom,
          {
            type: 'meta:update',
            groove: currentRoom.groove,
            byClientId: clientId,
          },
          clientId
        );
      } else if (msg.type === 'groove:load') {
        currentRoom.groove = {
          ...msg.groove,
          steps: cloneGrid(msg.groove.steps),
          updatedAt: Date.now(),
        };
        broadcastRoom(
          currentRoom,
          {
            type: 'groove:load',
            groove: currentRoom.groove,
            byClientId: clientId,
          },
          clientId
        );
      } else if (msg.type === 'cursor:focus') {
        const entry = currentRoom.clients.get(clientId);
        if (entry) {
          entry.participant.activeStep = msg.step;
          entry.participant.activeInstrument = msg.instrument;
          broadcastRoom(
            currentRoom,
            {
              type: 'cursor:focus',
              clientId,
              step: msg.step,
              instrument: msg.instrument,
            },
            clientId
          );
        }
      } else if (msg.type === 'presence:rename') {
        const entry = currentRoom.clients.get(clientId);
        if (entry) {
          entry.participant.name = String(msg.name || 'Musician').slice(0, 32);
          broadcastRoom(currentRoom, {
            type: 'presence:list',
            participants: getParticipantsList(currentRoom),
          });
        }
      }
    });

    ws.on('close', () => {
      if (currentRoom) {
        currentRoom.clients.delete(clientId);
        broadcastRoom(currentRoom, {
          type: 'presence:list',
          participants: getParticipantsList(currentRoom),
        });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`GrooveSheet server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start GrooveSheet server:', err);
  process.exit(1);
});
