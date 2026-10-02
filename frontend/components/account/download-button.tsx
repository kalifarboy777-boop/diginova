"use client";

import { Download } from "lucide-react";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, type ButtonProps } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";

/** Télécharge un produit (archive de tous les fichiers) ou un fichier précis — URL signée 15 min. */
export function DownloadButton({ itemId, fileId, children = "Télécharger", ...props }: { itemId: number; fileId?: number } & ButtonProps) {
  const [busy, setBusy] = React.useState(false);
  const qc = useQueryClient();
  return (
    <Button
      variant="soft"
      size="sm"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await downloadFile(itemId, fileId);
        setBusy(false);
        qc.invalidateQueries({ queryKey: ["library"] });
      }}
      {...props}
    >
      {!busy && <Download />} {children}
    </Button>
  );
}
