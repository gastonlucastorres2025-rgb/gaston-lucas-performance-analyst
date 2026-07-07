import { fetchSheetValues } from "@/lib/google-auth";

export type TrainingTask = {
  nombre: string;
  url: string | null;
};

export type TrainingSession = {
  id: string;
  fecha: string; // YYYY-MM-DD
  turno: "M" | "V" | null;
  lugar: string | null;
  rival: string | null;
  sesionCompletaUrl: string | null;
  gpsUrl: string | null;
  tareas: TrainingTask[];
};

function parseFecha(raw: string): { fecha: string; turno: "M" | "V" | null } | null {
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*([MV])?$/i);
  if (!match) return null;
  const [, day, month, year, turno] = match;
  return {
    fecha: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    turno: (turno?.toUpperCase() as "M" | "V" | undefined) ?? null,
  };
}

export function youtubeIdAndStart(url: string | null): { videoId: string; start: number } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const videoId = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.slice(1)
      : (parsed.searchParams.get("v") ?? "");
    if (!videoId) return null;
    const start = Number(parsed.searchParams.get("t") ?? 0) || 0;
    return { videoId, start };
  } catch {
    return null;
  }
}

export async function fetchTrainingSessions(): Promise<TrainingSession[]> {
  const rows = await fetchSheetValues(process.env.GOOGLE_SHEETS_TRAINING_ID!, "Sheet1");
  const [header, ...body] = rows;
  if (!header) return [];

  const colIndex = (name: string) => header.indexOf(name);
  const idx = {
    fecha: colIndex("FECHA"),
    tarea: colIndex("TAREA"),
    linkTarea: colIndex("LINK TAREA"),
    rival: colIndex("RIVAL"),
    lugar: colIndex("LUGAR"),
    link: colIndex("LINK"),
    gps: colIndex("GPS"),
  };

  const sessions: TrainingSession[] = [];
  const idCounts = new Map<string, number>();

  for (const row of body) {
    const fechaRaw = row[idx.fecha]?.trim();
    const tareaNombre = row[idx.tarea]?.trim();

    if (fechaRaw) {
      const parsed = parseFecha(fechaRaw);
      if (!parsed) continue;

      const baseId = `${parsed.fecha}${parsed.turno ? `-${parsed.turno}` : ""}`;
      const occurrence = idCounts.get(baseId) ?? 0;
      idCounts.set(baseId, occurrence + 1);
      const id = occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`;

      sessions.push({
        id,
        fecha: parsed.fecha,
        turno: parsed.turno,
        lugar: row[idx.lugar]?.trim() || null,
        rival: row[idx.rival]?.trim() || null,
        sesionCompletaUrl: row[idx.link]?.trim() || null,
        gpsUrl: row[idx.gps]?.trim() || null,
        tareas: tareaNombre ? [{ nombre: tareaNombre, url: row[idx.linkTarea]?.trim() || null }] : [],
      });
      continue;
    }

    // Fila de continuacion: pertenece a la ultima sesion agregada.
    const lastSession = sessions[sessions.length - 1];
    if (lastSession && tareaNombre) {
      lastSession.tareas.push({ nombre: tareaNombre, url: row[idx.linkTarea]?.trim() || null });
    }
  }

  return sessions;
}
