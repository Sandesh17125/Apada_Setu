import { useState, useMemo, useRef, useEffect } from "react";
import {
  Siren, Send, Sparkles, ShieldCheck, GraduationCap, Handshake,
  AlertTriangle, MapPin, Copy, ChevronRight, Activity, Building2,
  Landmark, Users, CheckCircle2, Waves, Flame, Mountain, Wind, HeartPulse, Wrench,
  LogOut, Check, X, HandCoins, Settings, Trash2, ArrowRight, ArrowLeft, Bell,
  LayoutDashboard, FileText, Brain, FolderKanban, BarChart3, FolderOpen, Menu,
  Image as ImageIcon, Video, Mail, Lock
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { CATEGORIES, UNIVERSITIES, STAGES, classify, generateInsights, fetchChallenges, submitChallenge } from "./api.js";
import { getSession, clearSession, signUp, signIn } from "./auth.js";

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

const PROJECT_STAGES = [
  "Research", "Problem Analysis", "Solution Design", "Prototype Development",
  "Testing", "Pilot Deployment", "Final Implementation",
];

const ROLES = [
  { key: "citizen", label: "Citizen", icon: Users, desc: "Report challenges in your area" },
  { key: "government", label: "Government", icon: Landmark, desc: "Validate & monitor challenges" },
  { key: "university", label: "University", icon: GraduationCap, desc: "Review matched research problems" },
  { key: "industry", label: "Industry", icon: Handshake, desc: "Fund & mentor solutions" },
  { key: "ngo", label: "NGO / CSR", icon: HeartPulse, desc: "Support community impact" },
  { key: "admin", label: "Admin", icon: Settings, desc: "Full platform oversight" },
];

const SIDEBAR_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "challenges", label: "Challenges", icon: FileText },
  { key: "ai", label: "AI Analysis", icon: Brain },
  { key: "matching", label: "University Matching", icon: GraduationCap },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "documents", label: "Documents", icon: FolderOpen },
];

const SEVERITY_LEVELS = ["Low", "Medium", "High", "Critical"];

const INDIA_STATES_DISTRICTS = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Korba", "Bastar"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Karnal", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Kangra", "Solan", "Kullu"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Nainital", "Rishikesh", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol"],
};

const INDIA_STATES = Object.keys(INDIA_STATES_DISTRICTS);

function PriorityPill({ p }) {
  const map = {
    Critical: "bg-[#7A1F1A]/10 text-[#7A1F1A] border-[#7A1F1A]/35",
    High: "bg-[#B23A34]/10 text-[#B23A34] border-[#B23A34]/30",
    Medium: "bg-[#D4A017]/10 text-[#9c7a10] border-[#D4A017]/40",
    Low: "bg-[#0B7A75]/10 text-[#0B7A75] border-[#0B7A75]/30",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono tracking-wide border ${map[p] || map.Low}`}>{(p || "Low").toUpperCase()}</span>;
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

function AIInsightsPanel({ insights }) {
  if (!insights) return null;
  return (
    <div className="border border-[#16213E]/12 rounded-lg p-4 bg-white/60 space-y-3">
      <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide flex items-center gap-1.5">
        <Brain size={12} className="text-[#0B7A75]" /> AI INSIGHTS
      </div>
      <div>
        <div className="text-[11px] font-mono text-[#16213E]/45 mb-0.5">SUMMARY</div>
        <p className="text-[12.5px] leading-snug">{insights.summary}</p>
      </div>
      <div>
        <div className="text-[11px] font-mono text-[#16213E]/45 mb-0.5">ROOT CAUSE</div>
        <p className="text-[12.5px] leading-snug">{insights.rootCause}</p>
      </div>
      <div>
        <div className="text-[11px] font-mono text-[#16213E]/45 mb-1">AFFECTED STAKEHOLDERS</div>
        <div className="flex flex-wrap gap-1.5">
          {insights.stakeholders.map((s) => (
            <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-[#16213E]/5 text-[#16213E]/70">{s}</span>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-mono text-[#16213E]/45 mb-1">RECOMMENDED EXPERTISE</div>
        <div className="flex flex-wrap gap-1.5">
          {insights.suggestedExpertise.map((s) => (
            <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-[#0B7A75]/10 text-[#0B7A75]">{s}</span>
          ))}
        </div>
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
    const labels = STAGES;
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

const FUNDING_ESTIMATES = { Critical: 1500000, High: 1000000, Medium: 500000, Low: 200000 };

function estimateFunding(priority) {
  return FUNDING_ESTIMATES[priority] || FUNDING_ESTIMATES.Medium;
}

function getFundingContributors(challenge, offeredSupport, supportPledges) {
  const contributors = [];
  const ngoAmount = Number((supportPledges || {})[challenge.id] || 0);
  if (ngoAmount > 0) contributors.push({ org: "NGO / CSR partner", type: "NGO", amount: ngoAmount, status: "Received" });
  const industryTypes = (offeredSupport || {})[challenge.id];
  if (industryTypes && industryTypes.includes("Funding")) {
    contributors.push({ org: "Industry partner", type: "Industry", amount: Math.round(estimateFunding(challenge.priority) * 0.3), status: "Received" });
  }
  return contributors;
}

function FinancialSummary({ challenge, offeredSupport, supportPledges }) {
  if (challenge.status < 2) return null;
  const required = estimateFunding(challenge.priority);
  const contributors = getFundingContributors(challenge, offeredSupport, supportPledges);
  const received = contributors.reduce((sum, c) => sum + c.amount, 0);
  const gap = Math.max(required - received, 0);
  const pct = Math.min((received / required) * 100, 100);

  return (
    <div className="border border-[#16213E]/10 rounded-lg p-3 bg-white/60">
      <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide mb-2 flex items-center gap-1.5">
        <HandCoins size={11} /> FINANCIAL SUMMARY
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <div>
          <div className="font-display text-[15px] font-semibold">₹{required.toLocaleString()}</div>
          <div className="text-[9.5px] font-mono text-[#16213E]/45">REQUIRED</div>
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold text-[#0B7A75]">₹{received.toLocaleString()}</div>
          <div className="text-[9.5px] font-mono text-[#16213E]/45">RECEIVED</div>
        </div>
        <div>
          <div className="font-display text-[15px] font-semibold text-[#B23A34]">₹{gap.toLocaleString()}</div>
          <div className="text-[9.5px] font-mono text-[#16213E]/45">GAP</div>
        </div>
      </div>
      <div className="w-full h-1.5 bg-[#16213E]/8 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-[#0B7A75] transition-all" style={{ width: `${pct}%` }} />
      </div>
      {contributors.length > 0 ? (
        <div className="space-y-1">
          {contributors.map((c, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] text-[#16213E]/65">
              <span>{c.org} <span className="text-[#16213E]/40">({c.type})</span></span>
              <span className="font-mono text-[#0B7A75]">₹{c.amount.toLocaleString()} · {c.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10.5px] font-mono text-[#16213E]/40">No contributions recorded yet.</div>
      )}
    </div>
  );
}

function AuditTrail({ log }) {
  if (!log || log.length === 0) {
    return <div className="text-[11px] font-mono text-[#16213E]/40">No activity recorded yet.</div>;
  }
  return (
    <div className="space-y-1.5">
      {log.map((entry, i) => (
        <div key={i} className="flex items-start gap-2.5 text-[11.5px]">
          <span className="font-mono text-[10px] text-[#16213E]/40 w-28 shrink-0">{entry.time}</span>
          <span className="text-[#16213E]/50 font-medium w-20 shrink-0 shrink-0">{entry.actor}</span>
          <span className="text-[#16213E]/75">{entry.action}</span>
        </div>
      ))}
    </div>
  );
}

function ChallengeCard({ c, catMeta, iconFor, children, offeredSupport, supportPledges }) {
  const meta = catMeta(c.category);
  const Icon = iconFor(c.category);
  const [showJourney, setShowJourney] = useState(false);
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
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#16213E]/50 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={10} /> {c.location}</span>
              <span>{meta.label}</span>
              {c.expectedImpact && <span className="italic">{c.expectedImpact}</span>}
              {(c.photoCount > 0 || c.videoCount > 0 || c.documentCount > 0) && (
                <span className="flex items-center gap-1.5">
                  {c.photoCount > 0 && <span className="flex items-center gap-0.5"><ImageIcon size={10} />{c.photoCount}</span>}
                  {c.videoCount > 0 && <span className="flex items-center gap-0.5"><Video size={10} />{c.videoCount}</span>}
                  {c.documentCount > 0 && <span className="flex items-center gap-0.5"><FileText size={10} />{c.documentCount}</span>}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 pl-11">
        <Bridge activeStage={c.status} />
      </div>
      {c.status >= 3 && (
        <div className="mt-2 pl-11 flex items-center gap-2 text-[11.5px] text-[#16213E]/60 flex-wrap">
          <Building2 size={11} />
          Matched: {(c.assignedUniversity || UNIVERSITIES[c.category][0]).name}
          <span className="text-[#16213E]/35">·</span>
          <span className="italic">{(c.assignedUniversity || UNIVERSITIES[c.category][0]).tag}</span>
          {(c.assignedUniversity || UNIVERSITIES[c.category][0]).score && (
            <span className="font-mono text-[10px] text-[#0B7A75] bg-[#0B7A75]/10 px-1.5 py-0.5 rounded-full">
              {(c.assignedUniversity || UNIVERSITIES[c.category][0]).score}% match
            </span>
          )}
        </div>
      )}
      {children && <div className="mt-3 pl-11">{children}</div>}
      {c.status >= 2 && (
        <div className="mt-3 pl-11">
          <button
            type="button"
            onClick={() => setShowJourney((s) => !s)}
            className="text-[11px] font-mono text-[#0B7A75]/80 hover:text-[#0B7A75] flex items-center gap-1"
          >
            <Activity size={11} /> {showJourney ? "Hide" : "View"} journey & funding {showJourney ? "▴" : "▾"}
          </button>
          {showJourney && (
            <div className="mt-2 space-y-3">
              <FinancialSummary challenge={c} offeredSupport={offeredSupport} supportPledges={supportPledges} />
              <div className="border border-[#16213E]/10 rounded-lg p-3 bg-white/60">
                <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide mb-2 flex items-center gap-1.5">
                  <Activity size={11} /> AUDIT TRAIL
                </div>
                <AuditTrail log={c.auditLog} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchingPanel({ category, onAssign }) {
  const candidates = UNIVERSITIES[category] || [];
  return (
    <div className="border border-[#0B7A75]/25 bg-[#0B7A75]/5 rounded-lg p-3 space-y-2">
      <div className="font-mono text-[10px] text-[#0B7A75] tracking-wide flex items-center gap-1.5">
        <Sparkles size={11} /> SMART UNIVERSITY MATCHING
      </div>
      {candidates.map((u) => (
        <div key={u.name} className="flex items-center gap-3 bg-white/60 rounded-lg px-3 py-2">
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium truncate">{u.name}</div>
            <div className="text-[10.5px] text-[#16213E]/50 italic truncate">{u.tag}</div>
            <div className="w-full h-1.5 bg-[#16213E]/10 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-[#0B7A75] rounded-full" style={{ width: `${u.score}%` }} />
            </div>
          </div>
          <span className="font-mono text-[11px] text-[#0B7A75] shrink-0">{u.score}%</span>
          <button
            onClick={() => onAssign(u)}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-[#16213E] text-[#F6F3EC] hover:bg-[#0B7A75] transition-colors"
          >
            Assign
          </button>
        </div>
      ))}
    </div>
  );
}

function ProjectKanban({ stage, onAdvance, onMarkResolved, canEdit }) {
  const isDone = stage >= PROJECT_STAGES.length - 1;
  return (
    <div className="border border-[#D4A017]/25 bg-[#D4A017]/5 rounded-lg p-3">
      <div className="font-mono text-[10px] text-[#9c7a10] tracking-wide flex items-center gap-1.5 mb-2.5">
        <Wrench size={11} /> PROJECT WORKSPACE
      </div>
      <div className="flex items-center overflow-x-auto pb-1 gap-1">
        {PROJECT_STAGES.map((s, i) => (
          <div key={s} className="flex items-center shrink-0">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium whitespace-nowrap ${
                i < stage
                  ? "bg-[#0B7A75]/15 text-[#0B7A75]"
                  : i === stage
                  ? "bg-[#D4A017] text-white"
                  : "bg-[#16213E]/5 text-[#16213E]/35"
              }`}
            >
              {i < stage ? <CheckCircle2 size={11} /> : <span>{i + 1}</span>}
              {s}
            </div>
            {i < PROJECT_STAGES.length - 1 && <ChevronRight size={12} className="text-[#16213E]/20 mx-0.5 shrink-0" />}
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="mt-2.5">
          {!isDone ? (
            <button
              onClick={onAdvance}
              className="text-[11.5px] font-medium px-3 py-1.5 rounded-lg bg-[#16213E] text-[#F6F3EC] hover:bg-[#0B7A75] transition-colors"
            >
              Advance to next stage
            </button>
          ) : (
            <button
              onClick={onMarkResolved}
              className="text-[11.5px] font-medium px-3 py-1.5 rounded-lg bg-[#0B7A75] text-white hover:bg-[#095f5b] transition-colors"
            >
              Mark project resolved
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AccessibilityBar() {
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * fontScale}px`;
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.style.filter = highContrast ? "contrast(1.3) saturate(0.6)" : "";
  }, [highContrast]);

  return (
    <div className="bg-[#0D1730] text-[#F6F3EC]/65 text-[10.5px] font-mono">
      <div className="max-w-6xl mx-auto px-5 py-1 flex items-center justify-between gap-4 flex-wrap">
        <a href="#main-content" className="hover:text-white transition-colors">Skip to Main Content</a>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[#F6F3EC]/35">Text Size:</span>
          <button onClick={() => setFontScale(0.92)} className="hover:text-white transition-colors" aria-label="Decrease text size">A-</button>
          <button onClick={() => setFontScale(1)} className="hover:text-white transition-colors" aria-label="Reset text size">A</button>
          <button onClick={() => setFontScale(1.15)} className="hover:text-white transition-colors" aria-label="Increase text size">A+</button>
          <span className="text-[#F6F3EC]/25">|</span>
          <button onClick={() => setHighContrast((h) => !h)} className="hover:text-white transition-colors">
            {highContrast ? "Standard Contrast" : "High Contrast"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GovStrip() {
  return (
    <div className="text-[10.5px] font-mono">
      <AccessibilityBar />
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

function OfficialFooter() {
  return (
    <footer className="mt-auto border-t border-[#16213E]/15 bg-[#F1EDE3]">
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="grid sm:grid-cols-4 gap-6 mb-6 text-[12px]">
          <div>
            <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-2">ABOUT</div>
            <div className="space-y-1.5 text-[#16213E]/65">
              <div>About the Platform</div>
              <div>Ministry of Disaster Management</div>
              <div>National Disaster Management Authority</div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-2">RESOURCES</div>
            <div className="space-y-1.5 text-[#16213E]/65">
              <div>Reporting Guidelines</div>
              <div>University Partnership</div>
              <div>Industry & CSR Collaboration</div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-2">POLICIES</div>
            <div className="space-y-1.5 text-[#16213E]/65">
              <div>Terms of Use</div>
              <div>Privacy Policy</div>
              <div>Right to Information (RTI)</div>
              <div>Accessibility Statement</div>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-2">CONTACT</div>
            <div className="space-y-1.5 text-[#16213E]/65">
              <div>Helpline: 1800-XXX-XXXX</div>
              <div>helpdesk@disastermgmt.gov.in</div>
              <div>Sitemap</div>
            </div>
          </div>
        </div>
        <div className="border-t border-[#16213E]/10 pt-4 flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono text-[#16213E]/45">
          <span>© 2026 Ministry of Disaster Management, Government of India. All rights reserved.</span>
          <span>Content owned and maintained by the Ministry · Last updated: 31 Aug 2026</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- SIDEBAR ---------------- */

function Sidebar({ active, onSelect, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-60 bg-white border-r border-[#16213E]/10 z-40 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-4 border-b border-[#16213E]/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#16213E] flex items-center justify-center">
            <Siren size={16} className="text-[#F6F3EC]" />
          </div>
          <div>
            <div className="font-display font-semibold text-[15px] leading-none">Apada Setu</div>
            <div className="font-mono text-[9.5px] text-[#16213E]/50 tracking-wide mt-0.5">GOVT. OF INDIA</div>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { onSelect(item.key); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                active === item.key
                  ? "bg-[#0B7A75]/10 text-[#0B7A75]"
                  : "text-[#16213E]/65 hover:bg-[#16213E]/5"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

/* ---------------- LANDING PAGE ---------------- */

const WORKFLOW_NODES = [
  { label: "Citizen Reports", icon: Users },
  { label: "AI Analysis", icon: Sparkles },
  { label: "Govt. Validation", icon: Landmark },
  { label: "University Matching", icon: GraduationCap },
  { label: "Industry Support", icon: Handshake },
  { label: "Implementation", icon: Wrench },
  { label: "Impact", icon: CheckCircle2 },
];

function NotificationBell({ notifications, unreadCount, onOpen }) {
  const [open, setOpen] = useState(false);
  function toggle() {
    setOpen((o) => !o);
    if (!open) onOpen();
  }
  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-md border border-[#16213E]/15 flex items-center justify-center hover:bg-[#16213E]/5 transition-colors relative"
        title="Notifications"
      >
        <Bell size={14} className="text-[#16213E]/60" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#B23A34] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-[#16213E]/12 rounded-xl shadow-lg z-40">
            <div className="px-4 py-3 border-b border-[#16213E]/10 font-mono text-[10.5px] text-[#16213E]/50 tracking-wide">
              NOTIFICATIONS
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12.5px] text-[#16213E]/40 font-mono">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="px-4 py-3 border-b border-[#16213E]/5 last:border-0 hover:bg-[#16213E]/5 transition-colors">
                  <p className="text-[12.5px] leading-snug">{n.message}</p>
                  <span className="text-[10px] font-mono text-[#16213E]/40 mt-1 block">{n.time}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#16213E] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <GovStrip />
      <header id="main-content" className="border-b border-[#16213E]/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#16213E] flex items-center justify-center">
              <Siren size={16} className="text-[#F6F3EC]" />
            </div>
            <div>
              <div className="font-display font-semibold text-[17px] leading-none">Apada Setu</div>
              <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">DISASTER MANAGEMENT PLATFORM</div>
            </div>
          </div>
          <button
            onClick={() => onGetStarted(null)}
            className="text-[12.5px] font-medium px-4 py-2 rounded-lg border border-[#16213E]/15 hover:bg-[#16213E]/5 transition-colors"
          >
            Login
          </button>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-5 pt-16 pb-10 text-center">
        <span className="font-mono text-[11px] text-[#0B7A75] tracking-widest">आपदा सेतु — THE DISASTER BRIDGE</span>
        <h1 className="font-display text-[36px] sm:text-[48px] leading-[1.08] mt-3 font-semibold">
          Transforming Real-World Challenges into <span className="text-[#0B7A75]">Innovative Solutions</span>
        </h1>
        <p className="text-[#16213E]/65 mt-4 text-[16px] leading-relaxed max-w-2xl mx-auto">
          An AI-powered platform that connects citizens, government, universities, and industries to identify,
          analyze, solve, and monitor disaster-management challenges — end to end.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button
            onClick={() => onGetStarted("citizen")}
            className="flex items-center gap-2 bg-[#16213E] text-[#F6F3EC] rounded-lg px-5 py-3 text-[14px] font-medium hover:bg-[#0B7A75] transition-colors"
          >
            Report a Challenge <ArrowRight size={15} />
          </button>
          <button
            onClick={() => onGetStarted("government")}
            className="flex items-center gap-2 bg-white border border-[#16213E]/15 rounded-lg px-5 py-3 text-[14px] font-medium hover:bg-[#16213E]/5 transition-colors"
          >
            Explore Challenges
          </button>
          <button
            onClick={() => onGetStarted("university")}
            className="flex items-center gap-2 bg-white border border-[#16213E]/15 rounded-lg px-5 py-3 text-[14px] font-medium hover:bg-[#16213E]/5 transition-colors"
          >
            Join as Institution
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-10 w-full">
        <div className="border border-[#16213E]/10 rounded-2xl p-6 sm:p-8 bg-white/50">
          <h2 className="font-display font-semibold text-[16px] mb-6 text-center">How Apada Setu works</h2>
          <div className="flex items-center overflow-x-auto pb-2">
            {WORKFLOW_NODES.map((node, i) => (
              <div key={node.label} className="flex items-center flex-1 last:flex-none min-w-[110px]">
                <div className="flex flex-col items-center gap-2 shrink-0 mx-auto">
                  <div className="w-11 h-11 rounded-full bg-[#0B7A75]/10 border border-[#0B7A75]/30 flex items-center justify-center">
                    <node.icon size={18} className="text-[#0B7A75]" />
                  </div>
                  <span className="text-[10.5px] font-mono text-center w-24 leading-tight text-[#16213E]/70">
                    {node.label}
                  </span>
                </div>
                {i < WORKFLOW_NODES.length - 1 && (
                  <div className="flex-1 h-[2px] bg-[#16213E]/10 -translate-y-4 min-w-[20px]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-10 w-full">
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "Citizens", desc: "Report challenges with location & details", icon: Users, color: "#0B7A75" },
            { label: "Government", desc: "Validate & prioritize challenges", icon: Landmark, color: "#16213E" },
            { label: "Universities", desc: "Research & develop solutions", icon: GraduationCap, color: "#D4A017" },
            { label: "Industry", desc: "Fund, mentor & deploy solutions", icon: Handshake, color: "#B23A34" },
          ].map((r) => (
            <div key={r.label} className="border border-[#16213E]/10 rounded-xl p-5 bg-white/40">
              <r.icon size={20} style={{ color: r.color }} />
              <div className="font-display font-semibold text-[14px] mt-3">{r.label}</div>
              <div className="text-[12px] text-[#16213E]/55 mt-1 leading-snug">{r.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <OfficialFooter />
    </div>
  );
}

/* ---------------- LOGIN SCREEN ---------------- */

function AuthScreen({ onAuthed, preselectedRole, onBack }) {
  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState(preselectedRole || null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!role) return setError("Please select a role.");
      if (!name.trim()) return setError("Please enter your name.");
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email address.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
      if (password !== confirmPassword) return setError("Passwords do not match.");

      const result = signUp({ name, email, password, role });
      if (result.error) return setError(result.error);
      onAuthed(result.user);
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Please enter a valid email address.");
      if (!password) return setError("Please enter your password.");

      const result = signIn({ email, password });
      if (result.error) return setError(result.error);
      onAuthed(result.user);
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#16213E] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <GovStrip />
      <div id="main-content" className="flex-1 flex items-center justify-center px-5 relative py-10">
        <button
          onClick={onBack}
          className="absolute top-5 left-5 flex items-center gap-1.5 text-[12.5px] font-medium text-[#16213E]/60 hover:text-[#16213E] transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 justify-center mb-6">
            <div className="w-10 h-10 rounded-md bg-[#16213E] flex items-center justify-center">
              <Siren size={20} className="text-[#F6F3EC]" />
            </div>
            <div>
              <div className="font-display font-semibold text-[20px] leading-none">Apada Setu</div>
              <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">DISASTER MANAGEMENT PLATFORM</div>
            </div>
          </div>

          <div className="flex rounded-lg border border-[#16213E]/15 p-1 mb-5 bg-white/60">
            {[
              { key: "signin", label: "Sign In" },
              { key: "signup", label: "Sign Up" },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => { setMode(m.key); setError(""); }}
                className={`flex-1 text-[12.5px] font-medium py-2 rounded-md transition-colors ${
                  mode === m.key ? "bg-[#16213E] text-[#F6F3EC]" : "text-[#16213E]/55 hover:bg-[#16213E]/5"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="border border-[#16213E]/12 rounded-xl p-6 bg-white/50">
            {mode === "signup" && (
              <>
                <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">SIGN UP AS</label>
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

                <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">FULL NAME</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full mt-1 mb-4 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
                />
              </>
            )}

            <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">EMAIL</label>
            <div className="flex items-center mt-1 mb-4 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5">
              <Mail size={14} className="text-[#16213E]/40 mr-2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-[13.5px] focus:outline-none"
              />
            </div>

            <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">PASSWORD</label>
            <div className="flex items-center mt-1 mb-4 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5">
              <Lock size={14} className="text-[#16213E]/40 mr-2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                className="w-full text-[13.5px] focus:outline-none"
              />
            </div>

            {mode === "signup" && (
              <>
                <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">CONFIRM PASSWORD</label>
                <div className="flex items-center mt-1 mb-4 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5">
                  <Lock size={14} className="text-[#16213E]/40 mr-2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full text-[13.5px] focus:outline-none"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-[12px] text-[#B23A34] bg-[#B23A34]/8 border border-[#B23A34]/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#16213E] text-[#F6F3EC] rounded-lg py-2.5 text-[13.5px] font-medium hover:bg-[#0B7A75] transition-colors"
            >
              {mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-[11px] text-[#16213E]/40 mt-4 font-mono">
            Prototype auth · accounts stored locally in this browser only
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ROLE DASHBOARDS ---------------- */

function LocationPicker({ position, onPick }) {
  function ClickHandler() {
    useMapEvents({
      click(e) {
        onPick([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  }
  return (
    <div className="rounded-lg overflow-hidden border border-[#16213E]/15" style={{ height: 220 }}>
      <MapContainer center={position || [22.5, 80]} zoom={position ? 9 : 4.5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}

function FileUploadField({ label, icon: Icon, accept, files, onChange, hint }) {
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">{label.toUpperCase()}</label>
      <label
        htmlFor={inputId}
        className="mt-1 flex items-center gap-2.5 rounded-lg border border-dashed border-[#16213E]/25 bg-white px-3 py-2.5 text-[12.5px] text-[#16213E]/55 cursor-pointer hover:bg-[#16213E]/5 transition-colors"
      >
        <Icon size={15} className="text-[#16213E]/40 shrink-0" />
        <span className="truncate">
          {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : hint}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple
        onChange={(e) => onChange(Array.from(e.target.files || []))}
        className="hidden"
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {files.map((f, i) => (
            <span key={i} className="text-[10.5px] px-2 py-0.5 rounded-full bg-[#16213E]/5 text-[#16213E]/60 truncate max-w-[140px]">
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CitizenView({ challenges, catMeta, iconFor, form, setForm, handleSubmit, processing, insights, user, offeredSupport, supportPledges }) {
  const [tab, setTab] = useState("report");
  const myChallenges = challenges.filter((c) => c.submittedBy === user.name);
  const myActive = myChallenges.filter((c) => c.status < 5);
  const myResolved = myChallenges.filter((c) => c.status === 5);

  return (
    <section className="px-5 py-8">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("report")}
          className={`text-[12.5px] font-medium px-4 py-2 rounded-lg border transition-colors ${
            tab === "report" ? "bg-[#16213E] text-[#F6F3EC] border-[#16213E]" : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
          }`}
        >
          Report a challenge
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`text-[12.5px] font-medium px-4 py-2 rounded-lg border transition-colors relative ${
            tab === "mine" ? "bg-[#16213E] text-[#F6F3EC] border-[#16213E]" : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
          }`}
        >
          My challenges {myChallenges.length > 0 && `(${myChallenges.length})`}
        </button>
      </div>

      {tab === "report" && (
        <div className="grid lg:grid-cols-5 gap-6">
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
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">STATE</label>
                    <select
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value, district: "", location: e.target.value ? `${form.district || ""}${form.district ? ", " : ""}${e.target.value}` : "" })}
                      className="w-full mt-1 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">DISTRICT</label>
                    <select
                      value={form.district}
                      onChange={(e) => setForm({ ...form, district: e.target.value, location: `${e.target.value}, ${form.state}` })}
                      disabled={!form.state}
                      className="w-full mt-1 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">{form.state ? "Select district" : "Select a state first"}</option>
                      {(INDIA_STATES_DISTRICTS[form.state] || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">LOCATION</label>
                  <div className="flex items-center mt-1 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5">
                    <MapPin size={13} className="text-[#16213E]/40 mr-2" />
                    <input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="District, State (as shown on map)"
                      className="w-full text-[13.5px] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">PIN EXACT LOCATION ON MAP</label>
                  <div className="mt-1">
                    <LocationPicker position={form.coords} onPick={(coords) => setForm({ ...form, coords })} />
                  </div>
                  {form.coords && (
                    <p className="text-[10.5px] font-mono text-[#0B7A75] mt-1">
                      Pinned: {form.coords[0].toFixed(4)}, {form.coords[1].toFixed(4)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">SEVERITY LEVEL</label>
                  <div className="flex gap-1.5 mt-1">
                    {SEVERITY_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setForm({ ...form, severity: lvl })}
                        className={`flex-1 text-[11.5px] font-medium py-1.5 rounded-lg border transition-colors ${
                          form.severity === lvl
                            ? "bg-[#16213E] text-[#F6F3EC] border-[#16213E]"
                            : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">EXPECTED IMPACT</label>
                  <input
                    value={form.expectedImpact}
                    onChange={(e) => setForm({ ...form, expectedImpact: e.target.value })}
                    placeholder="e.g. ~500 residents affected"
                    className="w-full mt-1 rounded-lg border border-[#16213E]/15 bg-white px-3 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
                  />
                </div>

                <FileUploadField
                  label="Upload photos"
                  icon={ImageIcon}
                  accept="image/*"
                  files={form.photos}
                  onChange={(files) => setForm({ ...form, photos: files })}
                  hint="Tap to add photos of the site"
                />
                <FileUploadField
                  label="Upload videos"
                  icon={Video}
                  accept="video/*"
                  files={form.videos}
                  onChange={(files) => setForm({ ...form, videos: files })}
                  hint="Tap to add short video clips"
                />
                <FileUploadField
                  label="Upload documents"
                  icon={FileText}
                  accept=".pdf,.doc,.docx"
                  files={form.documents}
                  onChange={(files) => setForm({ ...form, documents: files })}
                  hint="Reports, official notices, etc."
                />

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
                  {insights && processing.stage >= 1 && (
                    <div className="mt-4">
                      <AIInsightsPanel insights={insights} />
                    </div>
                  )}
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
                <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges} />
              ))}
              {challenges.length === 0 && (
                <div className="text-[13px] text-[#16213E]/50 font-mono">No challenges reported yet — be the first!</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "mine" && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={15} className="text-[#16213E]/60" />
            <h2 className="font-display font-semibold text-[15px]">Tracking your reports</h2>
          </div>
          <p className="text-[12.5px] text-[#16213E]/55 mb-4">Live status of challenges you've submitted, from AI classification through resolution.</p>
          <div className="space-y-3 mb-8">
            {myActive.map((c) => (
              <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges} />
            ))}
            {myActive.length === 0 && (
              <div className="text-[13px] text-[#16213E]/50 font-mono">No active reports — submit one from the "Report a challenge" tab.</div>
            )}
          </div>

          {myResolved.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={15} className="text-[#16213E]/60" />
                <h2 className="font-display font-semibold text-[15px]">Resolved challenges</h2>
              </div>
              <div className="space-y-3">
                {myResolved.map((c) => (
                  <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function GovernmentView({ challenges, stats, catMeta, iconFor, onApprove, onReject, onAssign, onSetPriority, offeredSupport, supportPledges }) {
  const districtGroups = useMemo(() => {
    const map = {};
    challenges.forEach((c) => {
      const key = c.district || c.location || "Unspecified";
      if (!map[key]) map[key] = { total: 0, resolved: 0, high: 0 };
      map[key].total += 1;
      if (c.status === 5) map[key].resolved += 1;
      if (c.priority === "High" || c.priority === "Critical") map[key].high += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [challenges]);

  return (
    <section className="px-5 py-8">
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

      <div className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40 mb-6">
        <h3 className="font-mono text-[11px] text-[#16213E]/50 tracking-wide mb-3">DISTRICT-WISE MONITORING</h3>
        <div className="space-y-2">
          {districtGroups.map(([district, g]) => (
            <div key={district} className="flex items-center gap-3 text-[12.5px]">
              <span className="w-32 truncate font-medium">{district}</span>
              <div className="flex-1 h-2 bg-[#16213E]/8 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#0B7A75]" style={{ width: `${(g.resolved / g.total) * 100}%` }} />
                <div className="h-full bg-[#B23A34]/60" style={{ width: `${(g.high / g.total) * 100}%` }} />
              </div>
              <span className="font-mono text-[10.5px] text-[#16213E]/50 w-24 text-right">{g.total} total · {g.resolved} resolved</span>
            </div>
          ))}
          {districtGroups.length === 0 && <div className="text-[12.5px] text-[#16213E]/45 font-mono">No data yet.</div>}
        </div>
      </div>

      <div className="space-y-3">
        {challenges.map((c) => (
          <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-[#16213E]/45">SET PRIORITY:</span>
              <select
                value={c.priority}
                onChange={(e) => onSetPriority(c.id, e.target.value)}
                className="text-[11.5px] font-mono border border-[#16213E]/15 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
              >
                {["Critical", "High", "Medium", "Low"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {c.status < 2 && (
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
            )}
            {c.status === 2 && (
              <MatchingPanel category={c.category} onAssign={(u) => onAssign(c.id, u)} />
            )}
            {c.status === 3 && (
              <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Validated & matched — awaiting university acceptance</span>
            )}
            {c.status >= 4 && (
              <ProjectKanban stage={c.projectStage || 0} canEdit={false} />
            )}
          </ChallengeCard>
        ))}
      </div>
    </section>
  );
}

function UniversityView({ challenges, catMeta, iconFor, universityUser, setUniversityCategory, onAccept, onDecline, onAdvanceStage, onMarkResolved, onUpdateProjectInfo, offeredSupport, supportPledges }) {
  const category = universityUser.category || CATEGORIES[0].key;
  const matched = challenges.filter((c) => c.category === category && c.status >= 3);
  const [draftInfo, setDraftInfo] = useState({});

  function draft(id, field, value) {
    setDraftInfo((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  return (
    <section className="px-5 py-8">
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
        {matched.map((c) => {
          const d = draftInfo[c.id] || {};
          return (
            <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
              {c.status === 3 && (
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
              )}
              {c.status === 4 && (
                <div className="space-y-3">
                  <div className="border border-[#16213E]/10 rounded-lg p-3 bg-white/60 space-y-2">
                    <div className="font-mono text-[10px] text-[#16213E]/50 tracking-wide">TEAM & PROPOSAL</div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        defaultValue={c.teamName || ""}
                        placeholder="Student team name"
                        onBlur={(e) => onUpdateProjectInfo(c.id, { teamName: e.target.value })}
                        className="text-[12.5px] border border-[#16213E]/15 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
                      />
                      <input
                        defaultValue={c.facultyMentor || ""}
                        placeholder="Faculty mentor name"
                        onBlur={(e) => onUpdateProjectInfo(c.id, { facultyMentor: e.target.value })}
                        className="text-[12.5px] border border-[#16213E]/15 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
                      />
                    </div>
                    <textarea
                      defaultValue={c.proposal || ""}
                      placeholder="Short proposal / approach summary"
                      rows={2}
                      onBlur={(e) => onUpdateProjectInfo(c.id, { proposal: e.target.value })}
                      className="w-full text-[12.5px] border border-[#16213E]/15 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40 resize-none"
                    />
                    {(c.teamName || c.facultyMentor) && (
                      <div className="text-[11px] text-[#16213E]/55 font-mono">
                        {c.teamName && <>Team: <b>{c.teamName}</b></>} {c.facultyMentor && <>· Mentor: <b>{c.facultyMentor}</b></>}
                      </div>
                    )}
                  </div>
                  <ProjectKanban
                    stage={c.projectStage || 0}
                    canEdit={true}
                    onAdvance={() => onAdvanceStage(c.id)}
                    onMarkResolved={() => onMarkResolved(c.id)}
                  />
                </div>
              )}
              {c.status === 5 && (
                <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Project resolved</span>
              )}
            </ChallengeCard>
          );
        })}
        {matched.length === 0 && (
          <div className="text-[13px] text-[#16213E]/50 font-mono">No matched challenges in this category yet.</div>
        )}
      </div>
    </section>
  );
}

const SUPPORT_TYPES = ["Mentorship", "Funding", "Prototyping", "Pilot Testing", "Deployment"];

function IndustryView({ challenges, catMeta, iconFor, onOfferSupport, offeredSupport, supportPledges }) {
  const opportunities = challenges.filter((c) => c.status >= 3);
  const [selecting, setSelecting] = useState({});

  function toggleType(id, type) {
    setSelecting((prev) => {
      const current = prev[id] || [];
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      return { ...prev, [id]: next };
    });
  }

  return (
    <section className="px-5 py-8">
      <div className="flex items-center gap-2 mb-2">
        <Handshake size={15} className="text-[#16213E]/60" />
        <h2 className="font-display font-semibold text-[15px]">Partnership opportunities</h2>
      </div>
      <p className="text-[12.5px] text-[#16213E]/55 mb-6">University-matched projects open for funding, mentorship, or CSR support.</p>
      <div className="space-y-3">
        {opportunities.map((c) => {
          const offered = offeredSupport[c.id];
          const draft = selecting[c.id] || [];
          return (
            <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
              {offered ? (
                <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Offered: {offered.join(", ")}</span>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SUPPORT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(c.id, t)}
                        className={`text-[11.5px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                          draft.includes(t)
                            ? "bg-[#D4A017] text-white border-[#D4A017]"
                            : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onOfferSupport(c.id, draft.length ? draft : ["Mentorship"])}
                    className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#D4A017]/10 text-[#9c7a10] hover:bg-[#D4A017]/20 transition-colors"
                  >
                    <HandCoins size={12} /> Confirm support offer
                  </button>
                </div>
              )}
              {c.status >= 4 && (
                <div className="mt-2">
                  <ProjectKanban stage={c.projectStage || 0} canEdit={false} />
                </div>
              )}
            </ChallengeCard>
          );
        })}
        {opportunities.length === 0 && (
          <div className="text-[13px] text-[#16213E]/50 font-mono">No matched projects available yet.</div>
        )}
      </div>
    </section>
  );
}

function FundingByCategoryChart({ challenges, supportPledges }) {
  const data = useMemo(() => {
    const totals = {};
    Object.entries(supportPledges).forEach(([id, amount]) => {
      const c = challenges.find((x) => x.id === id);
      if (!c) return;
      totals[c.category] = (totals[c.category] || 0) + Number(amount || 0);
    });
    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [challenges, supportPledges]);

  if (data.length === 0) return null;

  return (
    <div className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40 mb-6">
      <h3 className="font-mono text-[11px] text-[#16213E]/50 tracking-wide mb-3">FUNDING PLEDGED BY CATEGORY</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={{ fontSize: 10 }}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `₹${v}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #16213E20" }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function NGOView({ challenges, catMeta, iconFor, onSupport, supportPledges, offeredSupport, onJoinProject, joinedIds }) {
  const [tab, setTab] = useState("opportunities");
  const needsSupport = challenges.filter((c) => c.status < 3);
  const inProgress = challenges.filter((c) => c.status >= 3 && c.status < 5);
  const resolved = challenges.filter((c) => c.status === 5);
  const districtsCovered = new Set(challenges.map((c) => c.location)).size;
  const estimatedBenefited = resolved.length * 480 + needsSupport.length * 60;
  const totalPledged = Object.values(supportPledges).reduce((sum, v) => sum + Number(v || 0), 0);
  const myProjects = challenges.filter((c) => joinedIds.includes(c.id));
  const myPledges = Object.entries(supportPledges).map(([id, amount]) => ({ challenge: challenges.find((c) => c.id === id), amount })).filter((p) => p.challenge);
  const [amountDraft, setAmountDraft] = useState({});

  return (
    <section className="px-5 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
        {[
          { label: "Awaiting support", val: needsSupport.length, icon: HeartPulse },
          { label: "Districts covered", val: districtsCovered, icon: MapPin },
          { label: "Stories resolved", val: resolved.length, icon: CheckCircle2 },
          { label: "Est. citizens benefited", val: estimatedBenefited.toLocaleString(), icon: Users },
          { label: "Total funds pledged", val: `₹${totalPledged.toLocaleString()}`, icon: HandCoins },
        ].map((s) => (
          <div key={s.label} className="border border-[#16213E]/10 rounded-lg p-3.5 bg-white/40">
            <s.icon size={15} className="text-[#0B7A75] mb-2" />
            <div className="font-display text-2xl font-semibold">{s.val}</div>
            <div className="font-mono text-[10px] text-[#16213E]/50 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "opportunities", label: "Opportunities" },
          { key: "participation", label: "My participation" },
          { key: "impact", label: "Community impact" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[12px] font-mono px-3 py-1.5 rounded-full border transition-colors ${
              tab === t.key ? "bg-[#16213E] text-[#F6F3EC] border-[#16213E]" : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "opportunities" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <HeartPulse size={15} className="text-[#16213E]/60" />
            <h2 className="font-display font-semibold text-[15px]">Community challenges needing support</h2>
          </div>
          <p className="text-[12.5px] text-[#16213E]/55 mb-4">
            Early-stage reports not yet government-validated — often where CSR funding or on-ground mobilization helps most.
          </p>

          <div className="space-y-3 mb-8">
            {needsSupport.map((c) => (
              <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
                {supportPledges[c.id] ? (
                  <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Pledged ₹{supportPledges[c.id]}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Funding amount (₹)"
                      value={amountDraft[c.id] || ""}
                      onChange={(e) => setAmountDraft((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-40 text-[12.5px] border border-[#16213E]/15 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B7A75]/40"
                    />
                    <button
                      onClick={() => onSupport(c.id, amountDraft[c.id] || "0")}
                      className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#0B7A75]/10 text-[#0B7A75] hover:bg-[#0B7A75]/20 transition-colors"
                    >
                      <HandCoins size={12} /> Pledge support
                    </button>
                  </div>
                )}
              </ChallengeCard>
            ))}
            {needsSupport.length === 0 && (
              <div className="text-[13px] text-[#16213E]/50 font-mono">No challenges currently need early support.</div>
            )}
          </div>

          {inProgress.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-[#16213E]/60" />
                <h2 className="font-display font-semibold text-[15px]">Active university projects</h2>
              </div>
              <div className="space-y-3">
                {inProgress.map((c) => (
                  <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
                    {joinedIds.includes(c.id) ? (
                      <span className="text-[11px] font-mono text-[#0B7A75]/70">✓ Participating in this project</span>
                    ) : (
                      <button
                        onClick={() => onJoinProject(c.id)}
                        className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#0B7A75]/10 text-[#0B7A75] hover:bg-[#0B7A75]/20 transition-colors"
                      >
                        <Users size={12} /> Participate in project
                      </button>
                    )}
                  </ChallengeCard>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "participation" && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-[#16213E]/60" />
            <h2 className="font-display font-semibold text-[15px]">Projects you're participating in</h2>
          </div>
          <div className="space-y-3 mb-8">
            {myProjects.map((c) => (
              <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
                {c.status >= 4 && <ProjectKanban stage={c.projectStage || 0} canEdit={false} />}
              </ChallengeCard>
            ))}
            {myProjects.length === 0 && (
              <div className="text-[13px] text-[#16213E]/50 font-mono">You haven't joined any projects yet — do so from the Opportunities tab.</div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <HandCoins size={15} className="text-[#16213E]/60" />
            <h2 className="font-display font-semibold text-[15px]">Your funding pledges</h2>
          </div>
          <div className="border border-[#16213E]/10 rounded-xl bg-white/40 divide-y divide-[#16213E]/8">
            {myPledges.map(({ challenge, amount }) => (
              <div key={challenge.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                <span className="font-mono text-[10px] text-[#16213E]/45 w-20">{challenge.id}</span>
                <span className="flex-1 truncate">{challenge.title}</span>
                <span className="font-mono text-[#0B7A75] font-medium">₹{Number(amount).toLocaleString()}</span>
              </div>
            ))}
            {myPledges.length === 0 && (
              <div className="px-4 py-4 text-[12.5px] text-[#16213E]/45 font-mono">No pledges made yet.</div>
            )}
          </div>
        </>
      )}

      {tab === "impact" && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-[#16213E]/60" />
            <h2 className="font-display font-semibold text-[15px]">Community impact monitor</h2>
          </div>
          <FundingByCategoryChart challenges={challenges} supportPledges={supportPledges} />
          <AnalyticsCharts challenges={challenges} />
          <ChallengeMap challenges={challenges} />

          {resolved.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={15} className="text-[#16213E]/60" />
                <h2 className="font-display font-semibold text-[15px]">Impact stories</h2>
              </div>
              <div className="space-y-3">
                {resolved.map((c) => (
                  <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function FinalReport({ c, catMeta, offeredSupport, supportPledges }) {
  const meta = catMeta(c.category);
  const contributors = getFundingContributors(c, offeredSupport, supportPledges);
  const required = estimateFunding(c.priority);
  const received = contributors.reduce((sum, x) => sum + x.amount, 0);

  return (
    <div className="border border-[#16213E]/15 rounded-xl p-5 bg-white space-y-5 text-[12.5px]" id={`report-${c.id}`}>
      <div className="text-center border-b border-[#16213E]/10 pb-4">
        <div className="font-mono text-[10px] text-[#0B7A75] tracking-widest">CHALLENGE RESOLUTION REPORT</div>
        <h2 className="font-display text-[20px] font-semibold mt-1">{c.title}</h2>
        <div className="font-mono text-[11px] text-[#16213E]/50 mt-1">{c.id} · {meta.label} · RESOLVED</div>
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-1.5">1. EXECUTIVE SUMMARY</div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div><span className="text-[#16213E]/50">Location:</span> {c.location}</div>
          <div><span className="text-[#16213E]/50">Category:</span> {meta.label}</div>
          <div><span className="text-[#16213E]/50">Priority:</span> {c.priority}</div>
          <div><span className="text-[#16213E]/50">Reported by:</span> {c.submittedBy || "Citizen"}</div>
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-1.5">2. UNIVERSITY & TEAM</div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div><span className="text-[#16213E]/50">Institution:</span> {(c.assignedUniversity || UNIVERSITIES[c.category][0]).name}</div>
          <div><span className="text-[#16213E]/50">Faculty mentor:</span> {c.facultyMentor || "—"}</div>
          <div><span className="text-[#16213E]/50">Student team:</span> {c.teamName || "—"}</div>
        </div>
        {c.proposal && <p className="mt-2 text-[#16213E]/70 italic">"{c.proposal}"</p>}
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-1.5">3. FUNDING REPORT</div>
        <div className="flex gap-6 mb-2">
          <div><span className="font-display text-[16px] font-semibold">₹{required.toLocaleString()}</span><div className="text-[10px] text-[#16213E]/45">Required</div></div>
          <div><span className="font-display text-[16px] font-semibold text-[#0B7A75]">₹{received.toLocaleString()}</span><div className="text-[10px] text-[#16213E]/45">Received</div></div>
        </div>
        {contributors.map((cont, i) => (
          <div key={i} className="flex justify-between text-[12px] text-[#16213E]/70">
            <span>{cont.org} ({cont.type})</span><span className="font-mono">₹{cont.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-1.5">4. PROJECT DEVELOPMENT</div>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_STAGES.map((s, i) => (
            <span key={s} className={`text-[10.5px] px-2 py-0.5 rounded-full ${i <= (c.projectStage || 0) ? "bg-[#0B7A75]/10 text-[#0B7A75]" : "bg-[#16213E]/5 text-[#16213E]/35"}`}>
              {i <= (c.projectStage || 0) ? "✓" : "○"} {s}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] text-[#16213E]/45 tracking-wide mb-1.5">5. COMPLETE AUDIT TRAIL</div>
        <AuditTrail log={c.auditLog} />
      </div>

      <div className="border-t border-[#16213E]/10 pt-3 text-[10.5px] font-mono text-[#16213E]/40 text-center">
        Generated by Apada Setu · Prototype report — figures are simulated for demonstration
      </div>
    </div>
  );
}

function AdminView({ challenges, stats, catMeta, iconFor, onSetStatus, onDelete, loggedInUsers, offeredSupport, supportPledges }) {
  const [tab, setTab] = useState("challenges");
  const [reportOpenId, setReportOpenId] = useState(null);
  const allInstitutions = useMemo(() => {
    const list = [];
    Object.entries(UNIVERSITIES).forEach(([cat, unis]) => {
      unis.forEach((u) => list.push({ ...u, category: cat }));
    });
    return list;
  }, []);
  const duplicatesFlagged = challenges.filter((c) => c.duplicate).length;

  return (
    <section className="px-5 py-8">
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

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: "challenges", label: "Challenge moderation" },
          { key: "ai", label: "AI monitoring" },
          { key: "institutions", label: "Institution management" },
          { key: "users", label: "User management" },
          { key: "reports", label: "Final reports" },
          { key: "config", label: "System configuration" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[12px] font-mono px-3 py-1.5 rounded-full border transition-colors ${
              tab === t.key ? "bg-[#16213E] text-[#F6F3EC] border-[#16213E]" : "border-[#16213E]/15 text-[#16213E]/60 hover:bg-[#16213E]/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "challenges" && (
        <>
          <AnalyticsCharts challenges={challenges} />
          <ChallengeMap challenges={challenges} />
          <div className="space-y-3">
            {challenges.map((c) => (
              <ChallengeCard key={c.id} c={c} catMeta={catMeta} iconFor={iconFor} offeredSupport={offeredSupport} supportPledges={supportPledges}>
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
                {c.status >= 4 && (
                  <div className="mt-2">
                    <ProjectKanban stage={c.projectStage || 0} canEdit={false} />
                  </div>
                )}
              </ChallengeCard>
            ))}
            {challenges.length === 0 && (
              <div className="text-[13px] text-[#16213E]/50 font-mono">No challenges in the system yet.</div>
            )}
          </div>
        </>
      )}

      {tab === "ai" && (
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Challenges AI-processed", val: stats.total },
            { label: "Duplicates flagged", val: duplicatesFlagged },
            { label: "Auto-classification rate", val: "100%" },
          ].map((s) => (
            <div key={s.label} className="border border-[#16213E]/10 rounded-lg p-4 bg-white/40">
              <div className="font-display text-2xl font-semibold">{s.val}</div>
              <div className="font-mono text-[10px] text-[#16213E]/50 mt-1">{s.label}</div>
            </div>
          ))}
          <div className="sm:col-span-3 border border-[#16213E]/10 rounded-lg p-4 bg-white/40">
            <div className="font-mono text-[11px] text-[#16213E]/50 mb-2">CATEGORY CLASSIFICATION LOG</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {challenges.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[10.5px] text-[#16213E]/40 w-20">{c.id}</span>
                  <span className="flex-1 truncate">{c.title}</span>
                  <span className="font-mono text-[10.5px] text-[#0B7A75]">{c.category}</span>
                  <PriorityPill p={c.priority} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "institutions" && (
        <div className="space-y-2">
          {allInstitutions.map((u) => (
            <div key={u.name} className="flex items-center gap-3 border border-[#16213E]/10 rounded-lg p-3 bg-white/40 text-[12.5px]">
              <GraduationCap size={14} className="text-[#0B7A75] shrink-0" />
              <span className="font-medium flex-1">{u.name}</span>
              <span className="text-[#16213E]/50 italic hidden sm:inline">{u.tag}</span>
              <span className="font-mono text-[10.5px] text-[#16213E]/45 px-2 py-0.5 rounded-full bg-[#16213E]/5">{u.category}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {loggedInUsers.length === 0 && <div className="text-[13px] text-[#16213E]/50 font-mono">No users have logged in this session yet.</div>}
          {loggedInUsers.map((u, i) => (
            <div key={i} className="flex items-center gap-3 border border-[#16213E]/10 rounded-lg p-3 bg-white/40 text-[12.5px]">
              <Users size={14} className="text-[#0B7A75] shrink-0" />
              <span className="font-medium flex-1">{u.name}</span>
              <span className="font-mono text-[10.5px] text-[#16213E]/45 px-2 py-0.5 rounded-full bg-[#16213E]/5">{u.role.toUpperCase()}</span>
              <span className="font-mono text-[10px] text-[#16213E]/35">{u.time}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          {challenges.filter((c) => c.status === 5).map((c) => (
            <div key={c.id} className="border border-[#16213E]/10 rounded-xl p-4 bg-white/40">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="font-mono text-[10px] text-[#16213E]/45">{c.id}</span>
                  <p className="text-[13.5px] font-medium mt-0.5">{c.title}</p>
                </div>
                <button
                  onClick={() => setReportOpenId(reportOpenId === c.id ? null : c.id)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#16213E] text-[#F6F3EC] hover:bg-[#0B7A75] transition-colors"
                >
                  <FileText size={12} /> {reportOpenId === c.id ? "Hide report" : "Generate final report"}
                </button>
              </div>
              {reportOpenId === c.id && (
                <div className="mt-4">
                  <FinalReport c={c} catMeta={catMeta} offeredSupport={offeredSupport} supportPledges={supportPledges} />
                  <button
                    onClick={() => window.print()}
                    className="mt-3 text-[11.5px] font-medium px-3 py-1.5 rounded-lg border border-[#16213E]/15 hover:bg-[#16213E]/5 transition-colors"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              )}
            </div>
          ))}
          {challenges.filter((c) => c.status === 5).length === 0 && (
            <div className="text-[13px] text-[#16213E]/50 font-mono">No resolved challenges yet — reports generate once a project is marked resolved.</div>
          )}
        </div>
      )}

      {tab === "config" && (
        <div className="border border-[#16213E]/10 rounded-lg p-4 bg-white/40 space-y-3 max-w-md">
          {[
            "Auto-approve low-priority challenges",
            "Email notifications for critical reports",
            "Public impact dashboard visibility",
            "Allow anonymous citizen reports",
          ].map((label) => (
            <label key={label} className="flex items-center justify-between text-[12.5px]">
              <span>{label}</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#0B7A75]" />
            </label>
          ))}
          <p className="text-[10.5px] font-mono text-[#16213E]/40 pt-1">Prototype settings — not persisted.</p>
        </div>
      )}
    </section>
  );
}

/* ---------------- MAIN APP ---------------- */

export default function App() {
  const [user, setUser] = useState(() => getSession());
  const [view, setView] = useState("landing");
  const [preselectedRole, setPreselectedRole] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "", location: "", district: "", state: "", severity: "Medium", expectedImpact: "",
    coords: null, photos: [], videos: [], documents: [],
  });
  const [processing, setProcessing] = useState(null);
  const [insights, setInsights] = useState(null);
  const [universityCategory, setUniversityCategory] = useState(CATEGORIES[0].key);
  const [offeredSupport, setOfferedSupport] = useState({});
  const [supportPledges, setSupportPledges] = useState({});
  const [joinedProjectIds, setJoinedProjectIds] = useState([]);
  const [loggedInUsers, setLoggedInUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarActive, setSidebarActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function pushNotification(message) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setNotifications((prev) => [{ id: `${Date.now()}-${Math.random()}`, message, time }, ...prev].slice(0, 30));
    setUnreadCount((c) => c + 1);
  }
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
    const high = challenges.filter((c) => c.priority === "High" || c.priority === "Critical").length;
    const matched = challenges.filter((c) => c.status >= 3).length;
    return { total, resolved, high, matched };
  }, [challenges]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || processing) return;

    const { title, location, district, state, severity, expectedImpact, coords, photos, videos, documents } = form;
    const cls = classify(title);
    const generatedInsights = generateInsights(title, cls);

    setProcessing({ title, location, stage: 0, cls, dupe: null });
    setInsights(generatedInsights);
    setForm({ title: "", location: "", district: "", state: "", severity: "Medium", expectedImpact: "", coords: null, photos: [], videos: [], documents: [] });

    let stage = 0;
    const tick = () => {
      stage += 1;
      setProcessing((p) => (p ? { ...p, stage } : p));
      if (stage < 4) {
        timerRef.current = setTimeout(tick, 850);
      } else {
        timerRef.current = setTimeout(async () => {
          const result = await submitChallenge({
            title, location, district, state, severity, expectedImpact,
            coords, submittedBy: user?.name,
            photoCount: photos.length, videoCount: videos.length, documentCount: documents.length,
          });
          const entry = result.entry || result;
          entry.auditLog = [{ time: new Date().toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), actor: "Citizen", action: "Challenge submitted and AI-classified" }];
          setChallenges((prev) => [entry, ...prev]);
          setProcessing(null);
          setInsights(null);
          pushNotification(`New challenge submitted: "${entry.title.slice(0, 50)}${entry.title.length > 50 ? "…" : ""}"`);
        }, 700);
      }
    };
    timerRef.current = setTimeout(tick, 700);
  }

  function logAudit(id, actor, action) {
    const time = new Date().toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, auditLog: [...(c.auditLog || []), { time, actor, action }] } : c)));
  }

  function updateLocalStatus(id, status) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }
  function assignUniversity(id, university) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status: 3, assignedUniversity: university } : c)));
  }
  function advanceProjectStage(id) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, projectStage: Math.min((c.projectStage || 0) + 1, PROJECT_STAGES.length - 1) } : c)));
  }
  function markProjectResolved(id) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, status: 5 } : c)));
  }
  function deleteLocalChallenge(id) {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  }
  function setPriority(id, priority) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, priority } : c)));
  }
  function updateProjectInfo(id, fields) {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }

  const catMeta = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[6];
  const iconFor = (key) => ICONS[key] || Wrench;

  if (!user) {
    if (view === "landing") {
      return (
        <LandingPage
          onGetStarted={(role) => {
            setPreselectedRole(role);
            setView("login");
          }}
        />
      );
    }
    return <AuthScreen
      onAuthed={(u) => {
        setUser(u);
        setLoggedInUsers((prev) => [...prev, { ...u, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      }}
      preselectedRole={preselectedRole}
      onBack={() => setView("landing")}
    />;
  }

  const roleMeta = ROLES.find((r) => r.key === user.role);

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#16213E] lg:flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Sidebar active={sidebarActive} onSelect={setSidebarActive} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0">
        <GovStrip />

        <header id="main-content" className="border-b border-[#16213E]/10 sticky top-0 bg-[#F6F3EC]/90 backdrop-blur z-20">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 rounded-md border border-[#16213E]/15 flex items-center justify-center lg:hidden"
              >
                <Menu size={16} className="text-[#16213E]/60" />
              </button>
              <div>
                <div className="text-[12.5px] font-medium leading-none">{user.name}</div>
                <div className="font-mono text-[10px] text-[#0B7A75] mt-0.5">{roleMeta.label.toUpperCase()}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={() => setUnreadCount(0)} />
              <button
                onClick={() => { clearSession(); setUser(null); setView("landing"); }}
                className="w-8 h-8 rounded-md border border-[#16213E]/15 flex items-center justify-center hover:bg-[#16213E]/5 transition-colors"
                title="Log out"
              >
                <LogOut size={14} className="text-[#16213E]/60" />
              </button>
            </div>
          </div>
        </header>

        <section className="px-5 pt-10 pb-2">
          <div className="max-w-2xl">
            <span className="font-mono text-[11px] text-[#0B7A75] tracking-widest">आपदा सेतु — THE DISASTER BRIDGE</span>
            <h1 className="font-display text-[30px] sm:text-[36px] leading-[1.1] mt-2 font-semibold">
              Welcome back, <span className="text-[#0B7A75]">{user.name}</span>.
            </h1>
            <p className="text-[#16213E]/65 mt-3 text-[15px] leading-relaxed">{roleMeta.desc}.</p>
          </div>
        </section>

        {user.role === "citizen" && (
          <CitizenView
            challenges={challenges}
            catMeta={catMeta}
            iconFor={iconFor}
            form={form}
            setForm={setForm}
            handleSubmit={handleSubmit}
            processing={processing}
            insights={insights}
            user={user}
            offeredSupport={offeredSupport}
            supportPledges={supportPledges}
          />
        )}

        {user.role === "government" && (
          <GovernmentView
            challenges={challenges}
            stats={stats}
            catMeta={catMeta}
            iconFor={iconFor}
            offeredSupport={offeredSupport}
            supportPledges={supportPledges}
            onApprove={(id) => { updateLocalStatus(id, 2); logAudit(id, "Government", "Approved challenge for university matching"); pushNotification(`Government approved challenge ${id} — ready for university matching`); }}
            onReject={(id) => { updateLocalStatus(id, 1); logAudit(id, "Government", "Rejected challenge"); pushNotification(`Government rejected challenge ${id}`); }}
            onAssign={(id, u) => { assignUniversity(id, u); logAudit(id, "Government", `Matched to ${u.name} (${u.score}% match)`); pushNotification(`${u.name} matched to challenge ${id} (${u.score}% match)`); }}
            onSetPriority={(id, priority) => { setPriority(id, priority); logAudit(id, "Government", `Priority changed to ${priority}`); pushNotification(`Government set challenge ${id} priority to ${priority}`); }}
          />
        )}

        {user.role === "university" && (
          <UniversityView
            challenges={challenges}
            catMeta={catMeta}
            iconFor={iconFor}
            universityUser={{ category: universityCategory }}
            setUniversityCategory={setUniversityCategory}
            offeredSupport={offeredSupport}
            supportPledges={supportPledges}
            onAccept={(id) => { updateLocalStatus(id, 4); logAudit(id, "University", "Accepted project — work has begun"); pushNotification(`University accepted project ${id} — work has begun`); }}
            onDecline={(id) => { updateLocalStatus(id, 2); logAudit(id, "University", "Declined project — returned to matching"); pushNotification(`University declined project ${id} — back to matching`); }}
            onAdvanceStage={(id) => { advanceProjectStage(id); logAudit(id, "University", "Advanced to next project stage"); pushNotification(`Project ${id} advanced to next stage`); }}
            onMarkResolved={(id) => { markProjectResolved(id); logAudit(id, "University", "Marked project resolved"); pushNotification(`Project ${id} marked resolved 🎉`); }}
            onUpdateProjectInfo={(id, fields) => { updateProjectInfo(id, fields); logAudit(id, "University", "Updated team / proposal details"); }}
          />
        )}

        {user.role === "industry" && (
          <IndustryView
            challenges={challenges}
            catMeta={catMeta}
            iconFor={iconFor}
            onOfferSupport={(id, types) => { setOfferedSupport((prev) => ({ ...prev, [id]: types })); logAudit(id, "Industry", `Offered support: ${types.join(", ")}`); pushNotification(`Industry partner offered ${types.join(", ")} on project ${id}`); }}
            offeredSupport={offeredSupport}
            supportPledges={supportPledges}
          />
        )}

        {user.role === "ngo" && (
          <NGOView
            challenges={challenges}
            catMeta={catMeta}
            iconFor={iconFor}
            onSupport={(id, amount) => { setSupportPledges((prev) => ({ ...prev, [id]: amount })); logAudit(id, "NGO", `Pledged ₹${Number(amount).toLocaleString()} in funding`); pushNotification(`NGO pledged ₹${amount} on challenge ${id}`); }}
            supportPledges={supportPledges}
            offeredSupport={offeredSupport}
            onJoinProject={(id) => { setJoinedProjectIds((prev) => [...prev, id]); logAudit(id, "NGO", "Joined project as participant"); pushNotification(`NGO joined project ${id} as a participant`); }}
            joinedIds={joinedProjectIds}
          />
        )}

        {user.role === "admin" && (
          <AdminView
            challenges={challenges}
            stats={stats}
            catMeta={catMeta}
            iconFor={iconFor}
            onSetStatus={(id, status) => { updateLocalStatus(id, status); logAudit(id, "Admin", `Status manually set to "${STAGES[status]}"`); pushNotification(`Admin set challenge ${id} to "${STAGES[status]}"`); }}
            onDelete={(id) => { deleteLocalChallenge(id); pushNotification(`Admin deleted challenge ${id}`); }}
            loggedInUsers={loggedInUsers}
            offeredSupport={offeredSupport}
            supportPledges={supportPledges}
          />
        )}

        <OfficialFooter />
      </div>
    </div>
  );
}
