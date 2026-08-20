import { sincronizarSeguimientoInternacional } from "@/lib/seguimiento-internacional/sync";

const FOLDER_ID_RAIZ = process.env.SEGUIMIENTO_INTERNACIONAL_FOLDER_ID!;

export async function GET() {
  try {
    const resumen = await sincronizarSeguimientoInternacional(FOLDER_ID_RAIZ, null);
    return Response.json(resumen);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
