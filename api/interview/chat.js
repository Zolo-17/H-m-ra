// api/interview/chat.js
//
// Ce fichier tourne côté SERVEUR (jamais visible par le candidat).
// Il reçoit l'historique de la conversation + les instructions ("system")
// depuis le site, les envoie à Claude, et renvoie la réponse au site.
// La clé secrète ANTHROPIC_API_KEY ne quitte jamais ce fichier.

const DEFAULT_SYSTEM_PROMPT = `Tu es un recruteur professionnel qui mène un entretien d'embauche. Pose une seule question à la fois et adapte-toi aux réponses du candidat.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { messages, system } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Historique de conversation manquant" });
  }

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
        max_tokens: 1000,
        system: system || DEFAULT_SYSTEM_PROMPT,
        messages,
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
