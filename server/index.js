/**
 * Stewardship Life — Railway-ready API
 * Serves static site + /api/coach + /api/feedback
 *
 * Env:
 *   PORT
 *   GROQ_API_KEY or OPENAI_API_KEY
 *   LLM_BASE_URL (default Groq)
 *   LLM_MODEL (default llama-3.1-8b-instant)
 *   DATA_DIR or RAILWAY_VOLUME_MOUNT_PATH
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const DATA_DIR =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, "data");

const LLM_BASE_URL = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "llama-3.1-8b-instant";
const LLM_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";

app.use(express.json({ limit: "6mb" }));
app.use(express.static(ROOT));

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const fb = path.join(DATA_DIR, "feedback");
  if (!fs.existsSync(fb)) fs.mkdirSync(fb, { recursive: true });
}

const COACH_SYSTEM = `You are a stewardship money coach inside a teaching life sim.
Players steward TIME, TALENTS, and TREASURES. Score = Wealth × (1 + Health/100 + Joy/100).
Wisdom pattern: spend less than earn · share ≥10% · invest the rest · rest · serve · limit debt.

RULES (hard):
- Only suggest changes to EXISTING controls: spend/save/share %, weekly hours, talent focus, insurance toggles, job choice, hire help.
- Do NOT invent new game mechanics, items, or free-chat therapy.
- Be brief, concrete, and teachable for ages ~13–18 and apprentices.
- Tie every suggestion to the numbers in the snapshot.

Respond with ONLY valid JSON:
{
  "read": "2-3 sentences interpreting their current life state",
  "suggestions": [
    { "action": "short control change", "why": "one sentence teaching why" }
  ],
  "watch": "one risk to watch next"
}
Max 3 suggestions.`;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    coach: Boolean(LLM_KEY),
    model: LLM_KEY ? LLM_MODEL : null,
    feedbackDir: DATA_DIR
  });
});

app.post("/api/coach", async (req, res) => {
  const snapshot = req.body?.snapshot;
  if (!snapshot || typeof snapshot !== "object") {
    return res.status(400).json({ error: "snapshot required" });
  }

  if (!LLM_KEY) {
    return res.json({
      source: "fallback",
      ...ruleBasedCoach(snapshot)
    });
  }

  try {
    const r = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LLM_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.4,
        max_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: COACH_SYSTEM },
          {
            role: "user",
            content: `Game snapshot:\n${JSON.stringify(snapshot, null, 0)}`
          }
        ]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("LLM error", r.status, errText.slice(0, 400));
      return res.json({ source: "fallback", ...ruleBasedCoach(snapshot), llmError: true });
    }

    const data = await r.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = ruleBasedCoach(snapshot);
    }
    return res.json({
      source: "llm",
      model: LLM_MODEL,
      read: String(parsed.read || "").slice(0, 800),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
      watch: String(parsed.watch || "").slice(0, 300)
    });
  } catch (e) {
    console.error(e);
    return res.json({ source: "fallback", ...ruleBasedCoach(snapshot) });
  }
});

function ruleBasedCoach(s) {
  const suggestions = [];
  const plan = s.plan || {};
  const time = plan.time || {};
  if ((plan.sharePct ?? 0) < 10) {
    suggestions.push({
      action: "Raise Share to at least 10%",
      why: "The wisdom pattern treats first-fruits giving as a floor; joy usually follows outward focus."
    });
  }
  if ((time.serve ?? 0) < 2) {
    suggestions.push({
      action: "Add 2+ hours/week serving others",
      why: "Short spending spikes fade; service tends to lift joy longer."
    });
  }
  if ((time.sleep ?? 0) < 49) {
    suggestions.push({
      action: "Move Sleep/rest toward ~56 hours/week",
      why: "Low rest quietly drains Health — and early collapse ends the lesson."
    });
  }
  if ((plan.spendPct ?? 0) > 80) {
    suggestions.push({
      action: "Cut Spend below 80% and raise Save",
      why: "High spending buys short joy and weakens compounding."
    });
  }
  if ((s.insuranceCovered ?? 0) < 3) {
    suggestions.push({
      action: "Turn on Health + Liability (+ Disability if you can)",
      why: "Random life events punish thin coverage hardest."
    });
  }
  if (!suggestions.length) {
    suggestions.push({
      action: "Keep the plan; nudge Learn or Serve by 1 hour",
      why: "You’re near the pattern — small consistency beats big swings."
    });
  }
  return {
    read: `Age ${s.age}: net worth about ${s.netWorthLabel || "—"}; Health ${s.health}%, Joy ${s.happiness}%. Job: ${s.job || "—"}.`,
    suggestions: suggestions.slice(0, 3),
    watch: s.debt > 20000 ? "Debt interest is competing with your save rate." : "Stay ready for a random setback — emergency cash matters."
  };
}

app.post("/api/feedback", (req, res) => {
  try {
    ensureDataDir();
    const id = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const payload = {
      id,
      receivedAt: new Date().toISOString(),
      version: req.body?.version || "unknown",
      mode: req.body?.mode || null,
      name: String(req.body?.name || "anonymous").slice(0, 80),
      role: String(req.body?.role || "").slice(0, 80),
      text: String(req.body?.text || "").slice(0, 8000),
      state: req.body?.state || null,
      screenshotDataUrl: req.body?.screenshotDataUrl
        ? String(req.body.screenshotDataUrl).slice(0, 5_000_000)
        : null,
      userAgent: req.headers["user-agent"] || ""
    };
    const file = path.join(DATA_DIR, "feedback", `${id}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    // Keep a lightweight index without screenshots
    const indexPath = path.join(DATA_DIR, "feedback-index.json");
    let index = [];
    if (fs.existsSync(indexPath)) {
      try {
        index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      } catch {
        index = [];
      }
    }
    index.unshift({
      id,
      receivedAt: payload.receivedAt,
      version: payload.version,
      mode: payload.mode,
      name: payload.name,
      role: payload.role,
      textPreview: payload.text.slice(0, 160),
      hasScreenshot: Boolean(payload.screenshotDataUrl)
    });
    fs.writeFileSync(indexPath, JSON.stringify(index.slice(0, 500), null, 2));
    res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "could not store feedback" });
  }
});

app.get("/api/feedback", (req, res) => {
  const token = process.env.FEEDBACK_ADMIN_TOKEN;
  if (token && req.headers["x-admin-token"] !== token) {
    return res.status(401).json({ error: "unauthorized" });
  }
  ensureDataDir();
  const indexPath = path.join(DATA_DIR, "feedback-index.json");
  if (!fs.existsSync(indexPath)) return res.json({ items: [] });
  try {
    const items = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

app.get("/api/feedback/:id", (req, res) => {
  const token = process.env.FEEDBACK_ADMIN_TOKEN;
  if (token && req.headers["x-admin-token"] !== token) {
    return res.status(401).json({ error: "unauthorized" });
  }
  ensureDataDir();
  const file = path.join(DATA_DIR, "feedback", `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "not found" });
  res.type("json").send(fs.readFileSync(file, "utf8"));
});

// SPA-ish fallback for deep links (none yet) — keep index for /
app.listen(PORT, () => {
  ensureDataDir();
  console.log(`Stewardship Life on :${PORT} · coach=${Boolean(LLM_KEY)} · data=${DATA_DIR}`);
});
