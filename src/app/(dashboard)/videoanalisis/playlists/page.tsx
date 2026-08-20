import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EliminarPlaylistBoton } from "@/components/videoanalisis/eliminar-playlist-boton";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const supabase = await createClient();
  const { data: playlists } = await supabase
    .from("va_playlists")
    .select("id, nombre, updated_at, va_playlist_items(count)")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Playlists"
        description="Compilados propios de cortes — juntá jugadas de distintos partidos en una sola lista y reproducilas de punta a punta."
      />

      {playlists && playlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {playlists.map((p) => {
            const cantidad = p.va_playlist_items?.[0]?.count ?? 0;
            return (
              <div key={p.id} className="rounded-lg border border-border p-4">
                <Link href={`/videoanalisis/playlists/${p.id}`} className="block">
                  <p className="font-medium text-foreground hover:text-primary">{p.nombre}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {cantidad} {cantidad === 1 ? "corte" : "cortes"}
                  </p>
                </Link>
                <div className="mt-3 flex justify-end">
                  <EliminarPlaylistBoton playlistId={p.id} nombre={p.nombre} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          Todavía no creaste ninguna playlist. Agregá cortes desde un partido o desde el buscador de clips con el
          botón &quot;+ Playlist&quot;.
        </p>
      )}
    </div>
  );
}
