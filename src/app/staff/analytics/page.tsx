import type { Metadata } from "next";
import { AnalyticsBoard } from "@/components/console/analytics-board";

export const metadata: Metadata = { title: "Analytics" };

export default function StaffAnalyticsPage() {
  return <AnalyticsBoard />;
}
