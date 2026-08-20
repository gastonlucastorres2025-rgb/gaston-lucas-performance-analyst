import { fetchSheetTabNames, fetchSheetValues } from "@/lib/google-auth";

export type FilaJugadorSheet = {
  equipo: string;
  nombre: string;
  apellido: string;
  dorsal: string | null;
  posicion: string | null;
  tactico: string | null;
  tecnico: string | null;
  fisico: string | null;
  otrasObservaciones: string | null;
};

// Sinónimos de encabezado por campo: la Sheet real (Liga BetPlay) no siempre usa
// exactamente el mismo nombre de columna que otra que se agregue después (sección 7
// del diseño). Se normaliza el encabezado (sin acentos, minúsculas) y se busca
// coincidencia parcial contra esta lista, en vez de asumir un nombre fijo.
const SINONIMOS: Record<keyof Omit<FilaJugadorSheet, "equipo">, string[]> = {
  nombre: ["nombre"],
  apellido: ["apellido"],
  dorsal: ["n* camiseta", "numero camiseta", "dorsal", "n camiseta"],
  posicion: ["posicion", "puesto", "position"],
  tactico: ["tactico", "analisis tactico"],
  tecnico: ["tecnico", "analisis tecnico"],
  fisico: ["fisico", "analisis fisico"],
  otrasObservaciones: ["otras observaciones", "observaciones", "notas"],
};

function normalizarEncabezado(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim();
}

function limpiar(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

function mapearColumnas(header: string[]): Record<keyof Omit<FilaJugadorSheet, "equipo">, number> {
  const normalizados = header.map(normalizarEncabezado);
  const idx = {} as Record<keyof Omit<FilaJugadorSheet, "equipo">, number>;

  for (const campo of Object.keys(SINONIMOS) as (keyof typeof SINONIMOS)[]) {
    const sinonimos = SINONIMOS[campo];
    idx[campo] = normalizados.findIndex((h) => sinonimos.some((s) => h.includes(s)));
  }

  return idx;
}

function col(row: string[], index: number): string | undefined {
  return index >= 0 ? row[index] : undefined;
}

// Una Sheet con una pestaña por equipo/rival (ej. "Informes individuales Liga BetPlay").
// Cada pestaña se lee con su propio mapeo de columnas (por si el orden difiere entre
// pestañas), y el nombre de la pestaña se usa como equipo/rival de esa tanda de filas.
export async function leerSheetInformesIndividuales(spreadsheetId: string): Promise<FilaJugadorSheet[]> {
  const pestañas = await fetchSheetTabNames(spreadsheetId);
  const filas: FilaJugadorSheet[] = [];

  for (const equipo of pestañas) {
    const rows = await fetchSheetValues(spreadsheetId, equipo);
    const [header, ...body] = rows;
    if (!header) continue;

    const idx = mapearColumnas(header);
    if (idx.nombre < 0 && idx.apellido < 0) continue; // pestaña sin columnas reconocibles

    for (const row of body) {
      const nombre = limpiar(col(row, idx.nombre));
      const apellido = limpiar(col(row, idx.apellido));
      if (!nombre && !apellido) continue;

      filas.push({
        equipo: equipo.trim(),
        nombre: nombre ?? "",
        apellido: apellido ?? "",
        dorsal: limpiar(col(row, idx.dorsal)),
        posicion: limpiar(col(row, idx.posicion)),
        tactico: limpiar(col(row, idx.tactico)),
        tecnico: limpiar(col(row, idx.tecnico)),
        fisico: limpiar(col(row, idx.fisico)),
        otrasObservaciones: limpiar(col(row, idx.otrasObservaciones)),
      });
    }
  }

  return filas;
}
