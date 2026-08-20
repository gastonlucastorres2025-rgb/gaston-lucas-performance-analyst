import { createAdminClient } from "@/lib/supabase/admin";
import { enriquecerConTransfermarkt } from "@/lib/seguimiento-internacional/transfermarkt";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Enriquece con Transfermarkt (foto, link, pie hábil de respaldo) a los jugadores que
// todavía no tienen foto. Secuencial con una pequeña pausa entre cada uno: son pedidos
// a un sitio de terceros sin API pública, no conviene dispararlos todos en paralelo.
export async function GET(request: Request) {
  const limite = Number(new URL(request.url).searchParams.get("limite") ?? "30");

  const admin = createAdminClient();
  const { data: jugadores } = await admin
    .from("si_jugadores")
    .select("id, full_name, current_club, preferred_foot")
    .is("photo_url", null)
    .eq("transfermarkt_intentado", false)
    .limit(limite);

  const resultados: { nombre: string; estado: string }[] = [];

  for (const jugador of jugadores ?? []) {
    try {
      const perfil = await enriquecerConTransfermarkt(jugador.full_name, jugador.current_club);
      if (!perfil) {
        await admin.from("si_jugadores").update({ transfermarkt_intentado: true }).eq("id", jugador.id);
        resultados.push({ nombre: jugador.full_name, estado: "sin_match" });
        await esperar(400);
        continue;
      }

      // Cuando hay match, el club de Transfermarkt manda siempre (es el dato vigente
      // hoy; el que traía el documento puede ser viejo o estar escrito distinto — ej.
      // "WANDERERS" vs "Montevideo Wanderers"). Solo se deja registro en el historial de
      // cambios si el valor realmente difiere, para no llenarlo de "cambios" que no lo son.
      const clubCambio = Boolean(perfil.club && perfil.club !== jugador.current_club);

      await admin
        .from("si_jugadores")
        .update({
          photo_url: perfil.fotoUrl,
          transfermarkt_url: perfil.perfilUrl,
          preferred_foot: jugador.preferred_foot ?? perfil.pieHabil,
          nationality: perfil.nacionalidad,
          birth_date: perfil.fechaNacimiento,
          club_escudo_url: perfil.escudoUrl,
          ...(perfil.club ? { current_club: perfil.club } : {}),
        })
        .eq("id", jugador.id);

      if (clubCambio) {
        await admin.from("si_cambios_historial").insert({
          player_id: jugador.id,
          campo: "current_club",
          valor_anterior: jugador.current_club,
          valor_nuevo: perfil.club,
          origen: "enriquecimiento_externo",
        });
      }

      resultados.push({ nombre: jugador.full_name, estado: clubCambio ? "actualizado_con_cambio_de_club" : "actualizado" });
    } catch (e) {
      resultados.push({ nombre: jugador.full_name, estado: `error: ${e instanceof Error ? e.message : String(e)}` });
    }

    await esperar(400);
  }

  return Response.json({ procesados: resultados.length, resultados });
}
