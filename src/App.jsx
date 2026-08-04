import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";

// ── Design tokens ── Héméra, déesse de l'aube : de la nuit naît la lumière ──
const T = {
  // Fond : ivoire chaud, comme le premier jour qui se lève (plus de noir)
  noir:    "#FBF1E1",
  // Surface secondaire (nav, alternance) : sable doré
  charbon: "#F5E6C8",
  // Cartes / champs : ivoire clair
  graphite:"#FFFCF5",
  // Accent principal : braise ambrée — la couleur du soleil qui perce
  or:      "#D9641E",
  // Halo doré — points forts, dégradés
  orPale:  "#F2A93C",
  // Fond doux pour badges / encarts
  orFond:  "#FBE3C4",
  // Texte principal : encre brune chaude (jamais de noir pur)
  blanc:   "#2B1B10",
  // Texte secondaire
  gris:    "#8A6F5C",
  grisClair:"#5C4A3D",
  // Résidu de nuit — contrastes profonds, ombres
  nuit:    "#3B2145",
  // Braise vive — alertes, urgence
  braise:  "#C43E1C",
  // Bordures chaudes
  bordure: "#E8D2AC",
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Manrope', 'Segoe UI', system-ui, sans-serif";
const FONT_MONO = "'Space Mono', 'Courier New', monospace";

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
    color: "#A8763E",
    prompt: `Module: MANAGEMENT. Présente-toi comme recruteur. Pose la première question sur l'organisation d'une équipe comptable.`,
  },
  {
    id: "technique",
    label: "Technique Comptable et audit",
    icon: "📊",
    desc: "SYSCOHADA Révisé, DSF, immobilisations, provisions, audit, normes IFRS, contrôle de gestion,  rapprochements bancaires",
    questions: 20,
    color: "#6B8E5A",
    prompt: `Module: TECHNIQUE COMPTABLE ET AUDIT. Présente-toi comme recruteur. Pose la première question: "Quels logiciels comptables maîtrisez-vous et comment les avez-vous utilisés concrètement?"`,
  },
  {
    id: "OHADA",
    label: "Réglementation OHADA",
    icon: "⚖️",
    desc: "SYSCOHADA révisé 2018, obligations, sanctions, états financiers",
    questions: 10,
    color: "#8B5FA0",
    prompt: `Module: SYSCOHADA révisé 2018. Présente-toi comme recruteur. Pose la première question sur le cadre comptable OHADA au Gabon.`,
  },
  {
    id: "fiscalite",
    label: "Fiscalité Gabonaise",
    icon: "🏛️",
    desc: "TVA 18%, TPS 9.5%, IS 30%, DSF, contrôles fiscaux, Digitax, loi des finances rectificative Gabon 2026",
    questions: 15,
    color: "#C43E1C",
    prompt: `Module: FISCALITÉ GABONAISE. Présente-toi comme recruteur. Pose la première question sur les obligations fiscales d'une entreprise au Gabon.`,
  },
  {
    id: "social",
    label: "Sécurité Sociale",
    icon: "🏥",
    desc: "CNSS, CNAMGS, taux 2026, calculs, sanctions, contrôles",
    questions: 10,
    color: "#3D7A8C",
    prompt: `Module: SÉCURITÉ SOCIALE. Présente-toi comme recruteur. Pose la première question sur les obligations sociales d'un employeur au Gabon.`,
  },
  {
    id: "complet",
    label: "Simulation Complète",
    icon: "🎯",
    desc: "Simulation d'entretien complet de A à Z — personnalité, management, technique, OHADA, fiscalité, social",
    questions: 78,
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

// ── Synthèse vocale (lecture audio des questions) ───────────────────────────
// Fonctionnalité native du navigateur, gratuite, aucun coût API.
function speakText(text) {
  if (!window.speechSynthesis) {
    alert("La lecture audio n'est pas supportée par ce navigateur. Essaie avec Chrome.");
    return;
  }
  window.speechSynthesis.cancel(); // stoppe une lecture en cours avant d'en lancer une nouvelle
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
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
    <div
      onClick={() => { window.location.href = "/"; }}
      role="button"
      title="Retour à l'accueil"
      style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
    >
      <div style={{
        width: 36, height: 36,
        background: `radial-gradient(circle at 35% 30%, ${T.orPale}, ${T.or} 70%)`,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: 700, color: T.blanc,
        fontFamily: "'Fraunces', Georgia, serif",
        boxShadow: `0 0 4px ${T.orPale}, 0 0 18px ${T.or}88, 0 0 34px ${T.or}44`,
      }}>H</div>
      <div>
        <div style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: "1.1rem", fontWeight: 700,
          color: T.or, letterSpacing: 3,
          textTransform: "uppercase",
        }}>Héméra</div>
        <div style={{
          fontSize: "0.6rem", color: T.gris,
          letterSpacing: 2, textTransform: "uppercase",
          fontFamily: "'Space Mono', monospace",
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

// ── Icônes de modules — illustrations sur-mesure (aucune photo, zéro droits) ─
function ModuleIcon({ id, size = 28, color }) {
  const c = color || "currentColor";
  const common = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: c, strokeWidth: 1.5,
    strokeLinecap: "round", strokeLinejoin: "round",
  };

  switch (id) {
    case "personnalite": // buste au lever du jour
      return (
        <svg {...common}>
          <path d="M12 3v2.2M6.5 5.5l1.4 1.4M17.5 5.5l-1.4 1.4" />
          <circle cx="12" cy="10" r="3.2" />
          <path d="M5.5 21c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        </svg>
      );
    case "management": // équipe reliée
      return (
        <svg {...common}>
          <circle cx="12" cy="6" r="2.3" />
          <circle cx="5.5" cy="16" r="2.3" />
          <circle cx="18.5" cy="16" r="2.3" />
          <path d="M12 8.3V12M12 12L5.5 13.9M12 12l6.5 1.9" />
        </svg>
      );
    case "technique": // registre comptable
      return (
        <svg {...common}>
          <path d="M5 4.5h14v16.2c-2-1-4-1-6.5 0-2.5 1-5-1-7.5 0z" />
          <path d="M9 9h6M9 12.5h6M9 16h4" />
        </svg>
      );
    case "OHADA": // balance de la justice
      return (
        <svg {...common}>
          <path d="M12 3v17M8 20h8" />
          <path d="M4 7h6M14 7h6" />
          <path d="M4 7l-2.3 4.6a2.6 2.6 0 0 0 4.6 0L4 7zM20 7l-2.3 4.6a2.6 2.6 0 0 0 4.6 0L20 7z" />
        </svg>
      );
    case "fiscalite": // reçu fiscal
      return (
        <svg {...common}>
          <path d="M6 3.5h12v17l-2.3-1.5-2.2 1.5-2.2-1.5-2.3 1.5-2.2-1.5-2.3 1.5v-17z" />
          <path d="M9 8.5l6 6M9.3 8.5h.01M14.7 14.5h.01" />
        </svg>
      );
    case "social": // bouclier de protection
      return (
        <svg {...common}>
          <path d="M12 3.2l7 2.6v5.4c0 4.5-3 7.7-7 9.6-4-1.9-7-5.1-7-9.6V5.8z" />
          <path d="M9.3 12l1.9 1.9 3.6-3.9" />
        </svg>
      );
    case "complet": // cible rayonnante — écho du soleil Héméra
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="12" cy="12" r="0.6" fill={c} />
          <path d="M12 2.3v2.3M12 19.4v2.3M2.3 12h2.3M19.4 12h2.3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
        </svg>
      );
  }
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
          fontSize: 13, fontWeight: 700, color: T.blanc,
          fontFamily: "'Fraunces', Georgia, serif",
        }}>H</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "80%", alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div style={{
          background: isUser
            ? `linear-gradient(135deg, ${T.or}22, ${T.orFond})`
            : T.graphite,
          border: isUser
            ? `1px solid ${T.or}44`
            : `1px solid #E8D2AC`,
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "12px 16px",
          color: T.blanc,
          fontSize: "0.88rem",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
        {!isUser && (
          <button
            onClick={() => speakText(msg.content)}
            style={{
              background: "none", border: "none", color: T.gris,
              fontSize: "0.68rem", cursor: "pointer", padding: "4px 2px 0",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >🔊 Écouter la question</button>
        )}
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
      fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif",
      overflowX: "hidden",
      position: "relative",
    }}>
      {/* Halo d'aube — la lumière d'Héméra perçant derrière le titre */}
      <div aria-hidden="true" style={{
        position: "absolute", top: "-10%", left: "50%",
        transform: "translateX(-50%)",
        width: 900, height: 900, maxWidth: "140vw",
        background: `radial-gradient(circle, ${T.orPale}55 0%, ${T.or}22 35%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid #E8D2AC`,
        position: "relative", zIndex: 1,
      }}>
        <Logo />
        <div style={{
          fontSize: "0.75rem", color: T.gris,
          letterSpacing: 1, textTransform: "uppercase",
          fontFamily: "'Space Mono', monospace",
        }}>Gabon · OHADA · 2026</div>
      </nav>

      {/* Hero */}
      <div style={{
        padding: "80px 32px 60px",
        maxWidth: 900, margin: "0 auto",
        textAlign: "center",
        position: "relative", zIndex: 1,
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
          fontFamily: "'Fraunces', Georgia, serif",
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
                fontFamily: "'Fraunces', Georgia, serif",
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
            color: T.blanc,
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
                border: `1px solid ${hovered === m.id ? T.or + "44" : "#EDD9B0"}`,
                borderRadius: 4,
                padding: "20px 20px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hovered === m.id ? "translateY(-2px)" : "none",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: `${m.color}1E`, marginBottom: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ModuleIcon id={m.id} size={22} color={m.color} />
              </div>
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
    