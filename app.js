/**
 * Stewardship Life — engine built for David Strege's vision
 * Plans first (spend/save/share, time, talents). Events stress-test the plan.
 * Score = Wealth × (1 + Health/100 + Happiness/100)
 */

const START_AGE = 25;
const RETIRE_AGE = 65;
const END_AGE = 85;

const JOBS = [
  { id: "trade", label: "Skilled trade", salary: 48000, stress: 0.9 },
  { id: "office", label: "Office / admin", salary: 52000, stress: 0.85 },
  { id: "teacher", label: "Teacher / mentor", salary: 46000, stress: 0.8 },
  { id: "nurse", label: "Healthcare", salary: 58000, stress: 1.05 },
  { id: "tech", label: "Technical / IT", salary: 72000, stress: 0.95 },
  { id: "sales", label: "Sales / business", salary: 55000, stress: 1.1 },
  { id: "ministry", label: "Ministry / nonprofit", salary: 38000, stress: 0.75 },
  { id: "creative", label: "Creative / freelance", salary: 42000, stress: 1.0 }
];

const TALENT_DOMAINS = [
  { id: "teaching", label: "Teaching & mentoring", income: 0.95, happiness: 1.08 },
  { id: "trade", label: "Craft / trade", income: 1.05, happiness: 1.0 },
  { id: "business", label: "Business", income: 1.12, happiness: 0.94 },
  { id: "creative", label: "Creative arts", income: 0.9, happiness: 1.1 },
  { id: "care", label: "Caregiving & hospitality", income: 0.92, happiness: 1.14 },
  { id: "leadership", label: "Leadership & organizing", income: 1.08, happiness: 1.02 },
  { id: "technical", label: "Technical & analytical", income: 1.15, happiness: 0.96 },
  { id: "athletic", label: "Athletic & outdoor", income: 0.93, happiness: 1.06 }
];

const TALENT_FOCUS = [
  { id: "balanced", label: "Balanced — grow and serve", income: 1.0, happiness: 1.06, health: 0 },
  { id: "self", label: "Mostly for my own career", income: 1.08, happiness: 0.88, health: -0.2 },
  { id: "others", label: "Mostly to benefit others", income: 0.9, happiness: 1.16, health: 0.1 },
  { id: "marketplace", label: "Marketplace first — give later", income: 1.14, happiness: 0.8, health: -0.3 },
  { id: "ministry", label: "Ministry / nonprofit focus", income: 0.78, happiness: 1.2, health: 0.15 },
  { id: "family", label: "Family & household first", income: 0.86, happiness: 1.12, health: 0.2 }
];

/** Short-term vs lasting happiness opportunities (David pop-ups) */
const OPPORTUNITIES = [
  {
    id: "trip",
    kind: "Short-term joy",
    title: "Weekend getaway",
    body: "A glossy ad promises rest and happiness — if you spend now.",
    visual: "linear-gradient(135deg,#0f766e,#134e4a), url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=60')",
    choices: [
      { label: "Book it ($1,800)", cash: -1800, happiness: 12, happinessDecay: 8, tag: "consume" },
      { label: "Skip — keep the plan", cash: 0, happiness: 0, tag: "steward" }
    ]
  },
  {
    id: "gadget",
    kind: "Short-term joy",
    title: "New must-have device",
    body: "Marketing says this will fix boredom. The lift fades fast.",
    visual: "linear-gradient(135deg,#92400e,#451a03)",
    choices: [
      { label: "Buy it ($900 on card)", cash: -200, debt: 700, happiness: 8, happinessDecay: 7, tag: "consume" },
      { label: "Wait 30 days", cash: 0, happiness: 1, tag: "steward" }
    ]
  },
  {
    id: "soup",
    kind: "Serve others",
    title: "Soup kitchen needs hands",
    body: "Serving others tends to lift happiness longer than spending on yourself.",
    visual: "linear-gradient(135deg,#14532d,#052e16)",
    choices: [
      { label: "Volunteer this season", timeServe: 2, happiness: 6, happinessDecay: 1, tag: "serve" },
      { label: "Send $75 instead", cash: -75, happiness: 3, happinessDecay: 1, tag: "share" },
      { label: "Not this time", happiness: -2, tag: "skip" }
    ]
  },
  {
    id: "class",
    kind: "Grow wisdom",
    title: "Evening seminar on money wisdom",
    body: "Seeking counsel and learning compounds into better decisions.",
    visual: "linear-gradient(135deg,#1e3a8a,#0f172a)",
    choices: [
      { label: "Attend ($120 + time)", cash: -120, timeLearn: 2, learnBoost: 0.01, happiness: 2, tag: "learn" },
      { label: "Read a free book instead", timeLearn: 1, learnBoost: 0.004, tag: "learn" },
      { label: "Skip", tag: "skip" }
    ]
  },
  {
    id: "spa",
    kind: "Short-term joy",
    title: "Spa / night out",
    body: "Personal enjoyment can help — briefly. Without rest habits, it won't stick.",
    visual: "linear-gradient(135deg,#5b21b6,#1e1b4b)",
    choices: [
      { label: "Go ($220)", cash: -220, happiness: 7, happinessDecay: 6, health: 1, tag: "consume" },
      { label: "Walk + early night instead", happiness: 2, health: 2, tag: "rest" }
    ]
  }
];

const LIFE_EVENTS = [
  {
    id: "illness",
    kind: "Life event",
    title: "Serious illness in the family",
    body: "Medical costs hit. Insurance and emergency savings decide how deep the wound is.",
    visual: "linear-gradient(135deg,#7f1d1d,#1c1917)",
    resolve(state) {
      const covered = state.insurance.health;
      const hit = covered ? 3500 : 18000;
      state.cash -= hit;
      state.health -= covered ? 4 : 12;
      state.happiness -= covered ? 3 : 8;
      return covered
        ? `Insurance limited the hit to $${hit.toLocaleString()}.`
        : `No health coverage. Out-of-pocket $${hit.toLocaleString()}.`;
    }
  },
  {
    id: "accident",
    kind: "Life event",
    title: "Car accident",
    body: "Liability and auto coverage matter when life is random.",
    visual: "linear-gradient(135deg,#9a3412,#1c1917)",
    resolve(state) {
      const covered = state.insurance.auto && state.insurance.liability;
      const hit = covered ? 2000 : 22000;
      state.cash -= hit;
      if (!covered) state.debt += 8000;
      state.happiness -= covered ? 2 : 7;
      return covered
        ? `Coverage held. Net cost about $${hit.toLocaleString()}.`
        : `Thin coverage. Cash hit $${hit.toLocaleString()} plus added debt.`;
    }
  },
  {
    id: "lawsuit",
    kind: "Life event",
    title: "Liability claim",
    body: "Someone holds you responsible. Umbrella / liability protection is stewardship, not fear.",
    visual: "linear-gradient(135deg,#334155,#0f172a)",
    resolve(state) {
      const covered = state.insurance.liability;
      if (covered) {
        state.cash -= 1500;
        return "Liability coverage absorbed most of the claim.";
      }
      state.cash -= 5000;
      state.debt += 25000;
      state.happiness -= 10;
      return "Uninsured liability. Heavy debt and stress follow.";
    }
  },
  {
    id: "job_loss",
    kind: "Life event",
    title: "Job disruption",
    body: "Income pauses. Emergency savings and low debt buy time.",
    visual: "linear-gradient(135deg,#1e293b,#0f172a)",
    resolve(state) {
      state.unemployedYears = (state.unemployedYears || 0) + 1;
      state.happiness -= 6;
      state.health -= 2;
      const cushion = state.cash > state.job.salary * 0.25;
      return cushion
        ? "Savings cushion the gap while you look."
        : "Thin reserves. Pressure rises fast.";
    }
  },
  {
    id: "market_dip",
    kind: "Life event",
    title: "Market setback",
    body: "Long-term investors who stay the course usually fare better than panic sellers.",
    visual: "linear-gradient(135deg,#365314,#0f172a)",
    resolve(state) {
      state.investments *= 0.82;
      return "Portfolio drops ~18%. Staying invested is usually wiser than fleeing.";
    }
  },
  {
    id: "get_rich",
    kind: "Temptation",
    title: "“Guaranteed” high return",
    body: "Get-rich schemes rarely work. Money often leaves faster than it arrived.",
    visual: "linear-gradient(135deg,#854d0e,#422006)",
    isOpportunity: true,
    choices: [
      {
        label: "Put in $8,000",
        apply(state) {
          const ok = Math.random() < 0.12;
          state.cash -= 8000;
          if (ok) {
            state.cash += 12000;
            state.happiness += 5;
            return "Rare win — and a dangerous lesson if you chase it again.";
          }
          state.happiness -= 8;
          return "The scheme collapses. Wisdom: limit speculative bets.";
        }
      },
      {
        label: "Walk away",
        apply(state) {
          state.happiness += 1;
          return "You sought wisdom over hype. That is stewardship.";
        }
      }
    ]
  }
];

let state = null;
let classroomStep = 0;
let pendingEvent = null;

function money(n) {
  const v = Math.round(n || 0);
  const sign = v < 0 ? "-" : "";
  return `${sign}$${Math.abs(v).toLocaleString()}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function netWorth(s) {
  s = s || state;
  if (!s) return 0;
  return (s.cash || 0) + (s.investments || 0) + (s.property || 0) - (s.debt || 0);
}

function lifetimeScore(s) {
  s = s || state;
  if (!s) return 0;
  const w = netWorth(s);
  return w * (1 + clamp(s.health, 0, 100) / 100 + clamp(s.happiness, 0, 100) / 100);
}

function jobById(id) {
  return JOBS.find((j) => j.id === id) || JOBS[1];
}

function domainById(id) {
  return TALENT_DOMAINS.find((t) => t.id === id) || TALENT_DOMAINS[0];
}

function focusById(id) {
  return TALENT_FOCUS.find((t) => t.id === id) || TALENT_FOCUS[0];
}

function defaultPlan() {
  return {
    spendPct: 70,
    savePct: 20,
    sharePct: 10,
    time: { work: 40, sleep: 56, learn: 4, serve: 3, social: 7, fun: 5, sabbath: 1 },
    talentDomain: "teaching",
    talentFocus: "balanced",
    investMix: { liquid: 30, retirement: 50, stocks: 20, property: 0 },
    hire: { planner: false, tax: false, coach: false }
  };
}

function createState(mode, overrides = {}) {
  const plan = { ...defaultPlan(), ...(overrides.plan || {}) };
  const job = jobById(overrides.jobId || "office");
  return {
    mode,
    age: START_AGE,
    job,
    plan,
    cash: 8000,
    investments: 2000,
    property: 0,
    debt: 12000,
    health: 76,
    happiness: 68,
    insurance: {
      health: !!overrides.insurance?.health,
      auto: !!overrides.insurance?.auto,
      disability: !!overrides.insurance?.disability,
      liability: !!overrides.insurance?.liability,
      property: !!overrides.insurance?.property
    },
    married: false,
    children: 0,
    learnBoost: 0,
    happinessBurst: 0,
    unemployedYears: 0,
    propertyHours: 0,
    history: [],
    log: [],
    ended: false,
    endReason: null,
    yearsAdvanced: 0
  };
}

function insuranceAnnualCost(s) {
  // Employee / household share (not full sticker price)
  let c = 0;
  if (s.insurance.health) c += 2800;
  if (s.insurance.auto) c += 1200;
  if (s.insurance.disability) c += 600;
  if (s.insurance.liability) c += 400;
  if (s.insurance.property) c += 900;
  return c;
}

function hireAnnualCost(s) {
  let c = 0;
  if (s.plan.hire.planner) c += 1800;
  if (s.plan.hire.tax) c += 450;
  if (s.plan.hire.coach) c += 1200;
  return c;
}

function weeklyHours(s) {
  const t = s.plan.time;
  return t.work + t.sleep + t.learn + t.serve + t.social + t.fun + (t.sabbath ? 8 : 0);
}

/**
 * One year of life under the current plan.
 * Shared by classroom projection and ongoing play.
 */
function simulateYear(s, opts = {}) {
  const { silent = false, forceEvent = null } = opts;
  if (s.ended) return null;

  const working = s.age < RETIRE_AGE && s.unemployedYears <= 0;
  const domain = domainById(s.plan.talentDomain);
  const focus = focusById(s.plan.talentFocus);
  const t = s.plan.time;
  const spend = s.plan.spendPct / 100;
  const save = Math.min(0.45, s.plan.savePct / 100);
  const share = s.plan.sharePct / 100;

  // --- Income (gross) ---
  let income = 0;
  if (working) {
    const years = Math.max(0, s.age - START_AGE);
    const growth = 1 + years * (0.008 + s.learnBoost);
    const healthPay = s.health < 35 ? 0.72 : s.health < 50 ? 0.9 : 1;
    income = s.job.salary * domain.income * focus.income * growth * healthPay;
    if (t.work > 50) income *= 1.05;
  } else if (s.age >= RETIRE_AGE) {
    income = Math.max(0, s.investments * 0.032) + Math.max(0, s.property * 0.015);
  } else {
    income = Math.max(12000, s.job.salary * 0.2);
    s.unemployedYears = Math.max(0, (s.unemployedYears || 1) - 1);
  }

  // Spend / Save / Share are % of gross income and should total 100%
  const spendAmt = income * spend;
  const saveAmt = income * save;
  const shareAmt = income * share;
  const taxRelief = share >= 0.1 ? shareAmt * 0.15 : 0;

  const insCost = insuranceAnnualCost(s);
  const helpCost = hireAnnualCost(s);
  const propertyUpkeep = s.property > 0 ? s.property * 0.012 : 0;
  const fixedCosts = insCost + helpCost + propertyUpkeep;

  // Time freed by hiring slightly reduces work pressure
  const workLoad = Math.max(
    0,
    t.work - (s.plan.hire.planner || s.plan.hire.tax ? 2 : 0) - (s.plan.hire.coach ? 1 : 0)
  );

  // Fixed costs come out of the spend bucket first; overflow nicks savings
  let savingsThisYear = saveAmt;
  let spendPressure = 0;
  if (fixedCosts > spendAmt) {
    const overflow = fixedCosts - spendAmt;
    savingsThisYear = Math.max(0, saveAmt - overflow);
    spendPressure = 1;
  } else if (spend >= 0.8) {
    spendPressure = 0.5;
  }

  // Debt: interest, then pay from cashflow
  s.debt *= 1.035;
  const plannedDebtPay = Math.min(s.debt, income * 0.08 + savingsThisYear * 0.1);
  s.debt = Math.max(0, s.debt - plannedDebtPay);

  s.cash += savingsThisYear * 0.45 + taxRelief - plannedDebtPay * 0.25;
  s.investments += savingsThisYear * 0.55;

  // Optional tilt into property from invest mix
  const mix = s.plan.investMix || { liquid: 30, retirement: 50, stocks: 20, property: 0 };
  const stockShare = (mix.stocks || 0) / 100;
  const retShare = (mix.retirement || 0) / 100;
  const propShare = (mix.property || 0) / 100;
  if (propShare > 0 && savingsThisYear > 0) {
    const toProp = savingsThisYear * 0.55 * propShare;
    s.investments = Math.max(0, s.investments - toProp);
    s.property += toProp;
    s.propertyHours = propShare > 0.15 ? 4 : 2;
  }

  // Modest long-run returns
  const riskReturn = 1.022 + stockShare * 0.018 + retShare * 0.01;
  s.investments = Math.max(0, s.investments * (working ? riskReturn : Math.min(riskReturn, 1.03)));
  if (s.cash > 0) s.cash *= 1.005;
  if (s.property > 0) {
    const managed = t.fun + t.learn + (s.plan.hire.planner ? 3 : 0) >= (s.propertyHours || 0) + 2;
    s.property *= managed ? 1.018 : 0.98;
  }

  if (s.cash < 0) {
    // Sell a slice of investments before ballooning debt
    const need = Math.abs(s.cash);
    const fromInv = Math.min(s.investments, need);
    s.investments -= fromInv;
    s.cash += fromInv;
    if (s.cash < 0) {
      s.debt += Math.abs(s.cash);
      s.cash = 0;
    }
  }

  // --- Health from time ---
  let dH = focus.health;
  if (t.sleep < 49) dH -= 2.2;
  else if (t.sleep >= 52) dH += 0.3;
  if (workLoad > 50) dH -= 1.6 * s.job.stress;
  if (t.fun < 3) dH -= 1.1;
  else dH += 0.35;
  if (!t.sabbath) dH -= 0.6;
  else dH += 0.35;
  if (s.plan.hire.coach) dH += 0.4;

  // --- Happiness ---
  let dJ = (domain.happiness * focus.happiness - 1) * 1.1;
  if (t.serve >= 2) dJ += 0.9;
  else dJ -= 1.5; // David: happiness struggles without serving
  if (share >= 0.1) dJ += 0.55;
  else dJ -= 0.5;
  if (t.social >= 6) dJ += 0.5;
  else dJ -= 0.45;
  if (s.married && t.social >= 5) dJ += 0.6;
  if (s.children > 0 && t.social >= 6) dJ += 0.4 * Math.min(2, s.children);
  if (spend >= 0.85 || spendPressure > 0) dJ += 0.25; // short burst from high spending / cost pressure
  dJ -= 0.55 + spendPressure * 0.3; // baseline fade; cost pressure hurts
  if (s.happinessBurst > 0) {
    dJ -= Math.min(6, s.happinessBurst * 0.5);
    s.happinessBurst = Math.max(0, s.happinessBurst - 3);
  }
  if (s.debt > 40000) dJ -= 1.2;
  else if (s.debt > 15000) dJ -= 0.4;

  // Crisis costs when pillars collapse
  if (s.health < 40) {
    s.cash -= 2500;
    s.debt += 800;
  }
  if (s.happiness < 35) {
    s.cash -= 1500;
  }
  if (s.cash < 0) {
    s.debt += Math.abs(s.cash);
    s.cash = 0;
  }

  s.health = clamp(s.health + dH, 5, 96);
  s.happiness = clamp(s.happiness + dJ, 5, 96);

  // Marriage chance via social time (ongoing flavor)
  if (!s.married && s.age < 45 && t.social >= 8 && Math.random() < 0.04) {
    s.married = true;
    s.happiness = clamp(s.happiness + 5, 5, 96);
    if (!silent) addLog("You built a marriage through shared community time.", true);
  }
  if (s.married && s.children < 3 && t.social >= 7 && Math.random() < 0.03) {
    s.children += 1;
    if (!silent) addLog(`A child joins the household (${s.children}). Time allocated to family matters more now.`, true);
  }

  s.history.push({
    age: s.age,
    health: s.health,
    happiness: s.happiness,
    wealth: netWorth(s),
    score: lifetimeScore(s)
  });

  // Early death before 65 → reboot signal
  if (s.health <= 5 && s.age < RETIRE_AGE) {
    s.ended = true;
    s.endReason = "early_death";
    return { earlyDeath: true };
  }

  s.age += 1;
  s.yearsAdvanced += 1;
  if (s.unemployedYears > 0 && working === false) {
    /* countdown handled above */
  }

  if (s.age > END_AGE) {
    s.age = END_AGE;
    s.ended = true;
    s.endReason = "completed";
  }

  return { income, giving: shareAmt, invested: saveAmt, forceEvent };
}

function addLog(msg, highlight = false) {
  if (!state) return;
  state.log.unshift({ age: state.age, msg, highlight });
  renderJournal();
}

function setWheel(cardId, pct, color) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const wheel = card.querySelector(".stat-wheel");
  if (!wheel) return;
  wheel.style.setProperty("--wheel-pct", clamp(pct, 0, 100));
  if (color) wheel.style.setProperty("--wheel-color", color);
}

function renderHUD() {
  if (!state) return;
  const nw = netWorth();
  const score = lifetimeScore();
  document.getElementById("hud-age").textContent = state.age.toFixed(0);
  document.getElementById("hud-phase").textContent =
    state.age >= RETIRE_AGE ? "Retirement years" : state.unemployedYears > 0 ? "Income disrupted" : "Working years";
  document.getElementById("hud-net").textContent = money(nw);
  document.getElementById("hud-score").textContent = money(score);
  document.getElementById("hud-job").textContent = state.job.label;
  document.getElementById("mode-badge").textContent = state.mode === "classroom" ? "Classroom" : "Ongoing";

  document.getElementById("val-health").textContent = `${Math.round(state.health)}%`;
  document.getElementById("val-happiness").textContent = `${Math.round(state.happiness)}%`;
  document.getElementById("val-wealth").textContent = money(nw);
  document.getElementById("val-score").textContent = money(score);
  setWheel("card-health", state.health, "#10B981");
  setWheel("card-happiness", state.happiness, "#7C3AED");

  document.getElementById("desc-health").textContent =
    state.health >= 80 ? "Strong" : state.health >= 55 ? "Steady" : state.health >= 35 ? "Strained" : "Critical";
  document.getElementById("desc-happiness").textContent =
    state.happiness >= 80 ? "Flourishing" : state.happiness >= 55 ? "Steady" : state.happiness >= 35 ? "Drifting" : "Empty";

  document.getElementById("card-health").classList.toggle("danger-flash", state.health < 35);
  document.getElementById("card-happiness").classList.toggle("danger-flash", state.happiness < 35);
  document.getElementById("card-wealth").classList.toggle("danger-flash", nw < 0);

  const wisdom = document.getElementById("wisdom-strip");
  const p = state.plan;
  const tips = [];
  if (p.sharePct < 10) tips.push("Sharing is under 10% — long-term happiness usually suffers.");
  if (p.time.serve < 2) tips.push("Little time serving others — happiness will struggle.");
  if (p.time.sleep < 49) tips.push("Sleep/rest is low — health will decline.");
  if (!p.time.sabbath) tips.push("No sabbath rhythm — build periodic rest.");
  if (p.spendPct > 80) tips.push("High spending buys short joy that fades.");
  if (!tips.length) tips.push("Plan looks aligned with spend-less / share / invest / rest / serve.");
  wisdom.textContent = tips[0];
}

function renderJournal() {
  const el = document.getElementById("journal");
  if (!el || !state) return;
  el.innerHTML = state.log
    .slice(0, 40)
    .map(
      (e) =>
        `<div class="text-[13px] leading-snug ${e.highlight ? "text-teal-200" : "text-slate-400"}"><span class="font-mono text-[10px] text-slate-600">Age ${e.age}:</span> ${e.msg}</div>`
    )
    .join("");
}

function toggleModal(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("active", !!show);
  el.classList.toggle("opacity-0", !show);
  el.classList.toggle("pointer-events-none", !show);
}

function showModeSelect() {
  toggleModal("modal-end", false);
  toggleModal("modal-event", false);
  document.getElementById("app-shell").classList.add("hidden");
  document.getElementById("screen-mode").classList.remove("hidden");
  state = null;
}

function startMode(mode) {
  document.getElementById("screen-mode").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");
  if (mode === "classroom") {
    state = createState("classroom");
    classroomStep = 0;
    document.getElementById("btn-advance").classList.add("hidden");
    document.getElementById("btn-edit-plan").classList.add("hidden");
    renderClassroomWizard();
  } else {
    state = createState("ongoing");
    document.getElementById("btn-advance").classList.remove("hidden");
    document.getElementById("btn-edit-plan").classList.remove("hidden");
    addLog("Ongoing life begins at 25. Your plan steers each year — adjust it as wisdom grows.", true);
    renderOngoingPlan();
  }
  renderHUD();
  renderJournal();
}

/* ===================== CLASSROOM WIZARD ===================== */

function renderClassroomWizard() {
  const panel = document.getElementById("panel-main");
  const steps = ["Job", "Spending", "Time", "Talents", "Protection"];
  const dots = steps
    .map((s, i) => `<span class="wizard-step-dot ${i === classroomStep ? "active" : i < classroomStep ? "done" : ""}" title="${s}"></span>`)
    .join("");

  let body = "";
  if (classroomStep === 0) {
    body = `
      <h2 class="font-display text-xl font-bold text-white">Choose a starting job</h2>
      <p class="text-sm text-slate-400">Classroom mode uses country-style averages (US baseline). Pick a path, then set your three plans.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        ${JOBS.map(
          (j) => `
          <button type="button" class="choice-card text-left rounded-xl border ${state.job.id === j.id ? "border-teal-500/60 bg-teal-950/30" : "border-slate-700 bg-slate-900/50"} p-3" onclick="pickJob('${j.id}')">
            <div class="font-semibold text-white text-sm">${j.label}</div>
            <div class="font-mono text-[11px] text-amber-400/90 mt-0.5">${money(j.salary)}/yr starting</div>
          </button>`
        ).join("")}
      </div>`;
  } else if (classroomStep === 1) {
    body = `
      <h2 class="font-display text-xl font-bold text-white">Spending plan</h2>
      <p class="text-sm text-slate-400">Allocate income: spend, save, share. Wisdom pattern: live below your means, share ≥10%, invest the rest.</p>
      <div class="grid grid-cols-3 gap-2 mt-3">
        ${[["spendPct", "Spend"], ["savePct", "Save"], ["sharePct", "Share"]].map(
          ([k, lab]) => `
          <label class="text-[10px] text-slate-500 uppercase tracking-wider">${lab}
            <input id="c-${k}" type="number" min="0" max="100" value="${state.plan[k]}" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 font-mono text-white text-sm" />
          </label>`
        ).join("")}
      </div>
      <p id="c-pct-hint" class="text-[11px] text-slate-500 mt-2">Must total 100%.</p>`;
  } else if (classroomStep === 2) {
    const t = state.plan.time;
    body = `
      <h2 class="font-display text-xl font-bold text-white">Time management</h2>
      <p class="text-sm text-slate-400">Hours per week. Sleep, sabbath, serve, learn, and family time shape health and happiness as much as money.</p>
      <div class="grid grid-cols-2 gap-2 mt-3">
        ${[
          ["work", "Work", t.work],
          ["sleep", "Sleep / rest", t.sleep],
          ["learn", "Learn", t.learn],
          ["serve", "Serve / volunteer", t.serve],
          ["social", "Family / social", t.social],
          ["fun", "Fun / activity", t.fun]
        ]
          .map(
            ([k, lab, v]) => `
          <label class="text-[10px] text-slate-500 uppercase tracking-wider">${lab}
            <input id="c-t-${k}" type="number" min="0" max="80" value="${v}" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 font-mono text-white text-sm" />
          </label>`
          )
          .join("")}
      </div>
      <label class="flex items-center gap-2 mt-3 text-sm text-slate-300">
        <input id="c-sabbath" type="checkbox" ${t.sabbath ? "checked" : ""} class="rounded border-slate-600" />
        Keep a weekly sabbath / rest day
      </label>`;
  } else if (classroomStep === 3) {
    body = `
      <h2 class="font-display text-xl font-bold text-white">Talents</h2>
      <p class="text-sm text-slate-400">What you’re good at — and whether you aim it at yourself, others, marketplace, ministry, or family.</p>
      <label class="block text-[10px] text-slate-500 uppercase tracking-wider mt-3">Primary talent
        <select id="c-domain" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-white text-sm">
          ${TALENT_DOMAINS.map((d) => `<option value="${d.id}" ${state.plan.talentDomain === d.id ? "selected" : ""}>${d.label}</option>`).join("")}
        </select>
      </label>
      <label class="block text-[10px] text-slate-500 uppercase tracking-wider mt-3">How you use it
        <select id="c-focus" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-white text-sm">
          ${TALENT_FOCUS.map((d) => `<option value="${d.id}" ${state.plan.talentFocus === d.id ? "selected" : ""}>${d.label}</option>`).join("")}
        </select>
      </label>`;
  } else {
    const ins = state.insurance;
    body = `
      <h2 class="font-display text-xl font-bold text-white">Protection & help</h2>
      <p class="text-sm text-slate-400">Insurance against life events. Hiring help frees time at a cost.</p>
      <div class="space-y-2 mt-3 text-sm">
        ${[
          ["health", "Health insurance"],
          ["auto", "Auto insurance"],
          ["disability", "Disability"],
          ["liability", "Liability / umbrella"],
          ["property", "Property insurance"]
        ]
          .map(
            ([k, lab]) => `
          <label class="flex items-center gap-2 text-slate-300"><input type="checkbox" id="c-ins-${k}" ${ins[k] ? "checked" : ""} class="rounded border-slate-600" /> ${lab}</label>`
          )
          .join("")}
      </div>
      <div class="space-y-2 mt-4 text-sm border-t border-slate-800 pt-3">
        <label class="flex items-center gap-2 text-slate-300"><input type="checkbox" id="c-hire-planner" ${state.plan.hire.planner ? "checked" : ""} class="rounded border-slate-600" /> Financial planner</label>
        <label class="flex items-center gap-2 text-slate-300"><input type="checkbox" id="c-hire-tax" ${state.plan.hire.tax ? "checked" : ""} class="rounded border-slate-600" /> Tax preparer</label>
        <label class="flex items-center gap-2 text-slate-300"><input type="checkbox" id="c-hire-coach" ${state.plan.hire.coach ? "checked" : ""} class="rounded border-slate-600" /> Health coach</label>
      </div>`;
  }

  panel.innerHTML = `
    <div class="flex items-center gap-1.5 mb-3">${dots}</div>
    ${body}
    <div class="flex gap-2 mt-5">
      <button type="button" class="flex-1 rounded-xl border border-slate-700 py-2.5 text-[11px] font-bold uppercase tracking-wider" onclick="classroomBack()">${classroomStep === 0 ? "Modes" : "Back"}</button>
      <button type="button" class="flex-1 rounded-xl bg-teal-500 text-slate-950 py-2.5 text-[11px] font-bold uppercase tracking-wider" onclick="classroomNext()">${classroomStep >= 4 ? "See lifetime results" : "Next"}</button>
    </div>`;
}

function pickJob(id) {
  state.job = jobById(id);
  renderClassroomWizard();
  renderHUD();
}

function readClassroomStep() {
  if (classroomStep === 1) {
    state.plan.spendPct = Number(document.getElementById("c-spendPct").value) || 0;
    state.plan.savePct = Number(document.getElementById("c-savePct").value) || 0;
    state.plan.sharePct = Number(document.getElementById("c-sharePct").value) || 0;
    const total = state.plan.spendPct + state.plan.savePct + state.plan.sharePct;
    const hint = document.getElementById("c-pct-hint");
    if (Math.abs(total - 100) > 0.5) {
      if (hint) {
        hint.textContent = `Totals ${total}% — need 100%.`;
        hint.className = "text-[11px] text-rose-400 mt-2";
      }
      return false;
    }
  }
  if (classroomStep === 2) {
    ["work", "sleep", "learn", "serve", "social", "fun"].forEach((k) => {
      state.plan.time[k] = Number(document.getElementById(`c-t-${k}`).value) || 0;
    });
    state.plan.time.sabbath = document.getElementById("c-sabbath").checked ? 1 : 0;
  }
  if (classroomStep === 3) {
    state.plan.talentDomain = document.getElementById("c-domain").value;
    state.plan.talentFocus = document.getElementById("c-focus").value;
  }
  if (classroomStep === 4) {
    ["health", "auto", "disability", "liability", "property"].forEach((k) => {
      state.insurance[k] = document.getElementById(`c-ins-${k}`).checked;
    });
    state.plan.hire.planner = document.getElementById("c-hire-planner").checked;
    state.plan.hire.tax = document.getElementById("c-hire-tax").checked;
    state.plan.hire.coach = document.getElementById("c-hire-coach").checked;
  }
  return true;
}

function classroomBack() {
  if (classroomStep === 0) return showModeSelect();
  readClassroomStep();
  classroomStep -= 1;
  renderClassroomWizard();
}

function classroomNext() {
  if (!readClassroomStep()) return;
  if (classroomStep < 4) {
    classroomStep += 1;
    renderClassroomWizard();
    return;
  }
  runClassroomProjection();
}

function runClassroomProjection() {
  // Freeze plan into a fresh sim state
  const snap = createState("classroom", {
    jobId: state.job.id,
    plan: structuredClone(state.plan),
    insurance: { ...state.insurance }
  });
  state = snap;
  addLog("Classroom projection running with your plans…", true);

  // Inject light randomness so identical plans aren't identical — but keep teachable
  for (let i = 0; i < END_AGE - START_AGE; i++) {
    if (state.ended) break;
    simulateYear(state, { silent: true });
    // Sparse random shocks (~1 every 7 years)
    if (!state.ended && Math.random() < 0.14) {
      const ev = LIFE_EVENTS.filter((e) => !e.isOpportunity)[Math.floor(Math.random() * 5)];
      if (ev && ev.resolve) {
        const note = ev.resolve(state);
        state.log.unshift({ age: state.age, msg: `${ev.title}: ${note}`, highlight: true });
      }
    }
    state.health = clamp(state.health, 5, 96);
    state.happiness = clamp(state.happiness, 5, 96);
    if (state.cash < 0) {
      state.debt += Math.abs(state.cash);
      state.cash = 0;
    }
  }
  state.age = END_AGE;
  state.ended = true;
  state.endReason = state.endReason || "classroom";
  showEndScreen();
}

/* ===================== ONGOING ===================== */

function renderOngoingPlan() {
  const p = state.plan;
  const panel = document.getElementById("panel-main");
  panel.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="font-display text-lg font-bold text-white">Your stewardship plan</h2>
        <p class="text-sm text-slate-400 mt-1">Each year follows this plan until you change it. Opportunities and setbacks will test it.</p>
      </div>
    </div>
    <div class="grid grid-cols-3 gap-2 mt-3 font-mono text-center">
      <div class="rounded-xl bg-slate-900 border border-slate-800 p-2"><div class="text-[8px] text-slate-500 uppercase">Spend</div><div class="text-white font-semibold">${p.spendPct}%</div></div>
      <div class="rounded-xl bg-slate-900 border border-slate-800 p-2"><div class="text-[8px] text-slate-500 uppercase">Save</div><div class="text-white font-semibold">${p.savePct}%</div></div>
      <div class="rounded-xl bg-slate-900 border border-slate-800 p-2"><div class="text-[8px] text-slate-500 uppercase">Share</div><div class="text-white font-semibold ${p.sharePct >= 10 ? "text-teal-300" : "text-rose-300"}">${p.sharePct}%</div></div>
    </div>
    <div class="text-sm text-slate-400 mt-3 space-y-1">
      <div><span class="text-slate-500">Time:</span> work ${p.time.work}h · sleep ${p.time.sleep}h · serve ${p.time.serve}h · learn ${p.time.learn}h · social ${p.time.social}h · fun ${p.time.fun}h ${p.time.sabbath ? "· sabbath" : ""}</div>
      <div><span class="text-slate-500">Talent:</span> ${domainById(p.talentDomain).label} → ${focusById(p.talentFocus).label}</div>
      <div><span class="text-slate-500">Covered:</span> ${Object.entries(state.insurance).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}</div>
    </div>
    <p class="text-[12px] text-slate-500 mt-3">Press <strong class="text-slate-300">Next Year</strong> to live another year. Low happiness or health will invite opportunities.</p>
  `;
}

function openPlanEditor() {
  if (!state || state.mode !== "ongoing") return;
  classroomStep = 1;
  // Reuse classroom steps 1-4 as editor, then return to ongoing
  state._editingPlan = true;
  document.getElementById("btn-advance").classList.add("hidden");
  renderPlanEditor();
}

function renderPlanEditor() {
  // Lightweight: jump into spending/time/talent/protection single scroll form
  const p = state.plan;
  const panel = document.getElementById("panel-main");
  panel.innerHTML = `
    <h2 class="font-display text-lg font-bold text-white">Adjust plan</h2>
    <div class="grid grid-cols-3 gap-2 mt-3">
      ${[["spendPct", "Spend", p.spendPct], ["savePct", "Save", p.savePct], ["sharePct", "Share", p.sharePct]]
        .map(([k, l, v]) => `<label class="text-[10px] text-slate-500 uppercase">${l}<input id="e-${k}" type="number" value="${v}" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 font-mono text-sm text-white" /></label>`)
        .join("")}
    </div>
    <div class="grid grid-cols-2 gap-2 mt-3">
      ${["work", "sleep", "learn", "serve", "social", "fun"]
        .map((k) => `<label class="text-[10px] text-slate-500 uppercase">${k}<input id="e-t-${k}" type="number" value="${p.time[k]}" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 font-mono text-sm text-white" /></label>`)
        .join("")}
    </div>
    <label class="flex items-center gap-2 mt-3 text-sm"><input id="e-sabbath" type="checkbox" ${p.time.sabbath ? "checked" : ""} /> Weekly sabbath</label>
    <label class="block text-[10px] text-slate-500 uppercase mt-3">Talent domain
      <select id="e-domain" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-sm text-white">
        ${TALENT_DOMAINS.map((d) => `<option value="${d.id}" ${p.talentDomain === d.id ? "selected" : ""}>${d.label}</option>`).join("")}
      </select>
    </label>
    <label class="block text-[10px] text-slate-500 uppercase mt-2">Talent focus
      <select id="e-focus" class="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 text-sm text-white">
        ${TALENT_FOCUS.map((d) => `<option value="${d.id}" ${p.talentFocus === d.id ? "selected" : ""}>${d.label}</option>`).join("")}
      </select>
    </label>
    <div class="grid grid-cols-2 gap-2 mt-3 text-sm">
      ${["health", "auto", "disability", "liability", "property"]
        .map((k) => `<label class="flex gap-2 items-center"><input id="e-ins-${k}" type="checkbox" ${state.insurance[k] ? "checked" : ""} /> ${k}</label>`)
        .join("")}
    </div>
    <div class="flex gap-2 mt-4">
      <button type="button" class="flex-1 rounded-xl border border-slate-700 py-2.5 text-[11px] font-bold uppercase" onclick="cancelPlanEdit()">Cancel</button>
      <button type="button" class="flex-1 rounded-xl bg-teal-500 text-slate-950 py-2.5 text-[11px] font-bold uppercase" onclick="savePlanEdit()">Save plan</button>
    </div>
  `;
}

function cancelPlanEdit() {
  state._editingPlan = false;
  document.getElementById("btn-advance").classList.remove("hidden");
  renderOngoingPlan();
}

function savePlanEdit() {
  const spend = Number(document.getElementById("e-spendPct").value) || 0;
  const save = Number(document.getElementById("e-savePct").value) || 0;
  const share = Number(document.getElementById("e-sharePct").value) || 0;
  if (Math.abs(spend + save + share - 100) > 0.5) {
    alert("Spend + Save + Share must total 100%.");
    return;
  }
  state.plan.spendPct = spend;
  state.plan.savePct = save;
  state.plan.sharePct = share;
  ["work", "sleep", "learn", "serve", "social", "fun"].forEach((k) => {
    state.plan.time[k] = Number(document.getElementById(`e-t-${k}`).value) || 0;
  });
  state.plan.time.sabbath = document.getElementById("e-sabbath").checked ? 1 : 0;
  state.plan.talentDomain = document.getElementById("e-domain").value;
  state.plan.talentFocus = document.getElementById("e-focus").value;
  ["health", "auto", "disability", "liability", "property"].forEach((k) => {
    state.insurance[k] = document.getElementById(`e-ins-${k}`).checked;
  });
  state._editingPlan = false;
  document.getElementById("btn-advance").classList.remove("hidden");
  addLog("Plan updated. Next years will follow the new stewardship choices.", true);
  renderOngoingPlan();
  renderHUD();
}

function advanceYear() {
  if (!state || state.mode !== "ongoing" || state.ended || state._editingPlan) return;
  if (pendingEvent) return;

  const before = state.age;
  simulateYear(state);
  addLog(`Year lived. Net worth ${money(netWorth())}. Score ${money(lifetimeScore())}.`);

  if (state.ended) {
    showEndScreen();
    return;
  }

  // Retirement notice
  if (before < RETIRE_AGE && state.age >= RETIRE_AGE) {
    addLog("Wage years end. Living on savings, investments, and stewardship through 85.", true);
  }

  // Opportunity / event cadence — not every year, but often enough to teach
  const needJoy = state.happiness < 55;
  const needHealth = state.health < 55;
  const roll = Math.random();
  if (needJoy && roll < 0.55) {
    presentOpportunity(Math.random() < 0.5 ? "soup" : Math.random() < 0.5 ? "trip" : "spa");
  } else if (needHealth && roll < 0.4) {
    presentOpportunity("class");
  } else if (roll < 0.22) {
    presentLifeEvent();
  } else if (roll < 0.32) {
    presentOpportunity(OPPORTUNITIES[Math.floor(Math.random() * OPPORTUNITIES.length)].id);
  }

  renderHUD();
  renderOngoingPlan();
}

function presentOpportunity(id) {
  const opp = OPPORTUNITIES.find((o) => o.id === id) || OPPORTUNITIES[0];
  pendingEvent = { type: "opportunity", data: opp };
  document.getElementById("event-kind").textContent = opp.kind;
  document.getElementById("event-title").textContent = opp.title;
  document.getElementById("event-body").textContent = opp.body;
  document.getElementById("event-visual").style.backgroundImage = opp.visual.includes("url")
    ? opp.visual
    : opp.visual;
  document.getElementById("event-visual").style.background = opp.visual;
  const box = document.getElementById("event-choices");
  box.innerHTML = opp.choices
    .map(
      (c, i) =>
        `<button type="button" class="choice-card w-full text-left rounded-xl border border-slate-700 bg-slate-950/80 hover:border-teal-500/40 px-3 py-2.5 text-sm text-slate-200" onclick="resolveOpportunity(${i})">${c.label}</button>`
    )
    .join("");
  toggleModal("modal-event", true);
}

function resolveOpportunity(index) {
  const opp = pendingEvent?.data;
  if (!opp) return;
  const c = opp.choices[index];
  if (c.cash) state.cash += c.cash;
  if (c.debt) state.debt += c.debt;
  if (c.happiness) state.happiness = clamp(state.happiness + c.happiness, 5, 96);
  if (c.health) state.health = clamp(state.health + c.health, 5, 96);
  if (c.happinessDecay) state.happinessBurst += c.happinessDecay;
  if (c.timeServe) state.plan.time.serve = Math.min(20, state.plan.time.serve + 0); // flavor
  if (c.learnBoost) state.learnBoost += c.learnBoost;
  if (c.tag === "consume") addLog(`${opp.title}: short-term lift — it will fade.`, true);
  else if (c.tag === "serve") addLog(`${opp.title}: service tends to last longer in the heart.`, true);
  else addLog(`${opp.title}: ${c.label}`);
  if (state.cash < 0) {
    state.debt += Math.abs(state.cash);
    state.cash = 0;
  }
  pendingEvent = null;
  toggleModal("modal-event", false);
  renderHUD();
}

function presentLifeEvent() {
  const pool = LIFE_EVENTS;
  const ev = pool[Math.floor(Math.random() * pool.length)];
  if (ev.isOpportunity) {
    pendingEvent = { type: "special", data: ev };
    document.getElementById("event-kind").textContent = ev.kind;
    document.getElementById("event-title").textContent = ev.title;
    document.getElementById("event-body").textContent = ev.body;
    document.getElementById("event-visual").style.background = ev.visual;
    document.getElementById("event-choices").innerHTML = ev.choices
      .map(
        (c, i) =>
          `<button type="button" class="choice-card w-full text-left rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm" onclick="resolveSpecial(${i})">${c.label}</button>`
      )
      .join("");
    toggleModal("modal-event", true);
    return;
  }
  const note = ev.resolve(state);
  addLog(`${ev.title}: ${note}`, true);
  state.health = clamp(state.health, 5, 96);
  state.happiness = clamp(state.happiness, 5, 96);
  if (state.cash < 0) {
    state.debt += Math.abs(state.cash);
    state.cash = 0;
  }
  if (state.health <= 5 && state.age < RETIRE_AGE) {
    state.ended = true;
    state.endReason = "early_death";
    showEndScreen();
  }
  renderHUD();
}

function resolveSpecial(index) {
  const ev = pendingEvent?.data;
  if (!ev) return;
  const msg = ev.choices[index].apply(state);
  addLog(`${ev.title}: ${msg}`, true);
  pendingEvent = null;
  toggleModal("modal-event", false);
  renderHUD();
}

/* ===================== END / DEBRIEF ===================== */

function buildDebrief(s) {
  const notes = [];
  const p = s.plan;
  const nw = netWorth(s);
  if (p.sharePct >= 10) notes.push({ ok: true, text: `Sharing at ${p.sharePct}% met the ≥10% wisdom pattern (and helped happiness).` });
  else notes.push({ ok: false, text: `Sharing was ${p.sharePct}% — below 10%. Discuss what “first fruits” giving could look like.` });

  if (p.spendPct + p.savePct + p.sharePct === 100 && p.spendPct <= 70) notes.push({ ok: true, text: "Lived within a restrained spending rate." });
  else if (p.spendPct > 80) notes.push({ ok: false, text: "High spending rate — short joy, weaker compounding." });

  if (p.time.serve >= 2) notes.push({ ok: true, text: "Time serving others supported lasting happiness." });
  else notes.push({ ok: false, text: "Little volunteer/serve time — happiness struggled without outward focus." });

  if (p.time.sleep >= 49 && p.time.sabbath) notes.push({ ok: true, text: "Rest and sabbath protected health." });
  else notes.push({ ok: false, text: "Rest/sabbath was thin — health paid the price." });

  if (p.time.learn >= 3) notes.push({ ok: true, text: "Learning time supported income progress." });
  else notes.push({ ok: false, text: "Little learning — career growth likely stalled." });

  const covered = Object.values(s.insurance).filter(Boolean).length;
  if (covered >= 3) notes.push({ ok: true, text: "Insurance stack reduced the damage of random events." });
  else notes.push({ ok: false, text: "Thin insurance — discuss illness, liability, and disability protection." });

  if (s.debt < 1000) notes.push({ ok: true, text: "Ended largely debt-free — interest was not the master." });
  else notes.push({ ok: false, text: `Still carried ${money(s.debt)} debt into the ending.` });

  if (s.health >= 70 && s.happiness >= 70 && nw > 0) notes.push({ ok: true, text: "Health and happiness multiplied wealth into a strong lifetime score." });
  else if (nw > 500000 && (s.health < 45 || s.happiness < 45)) notes.push({ ok: false, text: "Wealth looked strong, but low health/happiness crushed the lifetime score. Money alone is not the win." });

  return notes;
}

function showEndScreen() {
  const nw = netWorth();
  const score = lifetimeScore();
  let title = "Steady Steward";
  let icon = "⚖️";
  let summary = "A workable life with room to grow in rest, service, and generosity.";

  if (state.endReason === "early_death") {
    title = "Life interrupted — reboot";
    icon = "🔄";
    summary = "Health collapsed before 65. In this design, early death restarts the lesson so students can try a wiser plan.";
  } else if (
    nw > 750000 &&
    state.health >= 70 &&
    state.happiness >= 70 &&
    state.plan.sharePct >= 10 &&
    state.plan.time.serve >= 2
  ) {
    title = "Faithful Steward";
    icon = "🏆";
    summary = "You spent less than you earned, shared generously, invested wisely, and guarded health and relationships. Net worth mattered — but so did the life around it.";
  } else if (nw > 600000 && (state.health < 45 || state.happiness < 45)) {
    title = "Wealth without wellness";
    icon = "📉";
    summary = "Assets grew, but health or happiness did not. The score formula shows why a rich, empty life still loses.";
  } else if (nw < 50000 && state.happiness >= 70) {
    title = "Rich in relationships";
    icon = "🤝";
    summary = "Joy and connection were strong, but thin reserves leave later years fragile. Balance matters.";
  } else if (nw < 0 || state.debt > 50000) {
    title = "Debt bondage";
    icon = "⛓️";
    summary = "High-interest debt and overspending compounded against you. Limit debt; live below your means.";
  }

  document.getElementById("end-icon").textContent = icon;
  document.getElementById("end-title").textContent = `Legacy: ${title}`;
  document.getElementById("end-sub").textContent = `Completed journey at age ${state.age}`;
  document.getElementById("end-health").textContent = `${Math.round(state.health)}%`;
  document.getElementById("end-wealth").textContent = money(nw);
  document.getElementById("end-happiness").textContent = `${Math.round(state.happiness)}%`;
  document.getElementById("end-score").textContent = money(score);
  document.getElementById("end-summary").textContent = summary;
  document.getElementById("end-debrief").innerHTML = buildDebrief(state)
    .map(
      (n) =>
        `<div class="flex gap-2 items-start"><span class="${n.ok ? "text-emerald-400" : "text-amber-400"}">${n.ok ? "✓" : "!"}</span><span>${n.text}</span></div>`
    )
    .join("");

  renderHUD();
  toggleModal("modal-end", true);
}

/* ===================== BOOT ===================== */

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-home").addEventListener("click", showModeSelect);
  document.getElementById("btn-advance").addEventListener("click", advanceYear);
  document.getElementById("btn-edit-plan").addEventListener("click", openPlanEditor);
  document.getElementById("btn-clear-log").addEventListener("click", () => {
    if (state) state.log = [];
    renderJournal();
  });
  document.getElementById("btn-play-again").addEventListener("click", () => {
    const mode = state?.mode || "classroom";
    toggleModal("modal-end", false);
    startMode(mode);
  });
  showModeSelect();
});

// Expose handlers used by inline HTML
Object.assign(window, {
  startMode,
  showModeSelect,
  pickJob,
  classroomBack,
  classroomNext,
  resolveOpportunity,
  resolveSpecial,
  cancelPlanEdit,
  savePlanEdit
});
