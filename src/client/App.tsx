import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AttentionInfo, Need, ThreadMessage } from '../shared/types';
import { createIncident, fetchState, type StateResponse } from './api';
import {
  getWebMCPSnapshot, mountWebMCP, subscribeWebMCP, unmountWebMCP,
} from './webmcp';

export function App() {
  const m = window.location.pathname.match(/^\/i\/([\w-]+)/);
  if (m) {
    const token = new URLSearchParams(window.location.search).get('p') ?? '';
    return <CoordinationView incidentId={m[1]} token={token} />;
  }
  return <Landing />;
}

function Disclaimer() {
  return (
    <p className="notice">
      <strong>Fictionalized scenario for demonstration;</strong> not connected to an active
      emergency response. Relay is a hackathon prototype, not an emergency-management system.
    </p>
  );
}

function Landing() {
  const [links, setLinks] = useState<Record<string, string> | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setBusy(true); setError(null);
    try {
      const res = await createIncident();
      setLinks(res.joinLinks);
      setTitle(res.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap">
      <h1>Relay</h1>
      <p className="tagline">In a crisis, goodwill is abundant. Coordination is scarce.<br />
        <em>The agent coordinates; the human commits.</em></p>
      <Disclaimer />
      <button onClick={onCreate} disabled={busy}>
        {busy ? 'Creating…' : 'Create demo incident (Langtang seed)'}
      </button>
      {error && <p className="error">{error}</p>}
      {links && (
        <section>
          <h2>{title}</h2>
          <p>Join as a participant (magic links, demo-only identity):</p>
          <ul>
            {Object.entries(links).map(([id, href]) => (
              <li key={id}><a href={href}>{id}</a></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function useIncidentState(incidentId: string, token: string) {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(-1);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      try {
        const body = await fetchState(incidentId, token, versionRef.current);
        if (stopped) return;
        if (!('unchanged' in body)) {
          versionRef.current = body.version;
          setState(body);
        }
        setError(null);
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : String(e));
      }
    }
    tick();
    const t = setInterval(tick, 3000);
    const onChanged = () => tick();
    window.addEventListener('relay:changed', onChanged);
    return () => {
      stopped = true;
      clearInterval(t);
      window.removeEventListener('relay:changed', onChanged);
    };
  }, [incidentId, token]);

  return { state, error };
}

const LEVEL_ORDER = { L0: 0, L1: 1, L2: 2 } as const;

function CoordinationView({ incidentId, token }: { incidentId: string; token: string }) {
  const { state, error } = useIncidentState(incidentId, token);
  const webmcp = useSyncExternalStore(subscribeWebMCP, getWebMCPSnapshot);

  useEffect(() => {
    mountWebMCP(incidentId, token);
    return () => unmountWebMCP();
  }, [incidentId, token]);

  if (error) {
    return (
      <main className="wrap">
        <h1>Relay</h1>
        <p className="error">Cannot load incident: {error}</p>
        <p>Check that your magic link is complete (it must include <code>?p=…</code>).</p>
      </main>
    );
  }
  if (!state) return <main className="wrap"><p>Loading incident…</p></main>;

  const { incident, needs, attention, me, threads } = state;
  const counts = { L0: 0, L1: 0, L2: 0 };
  for (const n of needs) counts[attention[n.id]?.level ?? 'L2'] += 1;

  const sorted = [...needs].sort((a, b) => {
    const la = LEVEL_ORDER[attention[a.id]?.level ?? 'L2'];
    const lb = LEVEL_ORDER[attention[b.id]?.level ?? 'L2'];
    return la - lb || a.index - b.index;
  });

  const profile = me.responseProfile;

  return (
    <main className="wrap">
      <header>
        <h1>{incident.title}</h1>
        <Disclaimer />
        <p className="profile-strip">
          You are <strong>{me.displayName}</strong> ({me.role}) — {profile.transport},
          ≤{profile.maxTravelKm} km, {profile.availability || 'no availability window'}.
          {profile.exclusions.length > 0 && <> Not for you: {profile.exclusions.join(', ')}.</>}
        </p>
      </header>

      <section className="attention-map">
        <span className="badge l0">{counts.L0} routine</span>
        <span className="badge l1">{counts.L1} review required</span>
        <span className="badge l2">{counts.L2} human-only</span>
        <span className="version">state v{state.version}</span>
      </section>

      <div className="columns">
        <section className="needs">
          {sorted.map((n) => (
            <NeedCard
              key={n.id}
              need={n}
              attention={attention[n.id]}
              messages={threads.filter((t) => t.needId === n.id)}
              authors={Object.fromEntries(state.participants.map((p) => [p.id, p.displayName]))}
            />
          ))}
        </section>

        <aside className="tools-panel">
          <h2>Agent tools</h2>
          {webmcp.surface ? (
            <>
              <p className="muted">
                surface: <code>{webmcp.surface}</code>
                {webmcp.registeredVia && <> · via <code>{webmcp.registeredVia}()</code></>}
                {!webmcp.active && <> · <strong>inactive</strong></>}
              </p>
              <ul className="tool-list">
                {webmcp.tools.map((t) => <li key={t}><code>{t}</code></li>)}
              </ul>
            </>
          ) : (
            <p className="muted">
              No WebMCP surface detected yet. Open this page in a WebMCP-enabled browser
              (ChatGPT desktop-app browser, or Chrome 149+ with the
              <code> #enable-webmcp-testing</code> flag) and the tools register automatically.
            </p>
          )}
          <p className="muted">
            Tools queue <strong>drafts</strong> only — nothing is ever confirmed without you.
          </p>

          {state.drafts.filter((d) => d.status === 'queued').length > 0 && (
            <>
              <h2>Queued drafts</h2>
              <ul className="draft-list">
                {state.drafts.filter((d) => d.status === 'queued').map((d) => (
                  <li key={d.id}>
                    <span className={`badge ${d.level.toLowerCase()}`}>
                      {d.level === 'L0' ? 'Routine' : 'Review required'}
                    </span>{' '}
                    {d.summary}
                  </li>
                ))}
              </ul>
              <p className="muted">Confirm or discard in the Review Panel — never via a tool.</p>
            </>
          )}

          {webmcp.log.length > 0 && (
            <details className="mcp-log" open>
              <summary>Invocation log</summary>
              <pre>{webmcp.log.map((l) => `[${l.at}] ${l.line}`).join('\n')}</pre>
            </details>
          )}
        </aside>
      </div>
    </main>
  );
}

function NeedCard({ need, attention, messages, authors }: {
  need: Need;
  attention: AttentionInfo | undefined;
  messages: ThreadMessage[];
  authors: Record<string, string>;
}) {
  const level = attention?.level ?? 'L2';
  return (
    <article className={`card ${level.toLowerCase()}`}>
      <div className="card-head">
        <span className={`badge ${level.toLowerCase()}`}>{attention?.label ?? 'Human-only'}</span>
        <span className={`prio ${need.priority}`}>{need.priority}</span>
        <span className="cat">{need.category}</span>
      </div>
      <h3>{need.title}</h3>
      <p className="meta">
        {need.locationLabel} · {need.distanceKm} km
        {need.requiredCapabilities.length > 0 && <> · needs: {need.requiredCapabilities.join(', ')}</>}
        {need.amount && <> · {need.amount.value} {need.amount.unit}</>}
      </p>
      <p>{need.body}</p>
      {attention && attention.reasons.length > 0 && (
        <p className="reasons">{attention.reasons.join(' · ')}</p>
      )}
      {messages.length > 0 && (
        <details>
          <summary>{messages.length} update{messages.length > 1 ? 's' : ''}</summary>
          <ul className="thread">
            {messages.map((msg) => (
              <li key={msg.id}>
                <strong>{authors[msg.authorActorId] ?? msg.authorActorId}</strong>
                <span className="kind"> [{msg.kind}]</span>: {msg.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
