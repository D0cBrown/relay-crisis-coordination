# Spike findings — WebMCP reality check (2026-09-01)

Live spike: https://relay-spike.hackathon-webmcp.workers.dev
Rule applied: **reality wins over the brief; divergences documented here.**

## Compatibility matrix

| Environment | Page-side registration | Agent execution |
|---|---|---|
| Chrome 149+ (`chrome://flags/#enable-webmcp-testing` — official judge env #2) | ✅ `document.modelContext` present at load (+0.0s) | Testing surface only (`getTools`/`executeTool`); manual invocation works from DevTools; no built-in agent |
| ChatGPT desktop app, in-app browser (site tools, model 5.6 Sol — official judge env #1) | ✅ registered via `registerTool()` fallback | ❌ "the Browser page-tool bridge did not expose callable handles" — 4 consistent runs, execution never wired (as of 2026-09-01) |
| ChatGPT extension in Chrome side panel | ✅ | ❌ "Chrome-control surface … blocked indirect execution" (extension drives Chrome via DOM, not WebMCP) |

In every failed environment the agent behaved **honestly**: it refused to fabricate tool results, quoted page-derived data labeled as such, and confirmed nothing. This supports Relay's safety story.

## API surface as actually observed (Chrome 149+, flag enabled)

- Surface lives on **`document.modelContext`** (`navigator.modelContext` is false). The explainer's `navigator`-first assumption is wrong in practice; detection order `document` → `navigator` is correct.
- Members: `ontoolchange, executeTool, getTools, registerTool`. **No `provideContext`** on any surface observed (Chrome or ChatGPT).
- `registerTool(tool)` returns a **Promise that resolves to `undefined`** — no handle. How to unregister is still unknown (open item; `ontoolchange` may be relevant).
- `executeTool(tool, args)`:
  - first argument must be a **`RegisteredTool` object obtained from `getTools()`** (a string name is rejected: "The provided value is not of type 'RegisteredTool'");
  - second argument must be a **JSON string** (an object gives "Failed to parse input arguments").
- Tool shape accepted: `{ name, description, inputSchema, async execute(args) }` with results in MCP `CallToolResult` form `{ content: [{ type: 'text', text }] }`.

## Implications baked into the spike (and required in the real app)

1. **Detection is a watcher, not a one-shot check**: some hosts may inject the API only after the user grants page access. The spike polls every 150 ms and registers whenever the surface appears, logging the delay.
2. Registration prefers `provideContext({tools})` when available (spec baseline), else per-tool `registerTool()`.
3. `execute` tolerates both object and JSON-string arguments.
4. All tool results use the MCP `content` shape.

## Open items

- ChatGPT in-app browser: does the address-bar **site-tools arrow** list the two tools? (listed-but-not-callable ⇒ bridge bug; absent ⇒ feature not active on this account/app — different README wording.)
- Full DevTools `executeTool` run in Chrome with JSON-string args (final proof of native invocation path).
- Unregister mechanism (needed for the register-on-mount/unregister-on-unmount rule).
- Retest the ChatGPT in-app browser after app updates before submission — the feature is days old; a fix may land before Sep 3 with zero changes on our side.

## Consequence for the demo

Primary demo/video environment: **Chrome with the judges' flag**, showing real tool invocation and the L0/L1/L2 decisions in the on-page invocation log. The ChatGPT in-app browser is kept fully supported (spec-conformant registration + late-injection watcher) and retested as updates land; its current non-execution is documented as a platform limitation, not a page defect.
