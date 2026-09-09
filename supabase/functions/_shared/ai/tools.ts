// Outils de l'assistant (format neutre) + exécuteurs.
// Chaque exécuteur reçoit un client Supabase LIÉ AU JWT de l'utilisateur : la RLS
// s'applique donc automatiquement. Les outils "draft_*" ne modifient rien — ils
// renvoient une action que le frontend fera confirmer.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import type { ToolDef } from "./types.ts";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string | null;
  roles: string[];
  space: "public" | "client" | "staff" | "admin";
}

export interface ToolResult {
  content: string;            // texte remis au modèle
  action?: {                  // action proposée au frontend (facultatif)
    type: string;
    payload: Record<string, unknown>;
  };
}

type Executor = (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;

interface Entry {
  def: ToolDef;
  spaces: ToolContext["space"][];
  run: Executor;
}

const ENTRIES: Entry[] = [
  {
    spaces: ["public", "client", "staff", "admin"],
    def: {
      name: "get_apartment_info",
      description:
        "Renvoie les informations publiées de l'appartement (équipements, règles, heures d'arrivée/départ, politique d'annulation).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async (_a, ctx) => {
      const { data: apt } = await ctx.supabase
        .from("apartments")
        .select("name, summary, description, capacity, bedrooms, bathrooms, base_price, cleaning_fee, currency, cancellation_policy, house_rules, checkin_from, checkout_before")
        .eq("status", "published")
        .limit(1)
        .maybeSingle();
      if (!apt) return { content: "Aucun appartement publié pour le moment." };
      const { data: am } = await ctx.supabase
        .from("apartment_amenities").select("amenity_key, detail");
      return {
        content: JSON.stringify({ ...apt, amenities: am ?? [] }),
      };
    },
  },
  {
    spaces: ["public", "client", "staff", "admin"],
    def: {
      name: "check_availability",
      description: "Indique si l'appartement est disponible pour une période, et le prix estimé.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "string", description: "date d'arrivée AAAA-MM-JJ" },
          end: { type: "string", description: "date de départ AAAA-MM-JJ" },
          guests: { type: "integer", description: "nombre de voyageurs", default: 2 },
        },
        required: ["start", "end"],
        additionalProperties: false,
      },
    },
    run: async (a, ctx) => {
      const { data: apt } = await ctx.supabase
        .from("apartments").select("id").eq("status", "published").limit(1).maybeSingle();
      if (!apt) return { content: "Appartement indisponible." };
      const range = `[${a.start},${a.end})`;
      const { data: quote, error } = await ctx.supabase.rpc("quote_stay", {
        p_apartment: apt.id, p_range: range, p_guests: Number(a.guests ?? 2),
      });
      if (error) return { content: `Impossible de calculer : ${error.message}` };
      return {
        content: JSON.stringify(quote),
        action: quote?.available
          ? { type: "prefill_reservation", payload: { start: a.start, end: a.end, guests: a.guests ?? 2 } }
          : undefined,
      };
    },
  },
  {
    spaces: ["client"],
    def: {
      name: "list_my_reservations",
      description: "Liste les réservations de l'utilisateur connecté.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async (_a, ctx) => {
      const { data } = await ctx.supabase
        .from("reservations")
        .select("reference, date_range, guests_count, total_amount, amount_paid, status")
        .order("created_at", { ascending: false });
      return { content: JSON.stringify(data ?? []) };
    },
  },
  {
    spaces: ["client"],
    def: {
      name: "list_my_service_orders",
      description: "Liste les commandes de services de l'utilisateur connecté.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
    run: async (_a, ctx) => {
      const { data } = await ctx.supabase
        .from("service_orders")
        .select("reference, status, scheduled_for, price, payment_timing, service_id")
        .order("created_at", { ascending: false });
      return { content: JSON.stringify(data ?? []) };
    },
  },
  {
    spaces: ["client"],
    def: {
      name: "draft_service_order",
      description:
        "Prépare (sans l'envoyer) une commande de service. Le client la confirmera dans l'interface.",
      parameters: {
        type: "object",
        properties: {
          service_slug: { type: "string", description: "ex. cuisinier, entretien, massage…" },
          scheduled_for: { type: "string", description: "date/heure souhaitée ISO 8601 (facultatif)" },
          note: { type: "string" },
        },
        required: ["service_slug"],
        additionalProperties: false,
      },
    },
    run: async (a, ctx) => {
      const { data: svc } = await ctx.supabase
        .from("services").select("id, title, pricing_mode, base_price")
        .eq("slug", a.service_slug).eq("active", true).maybeSingle();
      if (!svc) return { content: `Service inconnu : ${a.service_slug}` };
      return {
        content: `Brouillon prêt pour « ${svc.title} ». En attente de confirmation du client.`,
        action: {
          type: "draft_service_order",
          payload: { service_id: svc.id, service_slug: a.service_slug, scheduled_for: a.scheduled_for ?? null, note: a.note ?? null },
        },
      };
    },
  },
  {
    spaces: ["client", "staff"],
    def: {
      name: "draft_message",
      description: "Rédige (sans l'envoyer) un message à destination de l'équipe ou du client.",
      parameters: {
        type: "object",
        properties: { body: { type: "string" } },
        required: ["body"],
        additionalProperties: false,
      },
    },
    run: (a) =>
      Promise.resolve({
        content: "Message rédigé, en attente d'envoi par l'utilisateur.",
        action: { type: "draft_message", payload: { body: String(a.body ?? "") } },
      }),
  },
  {
    spaces: ["public", "client", "staff", "admin"],
    def: {
      name: "search_kb",
      description: "Recherche dans la base de connaissances (FAQ, procédures, tourisme).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    run: async (a, ctx) => {
      const q = String(a.query ?? "");
      const { data } = await ctx.supabase
        .from("kb_articles")
        .select("slug, title, body")
        .textSearch("title", q, { type: "websearch", config: "french" })
        .limit(3);
      if (!data?.length) {
        // repli : recherche simple
        const { data: alt } = await ctx.supabase
          .from("kb_articles").select("slug, title, body").ilike("body", `%${q}%`).limit(3);
        return { content: JSON.stringify(alt ?? []) };
      }
      return { content: JSON.stringify(data) };
    },
  },
  {
    spaces: ["admin"],
    def: {
      name: "get_kpi",
      description: "Renvoie un indicateur agrégé (revenu, occupation, services).",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["revenue", "occupancy", "service_performance"] },
          period: { type: "string", description: "ex. 2026-08, 2026-Q3, last30d (indicatif)" },
        },
        required: ["metric"],
        additionalProperties: false,
      },
    },
    run: async (a, ctx) => {
      const view = { revenue: "v_revenue_daily", occupancy: "v_occupancy_monthly", service_performance: "v_service_performance" }[String(a.metric)] ?? null;
      if (!view) return { content: "Métrique inconnue." };
      const { data, error } = await ctx.supabase.from(view).select("*").limit(60);
      if (error) return { content: `Vue non disponible : ${error.message}` };
      return { content: JSON.stringify(data ?? []) };
    },
  },
];

export function toolsForSpace(space: ToolContext["space"]): ToolDef[] {
  return ENTRIES.filter((e) => e.spaces.includes(space)).map((e) => e.def);
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const entry = ENTRIES.find((e) => e.def.name === name && e.spaces.includes(ctx.space));
  if (!entry) return { content: `Outil non autorisé dans cet espace : ${name}` };
  try {
    return await entry.run(args, ctx);
  } catch (e) {
    return { content: `Erreur outil ${name} : ${e instanceof Error ? e.message : String(e)}` };
  }
}
