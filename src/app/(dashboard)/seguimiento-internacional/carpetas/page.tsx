import Link from "next/link";
import { CrearCarpetaBoton } from "@/components/seguimiento-internacional/crear-carpeta-boton";
import { EliminarCarpetaBoton } from "@/components/seguimiento-internacional/eliminar-carpeta-boton";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CarpetasSeguimientoPage() {
  const supabase = await createClient();
  const { data: carpetas } = await supabase
    .from("si_carpetas")
    .select("id, nombre, updated_at, si_carpeta_jugadores(count)")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Carpetas de seguimiento"
        description="Armá documentos con jugadores rivales (nombre, características y videos de Drive) para enviarle a tu plantel."
      />

      <div className="mb-6">
        <CrearCarpetaBoton />
      </div>

      {carpetas && carpetas.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {carpetas.map((c) => {
            const cantidad = c.si_carpeta_jugadores?.[0]?.count ?? 0;
            return (
              <div key={c.id} className="rounded-lg border border-border p-4">
                <Link href={`/seguimiento-internacional/carpetas/${c.id}`} className="block">
                  <p className="font-medium text-foreground hover:text-primary">{c.nombre}</p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {cantidad} {cantidad === 1 ? "jugador" : "jugadores"}
                  </p>
                </Link>
                <div className="mt-3 flex justify-end">
                  <EliminarCarpetaBoton carpetaId={c.id} nombre={c.nombre} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          Todavía no creaste ninguna carpeta. Tocá &quot;+ Nueva carpeta&quot; para armar la primera.
        </p>
      )}
    </div>
  );
}
