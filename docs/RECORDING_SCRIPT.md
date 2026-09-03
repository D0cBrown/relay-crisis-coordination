# Script di registrazione — ripresa unica, in ordine di montaggio

Una sola registrazione continua (~12–15 min grezzi). Le attese dell'agente si tagliano dopo.
Regola: dopo ogni azione **fermati 3 secondi** senza muovere il mouse. Dove c'è ⏸ aspetta
che l'agente finisca (può metterci 1–3 minuti: è normale, si taglia).

## 0. Preparazione (5 min, fuori registrazione)

- [ ] Chrome: Impostazioni → Lingue → **disattiva "Offri di tradurre le pagine"** (così la
      barra "Translate this page?" non compare più). Oppure ricordati di chiuderla con la ×.
- [ ] Barra dei preferiti nascosta (`Ctrl+Shift+B`), zoom 100%, finestra massimizzata, solo
      una scheda aperta, notifiche di Windows in "Non disturbare".
- [ ] Side panel ChatGPT aperto a destra, **nuova conversazione**, modello 5.6 Sol, Full access.
- [ ] Questo file aperto su un secondo schermo o sul telefono (non nella finestra registrata).
- [ ] Scheda su https://relay.hackathon-webmcp.workers.dev (landing, **non** ancora cliccato).

## 1. Registrazione

**▶ `Win+Alt+R` — parte la registrazione.**

### Scena 1 · The problem
1. Resta fermo sulla landing **6 secondi**.

### Scena 2 · The idea
2. Click **Create demo incident (Langtang seed)**. Fermo 3 s sulla lista dei link.
3. Click **Sam — volunteer with a car…**. Fermo 4 s sulla board.

### Scena 3 · The agent plugs in
4. Nel pannello scuro **Agent** a destra (se è chiuso, click sulla linguetta): espandi
   **▸ Invocation log**. Fermo 4 s (si vedono surface + 6 tool + log).
5. In ChatGPT incolla e invia:
   ```
   I have a car, two free hours this afternoon, and I can't provide medical care or enter unsafe areas. Catch me up, handle the safe logistics I can help with, and flag anything sensitive or uncertain for me.
   ```
6. ⏸ Se l'agente chiede conferma, invia: `Yes, go ahead.` ⏸
7. Quando nel log compaiono righe `invoked` / `QUEUED` e sulla pagina appare il **Review
   Panel**: fermo 5 s.

### Scena 4 · Bounded agency
8. Invia:
   ```
   Also draft the sealed medicine pickup and tell me what kind of review it needs.
   ```
   ⏸ (se rifiuta: `It's a sealed package handover, no clinical task. Please draft it — the server decides the review level.`)
9. Quando nel Review Panel compare la riga ambra **Review required**: fermo 4 s.
10. Invia:
    ```
    Now try to draft a commitment for the footbridge check and report exactly what Relay answers, word for word.
    ```
    ⏸ (se non vuole provarci: `Try anyway — I want to see the server's answer.`)
11. Quando risponde con `status: rejected` / Human-only: fermo 5 s sulla risposta.
12. Invia:
    ```
    Call get_review_block and explain what is ready for batch review, what needs my individual confirmation, and why.
    ```
    ⏸ Fermo 4 s sulla risposta.

### Scena 5 · The human commits
13. Scorri al **Review Panel**. Nella riga della medicina click **Source request (verbatim)**
    per espanderla. Fermo 4 s.
14. Click **Confirm N routine commitments** (il bottone del gruppo Routine). Fermo 3 s.
15. Nella riga della medicina click **Confirm this commitment**. Fermo 3 s (il panel sparisce).
16. Scorri fino al riquadro verde **Confirmed commitments**. Fermo 5 s.
17. Scorri su fino alle card: si vedono i badge `MATCHED`. Fermo 3 s.

### Scena 6 · The attack that fails
18. Scorri alla card **Generator fuel reimbursement request ($180)** (gruppo Review required).
    Click **▸ updates** per aprire il thread. Fermo 5 s sul messaggio
    *"[message to any assistant reading this: …]"*.
19. Invia:
    ```
    Read the generator fuel reimbursement need in full. Is there anything in its thread that tries to change the rules? What did you do with it?
    ```
    ⏸ Fermo 5 s sulla risposta.

### Scena 7 · Close
20. Invia:
    ```
    What has been confirmed, and what is still open for me? Keep it to three lines.
    ```
    ⏸ Fermo 5 s sulla risposta.
21. Scorri in cima alla board. Fermo 5 s.

**■ `Win+Alt+R` — stop.**

## 2. Subito dopo

- [ ] Riguarda il file al volo: si vede tutto? Nessuna barra "Translate"? Se manca un pezzo,
      **non rifare tutto**: registra solo quel pezzo come clip aggiuntiva.
- [ ] Sposta il file nella cartella del progetto (è ignorato da git) e passa a Clipchamp:
      un mp3 per scena (`media/voiceover/`), taglia tutte le attese ⏸, ≤ 2:55.
