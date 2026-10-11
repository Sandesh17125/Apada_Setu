/* ---------------------------------------------------------
   API layer.
   Connects to your Express backend running on :4000.
   Falls back to local mock data if the backend is unreachable.
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
const CRITICAL_WORDS = ["casualties", "trapped", "death", "collapsed", "life-threatening", "dying"];

export const UNIVERSITIES = {
  Flood: [
    { name: "IIT Roorkee — Hydrology Dept.", tag: "River systems & flood modelling", score: 95 },
    { name: "NIT Patna — Civil Engg.", tag: "Urban drainage design", score: 88 },
    { name: "IIT Guwahati — Water Resources", tag: "Flood forecasting systems", score: 81 },
  ],
  Earthquake: [
    { name: "IIT Kanpur — Seismic Engg. Lab", tag: "Structural seismic retrofit", score: 96 },
    { name: "IIT Roorkee — Earthquake Engg.", tag: "National seismic research", score: 90 },
    { name: "NIT Srinagar — Civil Engg.", tag: "Himalayan seismic zoning", score: 79 },
  ],
  Landslide: [
    { name: "IIT Mandi — Geohazards Group", tag: "Himalayan slope stability", score: 94 },
    { name: "NIT Hamirpur — Civil Engg.", tag: "Terrain risk mapping", score: 85 },
    { name: "Wadia Institute of Himalayan Geology", tag: "Slope failure research", score: 80 },
  ],
  Cyclone: [
    { name: "IIT Madras — Ocean Engg.", tag: "Coastal storm modelling", score: 93 },
    { name: "Andhra University — Meteorology", tag: "Cyclone tracking", score: 87 },
    { name: "IIT Bhubaneswar — Civil Engg.", tag: "Coastal infrastructure resilience", score: 78 },
  ],
  Fire: [
    { name: "NFSC Nagpur", tag: "Fire safety systems", score: 92 },
    { name: "IIT Delhi — Safety Engg.", tag: "Industrial fire risk", score: 84 },
    { name: "IIT Bombay — Chemical Engg.", tag: "Combustion & fire dynamics", score: 76 },
  ],
  Health: [
    { name: "AIIMS Delhi — Community Medicine", tag: "Epidemic response", score: 97 },
    { name: "PGIMER Chandigarh", tag: "Disaster health logistics", score: 89 },
    { name: "NIMHANS Bengaluru", tag: "Post-disaster mental health", score: 77 },
  ],
  Infra: [
    { name: "IIT Bombay — Structural Engg.", tag: "Rapid damage assessment", score: 91 },
    { name: "NIT Surat — Civil Engg.", tag: "Infra resilience audits", score: 83 },
    { name: "IIT Delhi — Structural Engg.", tag: "Retrofit & rehabilitation", score: 75 },
  ],
};

export const STAGES = ["Submitted", "AI Classified", "Govt. Validated", "University Matched", "In Progress", "Resolved"];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
let seed = [
  { id: "APS-1042", title: "Severe waterlogging near Rajendra Nagar market, drainage blocked for 3 days", category: "Flood", priority: "High", status: 3, location: "Patna, Bihar", district: "Patna", state: "Bihar", severity: "High", expectedImpact: "~2,000 residents affected", duplicate: false },
  { id: "APS-1041", title: "Cracks widening on hillside road after monsoon, landslide risk to nearby homes", category: "Landslide", priority: "High", status: 4, location: "Shimla, HP", district: "Shimla", state: "Himachal Pradesh", severity: "High", expectedImpact: "40 homes at risk", duplicate: false },
  { id: "APS-1039", title: "Old community hall roof damaged, needs structural inspection before reuse as shelter", category: "Infra", priority: "Medium", status: 2, location: "Ranchi, Jharkhand", district: "Ranchi", state: "Jharkhand", severity: "Medium", expectedImpact: "Shelter capacity reduced", duplicate: false },
];
let nextIdCounter = 1043;

export function classify(text) {
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const c of CATEGORIES) {
    const score = c.keywords.filter((k) => t.includes(k)).length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  const isCritical = CRITICAL_WORDS.some((w) => t.includes(w));
  const isUrgent = URGENT_WORDS.some((w) => t.includes(w));
  const priority = isCritical ? "Critical" : isUrgent ? "High" : bestScore > 0 ? "Medium" : "Low";
  return { category: best ? best.key : "Infra", priority, matchedKeywords: bestScore };
}

export function generateInsights(text, cls) {
  const catLabel = (CATEGORIES.find((c) => c.key === cls.category) || {}).label || "Infrastructure";
  return {
    summary: `A ${cls.priority.toLowerCase()}-priority ${catLabel.toLowerCase()} issue has been reported, based on the description provided.`,
    rootCause: cls.category === "Flood"
      ? "Likely linked to inadequate drainage capacity and heavy seasonal rainfall."
      : cls.category === "Landslide"
      ? "Likely linked to slope destabilization following prolonged rainfall."
      : cls.category === "Earthquake"
      ? "Structural vulnerability exposed by recent seismic activity."
      : cls.category === "Health"
      ? "Possible outbreak vector requiring rapid epidemiological review."
      : "Likely linked to ageing infrastructure and deferred maintenance.",
    stakeholders: ["Local residents", "District administration", "Emergency response teams", "Nearby institutions"],
    suggestedExpertise: (UNIVERSITIES[cls.category] || []).map((u) => u.tag),
  };
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
    const res = await fetch(`${API_BASE}/api/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchChallenges() {
  if (await backendAvailable()) {
    const res = await fetch(`${API_BASE}/api/challenges`);
    return res.json();
  }
  return Promise.resolve([...seed]);
}

export async function submitChallenge({ title, location, district, state, severity, expectedImpact, coords, submittedBy, photoCount, videoCount, documentCount }) {
  if (await backendAvailable()) {
    const res = await fetch(`${API_BASE}/api/challenges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, location, district, state, severity, expectedImpact, coords, submittedBy, photoCount, videoCount, documentCount }),
    });
    return res.json();
  }

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
    district: district || "",
    state: state || "",
    severity: severity || cls.priority,
    expectedImpact: expectedImpact || "",
    coords: coords || null,
    submittedBy: submittedBy || "",
    photoCount: photoCount || 0,
    videoCount: videoCount || 0,
    documentCount: documentCount || 0,
    duplicate: !!dupe,
  };
  seed = [entry, ...seed];
  return Promise.resolve({ entry, cls, dupe });
}
