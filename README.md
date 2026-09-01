# Relay — WebMCP crisis coordination

**In a crisis, goodwill is abundant. Coordination is scarce.**
**The agent coordinates; the human commits.**

Relay is a shared crisis-coordination board where local responders, volunteers and community
groups post needs and resources. Each participant brings their own browser AI agent: through
[WebMCP](https://github.com/webmachinelearning/webmcp), that agent can triage the live backlog
against the participant's declared capabilities and safety boundaries, ask clarifications, and
queue **draft** commitments. Confirmation always happens in the page's human Review Panel —
no tool can confirm or dispatch anything.

> **Fictionalized scenario for demonstration; not connected to an active emergency response.**
> Relay is a hackathon prototype (OpenAI WebMCP Challenge 2026), not a certified
> emergency-management, medical, dispatch or public-safety system.

## Status

- ✅ Phase 1 — WebMCP spike validated in real browsers; findings and platform divergences in
  [`spike/FINDINGS.md`](spike/FINDINGS.md)
- ✅ Phase 2 — Worker + Durable Object per incident, signed magic links, Langtang demo seed,
  coordination view with polling
- ⏳ Phase 3 — WebMCP tools + server-side validation + audit
- ⏳ Phase 4 — Review Panel + human commit path
- ⏳ Phase 5 — polish, judge path, submission

## Develop

```bash
npm install
npm test          # vitest: attention compilation, magic-link guard
npm run dev       # build client + wrangler dev on http://localhost:8787
npm run deploy    # build + wrangler deploy
```

Create a demo incident from the landing page; join links (demo-only signed identity) are shown
for the seeded participants. Identity is deliberately pluggable; in production set the HMAC
secret with `wrangler secret put MAGIC_SECRET`.

## License

MIT
