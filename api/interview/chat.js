// api/interview/chat.js
// Version améliorée: validation, sécurité, robustesse, coût mieux maîtrisé

const DEFAULT_SYSTEM_PROMPT = `Tu es un recruteur professionnel qui mène un entretien d'embauche. Pose une seule question à la fois et adapte-toi aux réponses du candidat.`;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toAnthropicMessages(messages) {
  return messages
    .filter(m => m && typeof m === 'object')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: safeText(m.content),
    }))
    .filter(m => m.content.length > 0);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { messages, system } = req.body || {};

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Clé API manquante côté serveur.' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Historique de conversation manquant' });
  }

  const cleanedMessages = toAnthropicMessages(messages);
  if (cleanedMessages.length === 0) {
    return res.status(400).json({ error: 'Messages invalides' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: safeText(system) || DEFAULT_SYSTEM_PROMPT,
        messages: cleanedMessages,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Erreur API Anthropic:', data);
      return res.status(502).json({ error: 'Erreur lors de la communication avec l'IA.' });
    }

    const reply = data.content?.find((b) => b.type === 'text')?.text?.trim()
      || 'Désolé, une erreur est survenue. Réessaie.';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Erreur serveur:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  } finally {
    clearTimeout(timeout);
  }
}
