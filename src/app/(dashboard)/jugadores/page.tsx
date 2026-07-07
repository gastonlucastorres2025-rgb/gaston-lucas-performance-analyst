import Image from "next/image";
import { PageHeader } from "@/components/page-header";
import { countryFlagClass } from "@/lib/country-flags";
import { createClient } from "@/lib/supabase/server";

const POSITION_ORDER = ["Portero", "Defensor", "Mediocampista", "Delantero"];

function initials(nombre: string, apellido: string) {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

export default async function JugadoresPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: physicalData }] = await Promise.all([
    supabase
      .from("players")
      .select("id, dorsal, nombre, apellido, posicion_principal, nacionalidad, estado, foto_url")
      .order("dorsal", { ascending: true, nullsFirst: false }),
    supabase
      .from("player_physical_data")
      .select("player_id, altura, peso")
      .order("fecha", { ascending: false }),
  ]);

  const latestPhysicalByPlayer = new Map<string, { altura: number | null; peso: number | null }>();
  for (const record of physicalData ?? []) {
    if (!latestPhysicalByPlayer.has(record.player_id)) {
      latestPhysicalByPlayer.set(record.player_id, { altura: record.altura, peso: record.peso });
    }
  }

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
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Altura</th>
              <th className="px-4 py-3">Peso</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player) => {
              const physical = latestPhysicalByPlayer.get(player.id);
              const flagClass = countryFlagClass(player.nacionalidad);

              return (
                <tr
                  key={player.id}
                  className="border-b border-border last:border-0 hover:bg-primary/5"
                >
                  <td className="px-4 py-3 font-medium text-foreground/60">
                    {player.dorsal ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {player.foto_url ? (
                        <Image
                          src={player.foto_url}
                          alt={`${player.nombre} ${player.apellido}`}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-border">
                          {initials(player.nombre, player.apellido)}
                        </div>
                      )}
                      <span className="font-medium">
                        {player.nombre} {player.apellido}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {player.posicion_principal}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    <div className="flex items-center gap-2">
                      {flagClass && <span className={`${flagClass} rounded-[2px]`} />}
                      {player.nacionalidad}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {physical?.altura ? `${physical.altura.toFixed(2)} m` : "-"}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {physical?.peso ? `${physical.peso} kg` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {player.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
