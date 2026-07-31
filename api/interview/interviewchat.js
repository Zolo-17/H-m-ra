import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sunrise } from "lucide-react";

/**
 * InterviewChat — Héméra
 * -----------------------------------------
 * Interface de discussion pour la simulation d'entretien.
 * Envoie l'historique complet à /api/interview/chat à chaque message.
 *
 * Props :
 *  - jobRole: string        ex: "Chef Comptable"
 *  - moduleName?: string    ex: "Hôtellerie & Tourisme"
 */
export default function InterviewChat({ jobRole = "le poste visé", moduleName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function callInterviewAPI(updatedMessages) {
    setLoading(true);
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, jobRole, moduleName }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erreur de connexion. Réessaie dans un instant." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    setStarted(true);
    // Message initial vide côté "user" pour déclencher la première question du recruteur
    const initial = [{ role: "user", content: "Bonjour, je suis prêt(e) à commencer l'entretien." }];
    setMessages(initial);
    callInterviewAPI(initial);
  }

  function handleSend() {
    if (!input.trim() || loading) return;
    const updated = [...messages, { role: "user", content: input.trim() }];
    setMessages(updated);
    setInput("");
    callInterviewAPI(updated);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <Sunrise className="w-8 h-8 text-amber-300 mb-4" />
        <h1 className="font-serif text-2xl sm:text-3xl text-white mb-3">
          Simulation d'entretien — {jobRole}
        </h1>
        <p className="text-slate-400 max-w-md mb-8 text-sm">
          Le recruteur virtuel va te poser une série de questions, une à la
          fois. Réponds comme tu le ferais en vrai entretien. À la fin, tu
          recevras une évaluation détaillée.
        </p>
        <button
          onClick={handleStart}
          className="px-6 py-3 rounded-lg bg-amber-400 text-slate-950 font-semibold hover:bg-amber-300 transition-colors"
        >
          Commencer l'entretien
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-2">
        <Sunrise className="w-5 h-5 text-amber-300" />
        <span className="text-white font-medium">{jobRole}</span>
        {moduleName && (
          <span className="text-slate-500 text-sm">· {moduleName}</span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4 max-w-2xl mx-auto w-full">
        {messages
          .filter((m, i) => !(i === 0 && m.role === "user")) // cache le message déclencheur initial
          .map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={[
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-amber-400 text-slate-950"
                    : "bg-white/10 text-slate-100",
                ].join(" ")}
              >
                {m.content}
              </div>
            </div>
          ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-slate-400 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Le recruteur réfléchit…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Tape ta réponse…"
            rows={2}
            className="flex-1 resize-none rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:border-amber-400/50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 rounded-lg bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-300 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
