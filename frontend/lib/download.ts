import { toast } from "sonner";
import { api, ApiError } from "./api";

/** Demande une URL signée (15 min) puis lance le téléchargement. */
export async function downloadFile(libraryItemId: number, fileId?: number) {
  try {
    const r = await api<{ url: string; file_name: string }>(fileId ? `/library/${libraryItemId}/files/${fileId}/download` : `/library/${libraryItemId}/download-all`, { method: "POST" });
    const a = document.createElement("a");
    a.href = r.url;
    a.download = r.file_name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success(`Téléchargement de ${r.file_name} lancé`);
    return true;
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : "Téléchargement impossible.");
    return false;
  }
}
