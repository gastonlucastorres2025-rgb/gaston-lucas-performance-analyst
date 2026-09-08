/** Trayectoria real del cuerpo técnico como entrenadores, en orden cronológico — para la franja
 * de escudos del header. Los 5 escudos son los archivos que pasó el usuario directamente
 * (public/escudos/), no una fuente externa — así no depende de que un CDN de terceros tenga la
 * versión correcta del escudo de cada club. */
// El "?v=2" es solo para que el navegador no sirva una versión vieja cacheada del archivo
// cuando se reemplaza la imagen sin cambiarle el nombre — no es parte del archivo real.
export const TRAYECTORIA_DT = [
  { nombre: "Liverpool FC", pais: "Uruguay", escudo: "/escudos/liverpool.png?v=2" },
  { nombre: "León FC", pais: "México", escudo: "/escudos/leon.png?v=2" },
  { nombre: "Independiente Santa Fe", pais: "Colombia", escudo: "/escudos/santa-fe.png?v=2" },
  { nombre: "Cerro Porteño", pais: "Paraguay", escudo: "/escudos/cerro-porteno.png?v=2" },
  { nombre: "Club Nacional de Fútbol", pais: "Uruguay", escudo: "/escudos/nacional.svg?v=2" },
] as const;
