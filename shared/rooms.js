// Room state and every action a trainer or trainee can take. The trainer's
// browser runs this and is the source of truth; trainees get a sanitized view
// (no tokens, no live answers). Plain JS so it also runs under Node for tests.
import {
  AUTO_FAIL_MODES, DEFAULT_SETTINGS, RATING_SCALES, computeResult, isCompleteScorecard,
} from './scorecard.js';

const PALETTE_SIZE = 7;
const NAME_MAX = 60;

export class ActionError extends Error {}
const fail = msg => { throw new ActionError(msg); };

const cleanName = v => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
// getRandomValues works in insecure contexts too (e.g. http://<LAN IP>), unlike randomUUID.
const hex = n => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');
const secret = () => hex(16);
const newId = () => hex(8);
const firstName = n => n.split(' ')[0];

function cleanSettings(s = {}) {
  return {
    ratingScale: RATING_SCALES.includes(s.ratingScale) ? s.ratingScale : DEFAULT_SETTINGS.ratingScale,
    autoFail: AUTO_FAIL_MODES.includes(s.autoFail) ? s.autoFail : DEFAULT_SETTINGS.autoFail,
    showRunningScore: typeof s.showRunningScore === 'boolean' ? s.showRunningScore : DEFAULT_SETTINGS.showRunningScore,
  };
}

export const newRoomCode = () => 'ERT-' + String(1000 + (globalThis.crypto.getRandomValues(new Uint16Array(1))[0] % 9000));

export function createRoom({ code, name, trainerName, settings }) {
  return {
    code: code || newRoomCode(),
    name: cleanName(name) || 'Untitled room',
    trainerName: cleanName(trainerName) || 'Your trainer',
    settings: cleanSettings(settings),
    stage: 'room', // 'create' (closed, being set up) | 'room' | 'final'
    trainees: [],
    nextColor: 0,
    round: null,
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function addTraineeRecord(room, name, status) {
  const t = { id: newId(), token: secret(), name, status, c: room.nextColor++ % PALETTE_SIZE };
  room.trainees.push(t);
  return t;
}

const joinedIds = room => room.trainees.filter(t => t.status === 'joined').map(t => t.id);

// ---- Trainer actions. Each returns an optional toast for the trainer. ----
export const trainerActions = {
  addTrainee(room, { name }) {
    name = cleanName(name);
    if (!name) fail('Enter a name first');
    if (room.trainees.some(t => t.name.toLowerCase() === name.toLowerCase())) fail(name + ' is already on the list');
    addTraineeRecord(room, name, 'invited');
    return firstName(name) + ' invited';
  },
  removeTrainee(room, { id }) {
    const t = room.trainees.find(x => x.id === id);
    if (!t) return;
    if (room.round && room.round.status === 'live' && room.round.performerId === id) fail("Can't remove the trainee on the call");
    room.trainees = room.trainees.filter(x => x.id !== id);
    if (room.round && room.round.status === 'live') {
      room.round.scorerIds = room.round.scorerIds.filter(x => x !== id);
      delete room.round.subs[id];
    }
    return firstName(t.name) + ' removed';
  },
  startRound(room, { id }) {
    if (room.stage !== 'room') fail('The room is not open');
    if (room.round && room.round.status === 'live') fail('A round is already live');
    const joined = joinedIds(room);
    if (!joined.includes(id)) fail('That trainee has not joined');
    if (joined.length < 2) fail('You need at least 2 trainees in the room');
    room.round = {
      n: room.rounds.length + 1, performerId: id, start: Date.now(), status: 'live',
      scorerIds: joined.filter(x => x !== id), subs: {},
    };
  },
  cancelRound(room) {
    if (!room.round || room.round.status !== 'live') return;
    room.round = null;
    return 'Round cancelled';
  },
  endRound(room) {
    const r = room.round;
    if (!r || r.status !== 'live') fail('No live round');
    if (!Object.keys(r.subs).length) fail('Wait for at least one scorecard');
    const done = {
      n: r.n, performerId: r.performerId, start: r.start, end: Date.now(), status: 'review',
      scorerIds: r.scorerIds, result: computeResult(r.subs, room.settings),
    };
    room.round = done;
    room.rounds.push(done);
  },
  nextRound(room) {
    if (room.round && room.round.status === 'live') fail('A round is still live');
    room.round = null;
  },
  finish(room) {
    room.stage = 'final';
    if (room.round && room.round.status === 'live') room.round = null;
  },
  backToRoom(room) {
    room.stage = 'room';
  },
  newSession(room) {
    room.stage = 'create';
    room.round = null;
    room.rounds = [];
  },
  reopen(room, { name, trainerName, settings }) {
    room.name = cleanName(name) || room.name;
    room.trainerName = cleanName(trainerName) || room.trainerName;
    room.settings = cleanSettings(settings);
    room.stage = 'room';
    return 'Room open — share the link';
  },
};

// ---- Trainee actions ----
// Join by picking an invited name (claimId) or typing a name. Typed names that
// match an invited trainee claim that record rather than creating a duplicate.
export function joinRoom(room, { name, claimId }) {
  if (room.stage === 'create') fail("This room isn't open yet");
  let t = claimId ? room.trainees.find(x => x.id === claimId && x.status === 'invited') : null;
  if (!t) {
    name = cleanName(name);
    if (!name) fail('Enter your name to join');
    const same = room.trainees.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (same && same.status === 'joined') fail(name + ' is already in the room — use a different name');
    t = same || addTraineeRecord(room, name, 'joined');
  }
  t.status = 'joined';
  t.token = secret(); // claiming rotates the token, so only this browser holds it
  return t;
}

// `start` identifies the round: a cancelled round's number is reused by the next one.
export function submitScorecard(room, trainee, { start, answers }) {
  const r = room.round;
  if (!r || r.status !== 'live' || r.start !== start) fail('This round is no longer live');
  if (!r.scorerIds.includes(trainee.id)) fail("You're not scoring this round");
  if (r.subs[trainee.id]) fail('Scorecard already submitted');
  if (!isCompleteScorecard(answers, room.settings)) fail('Answer every attribute before submitting');
  const clean = {};
  for (const k of Object.keys(answers)) if (/^a\d+$/.test(k)) clean[k] = answers[k];
  r.subs[trainee.id] = { answers: clean, at: Date.now() };
}

// ---- What clients see ----
export function publicView(room, online) {
  const round = room.round && {
    n: room.round.n, performerId: room.round.performerId, start: room.round.start, status: room.round.status,
    scorerIds: room.round.scorerIds.filter(id => room.trainees.some(t => t.id === id)),
    submitted: room.round.status === 'live' ? Object.keys(room.round.subs) : undefined,
    result: room.round.result,
  };
  return {
    code: room.code, name: room.name, trainerName: room.trainerName, settings: room.settings, stage: room.stage,
    trainees: room.trainees.map(t => ({ id: t.id, name: t.name, status: t.status, c: t.c, online: online.has(t.id) })),
    round,
    rounds: room.rounds.map(r => ({ n: r.n, performerId: r.performerId, start: r.start, end: r.end, result: r.result })),
  };
}
