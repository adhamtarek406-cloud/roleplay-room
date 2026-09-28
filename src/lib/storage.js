// Per-browser identity and drafts. Storage can be unavailable (private mode),
// so every access is guarded and the app still works for the current tab.
const mem = new Map();
const get = k => { try { return localStorage.getItem(k); } catch { return mem.get(k) ?? null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch { mem.set(k, v); } };
const del = k => { try { localStorage.removeItem(k); } catch { mem.delete(k); } };
const getJson = k => { try { return JSON.parse(get(k)); } catch { return null; } };

// Rooms this browser hosts. The trainer's browser is the room's only copy,
// so this is where every round and score lives. Pruned after 30 days idle.
const ROOM_TTL_MS = 30 * 24 * 3600 * 1000;
export const hostedRooms = {
  get: code => getJson('rr:room:' + code),
  save: room => set('rr:room:' + room.code, JSON.stringify(room)),
  remove: code => del('rr:room:' + code),
  list() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith('rr:room:')) continue;
        const r = getJson(k);
        if (!r) continue;
        if (Date.now() - r.updatedAt > ROOM_TTL_MS) { del(k); continue; }
        out.push(r);
      }
    } catch { /* storage unavailable */ }
    for (const [k, v] of mem) if (k.startsWith('rr:room:')) out.push(JSON.parse(v));
    return out.sort((a, b) => b.updatedAt - a.updatedAt);
  },
};

export const traineeIdentity = {
  get: code => getJson('rr:me:' + code),
  set: (code, v) => set('rr:me:' + code, JSON.stringify(v)),
  clear: code => del('rr:me:' + code),
};

export const lastTrainerName = {
  get: () => get('rr:trainerName') || '',
  set: v => set('rr:trainerName', v),
};

// Scorecard drafts survive a refresh mid-round. Keyed by round start time, since a
// cancelled round's number is reused by the next one.
export const drafts = {
  get: (code, roundStart, id) => getJson(`rr:draft:${code}:${roundStart}:${id}`) || {},
  set: (code, roundStart, id, answers) => set(`rr:draft:${code}:${roundStart}:${id}`, JSON.stringify(answers)),
};
