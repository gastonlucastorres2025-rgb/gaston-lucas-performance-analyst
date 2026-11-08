import { readdirSync, statSync } from "node:fs";
import path from "node:path";

// La biblioteca está organizada en carpetas con nombre (ej. "Jorge Bava"); cada una apunta a una
// carpeta real de la computadora, configurada en BIBLIOTECA_CARPETAS (.env.local) como JSON:
//   [{"nombre":"Jorge Bava","ruta":"/Users/.../SESIÓN - PARTIDO"}]
// Solo existe donde corre la plataforma en esa computadora: en la versión publicada en Vercel la
// variable no está y la biblioteca avisa que no está disponible.

const EXTENSIONES = new Set([".mp4", ".mov", ".m4v", ".webm"]);

export type CarpetaBiblioteca = { nombre: string; ruta: string };

export type VideoArchivo = {
  archivo: string;
  tamanoBytes: number;
  modificado: string;
  categoria: string;
};

/** Carpetas configuradas cuya ruta existe en esta máquina. Una entrada mal escrita se ignora. */
export function carpetasBiblioteca(): CarpetaBiblioteca[] {
  const crudo = process.env.BIBLIOTECA_CARPETAS?.trim();
  if (!crudo) return [];
  let lista: unknown;
  try {
    lista = JSON.parse(crudo);
  } catch {
    return [];
  }
  if (!Array.isArray(lista)) return [];

  const carpetas: CarpetaBiblioteca[] = [];
  for (const item of lista) {
    const nombre = typeof item?.nombre === "string" ? item.nombre.trim() : "";
    const ruta = typeof item?.ruta === "string" ? item.ruta.trim() : "";
    if (!nombre || !ruta || carpetas.some((c) => c.nombre === nombre)) continue;
    try {
      if (statSync(ruta).isDirectory()) carpetas.push({ nombre, ruta: path.resolve(ruta) });
    } catch {
      // la carpeta no existe en esta computadora: no se muestra
    }
  }
  return carpetas;
}

export function carpetaPorNombre(nombre: string | null | undefined): CarpetaBiblioteca | null {
  if (!nombre) return null;
  return carpetasBiblioteca().find((c) => c.nombre === nombre) ?? null;
}

/** Categoría automática según el nombre: "Tactical - Salida de 3.mp4" -> "Tactical". Las grabaciones
 * de pantalla del sistema ("Grabación de pantalla 2026-09-16…") van juntas; el resto, en "Otros". */
export function categoriaDe(archivo: string): string {
  // macOS guarda los nombres con la tilde separada de la letra (NFD): sin normalizar, "Grabación" no coincide.
  const base = archivo.normalize("NFC").replace(/\.[^.]+$/, "");
  if (/^grabaci[oó]n de pantalla/i.test(base)) return "Grabación de pantalla";
  const m = base.match(/^(.+?)\s+-\s+/);
  if (!m) return "Otros";
  const texto = m[1].trim().toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Videos de una carpeta (solo el primer nivel), del más reciente al más antiguo. */
export function listarVideos(carpeta: CarpetaBiblioteca): VideoArchivo[] {
  const videos: VideoArchivo[] = [];
  for (const entrada of readdirSync(carpeta.ruta, { withFileTypes: true })) {
    if (!entrada.isFile() || entrada.name.startsWith(".")) continue;
    if (!EXTENSIONES.has(path.extname(entrada.name).toLowerCase())) continue;
    const st = statSync(path.join(carpeta.ruta, entrada.name));
    videos.push({ archivo: entrada.name, tamanoBytes: st.size, modificado: st.mtime.toISOString(), categoria: categoriaDe(entrada.name) });
  }
  return videos.sort((a, b) => b.modificado.localeCompare(a.modificado));
}

/** Ruta absoluta de un video de una carpeta de la biblioteca, o null si no corresponde. Acepta solo
 * un nombre de archivo (sin rutas ni "..") con extensión de video, dentro de una carpeta
 * configurada: nunca se puede pedir nada fuera de ellas. */
export function resolverVideo(nombreCarpeta: string | null | undefined, archivo: string | null | undefined): string | null {
  const carpeta = carpetaPorNombre(nombreCarpeta);
  if (!carpeta || !archivo) return null;
  if (archivo !== path.basename(archivo) || archivo.includes("\0") || archivo.startsWith(".")) return null;
  if (!EXTENSIONES.has(path.extname(archivo).toLowerCase())) return null;
  const ruta = path.join(carpeta.ruta, archivo);
  if (path.dirname(ruta) !== carpeta.ruta) return null;
  try {
    return statSync(ruta).isFile() ? ruta : null;
  } catch {
    return null;
  }
}

/** Tipo MIME para servir el archivo. Los .mov de H.264 se sirven como mp4: es el mismo contenedor
 * base y así los navegadores los reproducen directo. */
export function tipoMime(ruta: string): string {
  return path.extname(ruta).toLowerCase() === ".webm" ? "video/webm" : "video/mp4";
}
