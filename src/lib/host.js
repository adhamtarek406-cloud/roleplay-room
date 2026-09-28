// The trainer's side: one RoomHub per room, kept alive across route changes and
// reachable by trainees through the room's peer id.
import { useEffect, useState } from 'react';
import { RoomHub } from '../../shared/hub.js';
import { ActionError, createRoom } from '../../shared/rooms.js';
import { CONN_OPTIONS, PEER_OPTIONS, PING_MS, Peer, peerIdFor } from './peer.js';
import { hostedRooms } from './storage.js';

const hosts = new Map(); // code -> Host

class Host {
  constructor(room, peer) {
    this.code = room.code;
    this.status = 'connecting'; // connecting | online | duplicate | offline
    this.listeners = new Set();
    this.toastListeners = new Set();
    this.hub = new RoomHub(room, {
      save: r => hostedRooms.save(r),
      onChange: () => this.emit(),
      onToast: m => this.toastListeners.forEach(fn => fn(m)),
    });
    this.start(peer);
    this.ping = setInterval(() => { for (const c of this.hub.conns) c.send({ t: 'ping' }); }, PING_MS);
  }

  setStatus(s) { if (this.status !== s) { this.status = s; this.emit(); } }
  emit() { this.listeners.forEach(fn => fn()); }

  // `peer` may be one that already holds the id (handed over from createHostedRoom).
  start(peer) {
    clearTimeout(this.retry);
    peer = peer || new Peer(peerIdFor(this.code), PEER_OPTIONS);
    this.peer = peer;
    if (peer.open) this.setStatus('online');
    peer.on('open', () => this.setStatus('online'));
    peer.on('connection', conn => this.accept(conn));
    peer.on('disconnected', () => {
      // Lost the broker (not the trainees): existing data channels keep working.
      if (peer.destroyed) return;
      this.setStatus('offline');
      this.retry = setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 2000);
    });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        // Another tab holds this room, or the broker hasn't noticed our last tab closed yet.
        this.setStatus('duplicate');
        peer.destroy();
        this.retry = setTimeout(() => this.start(), 4000);
      } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
        this.setStatus('offline');
        peer.destroy();
        this.retry = setTimeout(() => this.start(), 3000);
      }
    });
  }

  accept(conn) {
    if (conn.serialization !== 'json') { conn.close(); return; }
    let link = null;
    conn.on('open', () => { link = this.hub.attach(msg => { if (conn.open) conn.send(msg); }); });
    conn.on('data', msg => link?.receive(msg));
    const drop = () => { link?.close(); link = null; };
    conn.on('close', drop);
    conn.on('error', drop);
    // Also catch ICE failures that never fire 'close'.
    conn.on('iceStateChanged', s => { if (s === 'failed' || s === 'closed') drop(); });
  }

  act(name, args) { return this.hub.act(name, args); }

  destroy() {
    clearInterval(this.ping);
    clearTimeout(this.retry);
    this.peer?.destroy();
    hosts.delete(this.code);
  }
}

export function getHost(code, peer) {
  if (hosts.has(code)) return hosts.get(code);
  const room = hostedRooms.get(code);
  if (!room) return null;
  const h = new Host(room, peer);
  hosts.set(code, h);
  return h;
}

// Create a room whose code is free on the broker, and start hosting it.
export async function createHostedRoom(fields) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const room = createRoom(fields);
    if (hostedRooms.get(room.code)) continue;
    const claim = await claimId(peerIdFor(room.code));
    if (claim === 'taken') continue;
    if (claim === 'error') throw new Error("Couldn't reach the connection service — check your internet connection");
    hostedRooms.save(room);
    return getHost(room.code, claim);
  }
  throw new Error("Couldn't find a free room code — try again");
}

// Resolves to the open Peer holding `id`, or 'taken' / 'error'.
function claimId(id) {
  return new Promise(resolve => {
    const p = new Peer(id, PEER_OPTIONS);
    const fail = r => { clearTimeout(timer); p.destroy(); resolve(r); };
    const timer = setTimeout(() => fail('error'), 10000);
    p.on('open', () => { clearTimeout(timer); resolve(p); });
    p.on('error', e => { if (!p.open) fail(e.type === 'unavailable-id' ? 'taken' : 'error'); });
  });
}

// Trainer UI hook. Same shape as the trainee hook: { room, status, act }.
export function useHostedRoom(code, { onToast, onError }) {
  const [host] = useState(() => getHost(code));
  const [, force] = useState(0);
  useEffect(() => {
    if (!host) return;
    const re = () => force(n => n + 1);
    host.listeners.add(re);
    host.toastListeners.add(onToast);
    return () => { host.listeners.delete(re); host.toastListeners.delete(onToast); };
  }, [host, onToast]);

  if (!host) return { room: null, status: 'missing', act: () => {} };
  const act = (name, args) => {
    try {
      const toast = host.act(name, args);
      if (toast) onToast(toast);
    } catch (e) {
      if (e instanceof ActionError) onError(e.message); else { console.error(e); onError('Something went wrong'); }
    }
  };
  return { room: host.hub.view(), status: host.status, act };
}
