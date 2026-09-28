// Tests the room hub — everything the trainer's browser does for a room — with
// fake trainee connections, so no network or browser is needed.
// Usage: npm test
import assert from 'node:assert/strict';
import { RoomHub } from '../shared/hub.js';
import { ActionError, createRoom } from '../shared/rooms.js';
import { ATTRS } from '../shared/scorecard.js';

let step = 0;
const ok = (label, extra = '') => console.log(`  ✓ ${String(++step).padStart(2)} ${label}${extra ? ' — ' + extra : ''}`);

const toasts = [];
let saved = 0;
const room = createRoom({ name: 'Test room', trainerName: 'Hana', settings: { ratingScale: 'Met / Partial / Not met' } });
const hub = new RoomHub(room, { save: () => saved++, onToast: m => toasts.push(m) });

// Trainer actions: returns the error message if the action is refused.
const act = (name, args) => { try { hub.act(name, args); return null; } catch (e) { if (e instanceof ActionError) return e.message; throw e; } };

// A fake trainee connection. Messages round-trip through JSON like the real channel.
function connect(hello = {}) {
  const c = { msgs: [] };
  const link = hub.attach(m => c.msgs.push(JSON.parse(JSON.stringify(m))));
  c.send = m => link.receive(JSON.parse(JSON.stringify(m)));
  c.close = link.close;
  c.state = () => [...c.msgs].reverse().find(m => m.t === 'state');
  c.last = t => [...c.msgs].reverse().find(m => m.t === t);
  c.err = () => { const e = c.last('error'); c.msgs = c.msgs.filter(m => m.t !== 'error'); return e?.msg; };
  c.send({ t: 'hello', ...hello });
  return c;
}
function joinAs(name, claimId) {
  const c = connect();
  c.send({ t: 'join', name, claimId });
  const j = c.last('joined');
  assert.ok(j, 'join failed: ' + c.err());
  c.id = j.traineeId; c.token = j.token;
  return c;
}
const answersAll = v => Object.fromEntries(ATTRS.map(a => [a.id, v]));
const view = () => hub.view();

assert.match(room.code, /^ERT-\d{4}$/);
assert.equal(view().settings.ratingScale, 'Met / Partial / Not met');
ok('room created', room.code);

assert.equal(act('addTrainee', { name: 'Reem Al-Qahtani' }), null);
const invitedId = room.trainees[0].id;
ok('invited trainee cannot perform', act('startRound', { id: invitedId }));

const sara = joinAs('Sara Al-Otaibi');
const reem = joinAs('', invitedId);
const omar = joinAs('Omar Al-Harbi');
assert.equal(reem.id, invitedId);
assert.deepEqual(view().trainees.map(t => [t.name, t.status, t.online]),
  [['Reem Al-Qahtani', 'joined', true], ['Sara Al-Otaibi', 'joined', true], ['Omar Al-Harbi', 'joined', true]]);
assert.ok(toasts.includes('Sara joined the room'));
ok('three trainees joined (one claimed an invite); trainer notified');

const st = sara.state();
assert.ok(!JSON.stringify(st).includes(reem.token), 'tokens must never be broadcast');
ok('other trainees\' tokens are never sent');

const dup = connect();
dup.send({ t: 'join', name: 'sara al-otaibi' });
ok('duplicate joined name refused', dup.err());

const stranger = connect();
stranger.send({ t: 'submit', start: 1, answers: answersAll('met') });
assert.equal(stranger.last('error'), undefined);
ok('messages from a trainee who has not joined are ignored');

assert.equal(act('startRound', { id: sara.id }), null);
assert.equal(reem.state().room.round.status, 'live');
assert.equal(reem.state().room.round.scorerIds.length, 2);
ok('round 1 live with 2 scorers');

const start1 = room.round.start;
ok('cannot reveal with no scorecards', act('endRound'));
sara.send({ t: 'submit', start: start1, answers: answersAll('met') });
ok('performer cannot score themself', sara.err());
reem.send({ t: 'submit', start: start1, answers: { a1: 'met' } });
ok('incomplete scorecard refused', reem.err());
reem.send({ t: 'submit', start: start1, answers: { ...answersAll('met'), a3: 'bogus' } });
ok('invalid answer value refused', reem.err());

reem.send({ t: 'submit', start: start1, answers: answersAll('met') });
assert.equal(view().round.submitted.length, 1);
assert.ok(!JSON.stringify(omar.state()).includes('"answers"'), 'live answers must stay hidden');
ok('submission counted; answers hidden until reveal');
reem.send({ t: 'submit', start: start1, answers: answersAll('met') });
ok('double submit refused', reem.err());

// Omar misses a11 (auto-fail, retention ownership); room mean for a11 = 0.5 so no auto-fail.
omar.send({ t: 'submit', start: start1, answers: { ...answersAll('part'), a11: 'miss' } });
ok('trainer notified', toasts.at(-1));
assert.equal(act('endRound'), null);
const R = sara.state().room.round.result;
assert.equal(R.n, 2); assert.equal(R.final, 71); assert.deepEqual(R.af, []);
ok('round revealed to trainees', `final ${R.final}%, scorers ${R.scorers.map(s => s.score + '%/' + s.align + '% aligned').join(', ')}`);

act('nextRound');
assert.equal(act('startRound', { id: omar.id }), null);
const cancelledStart = room.round.start;
act('cancelRound');
await new Promise(r => setTimeout(r, 5));
act('startRound', { id: omar.id });
assert.equal(room.round.n, 2);
sara.send({ t: 'submit', start: cancelledStart, answers: answersAll('met') });
ok('late submit for a cancelled round is refused', sara.err());

ok("can't remove the trainee on the call", act('removeTrainee', { id: omar.id }));
assert.equal(act('removeTrainee', { id: reem.id }), null);
assert.ok(reem.last('removed'));
assert.equal(room.round.scorerIds.length, 1);
ok('removed scorer is kicked and dropped from the round');

const stale = connect({ traineeId: reem.id, token: reem.token });
assert.ok(stale.last('removed'));
sara.close();
assert.equal(view().trainees.find(t => t.id === sara.id).online, false);
const again = connect({ traineeId: sara.id, token: sara.token });
assert.equal(again.state().you.traineeId, sara.id);
assert.equal(view().trainees.find(t => t.id === sara.id).online, true);
const forged = connect({ traineeId: sara.id, token: 'guess' });
assert.equal(forged.state().you.traineeId, null);
ok('reconnect restores identity and presence; stale or forged identity is rejected');

again.send({ t: 'submit', start: room.round.start, answers: answersAll('miss') });
act('endRound');
assert.equal(room.round.result.final, 0);
ok('auto-fail zeroes the score', room.round.result.af.length + ' auto-fail attributes');

act('finish');
assert.equal(view().stage, 'final');
assert.deepEqual(view().rounds.map(r => r.n), [1, 2]);
ok('session finished with 2 rounds');

act('newSession');
const late = connect();
late.send({ t: 'join', name: 'Late' });
ok('closed room refuses joins', late.err());
act('reopen', { name: 'Test room 2', trainerName: 'Hana', settings: {} });
assert.equal(view().stage, 'room'); assert.equal(view().rounds.length, 0);
ok('new session reopens with a clean slate');

assert.ok(saved > 10);
const copy = JSON.parse(JSON.stringify(room));
assert.deepEqual(new RoomHub(copy).view().trainees.map(t => t.name), view().trainees.map(t => t.name));
ok('room state survives a save/restore round-trip');

console.log('\nAll checks passed.');
