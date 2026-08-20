import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const v = l.slice(i + 1).trim();
      return [l.slice(0, i).trim(), v.startsWith('"') ? JSON.parse(v) : v];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: team } = await supabase.from("teams").select("id").limit(1).single();

  await supabase.from("statsbomb_connections").delete().eq("team_id", team.id);
  await supabase.from("statsbomb_connections").insert({
    team_id: team.id,
    configurado: true,
    ultima_verificacion: new Date().toISOString(),
    ultimo_error: null,
  });

  await supabase.from("statsbomb_team_mapping").delete().eq("team_id", team.id);
  await supabase.from("statsbomb_team_mapping").insert({
    team_id: team.id,
    statsbomb_team_id: Number(env.STATSBOMB_OUR_TEAM_ID),
    statsbomb_team_name: env.STATSBOMB_OUR_TEAM_NAME,
  });

  await supabase.from("statsbomb_competition_mapping").delete().eq("team_id", team.id);
  await supabase.from("statsbomb_competition_mapping").insert({
    team_id: team.id,
    statsbomb_competition_id: Number(env.STATSBOMB_COMPETITION_ID),
    statsbomb_season_id: Number(env.STATSBOMB_SEASON_ID),
    nombre: "Primera División Uruguay 2026",
  });

  console.log("Mapeo StatsBomb guardado: Nacional (team_id 1985) en Primera División Uruguay 2026 (comp 111 / season 316).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
