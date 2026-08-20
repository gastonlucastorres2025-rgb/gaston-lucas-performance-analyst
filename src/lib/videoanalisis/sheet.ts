import { fetchSheetValues } from "@/lib/google-auth";

export type PartidoSheetRow = {
  sheetRowId: string;
  fecha: string | null;
  rival: string | null;
  competencia: string | null;
  youtubeLink: string | null;
  xmlDriveLink: string | null;
  golesFavor: number | null;
  golesContra: number | null;
  condicion: "local" | "visitante" | null;
};

function cleanStr(v: string | undefined): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

function parseFecha(v: string | undefined): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const partes = s.split(/[/-]/);
  if (partes.length !== 3) return null;
  const [d, m, y] = partes;
  if (!d || !m || !y) return null;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseResultado(v: string | undefined): { golesFavor: number | null; golesContra: number | null } {
  const s = cleanStr(v);
  if (!s) return { golesFavor: null, golesContra: null };
  const match = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return { golesFavor: null, golesContra: null };
  return { golesFavor: Number(match[1]), golesContra: Number(match[2]) };
}

function parseCondicion(v: string | undefined): "local" | "visitante" | null {
  const s = cleanStr(v)?.toLowerCase();
  if (!s) return null;
  if (s.startsWith("l")) return "local";
  if (s.startsWith("v")) return "visitante";
  return null;
}

function colIndex(header: string[], ...palabras: string[]) {
  return header.findIndex((h) => {
    const norm = h.trim().toLowerCase();
    return palabras.some((p) => norm.includes(p));
  });
}

export async function fetchPartidosSheetRows(): Promise<PartidoSheetRow[]> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_VIDEOANALISIS_ID;
  if (!spreadsheetId) throw new Error("Falta configurar GOOGLE_SHEETS_VIDEOANALISIS_ID.");

  const rows = await fetchSheetValues(spreadsheetId, "A1:Z2000");
  const [header, ...body] = rows;
  if (!header) return [];

  const idx = {
    id: colIndex(header, "id"),
    fecha: colIndex(header, "fecha"),
    rival: colIndex(header, "rival"),
    torneo: colIndex(header, "torneo", "competencia"),
    youtube: colIndex(header, "youtube"),
    xml: colIndex(header, "xml", "xlm"),
    resultado: colIndex(header, "resultado"),
    condicion: colIndex(header, "local", "visita"),
  };

  return body
    .map((row, i) => {
      const id = idx.id >= 0 ? cleanStr(row[idx.id]) : null;
      const rival = idx.rival >= 0 ? cleanStr(row[idx.rival]) : null;
      if (!id && !rival) return null;

      const { golesFavor, golesContra } = parseResultado(idx.resultado >= 0 ? row[idx.resultado] : undefined);

      return {
        sheetRowId: id ?? `fila-${i}`,
        fecha: idx.fecha >= 0 ? parseFecha(row[idx.fecha]) : null,
        rival,
        competencia: idx.torneo >= 0 ? cleanStr(row[idx.torneo]) : null,
        youtubeLink: idx.youtube >= 0 ? cleanStr(row[idx.youtube]) : null,
        xmlDriveLink: idx.xml >= 0 ? cleanStr(row[idx.xml]) : null,
        golesFavor,
        golesContra,
        condicion: idx.condicion >= 0 ? parseCondicion(row[idx.condicion]) : null,
      };
    })
    .filter((r): r is PartidoSheetRow => r !== null);
}
