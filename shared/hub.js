// Runs one room inside the trainer's browser: applies trainer actions, answers
// trainee connections, and pushes the room view to everyone. Transport-agnostic —
// a connection is anything with send(msg) — so tests drive it with fake conns.
import { ActionError, joinRoom, publicView, submitScorecard, trainerActions } from './rooms.js';

export class RoomHub {
  constructor(room, { save = () => {}, onChange = () => {}, onToast = () => {} } = {}) {
    this.room = room;
    this.save = save;
    this.onChange = onChange; // trainer UI re-render
    this.onToast = onToast; // trainer UI toast
    this.conns = new Set(); // { send, traineeId }
  }

  online() {
    const ids = new Set();
    for (const c of this.conns) if (c.traineeId) ids.add(c.traineeId);
    return ids;
  }

  view() {
    return publicView(this.room, this.online());
  }

  broadcast() {
    const room = this.view();
    const now = Date.now();
    for (const c of this.conns) {
      if (c.hello) c.send({ t: 'state', room, you: { role: 'trainee', traineeId: c.traineeId || null }, now });
    }
    this.onChange(room);
  }

  commit() {
    this.room.updatedAt = Date.now();
    this.save(this.room);
    this.broadcast();
  }

  // Trainer action from the local UI. Throws ActionError with a message to show.
  act(name, args = {}) {
    const fn = Object.hasOwn(trainerActions, name) && trainerActions[name];
    if (!fn) throw new ActionError('Unknown action');
    const before = new Set(this.room.trainees.map(t => t.id));
    const toast = fn(this.room, args);
    for (const c of this.conns) {
      if (c.traineeId && before.has(c.traineeId) && !this.room.trainees.some(t => t.id === c.traineeId)) {
        c.traineeId = null;
        c.send({ t: 'removed' });
      }
    }
    this.commit();
    return toast;
  }

  // A trainee connection opened. Returns { receive, close } for the transport to call.
  attach(send) {
    const c = { send, traineeId: null, hello: false };
    this.conns.add(c);
    return {
      receive: msg => {
        try {
          this.handle(c, msg);
        } catch (e) {
          if (e instanceof ActionError) c.send({ t: 'error', msg: e.message });
          else { console.error(e); c.send({ t: 'error', msg: 'Something went wrong' }); }
        }
      },
      close: () => {
        this.conns.delete(c);
        if (c.traineeId) this.broadcast(); // presence changed
      },
    };
  }

  handle(c, msg) {
    if (!msg || typeof msg !== 'object') return;
    const room = this.room;
    if (msg.t === 'hello') {
      c.hello = true;
      const t = room.trainees.find(x => x.id === msg.traineeId && x.token === msg.token && x.status === 'joined');
      c.traineeId = t ? t.id : null;
      if (msg.traineeId && !t) c.send({ t: 'removed' });
      return this.broadcast();
    }
    if (!c.hello) return;
    if (msg.t === 'join') {
      if (c.traineeId) return;
      const t = joinRoom(room, msg);
      // One live connection per trainee: a claim from a new device replaces the old one.
      for (const o of this.conns) if (o !== c && o.traineeId === t.id) { o.traineeId = null; o.send({ t: 'removed' }); }
      c.traineeId = t.id;
      c.send({ t: 'joined', traineeId: t.id, token: t.token });
      this.commit();
      this.onToast(t.name.split(' ')[0] + ' joined the room');
      return;
    }
    if (msg.t === 'submit' && c.traineeId) {
      const t = room.trainees.find(x => x.id === c.traineeId);
      if (!t) return;
      submitScorecard(room, t, msg);
      this.commit();
      const r = room.round;
      if (r.scorerIds.every(id => r.subs[id])) this.onToast('All scorecards are in — reveal when ready');
    }
  }
}
