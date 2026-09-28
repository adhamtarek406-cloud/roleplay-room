// Trainer console: create the room, manage trainees, run rounds, reveal results.
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Icon } from '../ds/index.jsx';
import { AUTO_FAIL_MODES, DEFAULT_SETTINGS, RATING_SCALES } from '../../shared/scorecard.js';
import { createHostedRoom, useHostedRoom } from '../lib/host.js';
import { hostedRooms, lastTrainerName } from '../lib/storage.js';
import { useTicker } from '../lib/useRoom.js';
import {
  Avatar, Content, Header, LiveDot, Main, Notice, ProgressBar, SCORECARD_SUMMARY, Shell, Toast, WhoPill,
  byId, display, eyebrow, fmtElapsed, initials, inputStyle, panel, performedScores, roomLink, scoreColor, useToast,
} from '../lib/ui.jsx';
import { Leaderboard, RoundReport, TrainerReportActions } from './Results.jsx';

const HOW = [{ n: '01', t: 'Create the room and share the link' }, { n: '02', t: 'Start a round with one trainee' }, { n: '03', t: 'The room scores; you reveal results' }];

function Segmented({ value, options, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--soft-grey-p1)', flexWrap: 'wrap' }}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <button key={String(v)} type="button" onClick={() => onChange(v)} aria-pressed={on}
            style={{ flex: '1 1 auto', border: 'none', cursor: 'pointer', height: 32, padding: '0 14px', borderRadius: 999, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, background: on ? '#fff' : 'transparent', color: on ? 'var(--zingy-purple)' : 'var(--text-muted)', boxShadow: on ? 'var(--shadow-sm)' : 'none' }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Used for a brand-new room (POST) and for re-opening a room after "New session".
export function CreateRoom({ initial, onCreate, busy }) {
  const [name, setName] = useState(initial?.name ?? 'ERT cohort — Experience recovery');
  const [trainerName, setTrainerName] = useState(initial?.trainerName ?? lastTrainerName.get());
  const [settings, setSettings] = useState(initial?.settings ?? DEFAULT_SETTINGS);
  const patch = p => setSettings(s => ({ ...s, ...p }));
  const submit = e => {
    e.preventDefault();
    lastTrainerName.set(trainerName.trim());
    onCreate({ name, trainerName, settings });
  };
  const label = { fontSize: 13, fontWeight: 600, color: 'var(--text-body)' };

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
      <div style={{ flex: '1 1 380px', background: 'var(--tamara-lavender)', color: '#fff', borderRadius: 28, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32, minHeight: 360 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ ...eyebrow, color: 'var(--light-lilac)' }}>Trainer console</span>
          <h1 style={{ margin: 0, ...display(52, 700, '-.03em', 0.98), color: '#fff', textWrap: 'balance' }}>Everyone plays. Everyone scores.</h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, maxWidth: 420, color: '#fff' }}>One trainee takes the call with you. The rest of the room scores them live on the Experience Recovery scorecard.</p>
        </div>
        <div className="rr-how" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
          {HOW.map(h => (
            <div key={h.n} style={{ background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={display(22, 700, 0)}>{h.n}</span>
              <span style={{ fontSize: 13, lineHeight: 1.4 }}>{h.t}</span>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} style={{ flex: '1 1 380px', ...panel, borderRadius: 28, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h2 style={{ margin: 0, ...display(26, 600, '-.01em', 1.2) }}>{initial ? 'Open a new session' : 'Create a room'}</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={label}>Room name</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} required style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={label}>Your name</span>
          <input value={trainerName} onChange={e => setTrainerName(e.target.value)} maxLength={60} placeholder="e.g. Hana" required style={inputStyle} />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 14, background: 'var(--soft-grey-p2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="clipboard-check" size={18} color="var(--tamara-lavender)" />
            <span style={{ fontSize: 13, color: 'var(--text-body)', flex: 1 }}>{SCORECARD_SUMMARY}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,auto) 1fr', gap: '10px 12px', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Rating scale</span>
            <Segmented value={settings.ratingScale} options={RATING_SCALES.map(v => [v, v])} onChange={v => patch({ ratingScale: v })} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Auto-fail</span>
            <Segmented value={settings.autoFail} options={AUTO_FAIL_MODES.map(v => [v, v])} onChange={v => patch({ autoFail: v })} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Running score</span>
            <Segmented value={settings.showRunningScore} options={[[true, 'Show to scorers'], [false, 'Hide']]} onChange={v => patch({ showRunningScore: v })} />
          </div>
        </div>
        <Button type="submit" size="lg" fullWidth iconRight="arrow-right" loading={busy}>{initial ? 'Open room' : 'Create room'}</Button>
      </form>
    </div>
  );
}

function Sidebar({ room, act, toast, viewRound, setViewRound }) {
  const [addName, setAddName] = useState('');
  const [copied, setCopied] = useState(false);
  const r = room.round;
  const live = r && r.status === 'live';
  const performed = performedScores(room);
  const joined = room.trainees.filter(t => t.status === 'joined');
  const link = roomLink(room.code);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* insecure context: the link is visible to copy by hand */ }
    setCopied(true); toast('Room link copied');
    setTimeout(() => setCopied(false), 2200);
  };
  const add = () => { if (addName.trim()) { act('addTrainee', { name: addName }); setAddName(''); } };

  return (
    <aside style={{ flex: '1 1 280px', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }} className="rr-aside">
      <div style={{ ...panel, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="link" size={18} color="var(--tamara-lavender)" />
          <span style={display(18, 600, 0)}>Invite with a link</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 14px', borderRadius: 999, background: 'var(--soft-grey-p2)', boxShadow: 'var(--shadow-inset-hairline)' }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', userSelect: 'all' }}>{link}</span>
          <Button size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>Anyone with the link lands in this room. Invited trainees switch to Joined when they open it.</span>
      </div>

      <div style={{ ...panel, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={display(18, 600, 0)}>Trainees</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{joined.length} of {room.trainees.length} in the room</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={addName} onChange={e => setAddName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }} placeholder="Add trainee by name" maxLength={60}
            style={{ ...inputStyle, flex: 1, minWidth: 0, height: 42, padding: '0 16px', borderRadius: 999, fontSize: 14 }} />
          <Button size="sm" variant="secondary" icon="user-plus" onClick={add} style={{ height: 42 }}>Add</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {room.trainees.length === 0 ? <span style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: 4 }}>No one yet. Share the link or add names to invite.</span> : null}
          {room.trainees.map(t => {
            let label = t.status === 'joined' ? 'Joined' : 'Invited', tone = t.status === 'joined' ? 'success' : 'neutral';
            if (live && r.performerId === t.id) { label = 'On call'; tone = 'brand'; }
            else if (live && r.submitted.includes(t.id)) { label = 'Submitted'; tone = 'info'; }
            else if (live && r.scorerIds.includes(t.id)) { label = 'Scoring'; tone = 'soft'; }
            const sub = performed[t.id] != null ? 'Performed · ' + performed[t.id] + '%'
              : t.status !== 'joined' ? 'Link not opened' : !t.online ? 'Offline' : 'Not performed yet';
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <Avatar t={t} style={{ opacity: t.status === 'joined' && t.online ? 1 : 0.5 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</span>
                </div>
                <Badge size="sm" tone={tone} dot={t.status === 'joined'}>{label}</Badge>
                <button className="rr-remove" onClick={() => act('removeTrainee', { id: t.id })} title="Remove from room" aria-label={'Remove ' + t.name}>
                  <Icon name="x" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {room.rounds.length > 0 ? (
        <div style={{ ...panel, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={display(18, 600, 0)}>Session so far</span>
          {room.rounds.map(x => (
            <button key={x.n} className="rr-history" onClick={() => setViewRound(x.n)} aria-current={viewRound === x.n}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', width: 54 }}>Round {x.n}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{byId(room, x.performerId).name}</span>
              <span style={{ ...display(18, 700, 0), color: scoreColor(x.result.final) }}>{x.result.final}%</span>
            </button>
          ))}
          <Button variant="ghost" size="sm" icon="trophy" onClick={() => { setViewRound(null); act('finish'); }}>End session and show leaderboard</Button>
        </div>
      ) : null}
    </aside>
  );
}

function PickPerformer({ room, act }) {
  const joined = room.trainees.filter(t => t.status === 'joined');
  const performed = performedScores(room);
  const tooFew = joined.length < 2;
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ ...eyebrow, color: 'var(--text-muted)' }}>Round {room.rounds.length + 1}</span>
        <h1 style={{ margin: 0, ...display(40) }}>Who's on the call?</h1>
        <span style={{ fontSize: 15, color: 'var(--text-body)' }}>Pick a trainee to start the round. Everyone else in the room gets the scorecard.</span>
      </div>
      {tooFew ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1.5px dashed var(--dreamy-lilac)', padding: 32, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <span style={display(20, 600, 0)}>Waiting for trainees</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>You need at least 2 people in the room — one to perform, one to score. Copy the link and share it.</span>
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 16 }}>
        {joined.map(t => {
          const done = performed[t.id] != null;
          return (
            <div key={t.id} style={{ ...panel, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, animation: 'rr-in 240ms cubic-bezier(.16,1,.3,1) both' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar t={t} size={48} font={16} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{done ? 'Performed · ' + performed[t.id] + '%' : t.online ? 'Not performed yet' : 'Offline'}</span>
                </div>
              </div>
              <Button size="sm" variant={done ? 'secondary' : 'primary'} icon="play" fullWidth disabled={tooFew} onClick={() => act('startRound', { id: t.id })}>Start round</Button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function LiveRound({ room, act, skew }) {
  const r = room.round;
  const perf = byId(room, r.performerId);
  const scorers = r.scorerIds;
  const subCount = r.submitted.length;
  return (
    <>
      <div style={{ background: 'var(--tamara-lavender)', color: '#fff', borderRadius: 28, padding: 32, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', ...display(36, 700, 0), background: '#fff', color: 'var(--zingy-purple)', flex: 'none' }}>{initials(perf.name)}</div>
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot />
            <span style={eyebrow}>Round {r.n} · Live</span>
          </div>
          <span style={display(40, 700, '-.02em')}>{perf.name}</span>
          <span style={{ fontSize: 14, color: 'var(--light-lilac)' }}>You're playing the customer</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ ...display(48, 600, '-.02em'), fontVariantNumeric: 'tabular-nums' }}>{fmtElapsed(Date.now() + skew - r.start)}</span>
          <span style={{ fontSize: 12, color: 'var(--light-lilac)' }}>elapsed</span>
        </div>
      </div>
      <div style={{ ...panel, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={display(20, 600, 0)}>Scorecards</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subCount} of {scorers.length} submitted · scores stay hidden until you reveal them</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => act('cancelRound')}>Cancel round</Button>
            <Button size="sm" icon="eye" disabled={subCount === 0} onClick={() => act('endRound')}>End round and reveal</Button>
          </div>
        </div>
        <ProgressBar pct={scorers.length ? Math.round(subCount / scorers.length * 100) : 0} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {scorers.map(id => {
            const t = byId(room, id); const done = r.submitted.includes(id);
            const color = done ? 'var(--success)' : 'var(--text-muted)';
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: done ? 'var(--success-surface)' : 'var(--soft-grey-p2)' }}>
                <Avatar t={t} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                  <span style={{ fontSize: 12, color }}>{done ? 'Submitted' : t.online ? 'Scoring…' : 'Offline'}</span>
                </div>
                <Icon name={done ? 'circle-check' : 'loader-circle'} size={18} color={color} style={done ? undefined : { animation: 'tamara-spin 1.6s linear infinite' }} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// Keep the tab from being closed by accident: it *is* the room.
function useLeaveGuard(active) {
  useEffect(() => {
    if (!active) return;
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [active]);
}

export function TrainerConsole({ code, navigate }) {
  const [toast, showToast] = useToast();
  const showError = useCallback(m => showToast(m, 'error'), [showToast]);
  const { room, status, act } = useHostedRoom(code, { onToast: showToast, onError: showError });
  const [viewRound, setViewRound] = useState(null);
  const live = room?.round?.status === 'live';
  useTicker(live);
  useLeaveGuard(!!room && room.trainees.some(t => t.online));

  if (status === 'missing') {
    return (
      <Shell>
        <Header title="Role-play room" />
        <Main><Content>
          <Notice icon="door-closed" title="This room isn't hosted in this browser"
            body="A room lives in the browser of the trainer who created it. If you're a trainee, ask your trainer for the invite link.">
            <div style={{ marginTop: 10 }}><Button icon="plus" onClick={() => navigate('/')}>Create a room</Button></div>
          </Notice>
        </Content></Main>
      </Shell>
    );
  }

  const r = room.round;
  const pastRound = viewRound ? room.rounds.find(x => x.n === viewRound) : null;
  const reportRound = pastRound || (r && r.status === 'review' ? r : null);
  const mode = room.stage === 'create' ? 'create' : room.stage === 'final' ? 'final' : reportRound ? 'report' : live ? 'live' : 'pick';

  return (
    <Shell>
      <Header title={room.name} code={room.stage !== 'create' ? room.code : null} right={<WhoPill label={room.trainerName + ' · Trainer'} />} />
      <HostBanner status={status} />
      <Main>
        {room.stage === 'room' ? <Sidebar room={room} act={act} toast={showToast} viewRound={viewRound} setViewRound={setViewRound} /> : null}
        <Content>
          {mode === 'create' ? <CreateRoom initial={room} onCreate={v => act('reopen', v)} /> : null}
          {mode === 'pick' ? <PickPerformer room={room} act={act} /> : null}
          {mode === 'live' ? <LiveRound room={room} act={act} skew={0} /> : null}
          {mode === 'report' ? (
            <>
              {pastRound && live ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 14, background: 'var(--surface-brand-softer)', color: 'var(--zingy-purple)', fontSize: 13, fontWeight: 600 }}>
                  <LiveDot /> Round {r.n} is still live
                  <span style={{ flex: 1 }} />
                  <Button size="sm" variant="ghost" onClick={() => setViewRound(null)}>Back to live round</Button>
                </div>
              ) : null}
              <RoundReport room={room} round={reportRound}
                actions={<TrainerReportActions viewingPast={!!pastRound} onBack={() => setViewRound(null)} onFinish={() => { setViewRound(null); act('finish'); }} onNext={() => act('nextRound')} />} />
            </>
          ) : null}
          {mode === 'final' ? (
            <Leaderboard room={room} actions={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => act('backToRoom')}>Back to room</Button>
                <Button variant="secondary" size="sm" icon="plus" onClick={() => { if (confirm('Start a new session? This clears every round and score in this room.')) act('newSession'); }}>New session</Button>
              </div>
            } />
          ) : null}
        </Content>
      </Main>
      <Toast toast={toast} />
    </Shell>
  );
}

function HostBanner({ status }) {
  const msg = {
    connecting: 'Opening the room…',
    offline: "Can't reach the connection service — trainees can't join until it's back. Retrying…",
    duplicate: 'This room is open in another tab or window. Close the other one to go live here. Retrying…',
  }[status];
  if (!msg) {
    return (
      <div style={{ background: 'var(--surface-brand-softer)', color: 'var(--zingy-purple)', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px 16px' }}>
        Keep this tab open — it's hosting the room for your trainees.
      </div>
    );
  }
  return <div role="status" style={{ background: 'var(--warning-surface)', color: 'var(--warning)', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px 16px' }}>{msg}</div>;
}

function YourRooms({ navigate }) {
  const rooms = hostedRooms.list().slice(0, 6);
  if (!rooms.length) return null;
  return (
    <div style={{ ...panel, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={display(20, 600, 0)}>Your rooms</span>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Rooms live in this browser. Reopen one to pick up where you left off.</span>
      {rooms.map(r => (
        <button key={r.code} className="rr-history" onClick={() => navigate('/host/' + r.code)}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--zingy-purple)', width: 72, flex: 'none' }}>{r.code}</span>
          <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.trainees.length} trainees · {r.rounds.length} rounds</span>
        </button>
      ))}
    </div>
  );
}

// Home — create a room (its code is claimed on the broker first), then open its console.
export function NewRoom({ navigate }) {
  const [toast, showToast] = useToast();
  const [busy, setBusy] = useState(false);
  const create = async v => {
    setBusy(true);
    try {
      const host = await createHostedRoom(v);
      navigate('/host/' + host.code);
    } catch (e) {
      showToast(e.message, 'error');
      setBusy(false);
    }
  };
  return (
    <Shell>
      <Header title="New room" />
      <Main><Content>
        <CreateRoom onCreate={create} busy={busy} />
        <YourRooms navigate={navigate} />
      </Content></Main>
      <Toast toast={toast} />
    </Shell>
  );
}
