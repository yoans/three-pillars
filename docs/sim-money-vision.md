# Stewardship Life Sim — Product Vision

**Working titles:** Sim Money (internal) · Stewardship Life (current public)  
**Source:** David Strege brief (2026-07)  
**Status:** **Primary build.** LifeForge card-sim archived on `archive/lifeforge-v1`. Current `main` is a from-scratch lean into this vision.

---

## Purpose

Teach biblical wisdom about money as stewardship of **time, talents, and treasures** — not wealth maximization alone.

Core pattern: spend less than you earn · give ≥10% · invest the rest · limit debt · seek wisdom · rest · serve others.

---

## Architecture (current)

| Piece | Role |
| --- | --- |
| **Shared year engine** | One `simulateYear()` drives classroom projection and ongoing play |
| **Classroom** | Multi-step wizard: Job → Spend/Save/Share → Time → Talents → Insurance/help → lifetime projection + **teacher debrief** |
| **Ongoing** | Year-by-year; edit plan anytime; opportunities (short joy vs serve) + life events |
| **Score** | `Wealth × (1 + Health% + Happiness%)` with wheels + total always visible |

Plans are the gameplay. Events stress-test the plan. Legacy LifeForge milestone cards are gone.

---

## Score Model

```
Total = Wealth + (Health% × Wealth) + (Happiness% × Wealth)
```

Teaching point: chase wealth while tanking health/happiness → a terrible life on the scoreboard.

---

## Player inputs

1. **Spending** — % spend / save / share (≥10% encouraged); insurance; optional hired help  
2. **Time** — work, sleep, learn, serve, social/family, fun, sabbath  
3. **Talents** — domain + aim (self / others / marketplace / ministry / family / balanced)

---

## Calibration intent

- Solid stewardship classroom runs: roughly **low–mid single-digit millions** lifetime score, not $12M–$26M defaults  
- Neglect rest/serve: health/happiness fall; early death before 65 can **reboot**  
- Wealth-only grind should **lose** to balanced stewardship on lifetime score  

---

## Still to deepen (with David)

Country packs beyond US baseline · richer invest mix UI · real-estate management loop · marriage/children as fuller systems · visual opportunity media · classroom class codes  

See open questions in prior notes (brand name, Scripture tone, school-safe pop-ups, inheritance display).
