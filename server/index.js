/**
 * Stewardship Life — Railway API
 * Serves static site + /api/coach (OpenAI) + /api/feedback (GitHub Issues)
 *
 * Env:
 *   PORT
 *   OPENAI_API_KEY
 *   LLM_BASE_URL (default https://api.openai.com/v1)
 *   LLM_MODEL (default gpt-4o-mini)
 *   GITHUB_TOKEN — fine-grained or classic with Issues: write
 *   GITHUB_REPO — owner/name (default yoans/three-pillars)
 *   GITHUB_FEEDBACK_LABELS — comma list (optional)
 */

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

const LLM_BASE_URL = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const LLM_KEY = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || "";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_REPO = process.env.GITHUB_REPO || "yoans/three-pillars";
const GITHUB_FEEDBACK_LABELS = (process.env.GITHUB_FEEDBACK_LABELS || "playtest-feedback")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(express.json({ limit: "6mb" }));
app.use(express.static(ROOT));

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
    feedback: Boolean(GITHUB_TOKEN),
    repo: GITHUB_REPO
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
            content: `Game snapshot:\n${JSON.stringify(snapshot)}`
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

function buildIssueBody(payload) {
  const stateJson = JSON.stringify(payload.state || {}, null, 2).slice(0, 60000);
  const lines = [
    `## Feedback`,
    payload.text || "_(no text)_",
    ``,
    `## Meta`,
    `- **Name:** ${payload.name || "anonymous"}`,
    `- **Role:** ${payload.role || "—"}`,
    `- **Version:** ${payload.version || "—"}`,
    `- **Mode:** ${payload.mode || "—"}`,
    `- **Captured:** ${payload.capturedAt || payload.receivedAt || new Date().toISOString()}`,
    `- **Screenshot:** ${payload.screenshotDataUrl ? "yes (attached below if upload succeeded)" : "no"}`,
    `- **User-Agent:** \`${(payload.userAgent || "").slice(0, 200)}\``,
    ``,
    `## Game state`,
    "```json",
    stateJson,
    "```"
  ];
  return lines.join("\n");
}

async function ensureLabel(name) {
  const [owner, repo] = GITHUB_REPO.split("/");
  const check = await fetch(`https://api.github.com/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "stewardship-life"
    }
  });
  if (check.status === 200) return;
  await fetch(`https://api.github.com/repos/${owner}/${repo}/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "stewardship-life"
    },
    body: JSON.stringify({
      name,
      color: "0d9488",
      description: "In-game playtest feedback"
    })
  });
}

async function createGitHubIssue(payload) {
  const [owner, repo] = GITHUB_REPO.split("/");
  if (!owner || !repo) throw new Error("GITHUB_REPO must be owner/name");

  for (const label of GITHUB_FEEDBACK_LABELS) {
    try {
      await ensureLabel(label);
    } catch (e) {
      console.warn("label ensure failed", label, e.message);
    }
  }

  const age = payload.state?.age != null ? ` age ${payload.state.age}` : "";
  const title = `[Feedback] ${payload.version || payload.mode || "play"} · ${payload.name || "anon"}${age}`.slice(0, 180);

  let body = buildIssueBody(payload);

  // Optional: park screenshot in a private-ish gist and link it
  if (payload.screenshotDataUrl && payload.screenshotDataUrl.startsWith("data:image")) {
    try {
      const gist = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "stewardship-life"
        },
        body: JSON.stringify({
          description: `Stewardship Life screenshot · ${title}`,
          public: false,
          files: {
            "screenshot.dataurl.txt": {
              content: payload.screenshotDataUrl.slice(0, 4_500_000)
            }
          }
        })
      });
      if (gist.ok) {
        const g = await gist.json();
        body += `\n\n## Screenshot gist\n${g.html_url}\n_(data URL text — open locally to preview)_\n`;
      }
    } catch (e) {
      console.warn("gist upload failed", e.message);
    }
  }

  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "stewardship-life"
    },
    body: JSON.stringify({
      title,
      body,
      labels: GITHUB_FEEDBACK_LABELS
    })
  });

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`GitHub issue failed ${r.status}: ${errText.slice(0, 400)}`);
  }
  return r.json();
}

app.post("/api/feedback", async (req, res) => {
  if (!GITHUB_TOKEN) {
    return res.status(503).json({
      error: "GITHUB_TOKEN not configured — feedback saved only on the tester’s device"
    });
  }

  try {
    const payload = {
      version: req.body?.version || "unknown",
      mode: req.body?.mode || null,
      name: String(req.body?.name || "anonymous").slice(0, 80),
      role: String(req.body?.role || "").slice(0, 80),
      text: String(req.body?.text || "").slice(0, 8000),
      state: req.body?.state || null,
      screenshotDataUrl: req.body?.screenshotDataUrl
        ? String(req.body.screenshotDataUrl).slice(0, 5_000_000)
        : null,
      capturedAt: req.body?.capturedAt || null,
      receivedAt: new Date().toISOString(),
      userAgent: req.headers["user-agent"] || ""
    };

    const issue = await createGitHubIssue(payload);
    res.json({
      ok: true,
      id: String(issue.number),
      url: issue.html_url
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "could not create GitHub issue" });
  }
});

app.listen(PORT, () => {
  console.log(
    `Stewardship Life on :${PORT} · coach=${Boolean(LLM_KEY)} (${LLM_MODEL}) · issues=${Boolean(GITHUB_TOKEN)} → ${GITHUB_REPO}`
  );
});
