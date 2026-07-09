const ALLOWED_ORIGIN = process.env.PUBLIC_SITE_URL || "https://tripone-app.vercel.app";
const MAX_PROMPT_LENGTH = 12000;
const MAX_TOKENS = 1200;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin || ALLOWED_ORIGIN);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!String(req.headers["content-type"] || "").includes("application/json")) {
    return res.status(415).json({ error: "Content-Type must be application/json" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI service is not configured." });
  }

  try {
    const { prompt, max_tokens } = req.body || {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "No prompt provided" });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return res.status(413).json({ error: "Prompt is too long" });
    }

    const tokenLimit = Math.min(Math.max(Number(max_tokens) || 1000, 1), MAX_TOKENS);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: tokenLimit,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "AI service error"
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "AI request failed" });
  }
};
