import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/lib/session";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["700", "800"], display: "swap" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "DigiNova — Le meilleur du digital, à portée de clic", template: "%s · DigiNova" },
  description: "Templates, business plans, e-books et packs IA pour entrepreneurs africains. Payez en Mobile Money ou par carte, téléchargez immédiatement, gardez vos achats à vie.",
  applicationName: "DigiNova",
  openGraph: { type: "website", locale: "fr_CI", siteName: "DigiNova" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F1A" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        {/* Thème : choix explicite (localStorage) sinon préférence système. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('dn_theme');if(t==='dark')document.documentElement.classList.add('dark');if(t==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body>
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-btn focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white">
          Aller au contenu
        </a>
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-inter)" } }} />
      </body>
    </html>
  );
}
