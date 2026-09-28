// Dev helper: bot trainees over the real PeerJS transport.
import { ATTRS, isThreePoint } from '../shared/scorecard.js';
import { CONN_OPTIONS, PEER_OPTIONS, Peer, peerIdFor } from '../src/lib/peer.js';

const NAMES = ['Sara Al-Otaibi', 'Omar Al-Harbi', 'Lina Haddad', 'Khalid Al-Mutairi', 'Yousef Nasser', 'Maha Al-Shehri', 'Faisal Al-Dosari'];
const log = m => { document.getElementById('log').textContent += m + '\n'; };
let used = 0;

function bot(code, name) {
  const peer = new Peer(PEER_OPTIONS);
  peer.on('error', e => log(`${name}: ${e.type}`));
  peer.on('open', () => {
    const conn = peer.connect(peerIdFor(code), CONN_OPTIONS);
    let id = null, asked = false; const scored = new Set();
    conn.on('open', () => conn.send({ t: 'hello' }));
    conn.on('data', m => {
      if (m.t === 'state' && !id && !asked) {
        asked = true;
        if (m.room.stage !== 'create' && !m.room.trainees.some(t => t.name === name && t.status === 'joined')) conn.send({ t: 'join', name });
      }
      if (m.t === 'joined') { id = m.traineeId; log(`${name} joined`); }
      if (m.t === 'removed') { log(`${name} was removed`); peer.destroy(); }
      if (m.t === 'error') log(`${name}: ${m.msg}`);
      const r = m.t === 'state' && id && m.room.round;
      if (r && r.status === 'live' && r.scorerIds.includes(id) && !r.submitted.includes(id) && !scored.has(r.start)) {
        scored.add(r.start);
        const skill = 0.55 + Math.random() * 0.4; const three = isThreePoint(m.room.settings);
        const answers = Object.fromEntries(ATTRS.map(a => {
          const p = a.crit === 'auto' ? Math.min(0.96, skill + 0.22) : skill;
          return [a.id, Math.random() < p ? 'met' : three && Math.random() < 0.55 ? 'part' : 'miss'];
        }));
        setTimeout(() => { conn.send({ t: 'submit', start: r.start, answers }); log(`${name} scored round ${r.n}`); }, 3000 + Math.random() * 7000);
      }
    });
  });
}

const params = new URLSearchParams(location.search);
const start = (code, n) => { for (let i = 0; i < n && used < NAMES.length; i++) bot(code, NAMES[used++]); };
document.getElementById('f').onsubmit = e => {
  e.preventDefault();
  start(document.getElementById('code').value.trim().toUpperCase(), Number(document.getElementById('count').value));
};
if (params.get('code')) start(params.get('code').toUpperCase(), Number(params.get('n') || 4));
