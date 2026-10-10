import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import Challenge from "./models/Challenge.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const CATEGORIES = [
  { key: "Flood", keywords: ["flood", "water logging", "river", "overflow", "rain", "drain", "waterlog"] },
  { key: "Earthquake", keywords: ["earthquake", "tremor", "seismic", "quake", "structural collapse"] },
  { key: "Landslide", keywords: ["landslide", "slope", "hill", "debris", "mudslide", "rockfall"] },
  { key: "Cyclone", keywords: ["cyclone", "storm", "wind", "hurricane", "gale"] },
  { key: "Fire", keywords: ["fire", "blaze", "burn", "smoke", "explosion"] },
  { key: "Health", keywords: ["disease", "outbreak", "epidemic", "health", "medical", "injury", "casualties"] },
  { key: "Infra", keywords: ["bridge", "road", "building", "collapse", "infrastructure", "damage", "crack"] },
];

const URGENT_WORDS = ["urgent", "immediate", "casualties", "trapped", "collapsed", "critical", "emergency", "life", "death", "severe"];

function classify(text) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const c of CATEGORIES) {
    const score = c.keywords.filter((k) => t.includes(k)).length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  const urgent = URGENT_WORDS.some((w) => t.includes(w));
  const priority = urgent ? "High" : bestScore > 0 ? "Medium" : "Low";
  return { category: best ? best.key : "Infra", priority };
}

function similarity(a, b) {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  wa.forEach((w) => { if (wb.has(w)) overlap++; });
  return overlap / Math.min(wa.size, wb.size);
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/challenges", async (req, res) => {
  try {
    const challenges = await Challenge.find().sort({ createdAt: -1 });
    res.json(challenges.map((c) => ({ ...c.toObject(), id: c._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/challenges", async (req, res) => {
  try {
    const { title, location } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const existing = await Challenge.find();
    const dupe = existing.find((c) => similarity(c.title, title) > 0.45);
    const cls = classify(title);

    const entry = await Challenge.create({
      title,
      category: cls.category,
      priority: cls.priority,
      status: dupe ? 2 : 3,
      location: location || "Location pending",
      duplicate: !!dupe,
    });

    res.status(201).json({ entry: { ...entry.toObject(), id: entry._id }, cls, dupe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));