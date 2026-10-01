import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Styles de texte du Figma (utilitaires @utility de globals.css) : ce sont des tailles de police,
// pas des couleurs — sinon tailwind-merge supprimerait « text-text-secondary » à côté de « text-h4 ».
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: ["display", "h1", "h2", "h3", "h4", "body-lg", "body", "body-medium", "body-sm", "label", "label-sm", "caption", "overline", "price-lg", "price"],
        },
      ],
    },
  },
});

/** Fusionne des classes Tailwind (les dernières l'emportent). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
