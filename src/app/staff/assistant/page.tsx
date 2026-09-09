import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { AiSettingsForm } from "@/components/console/ai-settings-form";

export const metadata: Metadata = { title: "Assistant IA" };

export default async function AssistantStaff() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: s } = await supabase.from("ai_settings").select("*").eq("id", 1).maybeSingle();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("console.title.assistant")} sub={t("console.sub.assistant")} />
      <AiSettingsForm
        enabledSpaces={s?.enabled_spaces ?? ["public", "client", "staff", "admin"]}
        defaultProvider={s?.default_provider ?? "echo"}
        defaultModel={s?.default_model ?? ""}
      />
    </div>
  );
}
