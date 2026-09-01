# Relay — project instructions for Claude Code

WebMCP-powered crisis coordination for communities, volunteers, NGOs, and local responders. Full spec: `docs/BRIEF.md` — read it before any non-trivial task. Hackathon deadline: **Sep 3, 2026, 22:00 Europe/Rome**. Bias every decision toward shipping a complete, polished vertical slice.

## Product principle
**The agent coordinates; the human commits.**

Relay is not an autonomous emergency-response system and must never present itself as one. It is a coordination layer for matching reported needs with a volunteer/member's declared capabilities and constraints. The site is deterministic; intelligence is brought by each visitor's own browser agent through WebMCP.

## Hard rules (never violate)
1. No server-side LLM calls; zero API keys in the repo. The site is a deterministic arbiter.
2. WebMCP tools create/update DRAFT COMMITMENTS only. No tool confirms a real-world commitment. Confirmation happens only in the page's Review Panel via a human-facing action.
3. Never depend on `requestUserInteraction` (progressive enhancement only).
4. Review Panel rows always show the verbatim source request + author/organization, not only the agent's paraphrase.
5. Money, medical, safeguarding, evacuation, and other safety-sensitive requests never batch-confirm. They are always individually reviewed or reserved.
6. Other users' content returned by tools gets `untrustedContentHint` (when supported) AND explicit delimiters with a one-line warning.
7. API: `document.modelContext`, fallback `navigator.modelContext`, then `@mcp-b/global` polyfill. Register tools on coordination-view mount, unregister on unmount/navigation.
8. The server revalidates every mutation against the signed volunteer profile + current incident state. Client-side gating is UX, not enforcement. Keep this covered by unit tests.
9. English UI and seed content.
10. The primary disaster scenario is **fictionalized**. It may be inspired by public facts from the Aug 26, 2026 Nepal Himalayan flood, but must not use real victims' identities or imply affiliation with Nepalese authorities, UN agencies, Red Cross, or NGOs.

## Stack & commands
- Cloudflare Workers + Durable Objects (one per incident), React + TS + Vite, polling sync (no websockets), MIT license.
- `npm run dev` = wrangler dev; `npm test` = vitest; `npm run test:e2e` = Playwright harness; `npm run deploy` = wrangler deploy.
- Keep the project a single package. No CSS framework unless already present.

## Testing conventions
- Vitest: profile→attention compilation, reserved-action rejection, sensitive-request escalation, commit-token guard. These must pass before any commit.
- Playwright harness simulates the AGENT side: loads the incident as a volunteer, asserts tools register/unregister, invokes them via `page.evaluate`, and asserts structured results and escalation behavior.
- Tool names, descriptions and schemas are part of the product. Treat changes as API breaks and call them out explicitly.

## Working style
- Follow the build order in `docs/BRIEF.md`. Do not scaffold until the spike (`spike/index.html`) has been validated in a real agent browser.
- Small verifiable increments; after each phase run tests + `wrangler dev` smoke check.
- Public repo + MIT LICENSE from the first commit. Never commit secrets; magic-link HMAC secret lives in wrangler secrets.
- When real WebMCP browser behavior contradicts the brief, reality wins: implement what works, document the divergence in README, and note it for the submission.
