import { useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";

const T = {
  bg: "#0F172A",
  bg2: "#111C33",
  card: "rgba(255,255,255,0.08)",
  card2: "rgba(255,255,255,0.12)",
  line: "rgba(255,255,255,0.12)",
  text: "#F8FAFC",
  muted: "#C7D2FE",
  soft: "#94A3B8",
  accent: "#F59E0B",
  accent2: "#22C55E",
  danger: "#EF4444",
  info: "#38BDF8",
  shadow: "0 24px 80px rgba(2, 6, 23, 0.45)",
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Manrope', 'Segoe UI', system-ui, sans-serif";

const SYSTEM_PROMPT = `Tu es un coach expert en recrutement, spécialisé dans la préparation aux entretiens d'embauche pour les professionnels de la comptabilité, finance et gestion en Afrique francophone, particulièrement au Gabon. Tu maîtrises le SYSCOHADA révisé, la fiscalité gabonaise (TVA 18%, TPS 9.5%, IS 30%), les normes OHADA, et la sécurité sociale gabonaise (CNSS 2026: 18% patronale/5% salariale, plafond 1 500 000 FCFA; CNAMGS: 3.5%/1.5%). Tu joues le rôle d'un recruteur strict et professionnel. Tu poses UNE question à la fois. Après chaque réponse tu: 1. Attribues une note de 1 à 5 étoiles (⭐) 2. Identifies les points forts (✅) 3. Identifies les points à améliorer (⚠️) 4. Proposes une reformulation optimisée (💬) RÈGLES STRICTES: - Si la note est < 4⭐, tu demandes de recommencer la même question - Tu ne passes à la suivante QUE si note ≥ 4⭐ - Tu signales chaque usage de "on/nous" au lieu de "JE" - Tu signales si le candidat dit "voilà" en conclusion - Tu exiges toujours un exemple concret - Tu exiges une conclusion reliée au poste visé Commence par te présenter comme recruteur et poser la première question selon le module choisi.`;

const MODULES = [
  { id: "personnalite", label: "Personnalité & Motivation", icon: "👤", desc: "Présentation, qualités, défauts, motivation, prétentions salariales", questions: 13, color: "#F59E0B", prompt: `Module: PERSONNALITÉ. Présente-toi comme recruteur d'une grande entreprise gabonaise cherchant un Chef Comptable. Pose la première question: "Présentez-vous."` },
  { id: "management", label: "Management d'équipe", icon: "👥", desc: "Organisation, délégation, gestion des conflits, formation des juniors", questions: 10, color: "#8B5CF6", prompt: `Module: MANAGEMENT. Présente-toi comme recruteur. Pose la première question sur l'organisation d'une équipe comptable.` },
  { id: "technique", label: "Technique Comptable et audit", icon: "📊", desc: "SYSCOHADA Révisé, DSF, immobilisations, provisions, audit, normes IFRS, contrôle de gestion, rapprochements bancaires", questions: 20, color: "#10B981", prompt: `Module: TECHNIQUE COMPTABLE ET AUDIT. Présente-toi comme recruteur. Pose la première question: "Quels logiciels comptables maîtrisez-vous et comment les avez-vous utilisés concrètement?"` },
  { id: "OHADA", label: "Réglementation OHADA", icon: "⚖️", desc: "SYSCOHADA révisé 2018, obligations, sanctions, états financiers", questions: 10, color: "#38BDF8", prompt: `Module: SYSCOHADA révisé 2018. Présente-toi comme recruteur. Pose la première question sur le cadre comptable OHADA au Gabon.` },
  { id: "fiscalite", label: "Fiscalité Gabonaise", icon: "🏛️", desc: "TVA 18%, TPS 9.5%, IS 30%, DSF, contrôles fiscaux, Digitax, loi des finances rectificative Gabon 2026", questions: 15, color: "#F97316", prompt: `Module: FISCALITÉ GABONAISE. Présente-toi comme recruteur. Pose la première question sur les obligations fiscales d'une entreprise au Gabon.` },
  { id: "social", label: "Sécurité Sociale", icon: "🏥", desc: "CNSS, CNAMGS, taux 2026, calculs, sanctions, contrôles", questions: 10, color: "#14B8A6", prompt: `Module: SÉCURITÉ SOCIALE. Présente-toi comme recruteur. Pose la première question sur les obligations sociales d'un employeur au Gabon.` },
  { id: "complet", label: "Simulation Complète", icon: "🎯", desc: "Simulation d'entretien complet de A à Z — personnalité, management, technique, OHADA, fiscalité, social", questions: 78, color: "#F59E0B", prompt: `Module: SIMULATION COMPLÈTE. Présente-toi comme recruteur d'une entreprise gabonaise recrutant un Chef Comptable, sans préciser de nom d'entreprise fictive. Mène un entretien complet couvrant successivement : présentation et motivation, management d'équipe, technique comptable (SYSCOHADA révisé), réglementation OHADA, fiscalité gabonaise (TVA, TPS, IS), et sécurité sociale (CNSS, CNAMGS). Présente-toi et commence par la Section 1 - Personnalité, Question 1: "Présentez-vous."` },
];

const TIMER_OPTIONS = [
  { label: "Sans chronomètre", value: null },
  { label: "1 min / question", value: 60 },
  { label: "2 min / question", value: 120 },
  { label: "3 min / question", value: 180 },
  { label: "5 min / question", value: 300 },
];

function formatTime(s) {
  if (s == null) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = 0.96;
  window.speechSynthesis.speak(u);
}

async function callClaude(messages, system = SYSTEM_PROMPT) {
  const res = await fetch("/api/interview/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de connexion");
  return data.reply || "Erreur de connexion.";
}

const cx = (...parts) => parts.filter(Boolean).join(" ");

function GlassCard({ children, className = "", style = {} }) {
  return <div className={cx("glass-card", className)} style={style}>{children}</div>;
}

function ProgressBar({ value, max }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return <div className="progress"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>;
}

function App() {
  const [selectedModule, setSelectedModule] = useState(MODULES[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0);
  const [timerOption, setTimerOption] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [mode, setMode] = useState("strict");
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const progress = useMemo(() => {
    const total = selectedModule.questions || 1;
    return Math.min(100, (step / total) * 100);
  }, [step, selectedModule]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (!started || timerOption == null) return;
    setRemaining(timerOption);
    const id = setInterval(() => setRemaining((s) => {
      if (s == null) return s;
      if (s <= 1) return 0;
      return s - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [started, timerOption, step]);

  const startInterview = async () => {
    setError("");
    setLoading(true);
    try {
      const system = `${SYSTEM_PROMPT}
Mode d'évaluation: ${mode}. Module choisi: ${selectedModule.label}.`;
      const first = await callClaude([{ role: "user", content: selectedModule.prompt }], system);
      setMessages([{ role: "assistant", content: first }]);
      setStarted(true);
      setStep(1);
      if (timerOption != null) setRemaining(timerOption);
      speakText(first);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const system = `${SYSTEM_PROMPT}
Mode d'évaluation: ${mode}. Module choisi: ${selectedModule.label}.`;
      const reply = await callClaude(nextMessages, system);
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      setStep((s) => s + 1);
      speakText(reply);
      if (timerOption != null) setRemaining(timerOption);
      const m = reply.match(/(?:Note|score)\s*[:\-]?\s*(\d)/i);
      if (m) setScore((prev) => Math.max(prev, Number(m[1])));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Simulation d'entretien", 14, 16);
    doc.setFont("helvetica", "normal");
    let y = 28;
    messages.forEach((m) => {
      const text = `${m.role === "user" ? "Candidat" : "Recruteur"}: ${m.content}`;
      const lines = doc.splitTextToSize(text, 180);
      if (y + lines.length * 7 > 280) { doc.addPage(); y = 20; }
      doc.text(lines, 14, y);
      y += lines.length * 7 + 2;
    });
    doc.save("simulation-entretien.pdf");
  };

  return (
    <div className="app-shell">
      <style>{`body{margin:0;background:radial-gradient(circle at top,#1E293B,#020617 65%);color:${T.text};font-family:${FONT_BODY};} *{box-sizing:border-box} .app-shell{min-height:100vh;padding:24px} .hero{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:stretch} .glass-card{backdrop-filter:blur(18px);background:${T.card};border:1px solid ${T.line};border-radius:24px;box-shadow:${T.shadow};padding:22px} .title{font-family:${FONT_DISPLAY};font-size:clamp(2rem,4vw,4rem);line-height:1.02;margin:0 0 12px} .muted{color:${T.muted}} .soft{color:${T.soft}} .btn{border:0;border-radius:16px;padding:14px 18px;font-weight:700;cursor:pointer} .btn-primary{background:linear-gradient(135deg,#F59E0B,#F97316);color:#111827} .btn-secondary{background:${T.card2};color:${T.text};border:1px solid ${T.line}} .grid{display:grid;gap:16px} .modules{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))} .module{padding:18px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid ${T.line};cursor:pointer;transition:.2s transform,.2s background} .module:hover{transform:translateY(-2px);background:rgba(255,255,255,.1)} .module.active{outline:2px solid ${T.accent}} .progress{height:10px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden}.progress-fill{height:100%;background:linear-gradient(90deg,#38BDF8,#22C55E)} .chat{max-height:520px;overflow:auto;display:flex;flex-direction:column;gap:12px;padding-right:4px} .bubble{max-width:82%;padding:14px 16px;border-radius:18px;line-height:1.55} .bubble.user{align-self:flex-end;background:rgba(34,197,94,.18);border:1px solid rgba(34,197,94,.35)} .bubble.assistant{align-self:flex-start;background:rgba(255,255,255,.07);border:1px solid ${T.line}} textarea{width:100%;min-height:110px;resize:vertical;border-radius:18px;border:1px solid ${T.line};background:rgba(15,23,42,.6);color:${T.text};padding:14px 16px;font:inherit} select{width:100%;padding:12px 14px;border-radius:14px;border:1px solid ${T.line};background:rgba(15,23,42,.6);color:${T.text}} .pill{display:inline-flex;gap:8px;align-items:center;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid ${T.line};color:${T.text}} @media (max-width: 980px){.hero{grid-template-columns:1fr}}`}</style>

      <div className="hero">
        <GlassCard>
          <div className="pill">Coach IA • Entretien professionnel • Gabon / Finance / Comptabilité</div>
          <h1 className="title">Prépare un candidat comme dans un vrai entretien premium.</h1>
          <p className="muted">Simulation immersive, feedback strict, export PDF, chronomètre, synthèse vocale et progression claire.</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: 18 }}>
            <button className="btn btn-primary" onClick={startInterview} disabled={loading}>{started ? "Relancer la simulation" : "Démarrer l’entretien"}</button>
            <button className="btn btn-secondary" onClick={exportPDF} disabled={!messages.length}>Exporter PDF</button>
          </div>
          {error && <p style={{ color: T.danger, marginTop: 12 }}>{error}</p>}
        </GlassCard>

        <GlassCard>
          <div className="grid" style={{ gap: 12 }}>
            <div><div className="soft">Question</div><strong>{step}</strong></div>
            <div><div className="soft">Score</div><strong>{score || "—"}</strong></div>
            <div><div className="soft">Temps restant</div><strong>{formatTime(remaining)}</strong></div>
            <ProgressBar value={progress} max={100} />
          </div>
        </GlassCard>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.1fr .9fr", marginTop: 20 }}>
        <GlassCard>
          <h2 style={{ marginTop: 0 }}>Modules</h2>
          <div className="grid modules">
            {MODULES.map((m) => (
              <div key={m.id} className={cx("module", selectedModule.id === m.id && "active")} onClick={() => setSelectedModule(m)}>
                <div style={{ fontSize: 26 }}>{m.icon}</div>
                <h3 style={{ margin: "10px 0 6px" }}>{m.label}</h3>
                <p className="soft" style={{ margin: 0 }}>{m.desc}</p>
                <p className="muted" style={{ marginBottom: 0 }}>{m.questions} questions</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <label className="soft">Mode d’entretien</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="strict">Strict / recruteur exigeant</option>
              <option value="coach">Coach structuré</option>
            </select>
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="soft">Chronomètre</label>
            <select value={timerOption ?? ""} onChange={(e) => setTimerOption(e.target.value === "" ? null : Number(e.target.value))}>
              {TIMER_OPTIONS.map((t) => <option key={String(t.value)} value={t.value ?? ""}>{t.label}</option>)}
            </select>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 style={{ marginTop: 0 }}>Simulation</h2>
          <div className="chat">
            {messages.map((m, i) => <div key={i} className={cx("bubble", m.role)}>{m.content}</div>)}
            {loading && <div className="bubble assistant">Analyse en cours…</div>}
            <div ref={endRef} />
          </div>
          <div style={{ marginTop: 14 }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Réponse du candidat…" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendAnswer(); }} />
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
              <button className="btn btn-primary" onClick={sendAnswer} disabled={!started || loading}>Envoyer</button>
              <button className="btn btn-secondary" onClick={() => speakText(messages[messages.length - 1]?.content || "")}>Relire la question</button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default App;
