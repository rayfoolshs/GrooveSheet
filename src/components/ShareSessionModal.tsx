import React, { useRef, useState } from 'react';
import { Check, Copy, Download, FileUp, Radio, Users, X } from 'lucide-react';
import { GrooveDocument, RoomParticipant } from '../types/groove';
import { ConnectionStatus } from '../hooks/useCollaboration';

interface ShareSessionModalProps {
  isOpen: boolean;
  roomId: string | null;
  status: ConnectionStatus;
  musicianName: string;
  participants: RoomParticipant[];
  groove: GrooveDocument;
  onClose: () => void;
  onStartOrJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onChangeName: (name: string) => void;
  onExportMidi: (repeats: number) => void;
  onImportMidiFile: (file: File) => Promise<void>;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => Promise<void>;
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({
  isOpen,
  roomId,
  status,
  musicianName,
  participants,
  onClose,
  onStartOrJoinRoom,
  onLeaveRoom,
  onChangeName,
  onExportMidi,
  onImportMidiFile,
  onExportJson,
  onImportJsonFile,
}) => {
  const [roomInput, setRoomInput] = useState(
    roomId || `groove-${Math.random().toString(36).slice(2, 7)}`
  );
  const [nameInput, setNameInput] = useState(musicianName);
  const [copied, setCopied] = useState(false);
  const [midiRepeats, setMidiRepeats] = useState(2);
  const [importError, setImportError] = useState<string | null>(null);
  const midiFileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const shareUrl = roomId
    ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}`
    : '';

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomInput.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleaned) return;
    if (nameInput.trim()) onChangeName(nameInput.trim());
    onStartOrJoinRoom(cleaned);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Real-Time Collaboration and Export"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Collaborate &amp; Export
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Real-Time Room Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Real-Time Studio Room
              </h3>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                {status === 'connected' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Live ({participants.length} connected)</span>
                  </>
                )}
                {status === 'connecting' && <span>Connecting...</span>}
                {status === 'reconnecting' && <span>Reconnecting...</span>}
                {status === 'solo' && <span>Local Solo Mode</span>}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Share a room link with bandmates or students to compose, toggle strokes, adjust Smart Drummer settings, and sync tempo in real time over WebSockets.
            </p>

            {roomId ? (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-1.5 text-xs font-mono-tabular bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={() => nameInput.trim() && onChangeName(nameInput.trim())}
                    className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={onLeaveRoom}
                    className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Leave Room
                  </button>
                </div>

                {participants.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      Musicians in Session
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {participants.map((p) => (
                        <div key={p.clientId} className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Your Display Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. Alex (Drums)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      placeholder="groove-room"
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Start / Join Live Session
                </button>
              </form>
            )}
          </div>

          {/* MIDI & Project File Export / Import */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              MIDI &amp; File Export / Import
            </h3>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Standard MIDI File (.mid)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  General MIDI Channel 10 with accents, ghost velocities, flams &amp; swing
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={midiRepeats}
                  onChange={(e) => setMidiRepeats(Number(e.target.value))}
                  aria-label="MIDI loop repetitions"
                  className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value={1}>1× Loop</option>
                  <option value={2}>2× Loops</option>
                  <option value={4}>4× Loops</option>
                  <option value={8}>8× Loops</option>
                </select>
                <button
                  type="button"
                  onClick={() => onExportMidi(midiRepeats)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 rounded-lg transition-opacity whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .mid
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => midiFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" />
                Import .mid
              </button>
              <button
                type="button"
                onClick={onExportJson}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => jsonFileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" />
                Import JSON
              </button>
            </div>

            <input
              ref={midiFileInputRef}
              type="file"
              accept=".mid,.midi"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setImportError(null);
                try {
                  await onImportMidiFile(file);
                  onClose();
                } catch (err) {
                  setImportError(err instanceof Error ? err.message : 'Failed to parse MIDI file');
                }
              }}
            />
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setImportError(null);
                try {
                  await onImportJsonFile(file);
                  onClose();
                } catch (err) {
                  setImportError(err instanceof Error ? err.message : 'Failed to parse JSON file');
                }
              }}
            />

            {importError && (
              <div className="text-xs text-red-600 dark:text-red-400">{importError}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
