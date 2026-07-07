import { fetchSheetValues } from "@/lib/google-auth";

export type ScoutingRow = {
  id: string;
  nombre: string;
  apellido: string;
  equipo_actual: string | null;
  liga: string | null;
  pais_liga: string | null;
  fecha_nacimiento: string | null;
  nacionalidad: string | null;
  posicion: string | null;
  club_formativo: string | null;
  proceso_seleccion: boolean | null;
  experiencia_altura: boolean | null;
  categoria: string | null;
  etiqueta: string | null;
};

const LIGA_NORMALIZE: Record<string, string> = {
  "division profesional": "División Profesional",
  "liga pro": "Liga Pro",
  "pirmera division chile": "Primera División de Chile",
  "primera division chile": "Primera División de Chile",
  "primera división chile": "Primera División de Chile",
  "primera divsion chile": "Primera División de Chile",
  "primera nacioanl": "Primera Nacional",
  "primera nacional": "Primera Nacional",
  "primera categoria": "Primera Categoría",
  "primera categoria iran": "Primera Categoría de Irán",
  "primera division paraguay": "Primera División de Paraguay",
  "primera division peru": "Primera División de Perú",
  "primera division rusia": "Primera División de Rusia",
  "seria a": "Serie A",
  "serie a": "Serie A",
  "-": "",
};

const LIGA_TO_PAIS: Record<string, string> = {
  "Liga AUF": "Uruguay",
  "Torneo Proyección": "Uruguay",
  "Liga BetPlay I": "Colombia",
  "Torneo BetPlay II": "Colombia",
  "Torneo Dimayor II": "Colombia",
  Colombia: "Colombia",
  "Liga FUTVE": "Venezuela",
  "Liga MX": "México",
  "Liga Profesional de Fútbol": "Argentina",
  "Primera Nacional": "Argentina",
  "División Profesional": "Paraguay",
  "Primera División de Paraguay": "Paraguay",
  "Primera División de Chile": "Chile",
  "Primera División de Perú": "Perú",
  "Primera División de Rusia": "Rusia",
  "Primera Categoría de Irán": "Irán",
  "Serie A": "Brasil",
  "Serie B": "Brasil",
  "Serie B Italia": "Italia",
  "A-League": "Australia",
  "USL Championship": "Estados Unidos",
  "Liga Pro": "Ecuador",
};

function cleanStr(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

function cleanBool(v: string | undefined): boolean | null {
  const s = cleanStr(v)?.toLowerCase();
  if (s === "si") return true;
  if (s === "no") return false;
  return null;
}

function cleanLiga(v: string | undefined): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  const normalized = LIGA_NORMALIZE[s.toLowerCase()];
  return normalized || s;
}

function cleanCategoria(v: string | undefined): string | null {
  const s = cleanStr(v)?.replace("B=", "B");
  return s && ["A", "B+", "B", "C"].includes(s) ? s : null;
}

function parseFecha(v: string | undefined): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  const [month, day, year] = s.split("/");
  if (!month || !day || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export async function fetchScoutingSheet(): Promise<ScoutingRow[]> {
  const rows = await fetchSheetValues(
    process.env.GOOGLE_SHEETS_SCOUTING_ID!,
    "Información general",
  );
  const [header, ...body] = rows;
  if (!header) return [];

  const colIndex = (name: string) => header.indexOf(name);
  const idx = {
    nombre: colIndex("Nombre"),
    apellido: colIndex("Apellido"),
    equipo: colIndex("Equipo"),
    liga: colIndex("Liga"),
    nacimiento: colIndex("Nacimiento"),
    nacionalidad: colIndex("Nacionalidad"),
    posicion: colIndex("Posición"),
    formacion: colIndex("Formación"),
    proceso: colIndex("Proceso de selección"),
    altura: colIndex("Experiencia en altura"),
    categoria: colIndex("Categoría"),
    referencias: colIndex("Referencias"),
  };

  return body
    .map((row, i) => {
      const nombre = cleanStr(row[idx.nombre]);
      const apellido = cleanStr(row[idx.apellido]);
      if (!nombre || !apellido) return null;

      const liga = cleanLiga(row[idx.liga]);

      return {
        id: `sheet-row-${i}`,
        nombre,
        apellido,
        equipo_actual: cleanStr(row[idx.equipo]),
        liga,
        pais_liga: liga ? (LIGA_TO_PAIS[liga] ?? null) : null,
        fecha_nacimiento: parseFecha(row[idx.nacimiento]),
        nacionalidad: cleanStr(row[idx.nacionalidad]),
        posicion: cleanStr(row[idx.posicion]),
        club_formativo: cleanStr(row[idx.formacion]),
        proceso_seleccion: cleanBool(row[idx.proceso]),
        experiencia_altura: cleanBool(row[idx.altura]),
        categoria: cleanCategoria(row[idx.categoria]),
        etiqueta: cleanStr(row[idx.referencias]),
      };
    })
    .filter((r): r is ScoutingRow => r !== null);
}
