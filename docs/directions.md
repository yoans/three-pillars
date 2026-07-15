# Directions — Stewardship Life lab

Organized from your light bulbs + David’s playtest emails. Goal: **fast tester loop**, not a rewrite.

---

## Product map (four lanes)

| Lane | Name | Role | Status |
| --- | --- | --- | --- |
| V1 | **Classroom** | Teacher-led plan → lifetime projection → debrief | Live |
| V2 | **Ongoing** | Year-by-year; edit plan; opportunities | Live |
| V3 | **Vision+** | Amalgam of David’s asks on top of Ongoing (conservative) | Lab |
| V4 | **AI Wizard** | Same numbers/controls facade; small model as coach behind the glass | Lab |
| Archive | Weird Game of Life | Early season/card prototype — mine for lifestyle/budget ideas | Archive |

**Ministry / Greedy** stay *play styles* (job + talent focus), not separate products.

---

## Principles (so we don’t explode scope)

1. **Facade first** — players always see numbers, hours, spend/save/share, buttons. AI never replaces the sim.
2. **Engine stays shared** — one `simulateYear()`; versions are UX + cadence + coach wrappers.
3. **Conservative shipping** — obvious wins before lifestyle/invest/home systems (those are backlog).
4. **Testers can move without you** — in-game feedback (text + state + screenshot) is the collab loop.
5. **Exit plan** — static Pages can stay; Railway is optional for AI + persisted feedback. Kill switch = turn off API keys / unpublish service.

---

## David feedback → where it lands

| Ask | Lane | Approach |
| --- | --- | --- |
| Joy instead of Happiness | V3 / V4 (+ label in Ongoing if desired) | Label swap; score still uses same pillar |
| Hours available vs used | V3 / V4 | Weekly meter (168h − commitments) |
| Accidental Home loses progress | All live modes | Confirm + local autosave |
| Change job mid-play | V3 / V4 | Job picker in Plan |
| More decision points / pop-ups / photos | V3 / V4 | Higher event cadence + a few stock-photo opportunities |
| Lifestyle home/car/family/vacations | Later | Port ideas from Weird GoL — not this pass |
| Richer invest allocation UI | Later | Engine already has `investMix`; UI later |
| Credit / bills / hard mode / scams (son) | Later curriculum pack | Design notes only for now |
| Edit game via AI (David learning) | Meta | Cursor / repo — not in-player; link from guide |

---

## AI integration (cheap model, strong rails)

**What players get:** interpretation of *current state* + 1–3 suggested *control* changes and why (e.g. “raise Share to 10%”, “add sleep hours”).

**What AI must not do:** invent new mechanics, rewrite history, free-chat life advice, or run the year without the engine.

**How it works:**

```
Game state snapshot (JSON) → /api/coach → small model → structured suggestions
                              ↑
                     guardrail prompt + schema
                     fallback: rule-based tips if API down
```

**Cost control:** short prompts, capped tokens, cheap model (Groq / OpenRouter flash-class), coach on demand (or once per year in Wizard), not every click.

**V4 Wizard:** same UI as Vision+; coach panel is primary; after each year a brief note auto-loads. Numbers still come from `simulateYear()`.

---

## Real-time tester cycle (minimum)

1. Tester plays any version.
2. Hits **Send feedback** → name/role + free text + auto-attached **state JSON** + optional **screenshot**.
3. Stored locally always; POSTs to Railway when available (`/api/feedback`).
4. You (or David) review the queue — no Slack archaeology required.

Later (optional): shared feedback board URL, class codes, remote save slots.

---

## Railway / persistence (when you’re ready)

| Piece | Purpose |
| --- | --- |
| Express (or similar) static + API | Serve the site + `/api/coach` + `/api/feedback` |
| Volume or file store | Persist feedback JSON |
| `GROQ_API_KEY` / OpenRouter | Cheap LLM |
| Kill switch | Unset key → coach falls back to rules; site still plays |

GitHub Pages can remain the free mirror without AI; Railway is the “lab with brain + memory.”

---

## Suggested order of work

1. Version lab UI + annotations (testers see the map)
2. David obvious wins inside Vision+
3. Feedback capture
4. AI coach + Railway scaffold
5. Playtest → revise → only then lifestyle/invest depth / apprentice pack

---

## Business / exit (David asked — keep light)

- **Who:** classrooms (Wildwood), apprentices, churches/nonprofits, families
- **How it takes off:** teacher shares link → class codes later → maybe paid coach API
- **Exit:** shut Railway + keys; Pages archive stays; no user lock-in if saves are exportable JSON
- Arrangement / overload: discuss when tester volume or API cost becomes real — not before first useful feedback queue
