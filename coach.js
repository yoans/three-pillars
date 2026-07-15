/**
 * AI stewardship coach — calls /api/coach with a tight snapshot.
 * Falls back to local rules if API is missing (GitHub Pages / no key).
 */
(function (global) {
  function snapshotFromState(state) {
    if (!state) return null;
    const nw =
      (state.cash || 0) + (state.investments || 0) + (state.property || 0) - (state.debt || 0);
    const t = state.plan?.time || {};
    const hoursUsed =
      (t.work || 0) +
      (t.sleep || 0) +
      (t.learn || 0) +
      (t.serve || 0) +
      (t.social || 0) +
      (t.fun || 0) +
      (t.sabbath ? 8 : 0);
    return {
      age: state.age,
      mode: state.mode,
      job: state.job?.label,
      netWorth: Math.round(nw),
      netWorthLabel: `$${Math.round(nw).toLocaleString()}`,
      health: Math.round(state.health),
      happiness: Math.round(state.happiness),
      debt: Math.round(state.debt || 0),
      cash: Math.round(state.cash || 0),
      investments: Math.round(state.investments || 0),
      plan: {
        spendPct: state.plan.spendPct,
        savePct: state.plan.savePct,
        sharePct: state.plan.sharePct,
        time: state.plan.time,
        talentDomain: state.plan.talentDomain,
        talentFocus: state.plan.talentFocus
      },
      insuranceCovered: Object.values(state.insurance || {}).filter(Boolean).length,
      hoursUsed,
      hoursFree: 168 - hoursUsed,
      recentLog: (state.log || []).slice(0, 5).map((e) => e.msg)
    };
  }

  function localCoach(snapshot) {
    const suggestions = [];
    const plan = snapshot.plan || {};
    const time = plan.time || {};
    if ((plan.sharePct ?? 0) < 10) {
      suggestions.push({
        action: "Raise Share to ≥10%",
        why: "Giving first is the floor of the wisdom pattern — joy usually follows."
      });
    }
    if ((time.serve ?? 0) < 2) {
      suggestions.push({
        action: "Schedule 2+ serve hours / week",
        why: "Service lifts Joy longer than impulse buys."
      });
    }
    if ((time.sleep ?? 0) < 49) {
      suggestions.push({
        action: "Protect ~56h sleep/rest",
        why: "Low rest drains Health; early collapse ends the lesson."
      });
    }
    if ((plan.spendPct ?? 0) > 80) {
      suggestions.push({
        action: "Lower Spend; raise Save",
        why: "High spend buys short joy and weak compounding."
      });
    }
    if ((snapshot.insuranceCovered ?? 0) < 3) {
      suggestions.push({
        action: "Add Health + Liability insurance",
        why: "Random events punish thin coverage."
      });
    }
    if (snapshot.hoursUsed > 168) {
      suggestions.push({
        action: "Cut weekly hours until ≤168",
        why: "Overcommitted weeks are a math error — and a life error."
      });
    }
    if (!suggestions.length) {
      suggestions.push({
        action: "Hold the plan; +1h Learn or Serve",
        why: "You’re near the pattern — consistency beats drama."
      });
    }
    return {
      source: "local",
      read: `Age ${snapshot.age}: ${snapshot.netWorthLabel}, Health ${snapshot.health}%, Joy ${snapshot.happiness}%. ${snapshot.hoursFree} free hours/week on the clock.`,
      suggestions: suggestions.slice(0, 3),
      watch:
        snapshot.debt > 20000
          ? "Debt interest is eating your save rate."
          : "Keep a cash cushion — life events will show up."
    };
  }

  async function askCoach(state) {
    const snapshot = snapshotFromState(state);
    if (!snapshot) return { source: "none", read: "Start a life first.", suggestions: [], watch: "" };

    try {
      const r = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot })
      });
      if (r.ok) {
        const data = await r.json();
        return {
          source: data.source || "llm",
          read: data.read,
          suggestions: data.suggestions || [],
          watch: data.watch || ""
        };
      }
    } catch {
      /* fall through */
    }
    return localCoach(snapshot);
  }

  function renderCoachInto(el, result) {
    if (!el || !result) return;
    const sug = (result.suggestions || [])
      .map(
        (s) =>
          `<li class="mt-2"><span class="text-teal-300 font-semibold">${escapeHtml(s.action)}</span><br/><span class="text-slate-400 text-[13px]">${escapeHtml(s.why)}</span></li>`
      )
      .join("");
    el.innerHTML = `
      <div class="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Coach · ${escapeHtml(result.source || "local")}</div>
      <p class="text-sm text-slate-200 leading-snug">${escapeHtml(result.read || "")}</p>
      <ul class="mt-2 text-sm list-disc pl-4 text-slate-300">${sug}</ul>
      ${result.watch ? `<p class="mt-3 text-[12px] text-amber-200/90"><span class="uppercase tracking-wider text-[9px] text-amber-500/80 font-bold">Watch</span> — ${escapeHtml(result.watch)}</p>` : ""}
    `;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  global.CoachLab = { askCoach, snapshotFromState, renderCoachInto, localCoach };
})(window);
