const ALLOWED_ORIGIN = process.env.PUBLIC_SITE_URL || "https://tripone-app.vercel.app";
const CITY_PATTERN = /^[A-Za-zÀ-ž\s.'-]{2,80}$/;

function setCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin || ALLOWED_ORIGIN);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Weather service is not configured." });
  }

  const city = String(req.query.city || "").trim();
  if (!CITY_PATTERN.test(city)) {
    return res.status(400).json({ error: "Invalid city" });
  }

  try {
    const qs = new URLSearchParams({
      q: city,
      appid: apiKey,
      units: "metric",
      lang: "en"
    });

    const forecastQs = new URLSearchParams(qs);
    forecastQs.set("cnt", "40");

    const [currentRes, forecastRes] = await Promise.all([
      fetch("https://api.openweathermap.org/data/2.5/weather?" + qs.toString()),
      fetch("https://api.openweathermap.org/data/2.5/forecast?" + forecastQs.toString())
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      return res.status(502).json({ error: "Weather unavailable" });
    }

    return res.status(200).json({
      current: await currentRes.json(),
      forecast: await forecastRes.json()
    });
  } catch (error) {
    return res.status(500).json({ error: "Weather request failed" });
  }
};
