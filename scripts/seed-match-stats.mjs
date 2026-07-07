import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const JSON_PATH = process.argv[2];

async function main() {
  const records = JSON.parse(readFileSync(JSON_PATH, "utf-8"));

  const { data: team } = await supabase.from("teams").select("id").limit(1).single();
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("id, fecha, rival");

  const payload = records.map((r) => {
    const matchMatch = existingMatches?.find(
      (m) => m.fecha === r.fecha && m.rival?.toLowerCase().includes(r.rival.toLowerCase()),
    );

    return {
      team_id: team.id,
      match_id: matchMatch?.id ?? null,
      fecha: r.fecha,
      rival: r.rival,
      competencia: r.competencia,
      condicion: r.condicion,
      duracion: r.duracion,
      escudo_rival_url: r.escudo_rival_url,
      goles_favor: r.stats_nacional.goles,
      goles_contra: r.stats_nacional.goles_recibidos,
      xg_favor: r.stats_nacional.xg,
      xg_contra: r.stats_rival.xg,
      posesion: r.stats_nacional.posesion,
      stats_nacional: r.stats_nacional,
      stats_rival: r.stats_rival,
    };
  });

  const { data, error } = await supabase.from("match_stats").insert(payload).select();
  if (error) throw error;
  console.log(`Listo: ${data.length} partidos con metricas cargados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
