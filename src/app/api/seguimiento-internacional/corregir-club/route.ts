import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerPerfilTransfermarkt } from "@/lib/seguimiento-internacional/transfermarkt";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uso único: para los jugadores que ya tienen transfermarkt_url guardado (de antes de
// que el club de Transfermarkt se impusiera siempre), fuerza current_club al valor de
// "Current club" de su propio perfil — el dato del documento puede ser viejo o estar
// escrito distinto (ej. "WANDERERS" vs "Montevideo Wanderers").
export async function GET(request: Request) {
  const limite = Number(new URL(request.url).searchParams.get("limite") ?? "600");

  const admin = createAdminClient();
  const { data: jugadores } = await admin
    .from("si_jugadores")
    .select("id, current_club, transfermarkt_url")
    .not("transfermarkt_url", "is", null)
    .limit(limite);

  let corregidos = 0;
  const errores: string[] = [];

  for (const jugador of jugadores ?? []) {
    try {
      const perfil = await obtenerPerfilTransfermarkt(jugador.transfermarkt_url!);
      if (perfil.club && perfil.club !== jugador.current_club) {
        await admin
          .from("si_jugadores")
          .update({ current_club: perfil.club, club_escudo_url: perfil.escudoUrl })
          .eq("id", jugador.id);
        await admin.from("si_cambios_historial").insert({
          player_id: jugador.id,
          campo: "current_club",
          valor_anterior: jugador.current_club,
          valor_nuevo: perfil.club,
          origen: "enriquecimiento_externo",
        });
        corregidos++;
      }
    } catch (e) {
      errores.push(e instanceof Error ? e.message : String(e));
    }
    await esperar(300);
  }

  return Response.json({ procesados: jugadores?.length ?? 0, corregidos, errores: errores.length });
}
