import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { ContactInbox, type ContactRow } from "@/components/console/contact-inbox";

export const metadata: Metadata = { title: "Messages de contact" };

export default async function StaffContact() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("id, name, email, phone, subject, message, locale, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as ContactRow[];
  const open = rows.filter((r) => r.status === "new").length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={t("contactInbox.title")}
        sub={open > 0 ? t("contactInbox.subOpen", { count: open }) : t("contactInbox.sub")}
      />
      <ContactInbox rows={rows} />
    </div>
  );
}
