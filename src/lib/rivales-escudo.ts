import { EQUIPOS } from "@/lib/tabla-anual";
import { escudoClubUruguayo } from "@/lib/uruguay-clubs";

/** Normaliza un nombre de club para poder cruzarlo contra otras fuentes (la planilla de
 * partidos y el catálogo de equipos uruguayos no siempre usan el mismo nombre para el mismo
 * club: "CA Tigre" vs "Tigre", "Montevideo City Torque" vs "Torque", "Club Atlético Cerro" vs
 * "Cerro"). Solo saca prefijos/sufijos genéricos, nunca inventa ni adivina un club distinto. */
export function normalizarNombreClub(nombre: string): string {
  return nombre
    .replace(/^Club Atlético\s+/i, "")
    .replace(/^Montevideo\s+City\s+/i, "")
    .replace(/^Montevideo\s+/i, "")
    .replace(/^CA\s+/i, "")
    .replace(/^CD\s+/i, "")
    .replace(/^Deportivo\s+/i, "Deportivo ")
    .replace(/\s+FC$/i, "")
    .replace(/\s+de las Piedras$/i, "")
    .trim();
}

/** Resuelve el escudo de un rival real (de `partidos_va`) sin inventar nada: primero prueba el
 * escudo cargado en `rivales` (join exacto por id, no por nombre), y si no hay, prueba el
 * diccionario de escudos de clubes uruguayos ya usado en Tabla Anual (normalizando el nombre).
 * Si ninguna fuente tiene el escudo, devuelve null — el llamador debe mostrar un placeholder. */
export function resolverEscudoRival(rival: { nombre: string; escudoRivales: string | null }): string | null {
  if (rival.escudoRivales) return rival.escudoRivales;
  const normalizado = normalizarNombreClub(rival.nombre);
  const porNombreExacto = escudoClubUruguayo(normalizado);
  if (porNombreExacto) return porNombreExacto;
  // Último intento: comparar normalizando también el lado del catálogo (p. ej. "Deportivo Maldonado" ya coincide,
  // pero por robustez ante variantes futuras probamos igualdad case-insensitive tras normalizar ambos lados).
  const match = EQUIPOS.find((eq) => normalizarNombreClub(eq.nombre).toLowerCase() === normalizado.toLowerCase());
  return match ? `https://a.espncdn.com/i/teamlogos/soccer/500/${match.espnId}.png` : null;
}
