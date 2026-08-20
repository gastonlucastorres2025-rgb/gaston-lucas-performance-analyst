import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.a.transfermarkt.technology",
      },
    ],
  },
  // Los Server Actions limitan el body a 1MB por defecto (ver
  // node_modules/next/dist/docs/.../serverActions.md) — muy poco para adjuntar un
  // Keynote/PDF real (Plan de partido en Rivales) o una imagen de plan de entrenamiento.
  experimental: {
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
};

export default nextConfig;
