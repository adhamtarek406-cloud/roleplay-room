// Trainee's live link to the room hosted in the trainer's browser. Reconnects
// with backoff and re-sends `hello`, so a refresh or a Wi-Fi drop lands the
// trainee back in place.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CONN_OPTIONS, PEER_OPTIONS, Peer, STALE_MS, peerIdFor } from './peer.js';
import { traineeIdentity } from './storage.js';

export function useRoom(code, { onToast, onError } = {}) {
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState({ traineeId: null });
  // connecting | open | reconnecting | unreachable (host tab closed or wrong code) | offline (no broker)
  const [status, setStatus] = useState('connecting');
  const [clockSkew, setClockSkew] = useState(0);
  const connRef = useRef(null);
  const cb = useRef({});
  cb.current = { onToast, onError };

  useEffect(() => {
    let closed = false, retry = 0, timer, watchdog, lastSeen = Date.now(), peer = null;

    const schedule = (why, ms) => {
      clearTimeout(timer);
      if (closed) return;
      setStatus(s => (why === 'unreachable' || why === 'offline' ? why : s === 'open' ? 'reconnecting' : s));
      timer = setTimeout(connect, ms ?? Math.min(8000, 1000 * 2 ** retry++));
    };

    const connect = () => {
      if (closed) return;
      if (!peer || peer.destroyed) { newPeer(); return; } // its 'open' calls connect
      if (peer.disconnected) { peer.reconnect(); return; }
      connRef.current?.close();
      const conn = peer.connect(peerIdFor(code), CONN_OPTIONS);
      connRef.current = conn;
      // ICE can stall without ever firing 'error'; give up on this attempt and retry.
      const openTimer = setTimeout(() => { if (!conn.open && conn === connRef.current) schedule('lost'); }, 15000);
      conn.on('open', () => {
        clearTimeout(openTimer);
        retry = 0; lastSeen = Date.now();
        const me = traineeIdentity.get(code);
        conn.send({ t: 'hello', traineeId: me?.id, token: me?.token });
      });
      conn.on('data', msg => {
        if (conn !== connRef.current) return;
        lastSeen = Date.now();
        if (msg.t === 'state') {
          setRoom(msg.room); setYou(msg.you); setStatus('open'); setClockSkew(msg.now - Date.now());
        } else if (msg.t === 'joined') {
          traineeIdentity.set(code, { id: msg.traineeId, token: msg.token });
        } else if (msg.t === 'removed') {
          traineeIdentity.clear(code);
          cb.current.onToast?.('You were removed from the room');
        } else if (msg.t === 'error') cb.current.onError?.(msg.msg);
      });
      conn.on('close', () => { if (conn === connRef.current) schedule('lost'); });
      conn.on('error', () => { if (conn === connRef.current) schedule('lost'); });
    };

    const newPeer = () => {
      peer?.destroy();
      const p = new Peer(PEER_OPTIONS);
      peer = p;
      p.on('open', () => { if (p === peer) connect(); });
      p.on('disconnected', () => { if (p === peer && !p.destroyed) schedule('lost', 2000); });
      p.on('error', err => {
        if (p !== peer) return;
        if (err.type === 'peer-unavailable') schedule('unreachable', 4000);
        else if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'].includes(err.type)) schedule('offline', 4000);
      });
    };
    newPeer();
    // The host pings every few seconds; silence means the channel died without a 'close'.
    watchdog = setInterval(() => {
      if (connRef.current?.open && Date.now() - lastSeen > STALE_MS) { lastSeen = Date.now(); schedule('lost', 0); }
    }, 3000);

    return () => { closed = true; clearTimeout(timer); clearInterval(watchdog); peer?.destroy(); };
  }, [code]);

  const send = useCallback(msg => {
    const conn = connRef.current;
    if (conn && conn.open) conn.send(msg);
    else cb.current.onError?.('Reconnecting — try again in a moment');
  }, []);

  return { room, you, status, clockSkew, send };
}

// Re-render once a second while `active` (for round timers).
export function useTicker(active) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}
