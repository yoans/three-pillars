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
| **Shared year engine** | One `simulateYear()` drives classroom projection and lived modes |
| **V1 Classroom** | Multi-step wizard → lifetime projection + **teacher debrief** |
| **V2 Ongoing** | Year-by-year baseline; edit plan; opportunities |
| **V3 Vision+** | Ongoing + David playtest wins (Joy, hours meter, job change, denser events, feedback) |
| **V4 AI Wizard** | Vision+ + coach panel (cheap LLM behind guardrails, or local rules) |
| **Score** | `Wealth × (1 + Health% + Joy%)` — Joy is the learner-facing label for the happiness pillar |

Plans are the gameplay. Events stress-test the plan. See `docs/directions.md` for the lab map and Railway notes.

---

## Still to deepen (with David)

Country packs · richer invest mix UI · real-estate / home / car lifestyle loop (mine LifeForge) · marriage/children systems · credit score / hard mode / scams (apprentice pack) · class codes · remote save slots

Obvious wins already in Vision+: hours visibility, Home confirm + autosave, job change, photo temptations, in-game feedback, optional AI coach.