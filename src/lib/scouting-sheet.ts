import { createSign } from "node:crypto";

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

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = base64url(signer.sign(privateKey));
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`No se pudo autenticar con Google: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchScoutingSheet(): Promise<ScoutingRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SCOUTING_ID;
  const accessToken = await getAccessToken();

  const range = encodeURIComponent("Información general");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new Error(`No se pudo leer la planilla: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];
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
