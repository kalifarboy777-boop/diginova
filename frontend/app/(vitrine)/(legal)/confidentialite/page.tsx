import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: LEGAL["confidentialite"].title };

export default function Page() {
  return <LegalPage doc="confidentialite" />;
}
