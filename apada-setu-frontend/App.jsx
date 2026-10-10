import { useState, useMemo, useRef, useEffect } from "react";
import {
  Siren, Send, Sparkles, ShieldCheck, GraduationCap, Handshake,
  AlertTriangle, MapPin, Copy, ChevronRight, Activity, Building2,
  Landmark, Users, CheckCircle2, Waves, Flame, Mountain, Wind, HeartPulse, Wrench,
  LogOut, Check, X, HandCoins, Settings, Trash2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { CATEGORIES, UNIVERSITIES, STAGES, classify, fetchChallenges, submitChallenge } from "./api.js";
 
const ICONS = { Flood: Waves, Earthquake: Activity, Landslide: Mountain, Cyclone: Wind, Fire: Flame, Health: HeartPulse, Infra: Wrench };
const CHART_COLORS = ["#0B7A75", "#D4A017", "#B23A34", "#16213E", "#4A7C7E", "#8B6F47", "#5B7C99"];
 
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
 
const LOCATION_COORDS = {
  "patna, bihar": [25.5941, 85.1376],
  "shimla, hp": [31.1048, 77.1734],
  "ranchi, jharkhand": [23.3441, 85.3096],
  "mumbai, maharashtra": [19.076, 72.8777],
  "delhi": [28.6139, 77.209],
  "chennai, tamil nadu": [13.0827, 80.2707],
  "kolkata, west bengal": [22.5726, 88.3639],
  "pune, maharashtra": [18.5204, 73.8567],
  "guwahati, assam": [26.1445, 91.7362],
  "bhubaneswar, odisha": [20.2961, 85.8245],
};
 
function coordsFor(location) {
  const key = (location || "").toLowerCase().trim();
  if (LOCATION_COORDS[key]) return LOCATION_COORDS[key];
  const hash = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [22 + ((hash % 10) - 5) * 0.8, 80 + ((hash % 14) - 7) * 0.8];
}
 
const ROLES = [
  { key: "citizen", label: "Citizen", icon: Users, desc: "Report challenges in your area" },
  { key: "government", label: "Government", icon: Landmark, desc: "Validate & monitor challenges" },
  { key: "university", label: "University", icon: GraduationCap, desc: "Review matched research problems" },
  { key: "industry", label: "Industry", icon: Handshake, desc: "Fund & mentor solutions" },
  { key: "admin", label: "Admin", icon: Settings, desc: "Full platform oversight" },
];
 
function PriorityPill({ p }) {
  const map = {
    High: "bg-[#B23A34]/10 text-[#B23A34] border-[#B23A34]/30",
    Medium: "bg-[#D4A017]/10 text-[#9c7a10] border-[#D4A017]/40",
    Low: "bg-[#0B7A75]/10 text-[#0B7A75] border-[#0B7A75]/30",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono tracking-wide border ${map[p]}`}>{p.toUpperCase()}</span>;
}
 
function Bridge({ activeStage }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <div className="flex items-center min-w-[640px] px-2">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                  i <= activeStage
                    ? "bg-[#0B7A75] border-[#0B7A75] text-[#F6F3EC] scale-105"
                    : "bg-transparent border-[#16213E]/20 text-[#16213E]/30"
                }`}
              >
                {i < activeStage ? <CheckCircle2 size={16} /> : <span className="text-xs font-mono">{i + 1}</span>}
              </div>
              <span className={`text-[10px] font-mono text-center w-20 leading-tight ${i <= activeStage ? "text-[#16213E]" : "text-[#16213E]/35"}`}>
                {s}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="flex-1 h-[2px] mx-1 relative -translate-y-3 overflow-hidden">
                <div className="absolute inset-0 bg-[#16213E]/10" />
                <div
                  className="absolute inset-y-0 left-0 bg-[#0B7A75] transition-all duration-700"
                  style={{ width: i < activeStage ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
 
function AnalyticsCharts({ challenges }) {
  const categoryData = useMemo(() => {
    const counts = {};
    challenges.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return Object.entries(counts).map(([category, count]) => ({ category, count }));
  }, [challenges]);
 
  const statusData = useMemo(() => {
    const labels = ["Submitted", "AI Classified", "Govt. Validated", "University Matched", "In Progress", "Resolved"];
    const counts = {};
    challenges.forEach((c) => {
      const label = labels[c.status] || "Submitted";
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [challenges]);
 
  if (challenges.length === 0) return null;
 
  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-6">
      <div className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40">
        <h3 className="font-mono text-[11px] text-[#16213E]/50 tracking-wide mb-3">CHALLENGES BY CATEGORY</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#16213E10" />
            <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#16213E99" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#16213E99" }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #16213E20" }} />
            <Bar dataKey="count" fill="#0B7A75" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
 
      <div className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40">
        <h3 className="font-mono text-[11px] text-[#16213E]/50 tracking-wide mb-3">STATUS DISTRIBUTION</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 10 }}>
              {statusData.map((entry, i) => (
                <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #16213E20" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
 
function ChallengeMap({ challenges }) {
  if (challenges.length === 0) return null;
 
  return (
    <div className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40 mb-6">
      <h3 className="font-mono text-[11px] text-[#16213E]/50 tracking-wide mb-3">CHALLENGE LOCATIONS</h3>
      <div className="rounded-lg overflow-hidden" style={{ height: 320 }}>
        <MapContainer center={[22.5, 80]} zoom={4.5} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {challenges.map((c) => (
            <Marker key={c.id} position={coordsFor(c.location)}>
              <Popup>
                <div style={{ fontSize: 12, maxWidth: 180 }}>
                  <b>{c.id}</b> — {c.priority} priority
                  <br />
                  {c.title}
                  <br />
                  <i>{c.location}</i>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
 
function ChallengeCard({ c, catMeta, iconFor, children }) {
  const meta = catMeta(c.category);
  const Icon = iconFor(c.category);
  return (
    <div className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40 hover:bg-white/70 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[#16213E]/5 flex items-center justify-center shrink-0 mt-0.5">
            <Icon size={14} className="text-[#0B7A75]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-[#16213E]/45">{c.id}</span>
              <PriorityPill p={c.priority} />
              {c.duplicate && (
                <span className="text-[10px] font-mono text-[#B23A34]/80 flex items-center gap-1">
                  <Copy size={10} /> possible duplicate
                </span>
              )}
            </div>
            <p className="text-[13.5px] mt-1 leading-snug">{c.title}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#16213E]/50">
              <span className="flex items-center gap-1"><MapPin size={10} /> {c.location}</span>
              <span>{meta.label}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 pl-11">
        <Bridge activeStage={c.status} />
      </div>
      {c.status >= 3 && (
        <div className="mt-2 pl-11 flex items-center gap-2 text-[11.5px] text-[#16213E]/60">
          <Building2 size={11} />
          Matched: {UNIVERSITIES[c.category][0].name}
          <span className="text-[#16213E]/35">·</span>
          <span className="italic">{UNIVERSITIES[c.category][0].tag}</span>
        </div>
      )}
      {children && <div className="mt-3 pl-11">{children}</div>}
    </div>
  );
}
 
function GovStrip() {
  return (
    <div className="text-[10.5px] font-mono">
      <div className="h-1 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
      <div className="bg-[#16213E] text-[#F6F3EC]/80">
        <div className="max-w-6xl mx-auto px-5 py-1.5 flex items-center justify-between">
          <span>भारत सरकार &nbsp;|&nbsp; Government of India</span>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">Ministry of Disaster Management (Prototype)</span>
            <button className="hover:text-white transition-colors">EN / हिं</button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
/* ---------------- LOGIN SCREEN ---------------- */
 
function LoginScreen({ onLogin }) {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
 
  function handleSubmit(e) {
    e.preventDefault();
    if (!role || !name.trim()) return;
    onLogin({ role, name: name.trim() });
  }
 
  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#16213E] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <GovStrip />
      <div className="flex-1 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-md bg-[#16213E] flex items-center justify-center">
            <Siren size={20} className="text-[#F6F3EC]" />
          </div>
          <div>
            <div className="font-display font-semibold text-[20px] leading-none">Apada Setu</div>
            <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">SIH 26043 · TEAM KARGIL</div>
          </div>
        </div>
 
        <form onSubmit={handleSubmit} className="border border-[#16213E]/12 rounded-xl p-6 bg-white/50">
          <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">SIGN IN AS</label>
          <div className="grid grid-cols-2 gap-2.5 mt-2 mb-5">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  role === r.key
                    ? "border-[#0B7A75] bg-[#0B7A75]/10"
                    : "border-[#16213E]/12 bg-white hover:bg-[#16213E]/5"
                }`}
              >
                <r.icon size={16} className={role === r.key ? "text-[#0B7A75]" : "text-[#16213E]/50"} />
                <div className="text-[13px] font-medium mt-1.5">{r.label}</div>
                <div className="text-[10.5px] text-[#16213E]/50 leading-tight mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>
 
          <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">YOUR NAME</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rohan Sharma"
            className="w-full mt-1 mb-5 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
          />
 
          <button
            type="submit"
            disabled={!role || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[#16213E] text-[#F6F3EC] rounded-lg py-2.5 text-[13.5px] font-medium hover:bg-[#0B7A75] transition-colors disabled:opacity-40"
          >
            Sign in
          </button>
        </form>
 
        <p className="text-center text-[11px] text-[#16213E]/40 mt-4 font-mono">
          Prototype login · no password required
        </p>
      </div>
      </div>
    </div>
  );
}
 
/* ---------------- ROLE DASHBOARDS ---------------- */
 
function CitizenView({ challenges, catMeta, iconFor, form, setForm, handleSubmit, processing }) {
  return (
    <section className="max-w-6xl mx-auto px-5 py-8 grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-2">
        <div className="border border-[#16213E]/12 rounded-xl p-5 bg-white/50">
          <div className="flex items-center gap-2 mb-4">
            <Users size={15} className="text-[#16213E]/60" />
            <h2 className="font-display font-semibold text-[15px]">Report a challenge</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">DESCRIPTION</label>
              <textarea
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Flash flood near riverside colony, water entering homes, immediate help needed"
                rows={4}
                className="w-full mt-1 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40 resize-none"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">LOCATION</label>
              <div className="flex items-center mt-1 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5">
                <MapPin size={13} className="text-[#16213E]/40 mr-2" />
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="District, State"
                  className="w-full text-[13.5px] focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!form.title.trim() || !!processing}
              className="w-full flex items-center justify-center gap-2 bg-[#16213E] text-[#F6F3EC] rounded-lg py-2.5 text-[13.5px] font-medium hover:bg-[#0B7A75] transition-colors disabled:opacity-40"
            >
              <Send size={14} /> Submit challenge
            </button>
          </form>
 
          {processing && (
            <div className="mt-5 border border-[#0B7A75]/30 bg-[#0B7A75]/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-[#0B7A75] animate-pulse" />
                <span className="font-mono text-[11px] text-[#0B7A75]">AI ENGINE PROCESSING</span>
              </div>
              <Bridge activeStage={processing.stage} />
              <div className="mt-3 space-y-1.5 text-[12.5px]">
                {processing.stage >= 1 && (
                  <div className="flex items-center gap-2 text-[#16213E]/75">
                    <ChevronRight size={12} /> Classified as <b>{catMeta(processing.cls.category).label}</b>, priority <PriorityPill p={processing.cls.priority} />
                  </div>
                )}
                {processing.stage >= 2 && (
                  <div className="flex items-center gap-2 text-[#16213E]/75">
                    <Copy size={12} /> Duplicate check complete
                  </div>
                )}
                {processing.stage >= 3 && (
                  <div className="flex items-center gap-2 text-[#16213E]/75">
                    <ShieldCheck size={12} /> Validated for institutional routing
                  </div>
                )}
                {processing.stage >= 4 && (
                  <div className="flex items-center gap-2 text-[#16213E]/75">
                    <GraduationCap size={12} /> Matched to {UNIVERSITIES[processing.cls.category][0].name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
 
      <div className="lg:col-span-3">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} className="text-[#16213E]/60" />
          <h2 className="font-display font-semibold text-[15px]">Recently reported challenges</h2>
        </div>
        <div className="space-y-3">
          {challenges.slice(0, 6).map((c) => (
            <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} />
          ))}
          {challenges.length === 0 && (
            <div className="text-[13px] text-[#16213E]/50 font-mono">No challenges reported yet — be the first!</div>
          )}
        </div>
      </div>
    </section>
  );
}
 
function GovernmentView({ challenges, stats, catMeta, iconFor, onApprove, onReject }) {
  return (
    <section className="max-w-6xl mx-auto px-5 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Challenges logged", val: stats.total, icon: Activity },
          { label: "University-matched", val: stats.matched, icon: GraduationCap },
          { label: "High priority", val: stats.high, icon: AlertTriangle },
          { label: "Resolved", val: stats.resolved, icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="border border-[#16213E]/10 rounded-lg p-3.5 bg-white/40">
            <s.icon size={15} className="text-[#0B7A75] mb-2" />
            <div className="font-display text-2xl font-semibold">{s.val}</div>
            <div className="font-mono text-[10px] text-[#16213E]/50 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
 
      <div className="flex items-center gap-2 mb-4">
        <Landmark size={15} className="text-[#16213E]/60" />
        <h2 className="font-display font-semibold text-[15px]">Government analytics dashboard</h2>
      </div>
 
      <AnalyticsCharts challenges={challenges} />
      <ChallengeMap challenges={challenges} />
 
      <div className="space-y-3">
        {challenges.map((c) => (
          <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor}>
            {c.status < 3 ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(c.id)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#0B7A75]/10 text-[#0B7A75] hover:bg-[#0B7A75]/20 transition-colors"
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  onClick={() => onReject(c.id)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#B23A34]/10 text-[#B23A34] hover:bg-[#B23A34]/20 transition-colors"
                >
                  <X size={12} /> Reject
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Validated</span>
            )}
          </ChallengeCard>
        ))}
      </div>
    </section>
  );
}
 
function UniversityView({ challenges, catMeta, iconFor, universityUser, setUniversityCategory, onAccept, onDecline }) {
  const category = universityUser.category || CATEGORIES[0].key;
  const matched = challenges.filter((c) => c.category === category && c.status >= 3);
 
  return (
    <section className="max-w-6xl mx-auto px-5 py-8">
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap size={15} className="text-[#16213E]/60" />
        <h2 className="font-display font-semibold text-[15px]">Matched research challenges</h2>
      </div>
      <p className="text-[12.5px] text-[#16213E]/55 mb-4">Viewing challenges routed to your department's expertise area:</p>
 
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setUniversityCategory(c.key)}
            className={`text-[12px] font-mono px-3 py-1.5 rounded-full border transition-colors ${
              category === c.key
                ? "bg-[#16213E] text-[#F6F3EC] border-[#16213E]"
                : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
 
      <div className="space-y-3">
        {matched.map((c) => (
          <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor}>
            {c.status === 3 ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onAccept(c.id)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#0B7A75]/10 text-[#0B7A75] hover:bg-[#0B7A75]/20 transition-colors"
                >
                  <Check size={12} /> Accept project
                </button>
                <button
                  onClick={() => onDecline(c.id)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#B23A34]/10 text-[#B23A34] hover:bg-[#B23A34]/20 transition-colors"
                >
                  <X size={12} /> Decline
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ In progress</span>
            )}
          </ChallengeCard>
        ))}
        {matched.length === 0 && (
          <div className="text-[13px] text-[#16213E]/50 font-mono">No matched challenges in this category yet.</div>
        )}
      </div>
    </section>
  );
}
 
function IndustryView({ challenges, catMeta, iconFor, onOfferSupport, offeredIds }) {
  const opportunities = challenges.filter((c) => c.status >= 3);
 
  return (
    <section className="max-w-6xl mx-auto px-5 py-8">
      <div className="flex items-center gap-2 mb-2">
        <Handshake size={15} className="text-[#16213E]/60" />
        <h2 className="font-display font-semibold text-[15px]">Partnership opportunities</h2>
      </div>
      <p className="text-[12.5px] text-[#16213E]/55 mb-6">University-matched projects open for funding, mentorship, or CSR support.</p>
 
      <div className="space-y-3">
        {opportunities.map((c) => (
          <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor}>
            {offeredIds.includes(c.id) ? (
              <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Support offered</span>
            ) : (
              <button
                onClick={() => onOfferSupport(c.id)}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#D4A017]/10 text-[#9c7a10] hover:bg-[#D4A017]/20 transition-colors"
              >
                <HandCoins size={12} /> Offer support
              </button>
            )}
          </ChallengeCard>
        ))}
        {opportunities.length === 0 && (
          <div className="text-[13px] text-[#16213E]/50 font-mono">No matched projects available yet.</div>
        )}
      </div>
    </section>
  );
}
 
function AdminView({ challenges, stats, catMeta, iconFor, onSetStatus, onDelete }) {
  return (
    <section className="max-w-6xl mx-auto px-5 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        {[
          { label: "Challenges logged", val: stats.total, icon: Activity },
          { label: "University-matched", val: stats.matched, icon: GraduationCap },
          { label: "High priority", val: stats.high, icon: AlertTriangle },
          { label: "Resolved", val: stats.resolved, icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="border border-[#16213E]/10 rounded-lg p-3.5 bg-white/40">
            <s.icon size={15} className="text-[#0B7A75] mb-2" />
            <div className="font-display text-2xl font-semibold">{s.val}</div>
            <div className="font-mono text-[10px] text-[#16213E]/50 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
 
      <div className="flex items-center gap-2 mb-4">
        <Settings size={15} className="text-[#16213E]/60" />
        <h2 className="font-display font-semibold text-[15px]">Admin — full platform oversight</h2>
      </div>
 
      <AnalyticsCharts challenges={challenges} />
      <ChallengeMap challenges={challenges} />
 
      <div className="space-y-3">
        {challenges.map((c) => (
          <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor}>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={c.status}
                onChange={(e) => onSetStatus(c.id, Number(e.target.value))}
                className="text-[12px] font-mono border border-[#16213E]/15 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
              >
                {STAGES.map((s, i) => (
                  <option key={s} value={i}>{i}. {s}</option>
                ))}
              </select>
              <button
                onClick={() => onDelete(c.id)}
                className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#B23A34]/10 text-[#B23A34] hover:bg-[#B23A34]/20 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </ChallengeCard>
        ))}
        {challenges.length === 0 && (
          <div className="text-[13px] text-[#16213E]/50 font-mono">No challenges in the system yet.</div>
        )}
      </div>
    </section>
  );
}
 
/* ---------------- MAIN APP ---------------- */
 
export default function App() {
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", location: "" });
  const [processing, setProcessing] = useState(null);
  const [universityCategory, setUniversityCategory] = useState(CATEGORIES[0].key);
  const [offeredIds, setOfferedIds] = useState([]);
  const timerRef = useRef(null);
 
  useEffect(() => {
    fetchChallenges().then((data) => {
      setChallenges(data);
      setLoading(false);
    });
    return () => clearTimeout(timerRef.current);
  }, []);
 
  const stats = useMemo(() => {
    const total = challenges.length;
    const resolved = challenges.filter((c) => c.status === 5).length;
    const high = challenges.filter((c) => c.priority === "High").length;
    const matched = challenges.filter((c) => c.status >= 3).length;
    return { total, resolved, high, matched };
  }, [challenges]);
 
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || processing) return;
 
    const title = form.title;
    const location = form.location;
    const cls = classify(title);
 
    setProcessing({ title, location, stage: 0, cls, dupe: null });
    setForm({ title: "", location: "" });
 
    let stage = 0;
    const tick = () => {
      stage += 1;
      setProcessing((p) => (p ? { ...p, stage } : p));
      if (stage < 4) {
        timerRef.current = setTimeout(tick, 850);
      } else {
        timerRef.current = setTimeout(async () => {
          const result = await submitChallenge({ title, location });
          const entry = result.entry || result;
          setChallenges((prev) => [entry, ...prev]);
          setProcessing(null);
        }, 700);
      }
    };
    timerRef.current = setTimeout(tick, 700);
  }
 
  function updateLocalStatus(id, status) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }
 
  function deleteLocalChallenge(id) {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  }
 
  const catMeta = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[6];
  const iconFor = (key) => ICONS[key] || Wrench;
 
  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }
 
  const roleMeta = ROLES.find((r) => r.key === user.role);
 
  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#16213E]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <GovStrip />
 
      {/* Header */}
      <header className="border-b border-[#16213E]/10 sticky top-0 bg-[#F6F3EC]/90 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#16213E] flex items-center justify-center">
              <Siren size={16} className="text-[#F6F3EC]" />
            </div>
            <div>
              <div className="font-display font-semibold text-[17px] leading-none">Apada Setu</div>
              <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">SIH 26043 · TEAM KARGIL</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[12.5px] font-medium leading-none">{user.name}</div>
              <div className="font-mono text-[10px] text-[#0B7A75] mt-0.5">{roleMeta.label.toUpperCase()}</div>
            </div>
            <button
              onClick={() => setUser(null)}
              className="w-8 h-8 rounded-md border border-[#16213E]/15 flex items-center justify-center hover:bg-[#16213E]/5 transition-colors"
              title="Log out"
            >
              <LogOut size={14} className="text-[#16213E]/60" />
            </button>
          </div>
        </div>
      </header>
 
      {/* Hero — shown for all roles */}
      <section className="max-w-6xl mx-auto px-5 pt-10 pb-2">
        <div className="max-w-2xl">
          <span className="font-mono text-[11px] text-[#0B7A75] tracking-widest">आपदा सेतु — THE DISASTER BRIDGE</span>
          <h1 className="font-display text-[30px] sm:text-[36px] leading-[1.1] mt-2 font-semibold">
            Welcome back, <span className="text-[#0B7A75]">{user.name}</span>.
          </h1>
          <p className="text-[#16213E]/65 mt-3 text-[15px] leading-relaxed">{roleMeta.desc}.</p>
        </div>
      </section>
 
      {/* Role-based view */}
      {user.role === "citizen" && (
        <CitizenView
          challenges={challenges}
          catMeta={catMeta}
          iconFor={iconFor}
          form={form}
          setForm={setForm}
          handleSubmit={handleSubmit}
          processing={processing}
        />
      )}
 
      {user.role === "government" && (
        <GovernmentView
          challenges={challenges}
          stats={stats}
          catMeta={catMeta}
          iconFor={iconFor}
          onApprove={(id) => updateLocalStatus(id, 3)}
          onReject={(id) => updateLocalStatus(id, 1)}
        />
      )}
 
      {user.role === "university" && (
        <UniversityView
          challenges={challenges}
          catMeta={catMeta}
          iconFor={iconFor}
          universityUser={{ category: universityCategory }}
          setUniversityCategory={setUniversityCategory}
          onAccept={(id) => updateLocalStatus(id, 4)}
          onDecline={(id) => updateLocalStatus(id, 2)}
        />
      )}
 
      {user.role === "industry" && (
        <IndustryView
          challenges={challenges}
          catMeta={catMeta}
          iconFor={iconFor}
          onOfferSupport={(id) => setOfferedIds((prev) => [...prev, id])}
          offeredIds={offeredIds}
        />
      )}
 
      {user.role === "admin" && (
        <AdminView
          challenges={challenges}
          stats={stats}
          catMeta={catMeta}
          iconFor={iconFor}
          onSetStatus={updateLocalStatus}
          onDelete={deleteLocalChallenge}
        />
      )}
 
      <section className="max-w-6xl mx-auto px-5 pb-14">
        <div className="border-t border-[#16213E]/10 pt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[12px] font-mono text-[#16213E]/50">
          <span className="flex items-center gap-1.5"><GraduationCap size={13} /> HEI matching engine</span>
          <span className="flex items-center gap-1.5"><Handshake size={13} /> Industry / CSR partnership hub</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Govt. validation layer</span>
          <span className="ml-auto">Prototype build · Apada Setu · SIH 2026</span>
        </div>
      </section>
    </div>
  );
}
