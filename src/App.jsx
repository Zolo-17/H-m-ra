import { useState } from "react";
// import { jsPDF } from "jspdf"; // si tu utilises l'export PDF ailleurs

// ── Design tokens ── Héméra, déesse de l'aube : de la nuit naît la lumière ──
const T = {
  // Fond : ivoire chaud, comme le premier jour qui se lève (plus de noir)
  noir: "#FBF1E1",
  // Surface secondaire (nav, alternance) : sable doré
  charbon: "#F5E6C8",
  // Cartes / champs : ivoire clair
  graphite: "#FFFCF5",
  // Accent principal : braise ambrée — la couleur du soleil qui perce
  or: "#D9641E",
  // Halo doré — points forts, dégradés
  orPale: "#F2A93C",
  // Fond doux pour badges / encarts
  orFond: "#FBE3C4",
  // Texte principal : encre brune chaude (jamais de noir pur)
  blanc: "#2B1B10",
  // Texte secondaire
  gris: "#8A6F5C",
  grisClair: "#5C4A3D",
  // Résidu de nuit — contrastes profonds, ombres
  nuit: "#3B2145",
  // Braise vive — alertes, urgence
  braise: "#C43E1C",
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
          fontFamily: "'Fraunces', Georgia, serif",
          boxShadow: `0 0 4px ${T.orPale}, 0 0 18px ${T.or}88, 0 0 34px ${T.or}44`,
        }}
      >
        H
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
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
            fontFamily: "'Space Mono', monospace",
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
      {/* Halo d'aube — la lumière d'Héméra perçant derrière le titre */}
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
        {/* Ornement vertical */}
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
          Gabon