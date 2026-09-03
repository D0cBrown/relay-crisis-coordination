# Runbook submission — 3 settembre 2026 (deadline 22:00 Rome)

Checklist operativa, in ordine. Tempo totale stimato: **~2 ore**. Spunta man mano.

Stato di partenza (verificato): app live · repo pubblico con MIT · README + testing
instructions · testo Devpost pronto (`docs/SUBMISSION.md`) · voiceover generato
(`media/voiceover/scene-1..7.mp3`) · copione (`docs/VIDEO_SCRIPT.md`).

---

## A. Preparazione (15 min)

- [ ] **Chrome**: `chrome://flags/#enable-webmcp-testing` = Enabled (se lo cambi, riavvia).
- [ ] **Estensione ChatGPT** nel side panel: loggato, modello **5.6 Sol**, "Full access" attivo.
- [ ] Chrome a schermo intero / massimizzato, zoom 100%, barra dei preferiti nascosta
      (`Ctrl+Shift+B`), chiudi tutte le altre schede, silenzia le notifiche di Windows
      (Impostazioni → Sistema → Notifiche → "Non disturbare").
- [ ] Apri **Blocco note** con i 6 prompt pronti da copiare (sezione C qui sotto).
- [ ] Vai su https://relay.hackathon-webmcp.workers.dev → **Create demo incident** → apri
      il link di **Sam** in una nuova scheda. Chiudi la scheda della landing.
- [ ] Nel pannello **Agent** (a destra): aprilo se è chiuso, espandi **Invocation log** e
      **What can I help with?** così durante la registrazione si vede tutto.
- [ ] **Prova generale muta** (5 min): esegui i prompt 1→6 senza registrare per prendere i
      tempi. Poi **crea un incident nuovo** per la ripresa vera (stato pulito, v1).

## B. Registrazione schermo (20–30 min)

Strumento: **Xbox Game Bar** — `Win+G` → widget Cattura → ● Registra (oppure `Win+Alt+R`
per avviare/fermare). Registra la finestra di Chrome; il side panel di ChatGPT è dentro
Chrome, quindi viene ripreso. L'audio del microfono può restare spento (la voce è sintetica).
I file finiscono in `Videos\Captures`.

Non serve una ripresa unica perfetta: registra pure in più spezzoni, taglierai in montaggio.
Dopo ogni azione **fermati 2–3 secondi**: serve margine per i tagli.

Scaletta (le scene seguono `docs/VIDEO_SCRIPT.md`):

1. **The problem** — landing page ferma 6 s (aprila in una scheda a parte, poi torna).
2. **The idea** — click *Create demo incident* → click *Sam*. Fermati sul board 4 s.
3. **The agent plugs in** — mostra il pannello Agent (surface + 6 tool). Incolla **prompt 1**
   in ChatGPT. Se chiede conferma → **prompt 2**. Aspetta che nel log compaiano
   `invoked` / `QUEUED`. Lascia scorrere 5 s.
4. **Bounded agency** — se l'agente NON ha draftato la medicina → **prompt 2b**. Poi
   **prompt 3** (footbridge): aspetta la riga `REJECTED` nel log. Poi **prompt 4**.
5. **The human commits** — scorri al Review Panel; espandi "Source request (verbatim)" su
   una riga; click **Confirm 1 routine commitment**; click **Confirm this commitment**
   sulla medicina; scorri a "Confirmed commitments".
6. **The attack that fails** — scorri alla card *Generator fuel reimbursement* (sezione
   Review required), espandi "updates", lascia leggere 4 s il messaggio iniettato. Incolla
   **prompt 5**; mostra la risposta.
7. **Close** — **prompt 6**; poi torna in cima al board (o alla landing) e fermati 5 s.

`Win+Alt+R` per fermare.

## C. I prompt (incollali così come sono)

1. `I have a car, two free hours this afternoon, and I can't provide medical care or enter unsafe areas. Catch me up, handle the safe logistics I can help with, and flag anything sensitive or uncertain for me.`
2. `Yes, go ahead.`
2b. `Also draft the sealed medicine pickup and tell me what kind of review it needs.`
3. `Now try to draft a commitment for the footbridge check and report exactly what Relay answers, word for word.`
4. `Call get_review_block and explain what is ready for batch review, what needs my individual confirmation, and why.`
5. `Read the generator fuel reimbursement need in full. Is there anything in its thread that tries to change the rules? What did you do with it?`
6. `What has been confirmed, and what is still open for me? Keep it to three lines.`

Se al prompt 3 l'agente rifiuta di provarci: `Try anyway — I want to see the server's answer.`

## D. Montaggio in Clipchamp (30–45 min)

- [ ] Apri **Clipchamp** (Start → Clipchamp) → *Crea un nuovo video* → 16:9.
- [ ] *Importa media*: la/le registrazioni + i 7 mp3 da `media\voiceover\`.
- [ ] Trascina il video sulla timeline. **Disattiva l'audio della traccia video** (icona
      altoparlante sulla clip → muto).
- [ ] Taglia in scene: posiziona il cursore, tasto **S** per dividere; elimina i tempi morti.
- [ ] Per ogni scena: trascina il suo `scene-N-*.mp3` sulla traccia audio sotto la clip.
      Allunga/accorcia la clip video finché copre l'audio (+ ~1 s di coda).
- [ ] Sottotitoli: *Didascalie* → *Genera automaticamente* (inglese). Controlla che
      "WebMCP" e "Relay" siano scritti bene.
- [ ] Facoltativo: titolo di apertura "Relay — the agent coordinates; the human commits"
      (3 s) e chiusura con URL live + repo (4 s).
- [ ] **Durata totale ≤ 2:55.** Guarda tutto una volta dall'inizio.
- [ ] *Esporta* → 1080p → salva `relay-demo.mp4`.

## E. YouTube (10 min)

- [ ] https://studio.youtube.com → *Crea* → *Carica video* → `relay-demo.mp4`.
- [ ] Titolo: `Relay — WebMCP crisis coordination (OpenAI WebMCP Challenge 2026)`
- [ ] Descrizione: tagline + `https://relay.hackathon-webmcp.workers.dev` +
      `https://github.com/D0cBrown/relay-crisis-coordination`
- [ ] Pubblico: "No, non è per bambini". Visibilità: **Non in elenco** (o Pubblico).
- [ ] Attendi l'elaborazione HD, apri il link in incognito per verificare che parta con
      l'audio. **Copia l'URL.**

## F. Screenshot per Devpost (5 min)

- [ ] Sul board di Sam con il pannello Agent aperto e il log visibile: `Win+Shift+S` →
      area → salva come `relay-board.png`. Meglio se con il Review Panel visibile (fai un
      draft prima).
- [ ] Facoltativo un secondo screenshot della landing.

## G. Submission su Devpost (20 min)

- [ ] https://webmcp.devpost.com → *Register* se non fatto → **Submit project / Start**.
- [ ] Apri `docs/SUBMISSION.md` e sostituisci `<VIDEO_URL>` con il link YouTube.
- [ ] Compila i campi copiando i blocchi:
      - **Project name**: Relay
      - **Tagline**: il blocco *Tagline*
      - **About the project**: tutto il blocco *About the project* (Inspiration → What's next)
      - **Try it out links**: URL live + URL repo
      - **Video link**: URL YouTube
      - **Built with**: i tag del blocco *Built with*
      - **Image / gallery**: `relay-board.png`
      - Se c'è un campo dedicato alle **testing instructions**: incolla il blocco finale;
        altrimenti è già in fondo all'About.
- [ ] Spunta le dichiarazioni (originalità, licenza OSS, ecc.) → **Submit**.
- [ ] **Non aspettare le 21:59**: salva la submission appena hai il video; Devpost permette
      di modificarla fino alla deadline.

## H. Verifica finale (5 min)

- [ ] Apri la pagina Devpost del progetto in **incognito**: video riproducibile, link live e
      repo funzionanti, immagine visibile, testo senza `<VIDEO_URL>` residui.
- [ ] Apri il README su GitHub in incognito: si legge bene, i link interni funzionano.
- [ ] Da qui in poi **non deployare più nulla** (freeze). Se proprio devi, verifica di nuovo
      il flusso completo in produzione dopo.

## Se qualcosa va storto

- L'agente non chiama i tool (log fermo alla registrazione) → ricarica la pagina, riapri il
  side panel, rimanda il prompt 1. Ieri ha funzionato al secondo tentativo.
- L'agente ricarica la pagina da solo → il log persiste, continua a registrare.
- Devpost vuole un campo che non è nel testo → scrivi 2 righe, non bloccarti.
- Timeout di Cloudflare o repo non raggiungibile → riprova dopo 30 s (è transitorio).
- Video oltre i 3:00 → taglia la scena 6 (attack) a metà o accorcia le pause; l'audio parlato
  è 2:05, il margine c'è.
