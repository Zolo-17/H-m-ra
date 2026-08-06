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

// Normalise un texte pour comparer des mots-clés sans tenir compte des accents/majuscules
function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
// Renvoie null en cas d'échec (au lieu d'un texte d'erreur trompeur), pour
// permettre au Simulator de basculer proprement en mode basique.
async function callClaude(messages, extraSystem = "") {
  try {
    const res = await fetch("/api/interview/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: SYSTEM_PROMPT + extraSystem,
        messages,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error || !data.reply) return null;
    return data.reply;
  } catch {
    return null;
  }
}

// ── Banque de questions de secours ──────────────────────────────────────────
// Utilisée automatiquement si l'IA est indisponible — invisible pour le
// candidat, qui vit une expérience continue. Les mots-clés attendus dans la
// réponse sont marqués **ainsi** et s'affichent en valeur (voir Bubble).
// Réponses-modèles généralisées : à personnaliser (nom, employeur, années).
const FALLBACK_BANK = {
  personnalite: [
    { q: "Présentez-vous.", points: ["**nom complet**", "**années d'expérience**", "**poste actuel et employeur**", "**outils maîtrisés**"], s: "Je m'appelle [votre nom], comptable avec **plus de X années d'expérience**. Je travaille actuellement chez [votre employeur] où je gère **la comptabilité générale**, les déclarations fiscales et les travaux de fin d'exercice. Je maîtrise **Sage 100**, Digitax et Excel, et je suis aujourd'hui à la recherche d'une nouvelle opportunité." },
    { q: "Quelles sont vos qualités principales ?", points: ["**3 qualités liées au métier**", "**exemple concret**", "**pourquoi ça compte**"], s: "Je suis **rigoureux(se)** — je vérifie toujours mes travaux avant de les soumettre. Je suis **discret(ète)**, car je traite des informations financières sensibles au quotidien. Et je respecte la **déontologie**, base de la confiance avec les clients." },
    { q: "Quels sont vos défauts ?", points: ["**défaut réel non rédhibitoire**", "**comment vous le gérez**", "**rester bref et honnête**"], s: "Je suis parfois **trop perfectionniste**, ce qui me pousse à revérifier mon travail plusieurs fois. Je gère cela en m'imposant des **limites de temps claires** pour chaque tâche." },
    { q: "Pourquoi cherchez-vous un nouveau poste ?", points: ["**ne jamais critiquer l'employeur actuel**", "**motivation positive**", "**lien avec le poste visé**"], s: "Après **[X années] en entreprise**, je souhaite évoluer vers un environnement offrant plus de diversité de missions. Ce poste me permettrait de mettre à profit mon expertise tout en continuant à **progresser dans ma carrière**." },
    { q: "Pourquoi ce poste, pourquoi cette entreprise ?", points: ["**personnaliser la réponse**", "**ce qui vous attire précisément**", "**lien avec votre expérience**"], s: "Ce poste représente pour moi une opportunité d'**approfondir mon expertise** dans un environnement stimulant. Mon expérience passée est complémentaire à ce que vous recherchez, et cette diversité me motive vraiment." },
    { q: "Comment gérez-vous la pression et les délais serrés ?", points: ["**méthode concrète (planning, priorisation)**", "**exemple vécu**", "**calme et maîtrise**"], s: "Je priorise mes tâches avec un **planning clair**. Lors des périodes de clôture, je planifie chaque étape à l'avance pour ne jamais être pris(e) de court. La **rigueur dans l'organisation** est ma meilleure arme contre la pression." },
    { q: "Comment travaillez-vous en équipe ?", points: ["**communication et transparence**", "**disponibilité envers les collègues**", "**autonomie**"], s: "Je partage l'information facilement, je suis **disponible pour mes collègues** et j'adapte ma communication selon les interlocuteurs. La **transparence** est essentielle, tout en sachant travailler en **autonomie**." },
    { q: "Décrivez une erreur professionnelle et ce que vous en avez appris.", points: ["**erreur réelle non grave**", "**prise de responsabilité**", "**leçon apprise**"], s: "J'ai eu un écart dans un rapprochement bancaire traité trop rapidement. J'en ai pris la **responsabilité**, je l'ai régularisé, et j'ai appris à **toujours vérifier deux fois** avant de valider." },
    { q: "Où vous voyez-vous dans 3 ans ?", points: ["**ambition réaliste**", "**évolution vers plus de responsabilités**", "**lien avec l'entreprise**"], s: "J'aimerais évoluer vers un poste avec **plus de responsabilités**, en supervision et en conseil. Ce poste serait le cadre idéal pour y parvenir, si vous m'accompagnez dans cette progression." },
    { q: "Quelle est votre prétention salariale ?", points: ["**ne pas donner de chiffre en premier**", "**vous positionner comme apportant une expertise**", "**ouverture à la discussion**"], s: "Je m'inscris dans une dynamique d'**intérêt commun**. Ce que j'apporte, c'est une expertise de **[X années]** et un savoir-faire éprouvé. Je vous fais confiance pour formuler une proposition **en adéquation avec le poste**, et je reste ouvert(e) à en discuter." },
  ],
  management: [
    { q: "Comment organisez-vous le travail au sein de votre équipe ?", points: ["**répartition selon les compétences**", "**planning avec échéances**", "**suivi régulier**"], s: "J'évalue les **compétences de chacun** pour répartir les tâches. J'établis un **planning avec échéances claires**, j'organise des points d'équipe réguliers et je reste disponible pour accompagner les difficultés." },
    { q: "Comment contrôlez-vous la qualité du travail de vos collaborateurs ?", points: ["**procédure de révision systématique**", "**points sensibles vérifiés**", "**retour constructif**"], s: "Je mets en place une **révision systématique** sur les points sensibles : rapprochements, déclarations, soldes inhabituels. Après chaque contrôle, je donne un **retour constructif** pour faire progresser mon collaborateur." },
    { q: "Comment formez-vous un collaborateur junior ?", points: ["**expliquer le sens avant la méthode**", "**montrer puis laisser faire**", "**valoriser les progrès**"], s: "J'explique le **sens de chaque tâche**, pas seulement la méthode. Je procède par étapes : je montre, on fait ensemble, puis je laisse le junior faire seul. Je **valorise les progrès** pour renforcer sa confiance." },
    { q: "Comment gérez-vous les priorités en période de clôture avec plusieurs dossiers ?", points: ["**matrice urgence/importance**", "**anticipation**", "**délégation**"], s: "J'établis une **matrice de priorités** urgence/importance. J'anticipe les clôtures en planifiant les étapes en amont, et je **délègue les tâches exécutives** pour me concentrer sur la supervision." },
    { q: "Un client se plaint de la qualité du travail d'un collaborateur. Comment réagissez-vous ?", points: ["**écouter sans minimiser**", "**vérifier les faits**", "**assumer la responsabilité**"], s: "J'écoute le client sans minimiser sa plainte, je vérifie les faits avec mon collaborateur, puis j'**assume la responsabilité** en tant que superviseur et je corrige le problème avec des mesures préventives." },
    { q: "Comment motivez-vous votre équipe ?", points: ["**reconnaissance du travail**", "**implication dans les décisions**", "**montée en compétences**"], s: "Je **valorise le travail bien fait** et j'implique mes collaborateurs dans les décisions qui les concernent. Je favorise leur **montée en compétences** en leur confiant progressivement de nouvelles responsabilités." },
    { q: "Comment gérez-vous un collaborateur en difficulté ?", points: ["**identifier la cause**", "**entretien individuel bienveillant**", "**objectifs clairs et suivi**"], s: "J'identifie d'abord la **nature de la difficulté** lors d'un entretien individuel bienveillant. Je propose un accompagnement adapté, puis je fixe des **objectifs clairs** avec un suivi rapproché." },
    { q: "Comment faites-vous monter en compétences votre équipe sur des sujets complexes ?", points: ["**partage de connaissances interne**", "**cas concrets**", "**évaluation des acquis**"], s: "J'organise des **sessions de partage de connaissances** basées sur des cas concrets. J'encourage les formations externes et j'**évalue régulièrement les acquis** pour ajuster le plan de formation." },
    { q: "Comment assurez-vous la continuité du service en cas d'absence d'un collaborateur clé ?", points: ["**documentation des dossiers**", "**polyvalence en binôme**", "**tableau de bord partagé**"], s: "Je veille à ce que chaque dossier soit **documenté et accessible** par au moins deux personnes. Je forme mes collaborateurs en **binôme** et je maintiens un **tableau de bord partagé** sur l'état des dossiers." },
    { q: "Comment gérez-vous un désaccord avec votre supérieur ?", points: ["**arguments factuels**", "**respect de la décision finale**", "**traçabilité**"], s: "J'expose mon point de vue avec des **arguments factuels** et des chiffres à l'appui, de manière respectueuse. Si la décision finale lui revient, je l'applique tout en **documentant mes observations**." },
  ],
  technique: [
    { q: "Quels logiciels comptables maîtrisez-vous ?", points: ["**Sage 100 (Compta, Immobilisations, Gestion Commerciale)**", "**Digitax**", "**Excel**"], s: "Je maîtrise **Sage 100** Comptabilité, Immobilisations et Gestion Commerciale, ainsi que **Digitax** pour les obligations fiscales. Je suis également à l'aise avec **Excel** pour les analyses et le reporting." },
    { q: "Qu'est-ce qu'un rapprochement bancaire ?", points: ["**comparer relevé et solde comptable**", "**identifier les écarts**", "**fréquence mensuelle**"], s: "C'est le contrôle entre le **solde du relevé bancaire** et le solde comptable, afin d'**identifier et d'expliquer les écarts**. Il se réalise généralement **chaque mois**." },
    { q: "Quels types de déclarations fiscales avez-vous traités ?", points: ["**TVA, TPS, TSIL, CSS**", "**plateforme Digitax**", "**relation avec l'administration**"], s: "J'ai traité la **TVA**, la TPS, la TSIL, la CSS et les impôts sur salaires, via **Digitax**. Je gère également la relation avec l'**administration fiscale**." },
    { q: "Qu'est-ce que la TVA et comment fonctionne-t-elle ?", points: ["**impôt indirect collecté sur les ventes**", "**déduction sur les achats**", "**taux 18% au Gabon**"], s: "La TVA est un impôt indirect **collecté sur les ventes** et reversé à l'État, après **déduction de la TVA payée sur les achats**. Au Gabon, le taux normal est de **18%**." },
    { q: "Qu'est-ce que la DSF et comment la montez-vous ?", points: ["**balance définitive**", "**cohérence avec les déclarations fiscales**", "**délais légaux**"], s: "Je pars de la **balance définitive** après tous les travaux de fin d'exercice. Je contrôle la **cohérence avec les déclarations fiscales** de l'année, puis je renseigne bilan, compte de résultat et annexes dans les **délais légaux**." },
    { q: "Comment traitez-vous les immobilisations ?", points: ["**coût d'acquisition**", "**plan d'amortissement**", "**suivi et inventaire**"], s: "Je les enregistre à leur **coût d'acquisition**, je calcule les **amortissements** selon leur nature et durée d'utilité, et je réalise un **inventaire annuel** pour vérifier leur existence physique." },
    { q: "Comment gérez-vous le recouvrement des créances ?", points: ["**suivi des échéances**", "**relances progressives**", "**provisions pour créances douteuses**"], s: "Je suis les **échéances clients**, j'envoie des **relances progressives** en commençant par l'amiable, et je constitue des **provisions pour créances douteuses** en cas de non-paiement persistant." },
    { q: "Quelle est la différence entre résultat comptable et résultat fiscal ?", points: ["**résultat comptable = compte de résultat**", "**réintégrations/déductions fiscales**", "**base de calcul de l'IS**"], s: "Le résultat comptable est issu du **compte de résultat**. Le résultat fiscal s'obtient en **réintégrant les charges non déductibles** et en déduisant les abattements autorisés. C'est sur ce résultat fiscal que l'**IS** est calculé." },
    { q: "Comment détectez-vous une anomalie dans les comptes ?", points: ["**contrôles de cohérence**", "**soldes inhabituels**", "**croisement avec pièces justificatives**"], s: "Je réalise des **contrôles de cohérence** entre les comptes, je vérifie les **soldes inhabituels**, et je croise les données avec les **pièces justificatives** et relevés bancaires." },
    { q: "Comment justifiez-vous un solde de compte lors d'un audit ?", points: ["**balance claire**", "**pièces justificatives**", "**dossier de révision structuré**"], s: "Je prépare une **balance des comptes** claire, je fournis les **pièces justificatives** pour chaque mouvement, et j'anticipe les questions en constituant un **dossier de révision structuré**." },
  ],
  OHADA: [
    { q: "Que savez-vous du cadre comptable OHADA appliqué au Gabon ?", points: ["**SYSCOHADA révisé**", "**harmonisation 17 États**", "**états financiers obligatoires**"], s: "Le Gabon applique le **SYSCOHADA révisé** depuis 2018. Ce référentiel **harmonise les pratiques comptables** dans 17 États membres et impose des **états financiers structurés**." },
    { q: "Quelles sont les principales obligations comptables selon le SYSCOHADA ?", points: ["**comptabilité régulière et sincère**", "**plan comptable OHADA**", "**conservation des pièces**"], s: "Le SYSCOHADA impose une **comptabilité régulière et sincère**, conforme au **plan comptable OHADA**. L'entreprise doit produire des états financiers annuels et **conserver les pièces justificatives**." },
    { q: "Quelle est la différence entre système normal et système minimal de trésorerie ?", points: ["**seuils de chiffre d'affaires**", "**jeu complet d'états financiers**", "**entités simplifiées**"], s: "Le **système normal** s'applique aux entités dépassant certains seuils et exige un **jeu complet d'états financiers** ; le système minimal, simplifié, cible les **très petites entités**." },
    { q: "Comment préparez-vous une DSF dans le contexte OHADA ?", points: ["**balance définitive**", "**vérification amortissements/provisions**", "**respect des délais**"], s: "Je pars de la **balance définitive**, je vérifie les **amortissements et provisions**, puis je renseigne les états financiers OHADA et annexes dans le **respect des délais**." },
    { q: "Quelle est la différence entre résultat comptable et résultat fiscal en cadre OHADA ?", points: ["**résultat comptable OHADA**", "**retraitements fiscaux**", "**base de l'IS**"], s: "Le résultat comptable provient du **compte de résultat OHADA**. Le résultat fiscal s'obtient en le **retraitant selon la législation fiscale**, et sert de base au calcul de l'**IS**." },
    { q: "Comment garantissez-vous la conformité d'un dossier comptable aux normes OHADA ?", points: ["**procédure de révision**", "**vérification des pièces**", "**anticipation des audits**"], s: "Je mets en place une **procédure de révision structurée**, je contrôle les pièces et les soldes sensibles, et je **documente chaque étape** pour anticiper les audits." },
    { q: "Comment révisez-vous le travail de vos collaborateurs selon les normes OHADA ?", points: ["**cohérence de la balance**", "**justification des soldes**", "**conformité OHADA**"], s: "Je vérifie la **cohérence de la balance**, je m'assure que chaque solde est **justifié**, et je vérifie la **conformité OHADA** avant de donner un retour constructif." },
    { q: "Comment justifiez-vous un solde lors d'un audit OHADA ?", points: ["**pièces justificatives**", "**explication des variations**", "**traçabilité**"], s: "Je fournis les **pièces justificatives**, j'explique les **variations significatives**, et je présente un dossier de révision structuré pour démontrer la **traçabilité** des comptes." },
    { q: "Quelles sanctions en cas de non-conformité aux normes OHADA ?", points: ["**rejet de comptabilité**", "**sanctions administratives**", "**sanctions pénales en cas de fraude**"], s: "Les sanctions vont du **rejet de comptabilité** par l'administration fiscale à des **sanctions pénales** en cas de comptabilité fictive ou de fraude caractérisée." },
    { q: "Comment accompagnez-vous votre équipe dans la maîtrise des normes OHADA ?", points: ["**formations internes**", "**cas pratiques**", "**veille réglementaire**"], s: "J'organise des **formations internes**, je partage des **cas pratiques**, et j'assure une **veille SYSCOHADA** régulière pour maintenir le niveau de l'équipe à jour." },
  ],
  fiscalite: [
    { q: "Quelles sont les principales obligations fiscales d'une entreprise au Gabon ?", points: ["**déclarations mensuelles et annuelles**", "**DSF**", "**respect des délais**"], s: "Une entreprise doit produire ses **déclarations mensuelles et annuelles**, notamment la **DSF**. Je veille au **respect des délais** et à la cohérence entre comptabilité et fiscalité." },
    { q: "Comment préparez-vous les déclarations fiscales mensuelles ?", points: ["**collecte des données**", "**vérification des bases imposables**", "**contrôle croisé comptabilité/fiscalité**"], s: "Je collecte les données, je **vérifie les bases imposables**, j'applique les règles fiscales en vigueur et je fais un **contrôle croisé** avec la comptabilité avant archivage." },
    { q: "Quels sont les taux de TVA applicables au Gabon ?", points: ["**taux normal 18%**", "**taux réduits**", "**opérations exonérées**"], s: "Le taux normal est de **18%**, avec des **taux réduits** sur certains produits, et certaines opérations sont **exonérées** selon le Code Général des Impôts." },
    { q: "Comment calculez-vous l'Impôt sur les Sociétés ?", points: ["**taux de 30%**", "**résultat fiscal**", "**réintégrations/déductions**"], s: "L'IS s'applique au taux de **30%** sur le **résultat fiscal**, obtenu après **réintégration des charges non déductibles** et déduction des charges admises." },
    { q: "Quelles sont les échéances déclaratives fiscales principales ?", points: ["**TVA mensuelle**", "**DSF annuelle**", "**acomptes d'IS**"], s: "La **TVA** se déclare généralement **mensuellement**, la **DSF annuellement**, et les acomptes d'IS suivent un calendrier propre à chaque exercice." },
    { q: "Comment gérez-vous un contrôle fiscal ?", points: ["**préparation du dossier**", "**cohérence comptable/fiscale**", "**réponses factuelles**"], s: "Je prépare un **dossier complet**, je vérifie la **cohérence comptable et fiscale**, et je réponds de manière **factuelle** aux observations de l'administration." },
    { q: "Quelles taxes gabonaises spécifiques connaissez-vous en dehors de la TVA ?", points: ["**TPS**", "**TSIL**", "**CSS**"], s: "Je connais notamment la **TPS**, la **TSIL** et la **CSS**, en plus de la TVA et de l'IS, que j'ai déjà traitées via la plateforme **Digitax**." },
    { q: "Comment assurez-vous la veille fiscale dans votre pratique ?", points: ["**suivi des lois de finances**", "**mise à jour des barèmes**", "**formation continue**"], s: "Je suis les **lois de finances annuelles** pour mettre à jour mes barèmes de calcul, et je me forme régulièrement pour rester conforme à la **réglementation en vigueur**." },
    { q: "Comment justifiez-vous une charge déduite fiscalement ?", points: ["**pièce justificative probante**", "**lien avec l'activité**", "**conformité au CGI**"], s: "Je m'assure que chaque charge déduite est appuyée par une **pièce justificative probante**, qu'elle est **directement liée à l'activité**, et qu'elle respecte le **Code Général des Impôts**." },
    { q: "Comment gérez-vous une relance ou une mise en demeure de l'administration fiscale ?", points: ["**analyse du motif**", "**réponse argumentée dans les délais**", "**régularisation si fondée**"], s: "J'analyse d'abord le **motif de la relance**, je prépare une **réponse argumentée dans les délais impartis**, et je procède à une **régularisation** si l'observation est fondée." },
  ],
  social: [
    { q: "Quelles sont les obligations sociales d'un employeur au Gabon ?", points: ["**immatriculation**", "**déclarations mensuelles**", "**paiement des cotisations**"], s: "L'employeur doit **immatriculer les salariés**, produire les **déclarations sociales mensuelles**, et régler les **cotisations** dans les délais." },
    { q: "Comment calculez-vous les cotisations sociales ?", points: ["**salaire brut soumis à cotisations**", "**taux légaux**", "**plafonds**"], s: "Je pars du **salaire brut soumis à cotisations**, j'applique les **taux légaux en vigueur**, et je respecte les **plafonds** réglementaires." },
    { q: "Quel est le rôle de la CNSS ?", points: ["**retraite**", "**prestations familiales**", "**risques professionnels**"], s: "La **CNSS** couvre notamment la **retraite**, les **prestations familiales** et les **risques professionnels** des travailleurs affiliés." },
    { q: "Quel est le rôle de la CNAMGS ?", points: ["**assurance maladie**", "**accès aux soins**", "**cotisations patronales et salariales**"], s: "La **CNAMGS** gère l'**assurance maladie** et garantit l'**accès aux soins** des assurés et de leurs ayants droit." },
    { q: "Comment gérez-vous un contrôle CNSS ou CNAMGS ?", points: ["**dossier complet**", "**vérification des règles**", "**réponses factuelles**"], s: "Je prépare un **dossier complet**, je vérifie l'**application correcte des règles**, et je réponds de manière **factuelle** aux observations, avec correction si nécessaire." },
    { q: "Comment sécurisez-vous la gestion sociale au quotidien ?", points: ["**calendrier social**", "**double contrôle**", "**veille réglementaire**"], s: "Je mets en place un **calendrier social**, j'assure un **double contrôle** des bases de calcul, et je fais une **veille régulière** sur les évolutions réglementaires." },
    { q: "Que risque un employeur en cas de retard de cotisations sociales ?", points: ["**pénalités de retard**", "**majorations**", "**poursuites en cas grave**"], s: "Il s'expose à des **pénalités de retard** et des **majorations**, et dans les cas graves à des **poursuites** affectant sa conformité vis-à-vis des organismes sociaux." },
    { q: "Comment gérez-vous l'immatriculation d'un nouveau salarié ?", points: ["**délai réglementaire**", "**pièces à fournir**", "**suivi du dossier**"], s: "Je respecte le **délai réglementaire** d'immatriculation, je rassemble les **pièces nécessaires**, et j'assure le **suivi du dossier** jusqu'à confirmation." },
    { q: "Quelles sont les déclarations nominatives des salaires ?", points: ["**transmission mensuelle**", "**cohérence avec la paie**", "**archivage**"], s: "Ce sont des déclarations transmises **mensuellement**, garantissant la **cohérence entre la paie** effectuée et les cotisations déclarées, avec un **archivage** rigoureux." },
    { q: "Comment gérez-vous un litige avec un organisme social ?", points: ["**analyse du différend**", "**argumentation documentée**", "**recours si nécessaire**"], s: "J'analyse d'abord le **différend** avec les pièces disponibles, je prépare une **argumentation documentée**, et j'envisage un **recours** si la situation le justifie." },
  ],
};
FALLBACK_BANK.complet = [
  FALLBACK_BANK.personnalite[0],
  FALLBACK_BANK.management[0],
  FALLBACK_BANK.technique[0],
  FALLBACK_BANK.OHADA[0],
  FALLBACK_BANK.fiscalite[0],
  FALLBACK_BANK.social[0],
  FALLBACK_BANK.personnalite[5],
  FALLBACK_BANK.technique[7],
  FALLBACK_BANK.management[9],
  FALLBACK_BANK.personnalite[9],
];

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

// Convertit les **mots-clés** en vrai texte en gras (pas d'astérisques visibles)
function renderWithBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "inherit", fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
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
          {renderWithBold(msg.content)}
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
function Landing({ onStart, candidate, onFindProfile }) {
  const [hovered, setHovered] = useState(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupStatus, setLookupStatus] = useState("idle"); // idle | searching | notfound | error
  const [accessInfo, setAccessInfo] = useState(null); // { scope, moduleSlug } | null

  useEffect(() => {
    if (!candidate?.phone) { setAccessInfo(null); return; }
    fetch(`/api/access/check?phone=${encodeURIComponent(candidate.phone)}`)
      .then(r => r.json())
      .then(data => setAccessInfo(data.hasActiveAccess ? data : null))
      .catch(() => setAccessInfo(null));
  }, [candidate]);

  async function handleLookup(e) {
    e.preventDefault();
    setLookupStatus("searching");
    try {
      const res = await fetch(`/api/profile/lookup?phone=${encodeURIComponent(lookupPhone.trim())}`);
      const data = await res.json();
      if (data.found) {
        onFindProfile({ email: data.email, phone: lookupPhone.trim() });
      } else {
        setLookupStatus("notfound");
      }
    } catch {
      setLookupStatus("error");
    }
  }

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

        {candidate ? (
          <div style={{
            display: "inline-block", background: T.charbon,
            border: `1px solid ${T.bordure}`, borderRadius: 6,
            padding: "16px 24px", marginBottom: 8, textAlign: "left",
          }}>
            <div style={{
              fontSize: "0.65rem", color: T.or, letterSpacing: 1,
              textTransform: "uppercase", marginBottom: 4,
              fontFamily: "'Space Mono', monospace",
            }}>Bon retour</div>
            <div style={{ color: T.blanc, fontWeight: 700, marginBottom: 4 }}>
              {candidate.email || candidate.phone}
            </div>
            {accessInfo?.scope === "full" && (
              <div style={{ color: "#4A7B4A", fontSize: "0.72rem", marginBottom: 12 }}>
                ✅ Accès complet actif
              </div>
            )}
            {accessInfo?.scope === "module" && (
              <div style={{ color: T.gris, fontSize: "0.72rem", marginBottom: 12 }}>
                🔓 Accès actif — module "{accessInfo.moduleSlug}" uniquement
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => onStart("modules")}
                style={{
                  background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
                  color: T.blanc, border: "none", padding: "12px 32px",
                  fontSize: "0.85rem", fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase", cursor: "pointer", borderRadius: 2,
                }}
              >Continuer →</button>
              {accessInfo?.scope === "module" && (
                <a href="/paiement" style={{ color: T.or, fontSize: "0.75rem", textDecoration: "underline" }}>
                  Débloquer l'accès complet
                </a>
              )}
            </div>
          </div>
        ) : (
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
        )}

        {!candidate && (
          <div style={{ marginTop: 14 }}>
            {!showLookup ? (
              <button
                onClick={() => setShowLookup(true)}
                style={{
                  background: "none", border: "none", color: T.gris,
                  fontSize: "0.78rem", textDecoration: "underline",
                  cursor: "pointer", padding: 0,
                }}
              >Déjà inscrit ? Retrouve ton profil</button>
            ) : (
              <form onSubmit={handleLookup} style={{
                display: "flex", gap: 8, justifyContent: "center",
                flexWrap: "wrap", maxWidth: 340, margin: "0 auto",
              }}>
                <input
                  type="tel"
                  required
                  value={lookupPhone}
                  onChange={e => setLookupPhone(e.target.value)}
                  placeholder="Ton numéro de téléphone"
                  style={{
                    padding: "8px 12px", background: T.graphite,
                    border: `1px solid ${T.bordure}`, borderRadius: 4,
                    color: T.blanc, fontSize: "0.8rem", flex: 1, minWidth: 180,
                  }}
                />
                <button type="submit" disabled={lookupStatus === "searching"} style={{
                  padding: "8px 16px", background: T.or, border: "none",
                  borderRadius: 4, color: T.blanc, fontWeight: 700,
                  fontSize: "0.78rem", cursor: "pointer",
                }}>{lookupStatus === "searching" ? "…" : "Retrouver"}</button>
              </form>
            )}
            {lookupStatus === "notfound" && (
              <p style={{ color: "#C43E1C", fontSize: "0.75rem", marginTop: 8 }}>
                Aucun profil trouvé avec ce numéro. Inscris-toi via "Commencer la simulation".
              </p>
            )}
            {lookupStatus === "error" && (
              <p style={{ color: "#C43E1C", fontSize: "0.75rem", marginTop: 8 }}>
                Erreur de connexion, réessaie.
              </p>
            )}
          </div>
        )}

        {accessInfo?.scope !== "full" && (
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
        )}

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
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid #E8D2AC`,
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
function ModuleSelect({ onSelect, onBack, candidate }) {
  const [hovered, setHovered] = useState(null);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    if (!candidate?.phone) { setAccessInfo(null); return; }
    fetch(`/api/access/check?phone=${encodeURIComponent(candidate.phone)}`)
      .then(r => r.json())
      .then(data => setAccessInfo(data.hasActiveAccess ? data : null))
      .catch(() => setAccessInfo(null));
  }, [candidate]);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.noir,
      color: T.blanc,
      fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif",
    }}>
      <nav style={{
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid #E8D2AC`,
      }}>
        <Logo />
        <button onClick={onBack} style={{
          background: "none", border: `1px solid #E8D2AC`,
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
          fontFamily: "'Fraunces', Georgia, serif",
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
          {MODULES.map(m => {
            const isLocked = accessInfo?.scope === "module" && accessInfo.moduleSlug !== m.id;
            return (
            <div
              key={m.id}
              onClick={() => onSelect(m)}
              onMouseEnter={() => setHovered(m.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === m.id ? T.graphite : T.charbon,
                border: `1px solid ${hovered === m.id ? T.or + "66" : "#E8D2AC"}`,
                borderRadius: 4,
                padding: "24px",
                cursor: "pointer",
                transition: "all 0.2s",
                transform: hovered === m.id ? "translateY(-3px)" : "none",
                boxShadow: hovered === m.id ? `0 8px 30px ${T.or}20` : "none",
                opacity: isLocked ? 0.55 : 1,
                position: "relative",
              }}
            >
              {isLocked && (
                <div style={{
                  position: "absolute", top: 14, right: 14,
                  fontSize: "0.9rem",
                }}>🔒</div>
              )}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 16,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: "50%",
                  background: `${m.color}1E`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ModuleIcon id={m.id} size={26} color={m.color} />
                </div>
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
              {isLocked && (
                <div style={{
                  marginTop: 16, padding: "8px 12px",
                  background: `${T.braise}11`,
                  border: `1px solid ${T.braise}33`,
                  borderRadius: 3,
                  fontSize: "0.72rem", color: T.braise,
                }}>Nécessite l'accès complet</div>
              )}
              {!isLocked && m.id === "complet" && (
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
            );
          })}
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
  const [blockedReason, setBlockedReason] = useState("trial"); // "trial" | "module"
  const [blockedModuleOwned, setBlockedModuleOwned] = useState(null);
  const [basicMode, setBasicMode] = useState(false);
  const fallbackIndexRef = useRef(0);
  const attemptsRef = useRef(0);
  const answeredCountRef = useRef(0); // nombre de réponses déjà données par le candidat
  const basicScoreRef = useRef({ totalStars: 0, count: 0 }); // pour le score en mode secours
  const sessionLength = Math.min(module.questions, module.id === "complet" ? 10 : 8);
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [listeningInterim, setListeningInterim] = useState("");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const initialPromptRef = useRef("");
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false); // intention du candidat : continuer à dicter ou non
  const baseTextRef = useRef("");        // texte déjà présent avant de commencer à dicter
  const finalTranscriptRef = useRef(""); // texte confirmé accumulé pendant la dictée

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // rien à faire
      }
    };
  }, []);

  // Reconnaissance vocale : dicte la réponse du candidat dans le champ de texte.
  // Chrome coupe automatiquement l'écoute après quelques secondes de silence,
  // même en mode "continuous" — on relance donc automatiquement tant que le
  // candidat n'a pas explicitement cliqué sur "Arrêter". Un léger délai avant
  // chaque relance évite les erreurs de redémarrage trop brutal (InvalidState).
  const restartingRef = useRef(false);

  function createRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      setMicError("");
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += chunk + " ";
        } else {
          interim += chunk;
        }
      }
      const combined = (baseTextRef.current + " " + finalTranscriptRef.current + interim).trim();
      setInput(combined);
      setListeningInterim(interim.trim());
    };

    recognition.onerror = (event) => {
      const recoverable = ["no-speech", "network", "aborted"];
      if (recoverable.includes(event.error)) {
        return; // le onend qui suit gèrera la relance automatiquement
      }
      // Erreurs bloquantes : on informe clairement le candidat plutôt que de rester silencieux
      shouldListenRef.current = false;
      setListening(false);
      setListeningInterim("");
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setMicError("Accès au micro refusé. Autorise le micro dans les réglages de ton navigateur pour utiliser la dictée.");
      } else if (event.error === "audio-capture") {
        setMicError("Aucun micro détecté sur cet appareil.");
      } else {
        setMicError("La reconnaissance vocale a rencontré un problème. Réessaie, ou tape ta réponse.");
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current && !restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => {
          restartingRef.current = false;
          if (!shouldListenRef.current) return;
          try {
            recognition.start();
          } catch {
            setListening(false);
            setListeningInterim("");
          }
        }, 250);
      } else if (!shouldListenRef.current) {
        setListening(false);
        setListeningInterim("");
      }
    };

    return recognition;
  }

  function startListening() {
    if (listening) return; // évite les doubles démarrages sur double-clic
    const recognition = createRecognition();
    if (!recognition) {
      setMicError("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilise Chrome (ordinateur ou Android) pour cette fonctionnalité.");
      return;
    }
    setMicError("");
    baseTextRef.current = input;
    finalTranscriptRef.current = "";
    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setMicError("Impossible de démarrer le micro. Réessaie dans un instant.");
    }
  }

  function stopListening() {
    shouldListenRef.current = false;
    restartingRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // rien à faire, la reconnaissance était déjà arrêtée
    }
    setListening(false);
    setListeningInterim("");
  }

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

      if (data.hasActiveAccess && data.scope === "full") {
        return true; // accès total : tout est débloqué
      }

      if (data.hasActiveAccess && data.scope === "module") {
        // Accès verrouillé à un seul module — les autres restent bloqués,
        // sans recours possible à l'essai gratuit (déjà "au-delà" du trial).
        if (data.moduleSlug === module.id) return true;
        setBlockedReason("module");
        setBlockedModuleOwned(data.moduleSlug);
        return false;
      }

      // Pas d'accès payant du tout : on retombe sur l'essai gratuit
      const trialRes = await fetch("/api/trial/increment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: candidate.phone }),
      });
      const trialData = await trialRes.json();
      if (!trialData.allowed) setBlockedReason("trial");
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

    if (reply) {
      setMessages([
        { role: "user", content: fullPrompt },
        { role: "assistant", content: reply },
      ]);
    } else {
      setBasicMode(true);
      fallbackIndexRef.current = 0;
      const bank = FALLBACK_BANK[module.id] || FALLBACK_BANK.personnalite;
      setMessages([
        { role: "user", content: fullPrompt },
        {
          role: "assistant",
          content: `Bonjour, je suis ravi(e) de mener cet entretien avec vous aujourd'hui. Commençons.\n\n${bank[0].q}`,
        },
      ]);
    }
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

    // Mode basique : plus d'appel IA, on sert la banque de questions locale.
    // Le passage à la question suivante est conditionné à la présence des
    // mots-clés attendus dans la réponse du candidat — comme le ferait un
    // vrai recruteur qui attend des éléments précis. Chaque réponse validée
    // reçoit une note en étoiles, et un bilan final s'affiche à la fin.
    if (basicMode) {
      const bank = FALLBACK_BANK[module.id] || FALLBACK_BANK.personnalite;
      const current = bank[fallbackIndexRef.current];
      const keywords = (current?.points || []).map(p => p.replace(/\*\*/g, "").trim());
      const normAnswer = normalizeText(userMsg.content);
      const matched = keywords.filter(k => {
        const words = normalizeText(k).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
        return words.length === 0
          ? normAnswer.includes(normalizeText(k))
          : words.some(w => normAnswer.includes(w));
      });
      const missing = keywords.filter(k => !matched.includes(k));
      const passed = keywords.length === 0 || matched.length >= Math.ceil(keywords.length / 2);

      function closeBasicInterview() {
        const avgStars = basicScoreRef.current.count > 0
          ? basicScoreRef.current.totalStars / basicScoreRef.current.count
          : 3;
        const rounded = Math.max(1, Math.min(5, Math.round(avgStars)));
        const strong = rounded >= 4;
        return `\n\n📊 ÉVALUATION FINALE\nNote globale : ${rounded}/5 ${"⭐".repeat(rounded)}${"☆".repeat(5 - rounded)}\n\n✅ Points forts : ${strong ? "vous avez mentionné la majorité des éléments attendus dans vos réponses, avec un niveau de précision satisfaisant." : "vous avez une bonne base, avec quelques réponses solides et bien structurées."}\n\n⚠️ Points à améliorer : ${strong ? "continuez à structurer vos réponses avec des exemples concrets et chiffrés pour renforcer encore leur impact." : "plusieurs réponses gagneraient à intégrer davantage les termes techniques et références réglementaires attendus sur ce module."}\n\n🎯 Conseil pour le module "${module.label}" : relisez les points clés de chaque question de ce module et entraînez-vous à les reformuler naturellement à l'oral, comme devant un vrai recruteur.`;
      }

      let reply = "";
      if (passed) {
        attemptsRef.current = 0;
        const stars = keywords.length === 0
          ? 5
          : Math.max(1, Math.min(5, Math.ceil((matched.length / keywords.length) * 5)));
        basicScoreRef.current.totalStars += stars;
        basicScoreRef.current.count += 1;
        answeredCountRef.current += 1;

        reply = `${"⭐".repeat(stars)}${"☆".repeat(5 - stars)}\n${matched.length > 0 ? `Bonne réponse — vous avez bien mentionné : ${matched.join(", ")}.` : "Réponse notée."}`;

        const next = bank[fallbackIndexRef.current + 1];
        if (next && answeredCountRef.current < sessionLength) {
          fallbackIndexRef.current += 1;
          reply += `\n\n${next.q}`;
        } else {
          reply += closeBasicInterview();
        }
      } else {
        attemptsRef.current += 1;
        if (attemptsRef.current >= 2) {
          const stars = 2;
          basicScoreRef.current.totalStars += stars;
          basicScoreRef.current.count += 1;
          answeredCountRef.current += 1;
          attemptsRef.current = 0;

          reply = `${"⭐".repeat(stars)}${"☆".repeat(5 - stars)}\nVoici une réponse plus complète pour vous aider : ${current.s}`;

          const next = bank[fallbackIndexRef.current + 1];
          if (next && answeredCountRef.current < sessionLength) {
            fallbackIndexRef.current += 1;
            reply += `\n\n${next.q}`;
          } else {
            reply += closeBasicInterview();
          }
        } else {
          reply = `Votre réponse gagnerait à être complétée. Pensez à mentionner : ${missing.join(", ")}.\n\nSouhaitez-vous préciser votre réponse ?`;
        }
      }

      setMessages(p => [...p, { role: "assistant", content: reply }]);
      setLoading(false);
      return;
    }

    const apiMsgs = newMsgs.map(m => ({ role: m.role, content: m.content }));
    const isFinalAnswer = answeredCountRef.current + 1 >= sessionLength;
    const closingInstruction = isFinalAnswer
      ? `\n\nINSTRUCTION IMPORTANTE : le candidat vient de donner sa dernière réponse pour ce module. Après avoir évalué cette réponse normalement (⭐ note, ✅ points forts, ⚠️ points à améliorer, 💬 reformulation), NE POSE PLUS AUCUNE QUESTION. Conclus immédiatement par une évaluation finale, sous EXACTEMENT ce format :\n\n📊 ÉVALUATION FINALE\nNote globale : X/5 ⭐ (moyenne réelle et honnête des notes données durant tout l'entretien)\n\n✅ Points forts : (2 à 3 points concrets observés sur l'ensemble de l'entretien)\n\n⚠️ Points à améliorer : (2 à 3 points concrets et actionnables)\n\n🎯 Conseils pour le module "${module.label}" : (conseils précis, en lien avec les attentes réelles d'un recruteur sur ce sujet au Gabon)`
      : "";
    const reply = await callClaude(apiMsgs, closingInstruction);

    if (!reply) {
      // Échec IA en cours de simulation : bascule automatique et invisible pour le candidat
      setBasicMode(true);
      fallbackIndexRef.current = 0;
      const bank = FALLBACK_BANK[module.id] || FALLBACK_BANK.personnalite;
      setMessages(p => [...p, {
        role: "assistant",
        content: bank[0].q,
      }]);
      setLoading(false);
      return;
    }

    answeredCountRef.current += 1;
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
      const cleanContent = msg.content.replace(/\*\*/g, "");
      const lines = doc.splitTextToSize(cleanContent, maxWidth);
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
    const isModuleLock = blockedReason === "module";
    return (
      <div style={{
        minHeight: "100vh", background: T.noir, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 24,
        fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: T.or, fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.3rem", marginBottom: 12 }}>
            {isModuleLock ? "Ce module n'est pas inclus dans ton accès" : "Essai gratuit terminé"}
          </h2>
          <p style={{ color: T.gris, fontSize: "0.85rem", lineHeight: 1.6, marginBottom: 24 }}>
            {isModuleLock
              ? `Ton accès payant couvre uniquement le module "${blockedModuleOwned}". Débloque l'accès complet pour explorer tous les modules, y compris celui-ci.`
              : "Tu as utilisé tes 2 questions d'essai gratuites. Débloque l'accès complet pour continuer à t'entraîner sur tous les modules."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={onBack} style={{
              padding: "12px 20px", background: "none", border: "1px solid #E8D2AC",
              borderRadius: 4, color: T.gris, cursor: "pointer", fontSize: "0.85rem",
            }}>← Retour</button>
            <a href="/paiement" style={{
              padding: "12px 20px", background: T.or, border: "none",
              borderRadius: 4, color: T.blanc, fontWeight: 700, cursor: "pointer",
              fontSize: "0.85rem", textDecoration: "none",
            }}>Débloquer l'accès complet →</a>
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
        fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif",
        padding: 24,
      }}>
        <div style={{
          background: T.charbon,
          border: `1px solid #E8D2AC`,
          borderRadius: 6,
          padding: "48px 40px",
          maxWidth: 480, width: "100%",
          textAlign: "center",
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: "50%",
            background: `${module.color}1E`, margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ModuleIcon id={module.id} size={38} color={module.color} />
          </div>
          <div style={{
            fontSize: "0.65rem", color: T.or,
            letterSpacing: 4, textTransform: "uppercase",
            marginBottom: 12,
          }}>Module sélectionné</div>
          <h2 style={{
            fontFamily: "'Fraunces', Georgia, serif",
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
                  fontFamily: "'Fraunces', Georgia, serif",
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
                background: T.graphite, border: `1px solid #E8D2AC`,
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
                background: T.graphite, border: `1px solid #E8D2AC`,
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
                    border: `1px solid ${timerMinutes === opt.value ? T.or : "#E8D2AC"}`,
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
              border: `1px solid #E8D2AC`,
              color: T.gris, cursor: "pointer",
              fontSize: "0.8rem", borderRadius: 2,
              letterSpacing: 1, textTransform: "uppercase",
            }}>← Retour</button>
            <button onClick={start} style={{
              flex: 2, padding: "12px",
              background: `linear-gradient(135deg, ${T.or}, ${T.orPale})`,
              border: "none", color: T.blanc,
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
      fontFamily: "'Manrope', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: T.charbon,
        borderBottom: `1px solid #EDD9B0`,
        padding: "12px 20px",
        display: "flex", alignItems: "center", gap: 16,
        flexShrink: 0,
      }}>
        <Logo />
        <div style={{
          width: 1, height: 30, background: "#E8D2AC",
        }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <ModuleIcon id={module.id} size={16} color={module.color} />
          <div style={{
            fontSize: "0.65rem", color: T.gris,
            letterSpacing: 2, textTransform: "uppercase",
          }}>{module.label}</div>
        </div>
        <div style={{
          display: "flex", gap: 20, alignItems: "center",
        }}>
          {timerMinutes && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "0.6rem", color: T.gris,
                letterSpacing: 1, textTransform: "uppercase",
                fontFamily: "'Space Mono', monospace",
              }}>Temps</div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "1.1rem", fontWeight: 700,
                color: (timeLeft !== null && timeLeft <= 10) ? "#C43E1C" : T.or,
              }}>{formatTime(timeLeft)}</div>
            </div>
          )}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: "0.6rem", color: T.gris,
              letterSpacing: 1, textTransform: "uppercase",
              fontFamily: "'Space Mono', monospace",
            }}>Moyenne</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
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
            background: "none", border: `1px solid #E8D2AC`,
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
              fontSize: 13, fontWeight: 700, color: T.blanc,
              fontFamily: "'Fraunces', Georgia, serif", flexShrink: 0,
            }}>H</div>
            <div style={{
              background: T.graphite,
              border: `1px solid #E8D2AC`,
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
        borderTop: `1px solid #EDD9B0`,
        padding: "10px 20px 16px",
        display: "flex", flexDirection: "column", gap: 6,
        flexShrink: 0,
      }}>
        {listening && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: "0.72rem", color: "#C43E1C",
            fontFamily: "'Space Mono', monospace",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#C43E1C", animation: "micPulse 1.2s infinite",
            }} />
            Écoute en cours{listeningInterim ? ` — "${listeningInterim}"` : "…"}
          </div>
        )}
        {micError && !listening && (
          <div style={{ fontSize: "0.72rem", color: "#C43E1C" }}>
            ⚠️ {micError}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
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
            border: `1px solid #E8D2AC`,
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
          onBlur={e => e.target.style.borderColor = "#E8D2AC"}
        />
        <button
          onClick={listening ? stopListening : startListening}
          disabled={loading}
          title={listening ? "Arrêter la dictée" : "Dicter ma réponse au micro"}
          style={{
            padding: "12px 16px",
            background: listening ? "#C43E1C" : T.graphite,
            border: `1px solid ${listening ? "#C43E1C" : "#E8D2AC"}`,
            borderRadius: 4,
            color: listening ? "#fff" : T.gris,
            fontSize: "1.1rem",
            cursor: loading ? "not-allowed" : "pointer",
            flexShrink: 0,
            height: 44,
            transition: "all 0.2s",
            animation: listening ? "micPulse 1.2s infinite" : "none",
          }}
        >{listening ? "⏹️" : "🎤"}</button>
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px",
            background: loading || !input.trim()
              ? "#EDD9B0"
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
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 83, 79, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(217, 83, 79, 0); }
        }
        textarea::placeholder { color: #A88B6F; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.noir}; }
        ::-webkit-scrollbar-thumb { background: #E8D2AC; border-radius: 2px; }
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
          color: T.or, fontFamily: "'Fraunces', Georgia, serif", fontSize: "1.4rem",
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
              background: T.graphite, border: "1px solid #E8D2AC",
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
              background: T.graphite, border: "1px solid #E8D2AC",
              borderRadius: 4, color: T.blanc, fontSize: "0.85rem",
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
          <p style={{ color: "#A88B6F", fontSize: "0.7rem", marginBottom: 20 }}>
            Utilise le même numéro que celui utilisé pour ton paiement Mobile Money.
          </p>

          {error && (
            <p style={{ color: "#C43E1C", fontSize: "0.8rem", marginBottom: 12 }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: "12px 20px", background: "none", border: "1px solid #E8D2AC",
                borderRadius: 4, color: T.gris, cursor: "pointer", fontSize: "0.85rem",
              }}
            >← Retour</button>
            <button
              type="submit"
              style={{
                flex: 1, padding: "12px 20px", background: T.or, border: "none",
                borderRadius: 4, color: T.blanc, fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
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

  const handleFindProfile = (info) => {
    localStorage.setItem("hemera_candidate", JSON.stringify(info));
    setCandidate(info);
  };

  if (page === "landing") return (
    <Landing onStart={handleStart} candidate={candidate} onFindProfile={handleFindProfile} />
  );
  if (page === "register") return (
    <Register onRegistered={handleRegistered} onBack={() => setPage("landing")} />
  );
  if (page === "modules") return (
    <ModuleSelect
      onSelect={m => { setSelectedModule(m); setPage("simulator"); }}
      onBack={() => setPage("landing")}
      candidate={candidate}
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

