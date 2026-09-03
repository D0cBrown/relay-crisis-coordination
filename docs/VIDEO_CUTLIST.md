# Cut-list — registrazione "2026-09-03 10-17-01.mp4" (13:23) → video finale ≤ 2:55

Questa ripresa contiene TUTTE le scene (inclusa la conferma singola della medicina e il ledger).
Timecode ±3 s. Ogni riga = spezzone da tenere, con l'mp3 di voiceover da mettere sotto.
Evitare i tratti in cui in alto compare la barra azzurra "Translate this page?" (1:36–4:30,
6:12–6:18, 8:18–8:42): qui sotto sono già esclusi, dove serviva ho scelto alternative.

| Scena / mp3 (durata parlato) | Tieni da → a | Cosa si vede |
|---|---|---|
| 1 · the-problem (10 s) | 0:00 → 0:10 | landing, hero |
| 2 · the-idea (16 s) | 0:10 → 0:22 · 0:22 → 0:30 | click *Create demo incident* → link di Sam → board con contatori 2/2/3 |
| 3 · the-agent-plugs-in (22 s) | 0:24 → 0:30 · 0:42 → 0:50 · 12:00 → 12:10 · 12:48 → 13:00 | pannello Agent con i 6 tool · prompt incollato + "Thinking" · lista **Agent actions · server-verified** · *Invocation log* espanso (verde) |
| 4 · bounded-agency (23 s) | 4:36 → 4:48 · 6:24 → 6:36 · 7:42 → 7:54 | Review Panel con i 2 draft routine · riga ambra *Review required* con "Escalated: … never batch-confirmed" · risposta con JSON `status: rejected` (zoom sul side panel) |
| 5 · the-human-commits (22 s) | 10:48 → 11:00 · 11:04 → 11:14 · 11:14 → 11:20 · 11:24 → 11:32 · 11:36 → 11:42 | *Source request (verbatim)* espansa · click **Confirm 2 routine** · click **Confirm this commitment** (medicina) · ledger **Confirmed commitments** · card con `MATCHED` |
| 6 · the-attack-that-fails (21 s) | 9:12 → 9:24 · 9:30 → 9:34 · 10:00 → 10:10 | card *Generator fuel reimbursement* con i messaggi di Nima (quello iniettato in vista) · prompt · risposta "treated as untrusted prompt injection…" (zoom) |
| 7 · close (13 s) | 11:54 → 12:04 · 0:00 → 0:05 | risposta finale in tre righe · chiusura sulla landing |

Extra utilizzabile: 8:48 → 8:54 risposta di `get_review_block` (se vuoi allungare la scena 4).

## Note di montaggio

- Parlato totale 2:05; i tagli sopra danno ~2:35 di video. Se una clip è più corta del suo
  mp3, allungala tenendo l'ultimo fotogramma (Clipchamp: *Freeze frame*) o aggiungi 1–2 s
  della clip adiacente.
- Zoom 130% sul side panel nei punti 7:42–7:54 e 10:00–10:10 (testo piccolo).
- Nessuna attesa "Working for…" deve restare in video.
- Se in un tratto scelto vedi comunque la barra "Translate", in Clipchamp ritaglia (*Crop*)
  ~40 px dal bordo superiore di quella clip.
