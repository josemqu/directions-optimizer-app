import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : new URL("http://localhost:3000");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "optiMapp",
    template: "%s | optiMapp",
  },
  description:
    "Optimiza el orden de paradas (TSP), visualiza en mapa y exporta a Google Maps o WhatsApp.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "optiMapp",
    title: "optiMapp",
    description:
      "Optimiza el orden de paradas (TSP), visualiza en mapa y exporta a Google Maps o WhatsApp.",
  },
  twitter: {
    card: "summary",
    title: "optiMapp",
    description:
      "Optimiza el orden de paradas (TSP), visualiza en mapa y exporta a Google Maps o WhatsApp.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "optiMapp",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const storedMode = localStorage.getItem('theme-mode');
    const legacy = localStorage.getItem('theme');
    const storedPalette = localStorage.getItem('theme-palette');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = (storedMode === 'light' || storedMode === 'dark')
      ? storedMode
      : ((legacy === 'light' || legacy === 'dark') ? legacy : (prefersDark ? 'dark' : 'light'));
    const palette = storedPalette || 'slate';
    const root = document.documentElement;
    root.setAttribute('data-theme', palette);
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
