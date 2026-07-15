/**
 * In-game feedback capture — text + game state + optional screenshot.
 * Always saves locally; POSTs to /api/feedback when the API is up.
 */
(function (global) {
  const STORAGE_KEY = "stewardship-feedback-queue";

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setQueue(q) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q.slice(0, 40)));
  }

  function versionMeta(mode) {
    const map = {
      classroom: { id: "v1-classroom", label: "Classroom" },
      ongoing: { id: "v2-ongoing", label: "Ongoing" },
      vision: { id: "v3-vision-plus", label: "Vision+" },
      wizard: { id: "v4-ai-wizard", label: "AI Wizard" }
    };
    return map[mode] || { id: mode || "unknown", label: mode || "unknown" };
  }

  function buildStatePayload(state) {
    if (!state) return null;
    const nw =
      (state.cash || 0) + (state.investments || 0) + (state.property || 0) - (state.debt || 0);
    return {
      mode: state.mode,
      age: state.age,
      job: state.job?.label || state.job?.id,
      jobId: state.job?.id,
      plan: state.plan,
      insurance: state.insurance,
      cash: state.cash,
      investments: state.investments,
      property: state.property,
      debt: state.debt,
      netWorth: nw,
      health: state.health,
      happiness: state.happiness,
      married: state.married,
      children: state.children,
      ended: state.ended,
      endReason: state.endReason,
      recentLog: (state.log || []).slice(0, 12)
    };
  }

  async function captureScreenshot() {
    const target = document.getElementById("app-shell") || document.body;
    if (typeof html2canvas !== "function") return null;
    try {
      const canvas = await html2canvas(target, {
        backgroundColor: "#020617",
        scale: 0.6,
        logging: false,
        useCORS: true
      });
      return canvas.toDataURL("image/jpeg", 0.72);
    } catch {
      return null;
    }
  }

  async function submitFeedback({ name, role, text, state, includeScreenshot }) {
    const ver = versionMeta(state?.mode);
    const payload = {
      version: ver.id,
      mode: state?.mode || null,
      name: name || "anonymous",
      role: role || "",
      text: text || "",
      state: buildStatePayload(state),
      screenshotDataUrl: includeScreenshot ? await captureScreenshot() : null,
      capturedAt: new Date().toISOString()
    };

    const queue = getQueue();
    queue.unshift({ ...payload, localId: `local-${Date.now()}` });
    setQueue(queue);

    let remote = { ok: false };
    try {
      const r = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (r.ok) remote = await r.json();
    } catch {
      /* offline / Pages-only — local queue is enough */
    }

    return { local: true, remote, payload };
  }

  function openFeedbackModal() {
    toggleFeedbackModal(true);
  }

  function toggleFeedbackModal(show) {
    const el = document.getElementById("modal-feedback");
    if (!el) return;
    el.classList.toggle("active", !!show);
    el.classList.toggle("opacity-0", !show);
    el.classList.toggle("pointer-events-none", !show);
  }

  async function handleFeedbackSubmit() {
    const name = document.getElementById("fb-name")?.value?.trim() || "anonymous";
    const role = document.getElementById("fb-role")?.value?.trim() || "";
    const text = document.getElementById("fb-text")?.value?.trim() || "";
    const includeScreenshot = document.getElementById("fb-shot")?.checked !== false;
    const status = document.getElementById("fb-status");
    if (!text) {
      if (status) status.textContent = "Add a short note — what worked, what confused you, what you’d change.";
      return;
    }
    if (status) status.textContent = "Capturing…";
    const state = global.state || null;
    const result = await submitFeedback({ name, role, text, state, includeScreenshot });
    if (status) {
      status.textContent = result.remote?.ok
        ? `Sent to lab queue (${result.remote.id}). Also saved on this device.`
        : "Saved on this device. Remote API not reachable yet (fine on GitHub Pages).";
    }
    const ta = document.getElementById("fb-text");
    if (ta) ta.value = "";
  }

  global.FeedbackLab = {
    open: openFeedbackModal,
    close: () => toggleFeedbackModal(false),
    submit: handleFeedbackSubmit,
    getQueue,
    buildStatePayload,
    versionMeta
  };
})(window);
