# Stewardship Life Sim — Product Vision

**Working titles:** Sim Money (internal) · *Managing Your Money Experience Through Decisions and Events in Life* (public placeholder)  
**Source:** David Strege brief (2026-07)  
**Status:** North-star design. Current codebase is pivoting from LifeForge (ages 18–65 seasonal sim) toward this model. Prior LifeForge snapshot: branch `archive/lifeforge-v1`.

---

## Purpose

Teach biblical wisdom about money as stewardship of **time, talents, and treasures** — not wealth maximization alone. Players learn that spending less than you earn, giving at least ~10% of gross income, investing the rest, limiting debt, and seeking wise counsel produce better long-term lives than get-rich schemes or sacrificing health and relationships for cash.

---

## Two Modes

### 1. Classroom Mode (20–30 minutes)

1. Student selects or receives a job (from life stats / country defaults).
2. Student makes **three plan inputs**:
   - **Spending plan** — income allocation by % for spending, saving, and sharing (giving).
   - **Time management** — daily / weekly / monthly / calendar schedule (work, sleep, rest, fun, learning, volunteering, family/social, sabbath).
   - **Talent use** — for self-benefit vs benefit of others.
3. System simulates lifetime outcomes using country-relevant statistics.
4. Teacher debriefs: what could have been done differently given the lesson just taught.

**Design goal:** Fast setup → clear lifetime scorecard → teachable discussion. Not continuous play.

### 2. Ongoing Mode (continuous play)

Same pillars and inputs, but players adjust plans over time, respond to events, and watch progress toward goals from roughly **age 25 → 85** (typically earning **25–65**, then living on assets / inheritance planning **65–85**).

---

## Score Model (canonical)

| Component | Definition |
| --- | --- |
| **Wealth** | Net worth (baseline measurable) |
| **Health** | 0–100% |
| **Happiness** | 0–100% |

**Total score:**

```
Total = Wealth + (Health% × Wealth) + (Happiness% × Wealth)
      = Wealth × (1 + Health/100 + Happiness/100)
```

Example: Net worth $100,000, Health 80%, Happiness 50% → Total = 100k + 80k + 50k = **$230,000 equivalent score**.

**Teaching point:** Players can chase wealth while tanking health and happiness and still have a terrible life. Money alone gives only short-term happiness bursts that fade.

**HUD:** Constant net worth + **wheels** for Health % and Happiness % + grand total score.

---

## Core Player Inputs (both modes)

### A. Spending plan

- Allocate income by percentage: **Spend / Save / Share**.
- Encourage biblical pattern: live below means, **≥10% giving** to nonprofits of interest (long-term happiness + tax effects), invest the rest.
- Insurance against life events: illness, accident, disability, property/auto damage, liability.
- Debt discipline; avoid high-flying / get-rich schemes.

### B. Time management

Schedule across daily / weekly / monthly / calendar:

| Need | If neglected |
| --- | --- |
| Sleep, rest, fun, sabbath | Health declines |
| Volunteer / serve others | Happiness struggles long-term |
| Learning (reading, classes, seminars) | Income / life progress stalls |
| Activity in areas they enjoy | Health declines |
| Family / marriage / children (when present) | Happiness rises when time is allocated |
| Group / social time | Friends, community, potential spouse |

Hiring professionals (tax preparer, financial planner, property manager, health coach, social clubs) frees time at a cost.

### C. Talents

Allocate talents toward self-benefit vs serving others. Serving others supports longer-term happiness; purely self-focused paths underperform on the happiness wheel.

---

## Systems Roadmap

### Pop-up opportunities (marketing-style visuals)

When happiness (or other needs) is low, present enticing options with different duration profiles:

| Type | Examples | Happiness effect |
| --- | --- | --- |
| Short-term consumption | Trip, new item, spa, movie, drinking | Brief spike, fades |
| Service / giving | Soup kitchen, volunteering | Longer-lasting lift |

Visuals should feel inviting (photos/video-style pulls), not spreadsheet-only.

### Savings & investments (ongoing)

Allocate savings across:

- Accessible / liquid funds  
- Long-term: 401(k), Roth IRA, IRA, personal investments  
- Risk ladder: bank deposits → bonds → US / international / emerging stocks → private companies  
- Real estate (requires time to manage or value degrades)

### Random life events

Accidents, major health issues, liability lawsuits, bankruptcy, divorce, etc. Early death before 65 → **reboot** (start over).

### Country statistics

Pull or approximate real-life stats for the player’s country to drive income, costs, health baselines, and event probabilities.

---

## Biblical Stewardship Themes (encourage, don’t preach as a quiz)

1. Spend less than you make.  
2. Give at least ~10% of gross income.  
3. Invest the remainder wisely.  
4. Limit debt and speculative “get rich” bets.  
5. Seek wisdom from others (counselors, planners, mentors).  
6. Sabbath rest; serve others; steward time and talents, not only money.

---

## Relationship to Current Codebase

| LifeForge (archived) | Target |
| --- | --- |
| Ages 18–65, seasonal ticks | Ages 25–85; work to ~65, legacy to 85 |
| Health / wealth-score / joy as separate bars | Wealth + Health%×Wealth + Happiness%×Wealth total |
| Event-card + budget habits | Classroom plan wizard + ongoing adjust loop |
| Secular financial literacy framing | Stewardship of time, talents, treasures |
| Single continuous mode | Classroom + Ongoing |

Preserve useful mechanics (cashflow, debt, insurance, 401k, events) while rebuilding UX and scoring around David’s model.

---

## Open Questions for David

See end of implementation notes / reply to originator — brand name, denomination tone, country scope, classroom auth, inheritance rules, exact giving tax model, and content sensitivity for adult pop-ups.
