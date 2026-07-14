import { getGoogleAccessToken } from "@/lib/google-auth";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const API_BASE = "https://www.googleapis.com/drive/v3/files";

export function extraerFolderIdDeUrl(url: string): string | null {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function driveFetch(path: string, params: Record<string, string>): Promise<unknown> {
  const accessToken = await getGoogleAccessToken(DRIVE_SCOPE);
  const search = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}${path}?${search.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Google Drive: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type ArchivoDrive = { id: string; name: string; webViewLink: string; mimeType: string };

export async function fetchCarpeta(folderId: string): Promise<{ nombre: string; parentId: string | null }> {
  const data = (await driveFetch(`/${folderId}`, {
    fields: "name,parents",
    supportsAllDrives: "true",
  })) as { name: string; parents?: string[] };
  return { nombre: data.name, parentId: data.parents?.[0] ?? null };
}

export async function fetchNombreCarpeta(folderId: string): Promise<string> {
  const data = (await driveFetch(`/${folderId}`, { fields: "name", supportsAllDrives: "true" })) as { name: string };
  return data.name;
}

export async function fetchArchivosDeCarpeta(folderId: string): Promise<ArchivoDrive[]> {
  const data = (await driveFetch("", {
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,webViewLink,mimeType)",
    orderBy: "name",
    pageSize: "200",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  })) as { files: ArchivoDrive[] };
  return data.files ?? [];
}

export function parsearNombreCarpetaRival(nombre: string): { rival: string; ronda: string } {
  const partes = nombre.split(" - ").map((p) => p.trim());
  if (partes.length >= 2) {
    return { rival: partes[0], ronda: partes.slice(1).join(" - ") };
  }
  return { rival: nombre.trim(), ronda: "" };
}
