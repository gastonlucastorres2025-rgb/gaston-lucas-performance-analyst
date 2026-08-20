import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7; // los datos de un perfil (foto, pie, nacionalidad) cambian muy poco

export type ResultadoBusquedaTM = {
  nombre: string;
  club: string | null;
  perfilUrl: string;
  fotoUrl: string | null;
};

export type PerfilTransfermarkt = {
  fotoUrl: string | null;
  pieHabil: "izquierdo" | "derecho" | "ambidiestro" | null;
  nacionalidad: string | null;
  fechaNacimiento: string | null; // YYYY-MM-DD
  altura: number | null; // cm
  perfilUrl: string;
  club: string | null; // club actual según Transfermarkt (puede diferir del que ya teníamos)
  escudoUrl: string | null;
};

async function fetchHtml(url: string): Promise<string> {
  // Sin timeout explícito, un pedido lento se cuelga y frena a todos los siguientes en
  // el proceso secuencial (se vio en la corrida real: pasó de ~1 jugador/segundo a
  // ~1 cada 19 segundos a mitad de camino).
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Transfermarkt ${url}: ${res.status}`);
  return res.text();
}

// No hay API pública de Transfermarkt: se usa su buscador rápido (schnellsuche), igual
// que ya se scrapea la AUF en auf-scraper.ts. Cada resultado real vive en una
// "inline-table" anidada dentro de la fila de la tabla de resultados.
export async function buscarEnTransfermarkt(nombre: string): Promise<ResultadoBusquedaTM[]> {
  const html = await fetchHtml(`https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(nombre)}`);
  const $ = cheerio.load(html);

  const resultados: ResultadoBusquedaTM[] = [];
  $("table.items table.inline-table").each((_, tabla) => {
    const $tabla = $(tabla);
    const link = $tabla.find("td.hauptlink a").first();
    const nombreEncontrado = link.attr("title") || link.text().trim();
    const perfilUrl = link.attr("href");
    if (!nombreEncontrado || !perfilUrl) return;

    const clubLink = $tabla.find("tr").eq(1).find("a").first();
    const club = clubLink.attr("title") || clubLink.text().trim() || null;
    const foto = $tabla.find("img").first().attr("src") ?? null;

    resultados.push({
      nombre: nombreEncontrado,
      club,
      perfilUrl: perfilUrl.startsWith("http") ? perfilUrl : `https://www.transfermarkt.com${perfilUrl}`,
      fotoUrl: foto,
    });
  });

  return resultados;
}

function normalizarPie(texto: string): PerfilTransfermarkt["pieHabil"] {
  const s = texto.toLowerCase().trim();
  if (s === "right") return "derecho";
  if (s === "left") return "izquierdo";
  if (s === "both") return "ambidiestro";
  return null;
}

function parseFechaDMY(texto: string): string | null {
  // "22/05/2000 (26)" -> "2000-05-22"
  const match = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dia, mes, anio] = match;
  return `${anio}-${mes}-${dia}`;
}

function parseAltura(texto: string): number | null {
  // "1,83 m" -> 183
  const match = texto.replace(/ /g, " ").match(/(\d),(\d+)\s*m/);
  if (!match) return null;
  return Math.round(Number(`${match[1]}.${match[2]}`) * 100);
}

export async function obtenerPerfilTransfermarkt(perfilUrl: string): Promise<PerfilTransfermarkt> {
  const html = await fetchHtml(perfilUrl);
  const $ = cheerio.load(html);

  const fotoUrl = $("img.data-header__profile-image").attr("src") ?? null;
  const escudoUrl = $('img[src*="wappen"]').first().attr("src") ?? null;

  // Los pares vienen como spans hermanos alternados: "--regular" (etiqueta) seguido de
  // "--bold" (valor), dentro de .info-table — no como pares hijo/padre.
  const campos: Record<string, string> = {};
  let etiquetaActual: string | null = null;
  $(".info-table .info-table__content").each((_, el) => {
    const $el = $(el);
    const esEtiqueta = $el.hasClass("info-table__content--regular");
    const texto = $el.text().replace(/\s+/g, " ").trim();
    if (esEtiqueta) {
      etiquetaActual = texto.replace(/:$/, "");
    } else if (etiquetaActual && !(etiquetaActual in campos)) {
      campos[etiquetaActual] = texto;
    }
  });

  return {
    fotoUrl,
    pieHabil: campos["Foot"] ? normalizarPie(campos["Foot"]) : null,
    nacionalidad: campos["Citizenship"] ?? null,
    fechaNacimiento: campos["Date of birth/Age"] ? parseFechaDMY(campos["Date of birth/Age"]) : null,
    altura: campos["Height"] ? parseAltura(campos["Height"]) : null,
    perfilUrl,
    club: campos["Current club"] ?? null,
    escudoUrl,
  };
}

// Combina búsqueda + perfil. El buscador de Transfermarkt mezcla jugadores con
// representantes/agencias que matchean por nombre parecido — se descartan esos
// primero (solo interesan perfiles "/profil/spieler/").
// Si el club coincide con el que ya teníamos, es alta confianza. Si no coincide pero
// hay un único jugador real con ese nombre, se acepta igual: es más probable que el
// jugador haya cambiado de club desde el documento original que un homónimo exacto en
// nombre y apellido — y de aceptarlo, se actualiza el club actual al que dice
// Transfermarkt (decisión del usuario).
export async function enriquecerConTransfermarkt(nombre: string, clubActual: string | null): Promise<PerfilTransfermarkt | null> {
  const resultados = (await buscarEnTransfermarkt(nombre)).filter((r) => r.perfilUrl.includes("/profil/spieler/"));
  if (resultados.length === 0) return null;

  const normalizar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .toLowerCase();

  const porClub = clubActual
    ? resultados.find((r) => r.club && (normalizar(r.club).includes(normalizar(clubActual)) || normalizar(clubActual).includes(normalizar(r.club))))
    : undefined;

  const candidato = porClub ?? (resultados.length === 1 ? resultados[0] : undefined);

  if (!candidato) return null;

  const perfil = await obtenerPerfilTransfermarkt(candidato.perfilUrl);
  // El campo "Current club" de la propia página de perfil es más confiable que el que
  // aparece en la fila de resultados de búsqueda (a veces desactualizado por caché); se
  // usa como principal y el de la búsqueda solo si el perfil no lo tiene.
  return { ...perfil, club: perfil.club ?? candidato.club };
}
