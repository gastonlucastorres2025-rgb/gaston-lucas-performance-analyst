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

const baseUrl = env.STATSBOMB_API_BASE_URL;
const auth = `Basic ${Buffer.from(`${env.STATSBOMB_API_USERNAME}:${env.STATSBOMB_API_PASSWORD}`).toString("base64")}`;

async function main() {
  console.log(`Probando GET ${baseUrl}/api/v4/competitions ...`);
  const res = await fetch(`${baseUrl}/api/v4/competitions`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });

  console.log(`Status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    console.log("La autenticación o el endpoint fallaron. No se imprimen credenciales por seguridad.");
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Autenticación OK. ${data.length} competencias visibles para esta cuenta.\n`);

  const uruguay = data.filter((c) => c.country_name?.toLowerCase().includes("uruguay"));
  if (uruguay.length === 0) {
    console.log("No aparece ninguna competencia de Uruguay en la lista. Competencias disponibles:");
    data.forEach((c) => console.log(`  - ${c.country_name} / ${c.competition_name} (${c.season_name}) [comp_id=${c.competition_id}, season_id=${c.season_id}]`));
  } else {
    console.log("Competencias de Uruguay encontradas:");
    uruguay.forEach((c) => console.log(`  - ${c.competition_name} (${c.season_name}) [comp_id=${c.competition_id}, season_id=${c.season_id}]`));
  }
}

main().catch((e) => {
  console.error("Error de red o inesperado:", e.message);
  process.exit(1);
});
