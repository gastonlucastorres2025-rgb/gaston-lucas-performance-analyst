import type { MetadataRoute } from "next";

// Plataforma privada del cuerpo técnico — nunca debe aparecer en buscadores, aunque alguien
// comparta el link fuera de la plataforma. Bloquea a todos los rastreadores por completo.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
