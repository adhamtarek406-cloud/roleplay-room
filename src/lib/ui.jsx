// Small shared pieces of the role-play room UI.
import { useCallback, useRef, useState } from 'react';
import { Icon } from '../ds/index.jsx';
import { ATTRS, CATS } from '../../shared/scorecard.js';

export const PAL = [
  ['var(--light-lilac)', 'var(--zingy-purple)'], ['var(--sky-blue-p1)', 'var(--sky-blue-m1)'],
  ['var(--vibrant-pink-p1)', 'var(--vibrant-pink-m2)'], ['var(--cyan-p1)', 'var(--cyan-m2)'],
  ['var(--fresh-green-p1)', 'var(--fresh-green-m2)'], ['var(--sand-p1)', 'var(--sand-m2)'], ['var(--sunset-p1)', 'var(--sunset-m2)'],
];
export const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
export const firstName = n => (n || '').split(' ')[0];
export const scoreColor = v => (v >= 80 ? 'var(--success)' : v >= 60 ? 'var(--tamara-lavender)' : 'var(--danger)');
export const SCORECARD_SUMMARY = `Scorecard: ERT — Experience Recovery · ${CATS.length} categories · ${ATTRS.length} attributes`;

const REMOVED = { name: 'Removed trainee', c: 0 };
export const byId = (room, id) => room.trainees.find(t => t.id === id) || REMOVED;

export const fmtElapsed = ms => {
  const el = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(el / 60)).padStart(2, '0') + ':' + String(el % 60).padStart(2, '0');
};

export const asset = p => import.meta.env.BASE_URL + p;
export const roomLink = code => location.origin + location.pathname + '#/room/' + code;

// Last score per trainee who has performed.
export function performedScores(room) {
  const m = {};
  room.rounds.forEach(r => { m[r.performerId] = r.result.final; });
  return m;
}

export function Avatar({ t, size = 36, font = 13, style }) {
  const [bg, fg] = PAL[t.c % PAL.length];
  return (
    <div style={{ width: size, height: size, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: font, flex: 'none', background: bg, color: fg, ...style }}>
      {initials(t.name)}
    </div>
  );
}

export const panel = { background: '#fff', borderRadius: 20, boxShadow: 'var(--shadow-sm)' };
export const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' };
export const display = (size, weight = 700, ls = '-.03em', lh = 1) => ({ fontFamily: 'var(--font-display)', fontWeight: weight, fontSize: size, lineHeight: lh, letterSpacing: ls });
export const inputStyle = { height: 48, padding: '0 18px', borderRadius: 14, border: '1px solid var(--border-default)', fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', outline: 'none', background: '#fff' };

export function LiveDot() {
  return <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--vibrant-pink)', animation: 'rr-pulse 1.4s ease-in-out infinite' }} />;
}

export function ProgressBar({ pct, color = 'var(--tamara-lavender)', style }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: 'var(--soft-grey-p1)', overflow: 'hidden', ...style }}>
      <div style={{ height: '100%', borderRadius: 99, background: color, transition: 'width 400ms cubic-bezier(.16,1,.3,1)', width: pct + '%' }} />
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, tone = 'ok') => {
    setToast({ msg, tone, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return [toast, show];
}

export function Toast({ toast }) {
  if (!toast) return null;
  const err = toast.tone === 'error';
  return (
    <div key={toast.k} role="status" style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 50, background: 'var(--soft-grey-m2)', color: '#fff', padding: '12px 20px', borderRadius: 999, fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'rr-in 240ms cubic-bezier(.16,1,.3,1) both', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 'calc(100vw - 32px)' }}>
      <Icon name={err ? 'triangle-alert' : 'check'} size={16} color={err ? 'var(--sunset-p1)' : 'var(--fresh-green)'} />{toast.msg}
    </div>
  );
}

export function Header({ title, code, right }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,.86)', backdropFilter: 'saturate(180%) blur(18px)', WebkitBackdropFilter: 'saturate(180%) blur(18px)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="rr-header-inner" style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: '1 1 320px' }}>
          <img src={asset('logo-wordmark-lavender.png')} alt="Tamara" style={{ height: 24, display: 'block' }} />
          <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role-play room</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          </div>
          {code ? <span style={{ flex: 'none', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '5px 9px', borderRadius: 8, background: 'var(--surface-brand-softer)', color: 'var(--zingy-purple)' }}>{code}</span> : null}
        </div>
        {right ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{right}</div> : null}
      </div>
    </header>
  );
}

// Who's using this screen, shown on the right of the header.
export function WhoPill({ label, t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px 4px 4px', borderRadius: 999, background: 'var(--soft-grey-p1)' }}>
      {t ? <Avatar t={t} size={30} font={11} /> : <span style={{ width: 30, height: 30, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="clipboard-check" size={16} color="var(--tamara-lavender)" /></span>}
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
    </div>
  );
}

export function ConnectionBanner({ status }) {
  const msg = {
    reconnecting: 'Connection lost — reconnecting…',
    unreachable: "Lost the trainer's room — it may have been closed. Reconnecting…",
    offline: "Can't reach the connection service — reconnecting…",
  }[status];
  if (!msg) return null;
  return (
    <div role="status" style={{ background: 'var(--warning-surface)', color: 'var(--warning)', fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '8px 16px' }}>
      {msg}
    </div>
  );
}

export function Shell({ children }) {
  return <div style={{ minHeight: '100vh', background: 'var(--soft-grey-p2)', fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>{children}</div>;
}

export function Main({ children }) {
  return <main className="rr-main" style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>{children}</main>;
}

export function Content({ children }) {
  return <section style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>{children}</section>;
}

// Centered card used for closed / missing / removed states.
export function Notice({ icon, title, body, children }) {
  return (
    <div style={{ maxWidth: 520, width: '100%', margin: '60px auto 0', ...panel, borderRadius: 28, padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <Icon name={icon} size={40} color="var(--dreamy-lilac)" />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24 }}>{title}</span>
      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{body}</span>
      {children}
    </div>
  );
}
