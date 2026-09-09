// Adaptateur "echo" — mock déterministe pour le mode démo.
// Aucune clé requise. Répond avec des phrases scriptées + simule un appel d'outil
// quand le message contient un déclencheur simple.

import type { AiProvider, ChatOptions, StreamEvent } from "../types.ts";

const CANNED: Array<{ match: RegExp; reply: string }> = [
  { match: /arriv|check.?in|quelle heure/i, reply: "L'arrivée se fait à partir de 14h00 et le départ avant 11h00. Prévenez-nous de votre heure d'arrivée pour organiser l'accueil." },
  { match: /wifi|internet|connexion/i, reply: "L'appartement dispose d'une connexion Wi-Fi fibre. Le code vous est communiqué à l'arrivée." },
  { match: /parking|voiture|stationnement/i, reply: "Une place de parking privée et sécurisée est incluse avec l'appartement." },
  { match: /service|ménage|cuisinier|massage|coiffure/i, reply: "Nous proposons une dizaine de services à domicile : ménage, cuisinier privé, massage, coiffure, location de voiture, garde d'enfants… Dites-moi ce qu'il vous faut et je prépare la demande." },
  { match: /prix|tarif|combien|coûte/i, reply: "Le tarif dépend des dates et de la durée. Indiquez-moi vos dates d'arrivée et de départ pour un devis précis." },
  { match: /annul|rembours/i, reply: "La politique d'annulation est « modérée » : annulation gratuite jusqu'à quelques jours avant l'arrivée. Je peux transmettre votre demande à l'équipe." },
];

async function* stream(opts: ChatOptions): AsyncIterable<StreamEvent> {
  const last = [...opts.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const toolResults = opts.messages.filter((m) => m.role === "tool");
  const alreadyRanTool = toolResults.length > 0;

  // Si un outil a déjà répondu, on synthétise une réponse à partir de son résultat.
  if (alreadyRanTool) {
    const availTool = toolResults.find((m) => m.content.includes("check_availability"));
    let reply =
      "Voici ce que j'ai trouvé. N'hésitez pas si vous voulez que je prépare la suite.";
    if (availTool) {
      const available = /"available":true/.test(availTool.content);
      const total = availTool.content.match(/"total":\s*(\d+)/)?.[1];
      reply = available
        ? `Ces dates sont disponibles${total ? `, pour un total d'environ ${Number(total).toLocaleString("fr-FR")} XOF (ménage inclus)` : ""}. Souhaitez-vous que je prépare la réservation ?`
        : "Ces dates ne sont malheureusement pas disponibles. Voulez-vous que je vous propose d'autres périodes ?";
    }
    for (const word of reply.split(/(\s+)/)) {
      yield { type: "text-delta", text: word };
      await new Promise((r) => setTimeout(r, 12));
    }
    yield { type: "done" };
    return;
  }

  // simule un appel d'outil si on demande une disponibilité avec des dates
  const dates = last.match(/(\d{4}-\d{2}-\d{2}).{1,20}?(\d{4}-\d{2}-\d{2})/);
  if (dates && opts.tools?.some((t) => t.name === "check_availability")) {
    yield {
      type: "tool-call",
      call: { id: "echo-1", name: "check_availability", arguments: { start: dates[1], end: dates[2] } },
    };
    yield { type: "done", finishReason: "tool_calls" };
    return;
  }

  const hit = CANNED.find((c) => c.match.test(last));
  const reply =
    hit?.reply ??
    "Je suis l'assistant de Les 2 Palmiers (mode démonstration). Je peux vous renseigner sur l'appartement, les services, la réservation et le séjour. Que puis-je faire pour vous ?";

  for (const word of reply.split(/(\s+)/)) {
    yield { type: "text-delta", text: word };
    await new Promise((r) => setTimeout(r, 12));
  }
  yield { type: "done", usage: { inputTokens: last.length >> 2, outputTokens: reply.length >> 2 } };
}

export function createEchoProvider(model = "echo-1"): AiProvider {
  return {
    name: "echo",
    model,
    supportsTools: true,
    chat: stream,
    embed: (texts) =>
      Promise.resolve(
        texts.map((t) => {
          // pseudo-embedding déterministe de dimension 1536
          const v = new Array(1536).fill(0);
          for (let i = 0; i < t.length; i++) v[i % 1536] += t.charCodeAt(i) / 255;
          const norm = Math.hypot(...v) || 1;
          return v.map((x) => x / norm);
        }),
      ),
  };
}
