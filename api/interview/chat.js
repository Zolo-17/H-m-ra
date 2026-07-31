// api/interview/chat.js
//
// Ce fichier tourne côté SERVEUR (jamais visible par le candidat).
// Il reçoit l'historique de la conversation depuis le site,
// l'envoie à Claude avec les instructions d'un recruteur,
// et renvoie la réponse au site.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { messages, jobRole, moduleName } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Historique de conversation manquant" });
  }

  const systemPrompt = `Tu es un recruteur professionnel expérimenté qui mène un entretien d'embauche pour le poste de "${jobRole || "le poste visé"}"${moduleName ? ` dans le secteur "${moduleName}"` : ""}.

Règles à respecter strictement :
- Pose UNE seule question à la fois, jamais plusieurs d'un coup.
- Adapte ta question suivante selon la réponse précédente du candidat : creuse un point flou, challenge une affirmation vague, valorise un point fort en approfondissant.
- Reste professionnel, courtois mais exigeant — comme un vrai recruteur au Gabon.
- Varie les types de questions : motivation, expérience concrète, mise en situation, compétences techniques, questions comportementales.
- Après environ 8 à 10 questions, termine l'entretien. Annonce clairement "Ceci conclut notre entretien" puis donne une évaluation structurée :
  1. Points forts observés (2-3 points concrets)
  2. Points à améliorer (2-3 points concrets)
  3. Note sur 10
  4. Un conseil pratique et actionnable pour le prochain entretien réel
- Ne pose jamais deux questions dans le même message.
- Commence directement par te présenter brièvement puis poser ta première question, sans autre préambule.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: messages, // [{ role: "user"|"assistant", content: "..." }, ...]
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic:", errText);
      return res.status(502).json({ error: "Erreur lors de la communication avec l'IA." });
    }

    const data = await response.json();
    const reply = data.content?.find((b) => b.type === "text")?.text
      || "Désolé, une erreur est survenue. Réessaie.";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
}
