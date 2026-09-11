// ai-draft — génère un brouillon de message pour l'équipe (réponse client,
// suivi de demande, réponse à un avis…). Non-streaming, renvoie { text }.
// POST { kind, context, hint?, tone? }
//   kind : "client_reply" | "contact_reply" | "review_reply" | "service_reply"

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight, securityHeaders } from "../_shared/cors.ts";
import { chatWithFallback, providerConfigFromEnv, type ChatMessage } from "../_shared/ai/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Brouillons de repli quand aucun fournisseur IA n'est configuré (mode démo).
// Le staff n'a plus qu'à compléter les crochets. Dès qu'une clé AI_API_KEY est
// présente, ces gabarits ne sont plus utilisés.
const DEMO_DRAFTS: Record<string, string> = {
  client_reply:
    "Bonjour,\n\nMerci pour votre message. [Reprenez le point soulevé et répondez-y ici.] N'hésitez pas si vous avez d'autres questions.\n\nBien à vous,\nL'équipe Les 2 Palmiers",
  contact_reply:
    "Bonjour,\n\nMerci de nous avoir écrit. [Répondez à la demande : disponibilités, tarif, organisation du séjour.] Nous restons à votre disposition pour préparer votre venue.\n\nBien à vous,\nL'équipe Les 2 Palmiers",
  review_reply:
    "Merci beaucoup pour votre retour et pour le temps passé à le partager. [Personnalisez selon le contenu de l'avis.] Au plaisir de vous accueillir de nouveau.",
  service_reply:
    "Bonjour,\n\nC'est bien noté pour votre demande. [Précisez le créneau, le prix et l'organisation.] Nous revenons vers vous très vite pour confirmer.\n\nL'équipe Les 2 Palmiers",
};

const GUIDES: Record<string, string> = {
  client_reply:
    "Rédige la réponse d'un membre de l'équipe à un client de « Les 2 Palmiers » (hébergement + conciergerie à Cotonou). Ton chaleureux, professionnel, concis (2-5 phrases). Réponds directement, sans formule d'ouverture pompeuse. Signe « L'équipe Les 2 Palmiers » seulement si le fil le fait déjà.",
  contact_reply:
    "Rédige la réponse à un message reçu via le formulaire de contact du site. Chaleureux, utile, oriente vers l'action (réservation, appel, précisions). 3-6 phrases. Commence par « Bonjour {prénom}, ».",
  review_reply:
    "Rédige la réponse publique de l'établissement à un avis client. Remercie sincèrement, personnalise selon le contenu, reste bref (2-4 phrases). En cas d'avis mitigé : reconnais, explique brièvement, propose de reprendre contact.",
  service_reply:
    "Rédige un court message à un client au sujet de sa demande de service (créneau, prix, organisation). Clair et rassurant, 2-4 phrases.",
};

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders(req), ...securityHeaders, "Content-Type": "application/json" } });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const supa = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: "non authentifié" }, 401);
    const { data: isStaff } = await supa.rpc("is_staff", { uid: userRes.user.id });
    if (!isStaff) return json({ error: "réservé à l'équipe" }, 403);

    const { kind, context, hint, tone } = await req.json();
    const guide = GUIDES[kind];
    if (!guide) return json({ error: "kind inconnu" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: settings } = await admin.from("ai_settings").select("*").eq("id", 1).maybeSingle();
    const providerCfg = providerConfigFromEnv();

    // Aucun fournisseur réel : on renvoie un gabarit à compléter (mode démo).
    if (providerCfg.provider === "echo" || !providerCfg.apiKey) {
      return json({ text: DEMO_DRAFTS[kind] ?? DEMO_DRAFTS.client_reply, demo: true });
    }

    const system =
      guide +
      "\nÉcris uniquement le texte du message, sans préambule ni guillemets. Langue : celle du client si identifiable, sinon français." +
      (tone ? `\nTon demandé : ${tone}.` : "") +
      (settings?.system_prompts?.staff ? `\nContexte établissement : ${settings.system_prompts.staff}` : "");

    const messages: ChatMessage[] = [
      {
        role: "user",
        content:
          `Contexte :\n${(typeof context === "string" ? context : JSON.stringify(context, null, 2)).slice(0, 4000)}` +
          (hint ? `\n\nConsigne de l'agent : ${String(hint).slice(0, 500)}` : "") +
          `\n\nRédige maintenant le message.`,
      },
    ];

    let text = "";
    for await (const ev of chatWithFallback(providerCfg, { system, messages, temperature: 0.6, maxTokens: 500 })) {
      if (ev.type === "text-delta") text += ev.text;
      if (ev.type === "error") return json({ error: ev.error.message ?? "IA indisponible" }, 502);
    }

    return json({ text: text.trim() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
