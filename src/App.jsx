import { useState } from "react";

// ── Design tokens ── Héméra, déesse de l'aube : de la nuit naît la lumière ──
const T = {
  noir: "#FBF1E1",
  charbon: "#F5E6C8",
  graphite: "#FFFCF5",
  or: "#D9641E",
  orPale: "#F2A93C",
  orFond: "#FBE3C4",
  blanc: "#2B1B10",
  gris: "#8A6F5C",
  grisClair: "#5C4A3D",
  nuit: "#3B2145",
  braise: "#C43E1C",
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

// ── Synthèse vocale ───────────────────────────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis) {
    alert("La lecture audio n'est pas supportée par ce navigateur. Essaie avec Chrome.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

// ── API call ───────────────────────────────────────────────────────────────
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
      onClick={() => {
        window.location.href = "/";
      }}
      role="button"
      title="Retour à l'accueil"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: `radial-gradient(circle at 35% 30%, ${T.orPale}, ${T.or} 70%)`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          color: T.blanc,
          fontFamily: FONT_DISPLAY,
          boxShadow: `0 0 4px ${T.orPale}, 0 0 18px ${T.or}88, 0 0 34px ${T.or}44`,
        }}
      >
        H
      </div>
      <div>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "1.1rem",
            fontWeight: 700,
            color: T.or,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Héméra
        </div>
        <div
          style={{
            fontSize: "0.6rem",
            color: T.gris,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontFamily: FONT_MONO,
          }}
        >
          Prépare · Brille · Réussis
        </div>
      </div>
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────────────
function Landing({ onStart }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.noir,
        color: T.blanc,
        fontFamily: FONT_BODY,
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Halo d'aube */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          maxWidth: "140vw",
          background: `radial-gradient(circle, ${T.orPale}55 0%, ${T.or}22 35%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${T.bordure}`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Logo />
        <div
          style={{
            fontSize: "0.75rem",
            color: T.gris,
            letterSpacing: 1,
            textTransform: "uppercase",
            fontFamily: FONT_MONO,
          }}
        >
          Gabon · OHADA · 2026
        </div>
      </nav>

      {/* Hero */}
      <div
        style={{
          padding: "100px 32px 80px",
          maxWidth: 900,
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: 1,
            height: 60,
            background: `linear-gradient(to bottom, transparent, ${T.or})`,
            margin: "0 auto 32px",
          }}
        />

        <div
          style={{
            fontSize: "0.7rem",
            color: T.or,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Simulateur d'entretien professionnel
        </div>

        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
            fontWeight: 400,
            lineHeight: 1.2,
            color: T.blanc,
            margin: "0 0 16px",
            letterSpacing: -0.3,
          }}
        >
          Préparez-vous comme jamais
          <br />
          <span style={{ color: T.or }}>aucun candidat</span> ne se prépare
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: T.gris,
            maxWidth: 580,
            margin: "0 auto 16px",
            lineHeight: 1.8,
          }}
        >
          Le premier simulateur d'entretien conçu spécifiquement pour les
          professionnels de la comptabilité et de la finance au Gabon. SYSCOHADA,
          fiscalité gabonaise, OHADA — maîtrisez chaque question avec l'IA comme
          coach.
        </p>

        <p
          style={{
            fontSize: "0.85rem",
            color: T.gris,
            maxWidth: 580,
            margin: "0 auto 40px",
            lineHeight: 1.7,
          }}
        >
          Conçu pour les professionnels de la comptabilité et de la finance au
          Gabon — Libreville, Port‑Gentil, Franceville et toute la sous‑région.
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 56,
            marginBottom: 56,
          }}
        >
          {[
            { n: "7", l: "Modules" },
            { n: "OHADA", l: "Révisé" },
            { n: "5⭐", l: "Standard exigé" },
          ].map((s) => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: T.or,
                  lineHeight: 1,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: T.gris,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                {s.l}
              </div>
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
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow = `0 8px 40px ${T.or}60`)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.boxShadow = `0 4px 30px ${T.or}40`)
          }
        >
          Commencer la simulation →
        </button>

        <div
          style={{
            fontSize: "0.75rem",
            color: T.gris,
            marginTop: 14,
            lineHeight: 1.5,
          }}
        >
          Gratuit pour le module Personnalité · Accès complet via Mobile Money
        </div>

        <div
          style={{
            width: 1,
            height: 60,
            background: `linear-gradient(to bottom, ${T.or}, transparent)`,
            margin: "56px auto 0",
          }}
        />
      </div>

      {/* Modules preview */}
      <div
        style={{
          padding: "0 32px 80px",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            color: T.gris,
            letterSpacing: 4,
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Modules disponibles
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {MODULES.map((m) => (
            <div
              key={m.id}
              onClick={() => onStart("simulator", m)}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === m.id ? T.graphite : T.charbon,
                border: `1px solid ${
                  hovered === m.id ? T.or + "66" : T.bordure
                }`,
                borderRadius: 6,
                padding: "22px 20px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hovered === m.id ? "translateY(-3px)" : "none",
                boxShadow:
                  hovered === m.id
                    ? `0 10px 30px ${T.or}15`
                    : `0 2px 10px ${T.noir}08`,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 10 }}>{m.icon}</div>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: hovered === m.id ? T.or : T.blanc,
                  marginBottom: 6,
                  transition: "color 0.2s",
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: T.gris,
                  lineHeight: 1.5,
                  marginBottom: 12,
                }}
              >
                {m.desc}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: T.or,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {m.questions} questions
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${T.bordure}`,
          padding: "28px 32px",
          textAlign: "center",
        }}
      >
        <Logo />
        <div
          style={{
            fontSize: "0.7rem",
            color: T.gris,
            marginTop: 12,
            letterSpacing: 1,
            lineHeight: 1.5,
          }}
        >
          Conçu pour les professionnels gabonais · SYSCOHADA 2018 · Fiscalité
          2026 · CNSS & CNAMGS
        </div>
      </div>
    </div>
  );
}

// ── Module Selection ───────────────────────────────────────────────────────
function ModuleSelect({ onSelect, onBack }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.noir,
        color: T.blanc,
        fontFamily: FONT_BODY,
      }}
    >
      <nav
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${T.bordure}`,
        }}
      >
        <Logo />
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: `1px solid ${T.bordure}`,
            color: T.gris,
            padding: "8px 16px",
            fontSize: "0.75rem",
            cursor: "pointer",
            letterSpacing: 1,
            textTransform: "uppercase",
            borderRadius: 2,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.graphite;
            e.currentTarget.style.color = T.blanc;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = T.gris;
          }}
        >
          ← Retour
        </button>
      </nav>

      <div style={{ padding: "48px 32px", maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            fontSize: "0.65rem",
            color: T.or,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Choisissez votre module
        </div>
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: "2rem",
            fontWeight: 500,
            color: T.blanc,
            margin: "0 0 48px",
            letterSpacing: -0.2,
          }}
        >
          Sur quoi souhaitez-vous vous entraîner ?
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          {MODULES.map((m) => (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === m.id ? T.graphite : T.charbon,
                border: `1px solid ${
                  hovered === m.id ? T.or + "66" : T.bordure
                }`,
                borderRadius: 6,
                padding: "26px 22px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hovered === m.id ? "translateY(-3px)" : "none",
                boxShadow:
                  hovered === m.id
                    ? `0 10px 30px ${T.or}15`
                    : `0 2px 10px ${T.noir}08`,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{m.icon}</div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: hovered === m.id ? T.or : T.blanc,
                  marginBottom: 8,
                  transition: "color 0.2s",
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: T.gris,
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}
              >
                {m.desc}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: T.or,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {m.questions} questions
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: "0.8rem",
            color: T.gris,
            lineHeight: 1.6,
            maxWidth: 620,
          }}
        >
          Chaque module vous plonge dans une simulation d'entretien réaliste,
          avec feedback immédiat, note sur 5⭐ et reformulations optimisées.
          Commencez par le module Personnalité (gratuit), puis débloquez l'accès
          complet via Mobile Money.
        </div>
      </div>

      {/* Footer simplifié */}
      <div
        style={{
          borderTop: `1px solid ${T.bordure}`,
          padding: "20px 32px",
          textAlign: "center",
          marginTop: 40,
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: T.gris,
            letterSpacing: 1,
          }}
        >
          Héméra · Simulateur d'entretien pour professionnels gabonais
        </div>
      </div>
    </div>
  );
}

// ── App (structure minimale – à compléter avec ton simulateur) ───────────
export default function App() {
  const [screen, setScreen] = useState("landing"); // "landing" | "modules" | "simulator"
  const [selectedModule, setSelectedModule] = useState(null);

  function handleStart(target, module = null) {
    if (target === "modules") {
      setScreen("modules");
    } else if (target === "simulator" && module) {
      setSelectedModule(module);
      setScreen("simulator");
    }
  }

  function handleBackToLanding() {
    setScreen("landing");
    setSelectedModule(null);
  }

  if (screen === "landing") {
    return <Landing onStart={handleStart} />;
  }

  if (screen === "modules") {
    return (
      <ModuleSelect
        onSelect={(m) => handleStart("simulator", m)}
        onBack={handleBackToLanding}
      />
    );
  }

  if (screen === "simulator" && selectedModule) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.noir,
          color: T.blanc,
          fontFamily: FONT_BODY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "1.8rem",
              fontWeight: 600,
              color: T.blanc,
              marginBottom: 12,
            }}
          >
            Module : {selectedModule.label}
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: T.gris,
              maxWidth: 500,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Écran de simulation à intégrer ici (chat avec l'IA, timer, feedback,
            export PDF, etc.).
          </div>
          <button
            onClick={handleBackToLanding}
            style={{
              marginTop: 28,
              background: "none",
              border: `1px solid ${T.bordure}`,
              color: T.gris,
              padding: "10px 18px",
              fontSize: "0.75rem",
              cursor: "pointer",
              letterSpacing: 1,
              textTransform: "uppercase",
              borderRadius: 2,
            }}
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return <Landing onStart={handleStart} />;