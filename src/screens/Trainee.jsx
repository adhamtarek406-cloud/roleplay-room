// Trainee view: join by link, wait, take the call, or score a peer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Icon } from '../ds/index.jsx';
import { ATTRS, CATS, CRED, isThreePoint, scoreOf } from '../../shared/scorecard.js';
import { drafts } from '../lib/storage.js';
import { useRoom, useTicker } from '../lib/useRoom.js';
import {
  Avatar, ConnectionBanner, Content, Header, LiveDot, Main, Notice, ProgressBar, Shell, Toast, WhoPill,
  byId, display, eyebrow, firstName, fmtElapsed, inputStyle, panel, useToast,
} from '../lib/ui.jsx';
import { Leaderboard, RoundReport } from './Results.jsx';

function Join({ room, send }) {
  const invited = room.trainees.filter(t => t.status === 'invited');
  const [claimId, setClaimId] = useState(null);
  const [name, setName] = useState('');
  const claimed = invited.find(t => t.id === claimId);
  const joinedCount = room.trainees.filter(t => t.status === 'joined').length;
  const join = e => { e.preventDefault(); send({ t: 'join', claimId: claimed?.id, name }); };

  return (
    <div style={{ maxWidth: 520, width: '100%', margin: '40px auto 0', ...panel, borderRadius: 28, boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
      <div style={{ background: 'var(--tamara-lavender)', color: '#fff', padding: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ ...eyebrow, color: 'var(--light-lilac)' }}>You're invited</span>
        <span style={display(34, 700, '-.02em', 1.02)}>{room.name}</span>
        <span style={{ fontSize: 14 }}>Hosted by {room.trainerName} · {joinedCount} trainee{joinedCount === 1 ? '' : 's'} inside</span>
      </div>
      <form onSubmit={join} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {invited.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>Your trainer added these names — tap yours</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {invited.map(t => {
                const on = t.id === claimId;
                return (
                  <button key={t.id} type="button" onClick={() => setClaimId(on ? null : t.id)} aria-pressed={on}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: on ? 'var(--surface-brand-softer)' : 'var(--soft-grey-p2)', border: on ? '1.5px solid var(--tamara-lavender)' : '1.5px solid transparent' }}>
                    <Avatar t={t} size={30} font={11} />{t.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {claimed ? (
          <span style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--text-body)' }}>Hi {firstName(claimed.name)} — your trainer added you to this room. Join to take your turn and score your peers.</span>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>{invited.length ? 'Not on the list? Enter your name' : 'Your name'}</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Reem Al-Qahtani" maxLength={60} autoFocus style={inputStyle} />
          </label>
        )}
        <Button type="submit" size="lg" fullWidth disabled={!claimed && !name.trim()}>Join room</Button>
      </form>
    </div>
  );
}

function Waiting({ room, me }) {
  const joined = room.trainees.filter(t => t.status === 'joined');
  return (
    <div style={{ ...panel, borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>You're in, {firstName(me.name)}</span>
        <span style={display(40)}>Waiting for round {room.rounds.length + 1}</span>
        <span style={{ fontSize: 15, color: 'var(--text-body)' }}>{room.trainerName} will pick who's on the call. If it's not you, your scorecard opens automatically.</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {joined.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 6px', borderRadius: 999, background: 'var(--soft-grey-p2)', opacity: t.online ? 1 : 0.55 }}>
            <Avatar t={t} size={30} font={11} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}{t.id === me.id ? ' (you)' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Performer({ room, elapsed }) {
  const r = room.round;
  return (
    <>
      <div style={{ background: 'var(--tamara-lavender)', color: '#fff', borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LiveDot />
              <span style={eyebrow}>Round {r.n} · You're on the call</span>
            </div>
            <span style={display(52, 700, '-.03em', 0.98)}>You've got this.</span>
          </div>
          <span style={{ ...display(48, 600, 0), fontVariantNumeric: 'tabular-nums' }}>{elapsed}</span>
        </div>
        <span style={{ fontSize: 14, color: 'var(--light-lilac)' }}>{room.trainerName} is playing the customer. {r.scorerIds.length} peer{r.scorerIds.length === 1 ? ' is' : 's are'} scoring you on the Experience Recovery scorecard.</span>
      </div>
      <div style={{ ...panel, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={display(20, 600, 0)}>What you're scored on</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
          {CATS.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'var(--soft-grey-p2)' }}>
              <span style={{ ...display(18, 700, 0), color: 'var(--tamara-lavender)', width: 44 }}>{c.w}%</span>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Scoring({ room, me, elapsed, send }) {
  const r = room.round;
  const perf = byId(room, r.performerId);
  const three = isThreePoint(room.settings);
  const [ans, setAns] = useState(() => drafts.get(room.code, r.start, me.id));
  const [cat, setCat] = useState(0);
  const [open, setOpen] = useState({});
  useEffect(() => { drafts.set(room.code, r.start, me.id, ans); }, [ans, room.code, r.start, me.id]);

  const pick = (id, v) => setAns(a => ({ ...a, [id]: v }));
  const answered = ATTRS.filter(a => ans[a.id]).length;
  const running = Math.round(ATTRS.reduce((t, a) => t + (ans[a.id] ? a.w * CRED[ans[a.id]] : 0), 0));
  const options = [
    ['met', 'Met', 'check', 'var(--success-surface)', 'var(--success)'],
    ...(three ? [['part', 'Partial', 'minus', 'var(--warning-surface)', 'var(--warning)']] : []),
    ['miss', 'Not met', 'x', 'var(--danger-surface)', 'var(--danger)'],
  ];
  const submit = () => send({ t: 'submit', start: r.start, answers: ans });
  const go = i => { setCat(i); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <>
      <div style={{ ...panel, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Avatar t={perf} size={48} font={16} />
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot />
            <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>Round {r.n} · Live · {elapsed}</span>
          </div>
          <span style={display(22, 600, 0)}>Scoring {perf.name}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <nav className="rr-catnav" style={{ flex: '1 1 220px', maxWidth: 280, ...panel, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 96 }}>
          {CATS.map((c, i) => {
            const at = ATTRS.filter(a => a.c === i); const done = at.filter(a => ans[a.id]).length;
            const on = cat === i; const full = done === at.length;
            return (
              <button key={c.name} onClick={() => go(i)} aria-current={on}
                style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', textAlign: 'left', padding: '10px 12px', borderRadius: 12, fontFamily: 'var(--font-body)', background: on ? 'var(--surface-brand-softer)' : 'transparent' }}>
                <span style={{ width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none', background: full ? 'var(--tamara-lavender)' : on ? 'var(--light-lilac)' : 'var(--soft-grey-p1)', color: full ? '#fff' : on ? 'var(--zingy-purple)' : 'var(--text-muted)' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: on ? 'var(--zingy-purple)' : 'var(--text-primary)' }}>{c.name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{done}/{at.length}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ flex: '999 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={display(30, 700, '-.02em')}>{CATS[cat].name}</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{CATS[cat].w}% of total</span>
          </div>
          {ATTRS.filter(a => a.c === cat).map(a => (
            <div key={a.id} style={{ ...panel, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, animation: 'rr-in 240ms cubic-bezier(.16,1,.3,1) both' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge size="sm" tone="soft">{a.e}</Badge>
                <Badge size="sm" tone="neutral">{a.w}%</Badge>
                {a.crit === 'auto' ? <Badge size="sm" tone="danger" icon="triangle-alert">Auto-fail</Badge> : null}
                {a.crit === 'crit' ? <Badge size="sm" tone="warning">Critical</Badge> : null}
              </div>
              <span style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.4, textWrap: 'pretty' }}>{a.t}</span>
              <div role="radiogroup" aria-label={a.e} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {options.map(([v, label, icon, bg, fg]) => {
                  const on = ans[a.id] === v;
                  return (
                    <button key={v} role="radio" aria-checked={on} onClick={() => pick(a.id, v)}
                      style={{ flex: '1 1 120px', height: 48, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 15, transition: 'background 160ms,color 160ms', background: on ? bg : '#fff', color: on ? fg : 'var(--text-body)', border: on ? '1.5px solid ' + fg : '1px solid var(--border-default)' }}>
                      <Icon name={icon} size={18} />{label}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setOpen(o => ({ ...o, [a.id]: !o[a.id] }))} aria-expanded={!!open[a.id]}
                style={{ alignSelf: 'flex-start', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--tamara-lavender)' }}>
                <Icon name={open[a.id] ? 'chevron-up' : 'chevron-down'} size={16} />{open[a.id] ? 'Hide guidance' : 'What to observe'}
              </button>
              {open[a.id] ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                  <div style={{ background: 'var(--soft-grey-p2)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Observe for</span>
                    {a.o.map(line => (
                      <div key={line} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.45, color: 'var(--text-body)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--dreamy-lilac)', flex: 'none', marginTop: 7 }} /><span>{line}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'var(--surface-brand-softer)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--zingy-purple)' }}>What good looks like</span>
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-body)' }}>{a.g}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Button variant="ghost" size="sm" icon="arrow-left" disabled={cat === 0} onClick={() => go(cat - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" iconRight="arrow-right" disabled={cat === CATS.length - 1} onClick={() => go(cat + 1)}>Next category</Button>
          </div>
        </div>
      </div>

      <div className="rr-submitbar" style={{ position: 'sticky', bottom: 16, zIndex: 10, background: 'var(--soft-grey-m2)', color: '#fff', borderRadius: 999, padding: '10px 10px 10px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: 'var(--shadow-lg)' }}>
        <span style={{ fontSize: 14 }}><strong>{answered}</strong> of {ATTRS.length} answered</span>
        {room.settings.showRunningScore ? <span style={{ fontSize: 14, color: 'var(--light-lilac)' }}>Your score so far <strong style={{ color: '#fff' }}>{running}%</strong></span> : null}
        <span style={{ flex: 1 }} />
        <Button icon="send" disabled={answered < ATTRS.length} onClick={submit}>Submit scorecard</Button>
      </div>
    </>
  );
}

function Submitted({ room, me }) {
  const r = room.round;
  const perf = byId(room, r.performerId);
  const myScore = scoreOf(drafts.get(room.code, r.start, me.id));
  const subCount = r.submitted.length; const total = r.scorerIds.length;
  return (
    <div style={{ maxWidth: 640, width: '100%', margin: '20px auto 0', ...panel, borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: 'var(--success-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={28} color="var(--success)" />
      </div>
      <span style={display(34, 700, '-.02em', 1.02)}>Scorecard in for {perf.name}</span>
      <span style={{ fontSize: 15, color: 'var(--text-body)' }}>You gave <strong>{myScore}%</strong>. Results appear here when {room.trainerName} ends the round — {subCount} of {total} scorecards are in.</span>
      <ProgressBar pct={total ? Math.round(subCount / total * 100) : 0} style={{ width: '100%' }} />
    </div>
  );
}

export function TraineeView({ code }) {
  const [toast, showToast] = useToast();
  const showError = useCallback(m => showToast(m, 'error'), [showToast]);
  const { room, you, status, clockSkew, send } = useRoom(code, { onToast: showToast, onError: showError });
  const live = room?.round?.status === 'live';
  useTicker(live);

  const me = room && you.traineeId ? room.trainees.find(t => t.id === you.traineeId) : null;
  const header = (
    <Header title={room?.name || 'Role-play room'} code={room && room.stage !== 'create' ? room.code : null}
      right={me ? <WhoPill t={me} label={me.name} /> : null} />
  );

  if (!room) {
    const [icon, title, body] = status === 'unreachable'
      ? ['door-closed', "Can't reach the room", `Room ${code} is hosted in your trainer's browser. Check the link, and make sure your trainer has the room open. Retrying…`]
      : status === 'offline'
        ? ['triangle-alert', "Can't reach the connection service", 'Check your internet connection. Retrying…']
        : ['loader-circle', 'Connecting to the room…', 'This takes a few seconds.'];
    return <Shell>{header}<Main><Content><Notice icon={icon} title={title} body={body} /></Content></Main></Shell>;
  }

  const r = room.round;
  const elapsed = r ? fmtElapsed(Date.now() + clockSkew - r.start) : '00:00';
  let mode;
  if (room.stage === 'create') mode = 'closed';
  else if (!me) mode = 'join';
  else if (room.stage === 'final') mode = 'final';
  else if (live && r.performerId === me.id) mode = 'performer';
  else if (live && r.submitted.includes(me.id)) mode = 'submitted';
  else if (live && r.scorerIds.includes(me.id)) mode = 'scoring';
  else if (r && r.status === 'review') mode = 'report';
  else mode = 'waiting';

  return <TraineeScreen room={room} me={me} mode={mode} elapsed={elapsed} send={send} header={header} status={status} toast={toast} showToast={showToast} />;
}

function TraineeScreen({ room, me, mode, elapsed, send, header, status, toast, showToast }) {
  const r = room.round;
  const prevMode = useRef(mode);
  useEffect(() => {
    if (prevMode.current === 'scoring' && mode === 'submitted') showToast('Scorecard submitted');
    if (prevMode.current === 'join' && mode !== 'join') showToast("You're in the room");
    prevMode.current = mode;
  }, [mode, showToast]);

  return (
    <Shell>
      {header}
      <ConnectionBanner status={status} />
      <Main>
        <Content>
          {mode === 'closed' ? <Notice icon="door-closed" title="This room isn't open yet" body="Your trainer will share the link once the room is created." /> : null}
          {mode === 'join' ? <Join room={room} send={send} /> : null}
          {mode === 'waiting' ? <Waiting room={room} me={me} /> : null}
          {mode === 'performer' ? <Performer room={room} elapsed={elapsed} /> : null}
          {mode === 'scoring' ? <Scoring key={r.start} room={room} me={me} elapsed={elapsed} send={send} /> : null}
          {mode === 'submitted' ? <Submitted room={room} me={me} /> : null}
          {mode === 'report' ? <RoundReport room={room} round={r} actions={<Badge tone="soft" dot>Waiting for the next round</Badge>} /> : null}
          {mode === 'final' ? <Leaderboard room={room} /> : null}
        </Content>
      </Main>
      <Toast toast={toast} />
    </Shell>
  );
}

