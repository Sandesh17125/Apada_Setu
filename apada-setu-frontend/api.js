/* ---------------------------------------------------------
   API layer.
   Today (no backend running): everything works locally using
   the mock classifier + in-memory seed data below.
   Once your Express backend is up on :4000 with matching
   routes (POST /api/challenges, GET /api/challenges), this
   file will automatically use it instead — no component
   changes needed.
--------------------------------------------------------- */

export const CATEGORIES = [
  { key: "Flood", label: "Flood Management", keywords: ["flood", "water logging", "river", "overflow", "rain", "drain", "waterlog"] },
  { key: "Earthquake", label: "Earthquake Preparedness", keywords: ["earthquake", "tremor", "seismic", "quake", "structural collapse"] },
  { key: "Landslide", label: "Landslide", keywords: ["landslide", "slope", "hill", "debris", "mudslide", "rockfall"] },
  { key: "Cyclone", label: "Cyclone & Wind", keywords: ["cyclone", "storm", "wind", "hurricane", "gale"] },
  { key: "Fire", label: "Fire Safety", keywords: ["fire", "blaze", "burn", "smoke", "explosion"] },
  { key: "Health", label: "Public Health Emergency", keywords: ["disease", "outbreak", "epidemic", "health", "medical", "injury", "casualties"] },
  { key: "Infra", label: "Infrastructure", keywords: ["bridge", "road", "building", "collapse", "infrastructure", "damage", "crack"] },
];

const URGENT_WORDS = ["urgent", "immediate", "casualties", "trapped", "collapsed", "critical", "emergency", "life", "death", "severe"];

export const UNIVERSITIES = {
  Flood: [{ name: "IIT Roorkee — Hydrology Dept.", tag: "River systems & flood modelling" }, { name: "NIT Patna — Civil Engg.", tag: "Urban drainage design" }],
  Earthquake: [{ name: "IIT Kanpur — Seismic Engg. Lab", tag: "Structural seismic retrofit" }, { name: "IIT Roorkee — Earthquake Engg.", tag: "National seismic research" }],
  Landslide: [{ name: "IIT Mandi — Geohazards Group", tag: "Himalayan slope stability" }, { name: "NIT Hamirpur — Civil Engg.", tag: "Terrain risk mapping" }],
  Cyclone: [{ name: "IIT Madras — Ocean Engg.", tag: "Coastal storm modelling" }, { name: "Andhra University — Meteorology", tag: "Cyclone tracking" }],
  Fire: [{ name: "NFSC Nagpur", tag: "Fire safety systems" }, { name: "IIT Delhi — Safety Engg.", tag: "Industrial fire risk" }],
  Health: [{ name: "AIIMS Delhi — Community Medicine", tag: "Epidemic response" }, { name: "PGIMER Chandigarh", tag: "Disaster health logistics" }],
  Infra: [{ name: "IIT Bombay — Structural Engg.", tag: "Rapid damage assessment" }, { name: "NIT Surat — Civil Engg.", tag: "Infra resilience audits" }],
};

export const STAGES = ["Submitted", "AI Classified", "Govt. Validated", "University Matched", "In Progress", "Resolved"];

let seed = [
  { id: "APS-1042", title: "Severe waterlogging near Rajendra Nagar market, drainage blocked for 3 days", category: "Flood", priority: "High", status: 3, location: "Patna, Bihar", duplicate: false },
  { id: "APS-1041", title: "Cracks widening on hillside road after monsoon, landslide risk to nearby homes", category: "Landslide", priority: "High", status: 4, location: "Shimla, HP", duplicate: false },
  { id: "APS-1039", title: "Old community hall roof damaged, needs structural inspection before reuse as shelter", category: "Infra", priority: "Medium", status: 2, location: "Ranchi, Jharkhand", duplicate: false },
];
let nextIdCounter = 1043;

export function classify(text) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const c of CATEGORIES) {
    const score = c.keywords.filter((k) => t.includes(k)).length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  const urgent = URGENT_WORDS.some((w) => t.includes(w));
  const priority = urgent ? "High" : bestScore > 0 ? "Medium" : "Low";
  return { category: best ? best.key : "Infra", priority, matchedKeywords: bestScore };
}

function similarity(a, b) {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  wa.forEach((w) => { if (wb.has(w)) overlap++; });
  return overlap / Math.min(wa.size, wb.size);
}

async function backendAvailable() {
  try {
    const res = await fetch("/api/health", { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchChallenges() {
  if (await backendAvailable()) {
    const res = await fetch("/api/challenges");
    return res.json();
  }
  return Promise.resolve([...seed]);
}

export async function submitChallenge({ title, location }) {
  if (await backendAvailable()) {
    const res = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, location }),
    });
    return res.json();
  }

  // Local fallback: same logic the real backend will run
  const id = `APS-${nextIdCounter++}`;
  const dupe = seed.find((c) => similarity(c.title, title) > 0.45);
  const cls = classify(title);
  const entry = {
    id,
    title,
    category: cls.category,
    priority: cls.priority,
    status: dupe ? 2 : 3,
    location: location || "Location pending",
    duplicate: !!dupe,
  };
  seed = [entry, ...seed];
  return Promise.resolve({ entry, cls, dupe });
}
