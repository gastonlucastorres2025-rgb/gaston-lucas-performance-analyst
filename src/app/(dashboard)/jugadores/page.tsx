import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

const POSITION_ORDER = ["Portero", "Defensor", "Mediocampista", "Delantero"];

export default async function JugadoresPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, dorsal, nombre, apellido, posicion_principal, nacionalidad, estado")
    .order("dorsal", { ascending: true, nullsFirst: false });

  const sorted = (players ?? []).slice().sort((a, b) => {
    const posA = POSITION_ORDER.indexOf(a.posicion_principal ?? "");
    const posB = POSITION_ORDER.indexOf(b.posicion_principal ?? "");
    if (posA !== posB) return posA - posB;
    return (a.dorsal ?? 999) - (b.dorsal ?? 999);
  });

  return (
    <div>
      <PageHeader
        title="Jugadores"
        description={`${sorted.length} jugadores en el plantel.`}
      />

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-primary/5 text-left text-xs font-medium uppercase tracking-wide text-foreground/60">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3">Posición</th>
              <th className="px-4 py-3">Nacionalidad</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => (
              <tr
                key={player.id}
                className="border-b border-border last:border-0 hover:bg-primary/5"
              >
                <td className="px-4 py-3 font-medium text-foreground/60">
                  {player.dorsal ?? "-"}
                </td>
                <td className="px-4 py-3 font-medium">
                  {player.nombre} {player.apellido}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {player.posicion_principal}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {player.nacionalidad}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {player.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
