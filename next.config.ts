import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite ejecutar el piloto sin interferir con otro servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
