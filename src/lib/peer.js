// PeerJS transport. The trainer's browser registers the room's peer id with the
// public PeerJS broker (signalling only) and trainees open WebRTC data channels
// to it. Room data travels browser-to-browser, never through a server of ours.
import Peer from 'peerjs';

const PREFIX = 'tamara-ert-roleplay-';
export const peerIdFor = code => PREFIX + code;

export const PEER_OPTIONS = { debug: 0 };
export const CONN_OPTIONS = { reliable: true, serialization: 'json' };

// Host heartbeat: trainees treat 15s of silence as a lost connection.
export const PING_MS = 5000;
export const STALE_MS = 15000;

export { Peer };
