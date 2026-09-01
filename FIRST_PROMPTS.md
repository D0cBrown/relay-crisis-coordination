# Prompt suggeriti per le sessioni locali di Claude Code

## Sessione 1 — Spike (PRIMA di tutto)
Non serve Claude Code: servi `spike/index.html` via HTTPS, poi aprila nel browser di ChatGPT e in Chrome Canary con WebMCP. Chiedi:

> "What tools does this page offer? Call get_demo_state. I have a car, two free hours, and I cannot provide medical care. Find what I can safely help with, then draft a commitment for the medicine delivery if allowed."

Annota quale API esiste (`document.modelContext` vs `navigator.modelContext`), se la registrazione riesce, il formato degli argomenti e il risultato. Screenshot del log.

## Sessione 2 — Scaffold
"Leggi CLAUDE.md e docs/BRIEF.md. Lo spike ha dato questi risultati: <incolla note>. Scaffolda fase 2: Worker + Durable Object incident + magic link + seed loader + coordination view con polling. Non implementare ancora i tool WebMCP. Alla fine: vitest verdi, wrangler dev funzionante, MIT LICENSE."

## Sessione 3 — Tool WebMCP + bounded agency
"Fase 3: implementa i tool con nomi/descrizioni/schemi ESATTAMENTE come in docs/BRIEF.md §WebMCP tools, la compilazione del volunteer profile, la validazione server-side e l'audit. Aggiorna l'harness Playwright."

## Sessione 4 — Review Panel + sicurezza
"Fase 4: Review Panel con commit page-owned, escalation automatica per money/medical/safeguarding/evacuation, untrustedContentHint + delimitatori, e activity log. Nessun tool deve poter confermare un commitment."

## Sessione 5 — Seed, polish, README
"Fase 5: seed 'Langtang Valley Flood Response' come da brief (scenario fictionalized, inclusa una richiesta adversarial), pannello Agent tools live, endpoint reset, README per i giudici, percorso da 60 secondi verificato."

Regola d'oro: dopo ogni fase, deploy e giro manuale VERO nel browser di ChatGPT. Le note di quel giro sono l'input della sessione successiva.
