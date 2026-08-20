import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerPerfilTransfermarkt } from "@/lib/seguimiento-internacional/transfermarkt";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uso único: rellena club_escudo_url para jugadores que ya se enriquecieron con
// Transfermarkt antes de que este campo existiera — reutiliza transfermarkt_url ya
// guardado, no vuelve a buscar por nombre.
export async function GET(request: Request) {
  const limite = Number(new URL(request.url).searchParams.get("limite") ?? "600");

  const admin = createAdminClient();
  const { data: jugadores } = await admin
    .from("si_jugadores")
    .select("id, transfermarkt_url")
    .not("transfermarkt_url", "is", null)
    .is("club_escudo_url", null)
    .limit(limite);

  let actualizados = 0;
  const errores: string[] = [];

  for (const jugador of jugadores ?? []) {
    try {
      const perfil = await obtenerPerfilTransfermarkt(jugador.transfermarkt_url!);
      if (perfil.escudoUrl) {
        await admin.from("si_jugadores").update({ club_escudo_url: perfil.escudoUrl }).eq("id", jugador.id);
        actualizados++;
      }
    } catch (e) {
      errores.push(e instanceof Error ? e.message : String(e));
    }
    await esperar(300);
  }

  return Response.json({ procesados: jugadores?.length ?? 0, actualizados, errores: errores.length });
}
