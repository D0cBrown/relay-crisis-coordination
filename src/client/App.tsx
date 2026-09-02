import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AttentionInfo, DraftCommitment, Need, ThreadMessage } from '../shared/types';
import {
  createIncident, fetchPanelToken, fetchState, postCommit, type StateResponse,
} from './api';
import {
  getWebMCPSnapshot, mountWebMCP, subscribeWebMCP, unmountWebMCP, type WebMCPStatus,
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

const SUGGESTED_PROMPT =
  "I have a car, two free hours this afternoon, and I can't provide medical care or enter unsafe areas. Catch me up, handle the safe logistics I can help with, and flag anything sensitive or uncertain for me.";

const PARTICIPANT_LABELS: Record<string, string> = {
  sam: 'Sam — volunteer with a car, ≤12 km, afternoon window (recommended for judges)',
  maya: 'Maya — logistics volunteer with a van, lifting-capable',
  arun: 'Arun — local group coordinator (can reset the demo)',
  lena: 'Lena — observe-only participant',
  nima: 'Nima — community member',
};

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
    <main className="wrap landing">
      <div className="wordmark">Relay</div>
      <h1 className="hero">
        In a crisis, goodwill is abundant.<br />
        <em>Coordination is scarce.</em>
      </h1>
      <p className="tagline">
        A shared crisis board that your own browser agent can work through WebMCP —
        <strong> the agent coordinates; the human commits.</strong>
      </p>
      <Disclaimer />
      <button onClick={onCreate} disabled={busy}>
        {busy ? 'Creating…' : 'Create demo incident (Langtang seed)'}
      </button>
      {error && <p className="error">{error}</p>}
      {links && (
        <section>
          <h2>{title}</h2>
          <p>Join as a participant (magic links, demo-only identity):</p>
          <ul className="join-list">
            {Object.entries(links).map(([id, href]) => (
              <li key={id}><a href={href}>{PARTICIPANT_LABELS[id] ?? id}</a></li>
            ))}
          </ul>
          <p className="muted">
            Open a link in a WebMCP-enabled browser; the Agent panel on the board carries a
            suggested prompt.
          </p>
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

function jumpTo(level: 'L0' | 'L1' | 'L2') {
  document.getElementById(`group-${level}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const LEVEL_GROUPS = [
  { level: 'L0', title: 'Routine', hint: 'your agent can prepare these for batch review' },
  { level: 'L1', title: 'Review required', hint: 'drafts possible — you confirm one at a time' },
  { level: 'L2', title: 'Human-only', hint: 'your agent may brief you; no drafts' },
] as const;

function CoordinationView({ incidentId, token }: { incidentId: string; token: string }) {
  const { state, error } = useIncidentState(incidentId, token);
  const webmcp = useSyncExternalStore(subscribeWebMCP, getWebMCPSnapshot);

  // Register only once the signed profile is known: observe-only participants get read tools only.
  const preset = state?.me.responseProfile.preset;
  useEffect(() => {
    if (!preset) return;
    mountWebMCP(incidentId, token, { readOnly: preset === 'observe-only' });
    return () => unmountWebMCP();
  }, [incidentId, token, preset]);

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
      <header className="command-bar">
        <div className="wordmark">Relay</div>
        <div className="incident-meta">
          <h1>{incident.title}</h1>
          <span className="meta-line">{incident.regionLabel} · {incident.status}</span>
        </div>
      </header>
      <Disclaimer />
      <div className="profile-strip">
        <span className="who">You are <strong>{me.displayName}</strong> · {me.role}</span>
        <span className="chip">{profile.transport === 'none' ? 'no transport' : profile.transport}</span>
        <span className="chip">≤ {profile.maxTravelKm} km</span>
        {profile.availability && <span className="chip">{profile.availability}</span>}
        {profile.skills.map((s) => <span key={s} className="chip">{s}</span>)}
        {profile.exclusions.map((x) => <span key={x} className="chip no">no {x}</span>)}
      </div>

      <section className="attention-map">
        <button type="button" className="counter l0" onClick={() => jumpTo('L0')} title="Jump to routine needs"><span className="num">{counts.L0}</span><span className="lbl">Routine</span></button>
        <button type="button" className="counter l1" onClick={() => jumpTo('L1')} title="Jump to review-required needs"><span className="num">{counts.L1}</span><span className="lbl">Review required</span></button>
        <button type="button" className="counter l2" onClick={() => jumpTo('L2')} title="Jump to human-only needs"><span className="num">{counts.L2}</span><span className="lbl">Human-only</span></button>
        <div className="live"><span className="dot" />live · v{state.version}</div>
      </section>

      <ReviewPanel incidentId={incidentId} token={token} state={state} />

      <div className="columns">
        <section className="needs">
          {LEVEL_GROUPS.map(({ level, title, hint }) => {
            const items = sorted.filter((n) => (attention[n.id]?.level ?? 'L2') === level);
            if (items.length === 0) return null;
            return (
              <div key={level} id={`group-${level}`} className={`level-group ${level.toLowerCase()}`}>
                <h2 className="group-title">
                  <span className="group-dot" />{title}
                  <span className="group-hint">{hint}</span>
                </h2>
                {items.map((n) => (
                  <NeedCard
                    key={n.id}
                    need={n}
                    attention={attention[n.id]}
                    messages={threads.filter((t) => t.needId === n.id)}
                    authors={Object.fromEntries(state.participants.map((p) => [p.id, p.displayName]))}
                  />
                ))}
              </div>
            );
          })}
        </section>

        <AgentPanel webmcp={webmcp} />
      </div>

      {state.commitments.length > 0 && (
        <section className="activity">
          <h2>Confirmed commitments</h2>
          <ul>
            {state.commitments.map((c) => {
              const need = needsById(needs)[c.needId];
              return (
                <li key={c.id}>
                  ✓ <strong>{c.summary}</strong>
                  {need && <> — {need.title}</>}
                  <span className="muted"> · confirmed by the participant in the Review Panel</span>
                </li>
              );
            })}
          </ul>
          <p className="muted">
            Demo records only — confirmed commitments here do not claim any real-world outcome.
          </p>
        </section>
      )}
    </main>
  );
}

const PANEL_KEY = 'relay-agent-panel';

function AgentPanel({ webmcp }: { webmcp: WebMCPStatus }) {
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(PANEL_KEY) !== 'closed'; } catch { return true; }
  });
  const [copied, setCopied] = useState(false);

  function toggle() {
    setOpen((o) => {
      try { localStorage.setItem(PANEL_KEY, o ? 'closed' : 'open'); } catch { /* per-browser nicety */ }
      return !o;
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(SUGGESTED_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  if (!open) {
    return (
      <button className="tools-rail" onClick={toggle} title="Open the agent panel">
        <span className={`dot ${webmcp.surface ? 'on' : ''}`} />
        <span className="rail-label">Agent</span>
      </button>
    );
  }

  return (
    <aside className={`tools-panel ${webmcp.surface ? 'connected' : ''}`}>
      <div className="panel-head">
        <h2>Agent</h2>
        <button className="ghost" onClick={toggle} aria-label="Collapse agent panel">→</button>
      </div>

      {webmcp.surface ? (
        <>
          <p className="muted">
            <code>{webmcp.surface}</code>
            {webmcp.registeredVia && <> · <code>{webmcp.registeredVia}()</code></>}
            {!webmcp.active && <> · inactive</>}
          </p>
          <ul className="tool-list">
            {webmcp.tools.map((t) => <li key={t}><code>{t}</code></li>)}
          </ul>
        </>
      ) : (
        <p className="muted">
          No WebMCP surface in this browser yet. Open this page in the ChatGPT desktop-app
          browser, or in Chrome 149+ with <code>#enable-webmcp-testing</code>, and the tools
          register here automatically.
        </p>
      )}
      <p className="muted">Tools queue drafts only — nothing is confirmed without you.</p>

      <details className="prompt-block">
        <summary>What can I help with? — suggested prompt</summary>
        <p>“{SUGGESTED_PROMPT}”</p>
        <button className="secondary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy prompt'}</button>
      </details>

      {webmcp.log.length > 0 && (
        <details className="mcp-log">
          <summary>Invocation log ({webmcp.log.length})</summary>
          <pre>{webmcp.log.map((l) => `[${l.at}] ${l.line}`).join('\n')}</pre>
        </details>
      )}
    </aside>
  );
}

function needsById(needs: Need[]): Record<string, Need> {
  return Object.fromEntries(needs.map((n) => [n.id, n]));
}

function ReviewPanel({ incidentId, token, state }: {
  incidentId: string; token: string; state: StateResponse;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const queued = state.drafts.filter((d) => d.status === 'queued');
  if (queued.length === 0) return null;

  const routine = queued.filter((d) => d.level === 'L0');
  const individual = queued.filter((d) => d.level !== 'L0');
  const byId = needsById(state.needs);
  const authors = Object.fromEntries(state.participants.map((p) => [p.id, p.displayName]));

  async function act(confirmDraftIds: string[], discardDraftIds: string[] = []) {
    setBusy(true); setMsg(null);
    try {
      // per-render, single-use panel token: fetched by the human panel, consumed by the commit
      const { panelToken } = await fetchPanelToken(incidentId, token);
      const res = await postCommit(incidentId, token, { panelToken, confirmDraftIds, discardDraftIds });
      setMsg(res.status === 'applied'
        ? `Done: ${res.confirmed?.length ?? 0} confirmed, ${res.discarded?.length ?? 0} discarded.`
        : `Rejected: ${res.reason}`);
      window.dispatchEvent(new Event('relay:changed'));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="review-panel">
      <h2>Review Panel — your agent prepared these drafts; you decide</h2>

      {routine.length > 0 && (
        <div className="review-group">
          <h3>Routine — batch review</h3>
          {routine.map((d) => (
            <DraftRow key={d.id} draft={d} need={byId[d.needId]} authors={authors}
              busy={busy} onDiscard={() => act([], [d.id])} />
          ))}
          <button disabled={busy} onClick={() => act(routine.map((d) => d.id))}>
            Confirm {routine.length} routine commitment{routine.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {individual.length > 0 && (
        <div className="review-group">
          <h3>Review required — confirm each item individually</h3>
          {individual.map((d) => (
            <DraftRow key={d.id} draft={d} need={byId[d.needId]} authors={authors}
              busy={busy} onDiscard={() => act([], [d.id])}
              onConfirm={() => act([d.id])} />
          ))}
        </div>
      )}

      <p className="muted">
        Human-only needs never appear here: no draft can exist for them. Nothing is confirmed
        except by these buttons.
      </p>
      {msg && <p className="review-msg">{msg}</p>}
    </section>
  );
}

function DraftRow({ draft, need, authors, busy, onConfirm, onDiscard }: {
  draft: DraftCommitment;
  need: Need | undefined;
  authors: Record<string, string>;
  busy: boolean;
  onConfirm?: () => void;
  onDiscard: () => void;
}) {
  return (
    <article className={`draft-row ${draft.level.toLowerCase()}`}>
      <div className="card-head">
        <span className={`badge ${draft.level.toLowerCase()}`}>
          {draft.level === 'L0' ? 'Routine' : 'Review required'}
        </span>
        <strong>{need?.title ?? draft.needId}</strong>
      </div>
      <p><em>{draft.actionType}</em> — {draft.summary}</p>
      <p className="muted">Agent motivation: {draft.motivation}</p>
      {draft.escalationReason && <p className="reasons">Escalated: {draft.escalationReason}</p>}
      {need && (
        <details>
          <summary>Source request (verbatim) — {authors[need.sourceActorId] ?? need.sourceActorId}</summary>
          <blockquote className="verbatim">{need.body}</blockquote>
        </details>
      )}
      <div className="row-actions">
        {onConfirm && <button disabled={busy} onClick={onConfirm}>Confirm this commitment</button>}
        <button className="secondary" disabled={busy} onClick={onDiscard}>Discard</button>
      </div>
    </article>
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
        {need.status !== 'open' && <span className="status-chip">{need.status}</span>}
        <span className="card-index">#{need.index}</span>
      </div>
      <h3>{need.title}</h3>
      <p className="meta">
        {need.locationLabel} · {need.distanceKm} km
        {need.requiredCapabilities.length > 0 && <> · needs: {need.requiredCapabilities.join(', ')}</>}
        {need.amount && <> · {need.amount.value} {need.amount.unit}</>}
      </p>
      <p className="body">{need.body}</p>
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
                {msg.via === 'agent' && <span className="via-agent">via agent</span>}
                <span className="kind"> [{msg.kind}]</span>: {msg.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
