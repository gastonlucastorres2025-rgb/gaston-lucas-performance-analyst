import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InformeDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: informe } = await supabase.from("informes").select("*").eq("id", id).maybeSingle();

  if (!informe) notFound();

  const admin = createAdminClient();
  const { data: signed } = await admin.storage
    .from("informes")
    .createSignedUrl(informe.storage_path, 60 * 60);

  return (
    <div>
      <PageHeader
        title={informe.titulo}
        description={
          informe.rival
            ? `${informe.rival}${informe.fecha ? ` · ${new Date(`${informe.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" })}` : ""}`
            : undefined
        }
      />

      {signed?.signedUrl ? (
        <div className="h-[80vh] overflow-hidden rounded-lg border border-border">
          <iframe src={signed.signedUrl} className="h-full w-full" title={informe.titulo} />
        </div>
      ) : (
        <p className="text-sm text-foreground/50">No se pudo generar el enlace del archivo.</p>
      )}
    </div>
  );
}
