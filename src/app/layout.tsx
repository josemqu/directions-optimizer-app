import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Optimizador de Rutas",
  description:
    "Prototipo de optimización de rutas (TSP) con GraphHopper + Leaflet",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Optimizador de Rutas",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
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
