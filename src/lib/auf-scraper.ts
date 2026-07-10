import * as cheerio from "cheerio";

const AUF_URL = "https://www.auf.org.uy/liga-auf-uruguaya/";
const REVALIDATE_SECONDS = 1800; // 30 min

// La AUF no publica asistencias, solo goles de la temporada (acumulado, sin separar por torneo).
export type GoleadorAUF = { nombre: string; club: string; escudo: string; goles: number };

// Nombres con los que la AUF muestra a algunos clubes distinto a como los llamamos internamente.
const ALIAS: Record<string, string> = {
  TORQUE: "MONTEVIDEO CITY TORQUE",
  WANDERERS: "MONTEVIDEO WANDERERS",
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toUpperCase()
    .trim();
}

async function fetchGoleadoresTemporada(): Promise<GoleadorAUF[]> {
  const res = await fetch(AUF_URL, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`AUF goleadores: ${res.status}`);

  const buffer = await res.arrayBuffer();
  const html = new TextDecoder("windows-1252").decode(buffer);
  const $ = cheerio.load(html);

  const goleadores: GoleadorAUF[] = [];
  $(".jugador_slider_club").each((_, el) => {
    const $el = $(el);
    const nombre = $el.find("h3").first().text().trim();
    const club = $el.find("h5 span").first().text().trim();
    if (!nombre || !club) return;

    const escudoSrc = $el.find("img").first().attr("src") ?? "";
    const escudo = escudoSrc ? `https://www.auf.org.uy${escudoSrc}` : "";
    const golesTexto = $el.find(".icono-goles").first().parent().find("span").last().text().trim();
    const goles = Number(golesTexto) || 0;

    goleadores.push({ nombre, club, escudo, goles });
  });

  return goleadores;
}

export async function fetchGoleadoresClubAUF(nombreClub: string): Promise<GoleadorAUF[]> {
  const todos = await fetchGoleadoresTemporada();
  const clave = normalizar(nombreClub);
  const objetivo = ALIAS[clave] ?? clave;
  return todos.filter((g) => normalizar(g.club) === objetivo);
}
