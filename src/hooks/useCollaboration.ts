import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  GrooveDocument,
  HitType,
  InstrumentId,
  RoomParticipant,
  WsClientMessage,
  WsServerMessage,
} from '../types/groove';

export type ConnectionStatus = 'solo' | 'connecting' | 'connected' | 'reconnecting';

interface UseCollaborationOptions {
  roomId: string | null;
  musicianName: string;
  getLatestGroove: () => GrooveDocument;
  onRemoteGrooveReplace: (groove: GrooveDocument) => void;
  onRemoteCellSet: (instrument: InstrumentId, step: number, hit: HitType) => void;
}

export function useCollaboration({
  roomId,
  musicianName,
  getLatestGroove,
  onRemoteGrooveReplace,
  onRemoteCellSet,
}: UseCollaborationOptions) {
  const [status, setStatus] = useState<ConnectionStatus>(roomId ? 'connecting' : 'solo');
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pendingQueueRef = useRef<WsClientMessage[]>([]);
  const unmountedRef = useRef(false);

  // Store callbacks in refs so socket doesn't reconnect on every render
  const callbacksRef = useRef({ getLatestGroove, onRemoteGrooveReplace, onRemoteCellSet });
  callbacksRef.current = { getLatestGroove, onRemoteGrooveReplace, onRemoteCellSet };

  const musicianNameRef = useRef(musicianName);
  musicianNameRef.current = musicianName;

  const sendMessage = useCallback((msg: WsClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else if (roomId) {
      // Queue mutations during brief reconnect windows
      if (msg.type !== 'cursor:focus') {
        pendingQueueRef.current.push(msg);
      }
    }
  }, [roomId]);

  useEffect(() => {
    unmountedRef.current = false;

    if (!roomId) {
      setStatus('solo');
      setParticipants([]);
      setSelfId(null);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let attempt = 0;

    const connect = () => {
      if (unmountedRef.current) return;
      setStatus(attempt === 0 ? 'connecting' : 'reconnecting');

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setStatus('connected');
        const joinMsg: WsClientMessage = {
          type: 'join',
          roomId,
          name: musicianNameRef.current,
          initialGroove: callbacksRef.current.getLatestGroove(),
        };
        ws.send(JSON.stringify(joinMsg));

        // Flush any buffered mutations
        while (pendingQueueRef.current.length > 0) {
          const queued = pendingQueueRef.current.shift();
          if (queued) ws.send(JSON.stringify(queued));
        }
      };

      ws.onmessage = (event) => {
        let msg: WsServerMessage;
        try {
          msg = JSON.parse(event.data) as WsServerMessage;
        } catch {
          return;
        }

        if (msg.type === 'room:state') {
          setSelfId(msg.selfId);
          setParticipants(msg.participants);
          callbacksRef.current.onRemoteGrooveReplace(msg.groove);
        } else if (msg.type === 'cell:set') {
          callbacksRef.current.onRemoteCellSet(msg.instrument, msg.step, msg.hit);
        } else if (msg.type === 'meta:update' || msg.type === 'groove:load') {
          callbacksRef.current.onRemoteGrooveReplace(msg.groove);
        } else if (msg.type === 'presence:list') {
          setParticipants(msg.participants);
        } else if (msg.type === 'cursor:focus') {
          setParticipants((prev) =>
            prev.map((p) =>
              p.clientId === msg.clientId
                ? { ...p, activeStep: msg.step, activeInstrument: msg.instrument }
                : p
            )
          );
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        setStatus('reconnecting');
        attempt++;
        const delay = Math.min(8000, 1000 * Math.pow(1.4, attempt));
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomId]);

  const emitCellSet = useCallback(
    (instrument: InstrumentId, step: number, hit: HitType) => {
      if (!roomId) return;
      sendMessage({ type: 'cell:set', instrument, step, hit });
    },
    [roomId, sendMessage]
  );

  const emitMetaUpdate = useCallback(
    (
      patch: Partial<
        Pick<
          GrooveDocument,
          'title' | 'composer' | 'style' | 'notes' | 'bpm' | 'timeSignature' | 'subdivision' | 'bars' | 'swing'
        >
      >
    ) => {
      if (!roomId) return;
      sendMessage({ type: 'meta:update', patch });
    },
    [roomId, sendMessage]
  );

  const emitGrooveLoad = useCallback(
    (groove: GrooveDocument) => {
      if (!roomId) return;
      sendMessage({ type: 'groove:load', groove });
    },
    [roomId, sendMessage]
  );

  const emitCursorFocus = useCallback(
    (step: number | null, instrument: InstrumentId | null) => {
      if (!roomId) return;
      sendMessage({ type: 'cursor:focus', step, instrument });
    },
    [roomId, sendMessage]
  );

  const emitRename = useCallback(
    (name: string) => {
      if (!roomId) return;
      sendMessage({ type: 'presence:rename', name });
    },
    [roomId, sendMessage]
  );

  return {
    status,
    participants,
    selfId,
    emitCellSet,
    emitMetaUpdate,
    emitGrooveLoad,
    emitCursorFocus,
    emitRename,
  };
}
