import { Download, FileText, RefreshCw, Smartphone, User, Users } from "lucide-react";

const ICONS = { paiement: Smartphone, telechargements: Download, compte: User, remboursements: RefreshCw, licences: FileText, createurs: Users } as const;

export function TopicIcon({ slug }: { slug: string }) {
  const Icon = ICONS[slug as keyof typeof ICONS] ?? FileText;
  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand-primary">
      <Icon className="size-5" />
    </span>
  );
}
