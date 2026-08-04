import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  noir:    "#0A0A0A",
  charbon: "#141414",
  graphite:"#1E1E1E",
  or:      "#C9A84C",
  orPale:  "#E8D5A3",
  orFond:  "#2A2308",
  blanc:   "#F5F5F0",
  gris:    "#888880",
  grisClair:"#CCCCCC",
};

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un coach expert en recrutement, spécialisé dans la préparation aux entretiens d'embauche pour les professionnels de la comptabilité, finance et gestion en Afrique francophone, particulièrement au Gabon. Tu maîtrises le SYSCOHADA révisé, la fiscalité gabonaise (TVA 18%, TPS 9.5%, IS 30%), les normes OHADA, et la sécurité sociale gabonaise (CNSS 2026: 18% patronale/5% salariale, plafond 1 500 000 FCFA; CNAMGS: 3.5%/1.5%).

Tu joues le rôle d'un recruteur strict et professionnel. Tu poses UNE question à la fois. Après chaque réponse tu:
1. Attribues une note de 1 à 5 étoiles (⭐)
2. Identifies les points forts (✅)
3. Identifies les points à améliorer (⚠️)
4. Proposes une reformulation optimisée (💬)

RÈGLES STRICTES:
- Si la note est < 4⭐, tu demandes de recommencer la même question
- Tu ne passes à la suivante QUE si note ≥ 4⭐
- Tu signales chaque usage de "on/nous" au lieu de "JE"
- Tu signales si le candidat dit "voilà" en conclusion
- Tu exiges toujours un exemple concret
- Tu exiges une conclusion reliée au poste visé

Commence par te présenter comme recruteur et poser la première question selon le module choisi.`;

// ── Modules ────────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "personnalite",
    label: "Personnalité & Motivation",
    icon: "👤",
    desc: "Présentation, qualités, défauts, motivation, prétentions salariales",
    questions: 13,
    color: T.or,
    prompt: `Module: PERSONNALITÉ. Présente-toi comme recruteur d'une grande entreprise gabonaise cherchant un Chef Comptable. Pose la première question: "Présentez-vous."`,
  },
  {
    id: "management",
    label: "Management d'équipe",
    icon: "👥",
    desc: "Organisation, délégation, gestion des conflits, formation des juniors",
    questions: 10,
    color: "#8B7355",
    prompt: `Module: MANAGEMENT. Présente-toi comme recruteur. Pose la première question sur l'organisation d'une équipe comptable.`,
  },
  {
    id: "technique",
    label: "Technique Comptable",
    icon: "📊",
    desc: "SYSCOHADA, DSF, immobilisations, provisions, rapprochements bancaires",
    questions: 13,
    color: "#6B8B6B",
    prompt: `Module: TECHNIQUE COMPTABLE. Présente-toi comme recruteur. Pose la première question: "Quels logiciels comptables maîtrisez-vous et comment les avez-vous utilisés concrètement?"`,
  },
  {
    id: "ohada",
    label: "Réglementation OHADA",
    icon: "⚖️",
    desc: "SYSCOHADA révisé 2018, obligations, sanctions, états financiers",
    questions: 8,
    color: "#7B6B8B",
    prompt: `Module: OHADA. Présente-toi comme recruteur. Pose la première question sur le cadre comptable OHADA au Gabon.`,
  },
  {
    id: "fiscalite",
    label: "Fiscalité Gabonaise",
    icon: "🏛️",
    desc: "TVA 18%, TPS 9.5%, IS 30%, DSF, contrôles fiscaux, Digitax",
    questions: 8,
    color: "#8B4545",
    prompt: `Module: FISCALITÉ GABONAISE. Présente-toi comme recruteur. Pose la première question sur les obligations fiscales d'une entreprise au Gabon.`,
  },
  {
    id: "social",
    label: "Sécurité Sociale",
    icon: "🏥",
    desc: "CNSS, CNAMGS, taux 2026, calculs, sanctions, contrôles",
    questions: 7,
    color: "#456B8B",
    prompt: `Module: SÉCURITÉ SOCIALE. Présente-toi comme recruteur. Pose la première question sur les obligations sociales d'un employeur au Gabon.`,
  },
  {
    id: "complet",
    label: "Simulation Complète",
    icon: "🎯",
    desc: "Simulation d'entretien complet de A à Z — personnalité, management, technique, OHADA, fiscalité, social",
    questions: 40,
    color: T.or,
    prompt: `Module: SIMULATION COMPLÈTE. Présente-toi comme recruteur d'une entreprise gabonaise recrutant un Chef Comptable, sans préciser de nom d'entreprise fictive. Mène un entretien complet couvrant successivement : présentation et motivation, management d'équipe, technique comptable (SYSCOHADA révisé), réglementation OHADA, fiscalité gabonaise (TVA, TPS, IS), et sécurité sociale (CNSS, CNAMGS). Présente-toi et commence par la Section 1 - Personnalité, Question 1: "Présentez-vous."`,
  },
];

// ── Options de chronomètre ─────────────────────────────────────────────────
const TIMER_OPTIONS = [
  { label: "Sans chronomètre", value: null },
  { label: "1 min / question", value: 1 },
  { label: "2 min / question", value: 2 },
  { label: "3 min / question", value: 3 },
  { label: "5 min / question", value: 5 },
];

function formatTime(s) {
  if (s === null || s === undefined) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── API call ───────────────────────────────────────────────────────────────
// On ne parle JAMAIS directement à l'API Anthropic depuis le navigateur
// (la clé secrète serait exposée à tous les visiteurs). On passe par notre
// propre backend (/api/interview/chat), qui lui, détient la clé en sécurité.
async function callClaude(messages) {
  const res = await fetch("/api/interview/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  const data = await res.json();
  return data.reply || "Erreur de connexion.";
}

// ── Components ─────────────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 36, height: 36,
        background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 900, color: T.noir,
        fontFamily: "Georgia, serif",
        boxShadow: `0 0 20px ${T.or}40`,
      }}>H</div>
      <div>
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: "1.1rem", fontWeight: 700,
          color: T.or, letterSpacing: 3,
          textTransform: "uppercase",
        }}>Héméra</div>
        <div style={{
          fontSize: "0.6rem", color: T.gris,
          letterSpacing: 2, textTransform: "uppercase",
        }}>Prépare · Brille · Réussis</div>
      </div>
    </div>
  );
}

function StarDisplay({ count }) {
  return (
    <span style={{ color: T.or, fontSize: "1.2rem", letterSpacing: 2 }}>
      {"⭐".repeat(count)}{"☆".repeat(5 - count)}
    </span>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16,
      gap: 10,
      alignItems: "flex-end",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: T.noir,
          fontFamily: "Georgia, serif",
        }}>H</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser
          ? `linear-gradient(135deg, ${T.or}22, ${T.orFond})`
          : T.graphite,
        border: isUser
          ? `1px solid ${T.or}44`
          : `1px solid #2A2A2A`,
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px",
        color: T.blanc,
        fontSize: "0.88rem",
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: T.graphite,
          border: `1px solid ${T.or}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: T.or,
        }}>Vous</div>
      )}
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────────────
function Landing({ onStart }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.noir,
      color: T.blanc,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflowX: "hidden",
    }}>
      {/* Nav */}
      <nav style={{
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid #1A1A1A`,
      }}>
        <Logo />
        <div style={{
          fontSize: "0.75rem", color: T.gris,
          letterSpacing: 1, textTransform: "uppercase",
        }}>Gabon · OHADA · 2026</div>
      </nav>

      {/* Hero */}
      <div style={{
        padding: "80px 32px 60px",
        maxWidth: 900, margin: "0 auto",
        textAlign: "center",
      }}>
        {/* Ornement */}
        <div style={{
          width: 1, height: 60, background: `linear-gradient(to bottom, transparent, ${T.or})`,
          margin: "0 auto 32px",
        }} />

        <div style={{
          fontSize: "0.7rem", color: T.or,
          letterSpacing: 4, textTransform: "uppercase",
          marginBottom: 20,
        }}>
          Simulateur d'entretien professionnel
        </div>

        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
          fontWeight: 400,
          lineHeight: 1.2,
          color: T.blanc,
          margin: "0 0 16px",
          letterSpacing: -0.5,
        }}>
          Préparez-vous comme jamais
          <br />
          <span style={{ color: T.or }}>aucun candidat</span> ne se prépare
        </h1>

        <p style={{
          fontSize: "1rem", color: T.gris,
          maxWidth: 560, margin: "0 auto 48px",
          lineHeight: 1.8,
        }}>
          Le premier simulateur d'entretien conçu spécifiquement pour les professionnels 
          de la comptabilité et de la finance au Gabon. SYSCOHADA, fiscalité gabonaise, 
          OHADA — maîtrisez chaque question avec l'IA comme coach.
        </p>

        {/* Stats */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 48,
          marginBottom: 56,
        }}>
          {[
            { n: "7", l: "Modules" },
            { n: "OHADA", l: "Révisé" },
            { n: "5⭐", l: "Standard exigé" },
          ].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "Georgia, serif",
                fontSize: "2rem", fontWeight: 700,
                color: T.or, lineHeight: 1,
              }}>{s.n}</div>
              <div style={{
                fontSize: "0.7rem", color: T.gris,
                letterSpacing: 2, textTransform: "uppercase",
                marginTop: 6,
              }}>{s.l}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => onStart("modules")}
          style={{
            background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
            color: T.noir,
            border: "none",
            padding: "16px 48px",
            fontSize: "0.9rem",
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: 2,
            transition: "all 0.2s",
            boxShadow: `0 4px 30px ${T.or}40`,
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = `0 8px 40px ${T.or}60`}
          onMouseLeave={e => e.currentTarget.style.boxShadow = `0 4px 30px ${T.or}40`}
        >
          Commencer la simulation →
        </button>

        <div style={{ marginTop: 18 }}>
          <a
            href="/paiement"
            style={{
              color: T.gris, fontSize: "0.78rem",
              textDecoration: "underline", cursor: "pointer",
            }}
          >
            Débloquer l'accès complet — Mobile Money
          </a>
        </div>

        <div style={{
          width: 1, height: 60,
          background: `linear-gradient(to bottom, ${T.or}, transparent)`,
          margin: "56px auto 0",
        }} />
      </div>

      {/* Modules preview */}
      <div style={{
        padding: "0 32px 80px",
        maxWidth: 900, margin: "0 auto",
      }}>
        <div style={{
          fontSize: "0.65rem", color: T.gris,
          letterSpacing: 4, textTransform: "uppercase",
          textAlign: "center", marginBottom: 40,
        }}>Modules disponibles</div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}>
          {MODULES.map(m => (
            <div
              key={m.id}
              onClick={() => onStart("simulator", m)}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === m.id ? T.graphite : T.charbon,
                border: `1px solid ${hovered === m.id ? T.or + "44" : "#1E1E1E"}`,
                borderRadius: 4,
                padding: "20px 20px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hovered === m.id ? "translateY(-2px)" : "none",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 10 }}>{m.icon}</div>
              <div style={{
                fontSize: "0.85rem", fontWeight: 700,
                color: hovered === m.id ? T.or : T.blanc,
                marginBottom: 6, transition: "color 0.2s",
              }}>{m.label}</div>
              <div style={{
                fontSize: "0.75rem", color: T.gris,
                lineHeight: 1.5, marginBottom: 12,
              }}>{m.desc}</div>
              <div style={{
                fontSize: "0.65rem", color: T.or,
                letterSpacing: 1, textTransform: "uppercase",
              }}>{m.questions} questions</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid #1A1A1A`,
        padding: "24px 32px",
        textAlign: "center",
      }}>
        <Logo />
        <div style={{
          fontSize: "0.7rem", color: T.gris,
          marginTop: 12, letterSpacing: 1,
        }}>
          Conçu pour les professionnels gabonais · SYSCOHADA 2018 · Fiscalité 2026
        </div>
      </div>
    </div>
  );
}

// ── Module Selection ───────────────────────────────────────────────────────
function ModuleSelect({ onSelect, onBack }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.noir,
      color: T.blanc,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <nav style={{
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid #1A1A1A`,
      }}>
        <Logo />
        <button onClick={onBack} style={{
          background: "none", border: `1px solid #2A2A2A`,
          color: T.gris, padding: "8px 16px",
          fontSize: "0.75rem", cursor: "pointer",
          letterSpacing: 1, textTransform: "uppercase",
          borderRadius: 2,
        }}>← Retour</button>
      </nav>

      <div style={{ padding: "48px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{
          fontSize: "0.65rem", color: T.or,
          letterSpacing: 4, textTransform: "uppercase",
          marginBottom: 12,
        }}>Choisissez votre module</div>
        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: "2rem", fontWeight: 400,
          color: T.blanc, margin: "0 0 48px",
        }}>
          Sur quoi souhaitez-vous vous entraîner ?
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {MODULES.map(m => (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === m.id ? T.graphite : T.charbon,
                border: `1px solid ${hovered === m.id ? T.or + "66" : "#222"}`,
                borderRadius: 4,
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hovered === m.id ? "translateY(-3px)" : "none",
                boxShadow: hovered === m.id ? `0 8px 30px ${T.or}20` : "none",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 16,
              }}>
                <span style={{ fontSize: 28 }}>{m.icon}</span>
                <span style={{
                  fontSize: "0.65rem", color: T.or,
                  letterSpacing: 1, textTransform: "uppercase",
                  background: T.orFond, padding: "4px 10px", borderRadius: 20,
                }}>{m.questions}Q</span>
              </div>
              <div style={{
                fontSize: "0.95rem", fontWeight: 700,
                color: hovered === m.id ? T.or : T.blanc,
                marginBottom: 8, transition: "color 0.2s",
              }}>{m.label}</div>
              <div style={{
                fontSize: "0.78rem", color: T.gris, lineHeight: 1.6,
              }}>{m.desc}</div>
              {m.id === "complet" && (
                <div style={{
                  marginTop: 16, padding: "8px 12px",
                  background: `${T.or}11`,
                  border: `1px solid ${T.or}33`,
                  borderRadius: 3,
                  fontSize: "0.72rem", color: T.or,
                  letterSpacing: 0.5,
                }}>⭐ Recommandé pour l'entretien complet</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Simulator ──────────────────────────────────────────────────────────────
function Simulator({ module, candidate, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState({ total: 0, count: 0 });
  const [poste, setPoste] = useState("");
  const [secteur, setSecteur] = useState("");
  const [timerMinutes, setTimerMinutes] = useState(null); // null = pas de chronomètre
  const [timeLeft, setTimeLeft] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const initialPromptRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Relance le compte à rebours à chaque nouvelle question du recruteur
  useEffect(() => {
    if (!started || !timerMinutes) return;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant") {
      setTimeLeft(timerMinutes * 60);
    }
  }, [messages, started, timerMinutes]);

  // Fait décompter le chronomètre seconde par seconde
  useEffect(() => {
    if (!started || !timerMinutes) return;
    const id = setInterval(() => {
      setTimeLeft(t => (t !== null && t > 0 ? t - 1 : t));
    }, 1000);
    return () => clearInterval(id);
  }, [started, timerMinutes]);

  // Vérifie l'accès payant actif, sinon consomme un crédit d'essai gratuit.
  // Renvoie true si le candidat peut continuer, false s'il doit payer.
  async function checkAccess() {
    if (!candidate?.phone) return true;
    try {
      const res = await fetch(`/api/access/check?phone=${encodeURIComponent(candidate.phone)}`);
      const data = await res.json();
      if (data.hasActiveAccess) return true;

      const trialRes = await fetch("/api/trial/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: candidate.phone }),
      });
      const trialData = await trialRes.json();
      return !!trialData.allowed;
    } catch {
      return true; // ne bloque pas le candidat en cas de souci réseau
    }
  }

  const start = async () => {
    setLoading(true);
    const allowed = await checkAccess();
    if (!allowed) {
      setLoading(false);
      setBlocked(true);
      return;
    }
    setStarted(true);
    const contextLine = (secteur.trim() || poste.trim())
      ? `Contexte du candidat : il/elle postule pour le poste de "${poste.trim() || "non précisé"}" dans le secteur "${secteur.trim() || "non précisé"}". Adapte tes questions à ce contexte précis, en plus du thème du module choisi.\n\n`
      : "";
    const fullPrompt = contextLine + module.prompt;
    initialPromptRef.current = fullPrompt;
    const init = [{ role: "user", content: fullPrompt }];
    const reply = await callClaude(init);
    setMessages([
      { role: "user", content: fullPrompt },
      { role: "assistant", content: reply },
    ]);
    if (timerMinutes) setTimeLeft(timerMinutes * 60);
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const allowed = await checkAccess();
    if (!allowed) {
      setLoading(false);
      setBlocked(true);
      return;
    }
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    const apiMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
    const reply = await callClaude(apiMsgs);
    const starMatch = reply.match(/⭐+/);
    if (starMatch) {
      const stars = starMatch[0].length;
      setScore(p => ({ total: p.total + stars, count: p.count + 1 }));
    }
    setMessages(p => [...p, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  const handleKey = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const avg = score.count > 0 ? (score.total / score.count).toFixed(1) : "—";

  function generatePDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 15;
    const maxWidth = pageWidth - marginX * 2;
    let y = 22;

    doc.setFont(undefined, "bold");
    doc.setFontSize(18);
    doc.setTextColor(20, 20, 20);
    doc.text("Héméra — Rapport de simulation", marginX, y);
    y += 10;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(`Module : ${module.label}`, marginX, y); y += 6;
    if (poste.trim()) { doc.text(`Poste visé : ${poste.trim()}`, marginX, y); y += 6; }
    if (secteur.trim()) { doc.text(`Secteur : ${secteur.trim()}`, marginX, y); y += 6; }
    if (candidate?.email) { doc.text(`Candidat : ${candidate.email}`, marginX, y); y += 6; }
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, marginX, y); y += 6;
    doc.setTextColor(180, 140, 30);
    doc.setFont(undefined, "bold");
    doc.text(`Score moyen : ${avg} / 5`, marginX, y); y += 10;

    doc.setDrawColor(210, 210, 210);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    const visibleMessages = messages.filter(
      m => !(m.role === "user" && m.content === initialPromptRef.current)
    );

    doc.setFontSize(10.5);
    visibleMessages.forEach(msg => {
      const isRecruiter = msg.role === "assistant";
      if (y > 275) { doc.addPage(); y = 20; }

      doc.setFont(undefined, "bold");
      doc.setTextColor(isRecruiter ? 150 : 30, isRecruiter ? 100 : 30, isRecruiter ? 30 : 30);
      doc.text(isRecruiter ? "Recruteur :" : "Candidat :", marginX, y);
      y += 6;

      doc.setFont(undefined, "normal");
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(msg.content, maxWidth);
      lines.forEach(line => {
        if (y > 285) { doc.addPage(); y = 20; }
        doc.text(line, marginX, y);
        y += 5.5;
      });
      y += 5;
    });

    doc.save(`hemera-rapport-${module.id}-${Date.now()}.pdf`);
  }

  if (blocked) {
    return (
      <div style={{
        minHeight: "100vh", background: T.noir, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: T.or, fontFamily: "Georgia, serif", fontSize: "1.3rem", marginBottom: 12 }}>
            Essai gratuit terminé
          </h2>
          <p style={{ color: T.gris, fontSize: "0.85rem", lineHeight: 1.6, marginBottom: 24 }}>
            Tu as utilisé tes 2 questions d'essai gratuites. Débloque l'accès
            complet pour continuer à t'entraîner sur tous les modules.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={onBack} style={{
              padding: "12px 20px", background: "none", border: "1px solid #333",
              borderRadius: 4, color: T.gris, cursor: "pointer", fontSize: "0.85rem",
            }}>← Retour</button>
            <a href="/paiement" style={{
              padding: "12px 20px", background: T.or, border: "none",
              borderRadius: 4, color: T.noir, fontWeight: 700, cursor: "pointer",
              fontSize: "0.85rem", textDecoration: "none",
            }}>Débloquer l'accès →</a>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{
        minHeight: "100vh", background: T.noir,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: 24,
      }}>
        <div style={{
          background: T.charbon,
          border: `1px solid #222`,
          borderRadius: 6,
          padding: "48px 40px",
          maxWidth: 480, width: "100%",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>{module.icon}</div>
          <div style={{
            fontSize: "0.65rem", color: T.or,
            letterSpacing: 4, textTransform: "uppercase",
            marginBottom: 12,
          }}>Module sélectionné</div>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "1.8rem", fontWeight: 400,
            color: T.blanc, margin: "0 0 16px",
          }}>{module.label}</h2>
          <p style={{
            fontSize: "0.85rem", color: T.gris,
            lineHeight: 1.7, marginBottom: 32,
          }}>{module.desc}</p>

          <div style={{
            display: "flex", justifyContent: "center", gap: 32,
            marginBottom: 36,
            padding: "20px",
            background: T.graphite,
            borderRadius: 4,
          }}>
            {[
              { n: module.questions, l: "Questions" },
              { n: "5⭐", l: "Objectif" },
              { n: "JE", l: "Règle d'or" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "1.5rem", fontWeight: 700,
                  color: T.or,
                }}>{s.n}</div>
                <div style={{
                  fontSize: "0.65rem", color: T.gris,
                  letterSpacing: 1, textTransform: "uppercase",
                  marginTop: 4,
                }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: T.orFond,
            border: `1px solid ${T.or}33`,
            borderRadius: 4,
            padding: "12px 16px",
            marginBottom: 28,
            textAlign: "left",
          }}>
            {[
              "Parlez toujours en JE — jamais on/nous",
              "Donnez toujours un exemple concret",
              "Concluez en reliant au poste visé",
              "N'utilisez jamais 'voilà' en conclusion",
            ].map(r => (
              <div key={r} style={{
                fontSize: "0.78rem", color: T.orPale,
                marginBottom: 6, display: "flex", gap: 8,
              }}>
                <span style={{ color: T.or }}>→</span> {r}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 28, textAlign: "left" }}>
            <label style={{
              fontSize: "0.65rem", color: T.gris, letterSpacing: 1,
              textTransform: "uppercase", display: "block", marginBottom: 6,
            }}>Poste visé (optionnel)</label>
            <input
              type="text"
              value={poste}
              onChange={e => setPoste(e.target.value)}
              placeholder="Ex : Chef Comptable"
              style={{
                width: "100%", padding: "10px 12px", marginBottom: 16,
                background: T.graphite, border: `1px solid #2A2A2A`,
                borderRadius: 4, color: T.blanc, fontSize: "0.85rem",
                outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }}
            />

            <label style={{
              fontSize: "0.65rem", color: T.gris, letterSpacing: 1,
              textTransform: "uppercase", display: "block", marginBottom: 6,
            }}>Secteur d'activité (optionnel)</label>
            <input
              type="text"
              value={secteur}
              onChange={e => setSecteur(e.target.value)}
              placeholder="Ex : Hôtellerie, BTP, Banque..."
              style={{
                width: "100%", padding: "10px 12px", marginBottom: 20,
                background: T.graphite, border: `1px solid #2A2A2A`,
                borderRadius: 4, color: T.blanc, fontSize: "0.85rem",
                outline: "none", boxSizing: "border-box", fontFamily: "inherit",
              }}
            />

            <label style={{
              fontSize: "0.65rem", color: T.gris, letterSpacing: 1,
              textTransform: "uppercase", display: "block", marginBottom: 8,
            }}>Chronomètre par question</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TIMER_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setTimerMinutes(opt.value)}
                  style={{
                    padding: "8px 14px",
                    background: timerMinutes === opt.value ? T.or : "none",
                    border: `1px solid ${timerMinutes === opt.value ? T.or : "#2A2A2A"}`,
                    borderRadius: 20,
                    color: timerMinutes === opt.value ? T.noir : T.gris,
                    fontSize: "0.7rem", cursor: "pointer",
                    fontWeight: timerMinutes === opt.value ? 700 : 400,
                    transition: "all 0.15s",
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onBack} style={{
              flex: 1, padding: "12px",
              background: "none",
              border: `1px solid #2A2A2A`,
              color: T.gris, cursor: "pointer",
              fontSize: "0.8rem", borderRadius: 2,
              letterSpacing: 1, textTransform: "uppercase",
            }}>← Retour</button>
            <button onClick={start} style={{
              flex: 2, padding: "12px",
              background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
              border: "none", color: T.noir,
              cursor: "pointer", fontSize: "0.85rem",
              fontWeight: 700, borderRadius: 2,
              letterSpacing: 2, textTransform: "uppercase",
              boxShadow: `0 4px 20px ${T.or}40`,
            }}>Démarrer →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: T.noir,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: T.charbon,
        borderBottom: `1px solid #1E1E1E`,
        padding: "12px 20px",
        display: "flex", alignItems: "center", gap: 16,
        flexShrink: 0,
      }}>
        <Logo />
        <div style={{
          width: 1, height: 30, background: "#2A2A2A",
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "0.65rem", color: T.gris,
            letterSpacing: 2, textTransform: "uppercase",
          }}>{module.icon} {module.label}</div>
        </div>
        <div style={{
          display: "flex", gap: 20, alignItems: "center",
        }}>
          {timerMinutes && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "0.6rem", color: T.gris,
                letterSpacing: 1, textTransform: "uppercase",
              }}>Temps</div>
              <div style={{
                fontFamily: "Georgia, serif",
                fontSize: "1.1rem", fontWeight: 700,
                color: (timeLeft !== null && timeLeft <= 10) ? "#D9534F" : T.or,
              }}>{formatTime(timeLeft)}</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "0.6rem", color: T.gris,
              letterSpacing: 1, textTransform: "uppercase",
            }}>Moyenne</div>
            <div style={{
              fontFamily: "Georgia, serif",
              fontSize: "1.1rem", color: T.or,
              fontWeight: 700,
            }}>{avg}</div>
          </div>
          <button
            onClick={generatePDF}
            disabled={messages.length === 0}
            style={{
              background: "none", border: `1px solid ${T.or}`,
              color: T.or, padding: "6px 12px",
              fontSize: "0.7rem", cursor: messages.length === 0 ? "default" : "pointer",
              letterSpacing: 1, textTransform: "uppercase",
              borderRadius: 2, opacity: messages.length === 0 ? 0.4 : 1,
            }}
          >📄 Rapport PDF</button>
          <button onClick={onBack} style={{
            background: "none", border: `1px solid #2A2A2A`,
            color: T.gris, padding: "6px 12px",
            fontSize: "0.7rem", cursor: "pointer",
            letterSpacing: 1, textTransform: "uppercase",
            borderRadius: 2,
          }}>Quitter</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "24px 20px",
        display: "flex", flexDirection: "column",
      }}>
        {messages
          .filter(m => !(m.role === "user" && m.content === initialPromptRef.current))
          .map((msg, i) => <Bubble key={i} msg={msg} />)}

        {loading && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: T.noir,
              fontFamily: "Georgia, serif", flexShrink: 0,
            }}>H</div>
            <div style={{
              background: T.graphite,
              border: `1px solid #2A2A2A`,
              borderRadius: "18px 18px 18px 4px",
              padding: "12px 16px",
              display: "flex", gap: 5, alignItems: "center",
            }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: T.or,
                  animation: "pulse 1.4s infinite",
                  animationDelay: `${d}s`,
                  opacity: 0.6,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        background: T.charbon,
        borderTop: `1px solid #1E1E1E`,
        padding: "16px 20px",
        display: "flex", gap: 12, alignItems: "flex-end",
        flexShrink: 0,
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Rédigez votre réponse... (Entrée pour envoyer)"
          rows={3}
          style={{
            flex: 1,
            background: T.graphite,
            border: `1px solid #2A2A2A`,
            borderRadius: 4,
            padding: "12px 14px",
            color: T.blanc,
            fontSize: "0.88rem",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: 1.6,
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = T.or + "66"}
          onBlur={e => e.target.style.borderColor = "#2A2A2A"}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px",
            background: loading || !input.trim()
              ? "#222"
              : `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
            border: "none",
            borderRadius: 4,
            color: loading || !input.trim() ? T.gris : T.noir,
            fontSize: "1.1rem",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
            height: 44,
            transition: "all 0.2s",
            boxShadow: loading || !input.trim()
              ? "none"
              : `0 4px 15px ${T.or}40`,
          }}
        >→</button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        textarea::placeholder { color: #555; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.noir}; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
      `}</style>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
// ── Inscription du candidat ─────────────────────────────────────────────────
function Register({ onRegistered, onBack }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Adresse email invalide.");
      return;
    }
    if (cleanPhone.length < 8) {
      setError("Numéro de téléphone invalide.");
      return;
    }
    setError("");
    onRegistered({ email: email.trim(), phone: cleanPhone });
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.noir, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>🔑</div>
        <h1 style={{
          color: T.or, fontFamily: "Georgia, serif", fontSize: "1.4rem",
          textAlign: "center", marginBottom: 8,
        }}>
          Avant de commencer
        </h1>
        <p style={{ color: T.gris, fontSize: "0.85rem", textAlign: "center", marginBottom: 28, lineHeight: 1.6 }}>
          Renseigne ton email et ton numéro pour créer ton profil candidat.
          Tu bénéficies de 2 questions d'essai gratuites, tous modules confondus.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{
            fontSize: "0.65rem", color: T.gris, letterSpacing: 1,
            textTransform: "uppercase", display: "block", marginBottom: 6,
          }}>Adresse email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 16,
              background: T.graphite, border: "1px solid #2A2A2A",
              borderRadius: 4, color: T.blanc, fontSize: "0.85rem",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />

          <label style={{
            fontSize: "0.65rem", color: T.gris, letterSpacing: 1,
            textTransform: "uppercase", display: "block", marginBottom: 6,
          }}>Numéro de téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Ex : 077037005"
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 8,
              background: T.graphite, border: "1px solid #2A2A2A",
              borderRadius: 4, color: T.blanc, fontSize: "0.85rem",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
          <p style={{ color: "#666", fontSize: "0.7rem", marginBottom: 20 }}>
            Utilise le même numéro que celui utilisé pour ton paiement Mobile Money.
          </p>

          {error && (
            <p style={{ color: "#D9534F", fontSize: "0.8rem", marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: "12px 20px", background: "none", border: "1px solid #333",
                borderRadius: 4, color: T.gris, cursor: "pointer", fontSize: "0.85rem",
              }}
            >← Retour</button>
            <button
              type="submit"
              style={{
                flex: 1, padding: "12px 20px", background: T.or, border: "none",
                borderRadius: 4, color: T.noir, fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
              }}
            >Continuer →</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("landing");
  const [selectedModule, setSelectedModule] = useState(null);
  const [candidate, setCandidate] = useState(() => {
    try {
      const saved = localStorage.getItem("hemera_candidate");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleStart = (target, mod = null) => {
    if (target === "modules") {
      setPage(candidate ? "modules" : "register");
    }
    if (target === "simulator" && mod) {
      setSelectedModule(mod);
      setPage(candidate ? "simulator" : "register");
    }
  };

  const handleRegistered = (info) => {
    localStorage.setItem("hemera_candidate", JSON.stringify(info));
    setCandidate(info);
    setPage(selectedModule ? "simulator" : "modules");
  };

  if (page === "landing") return <Landing onStart={handleStart} />;
  if (page === "register") return (
    <Register onRegistered={handleRegistered} onBack={() => setPage("landing")} />
  );
  if (page === "modules") return (
    <ModuleSelect
      onSelect={m => { setSelectedModule(m); setPage("simulator"); }}
      onBack={() => setPage("landing")}
    />
  );
  if (page === "simulator" && selectedModule) return (
    <Simulator
      module={selectedModule}
      candidate={candidate}
      onBack={() => setPage("modules")}
    />
  );
  return null;
}

