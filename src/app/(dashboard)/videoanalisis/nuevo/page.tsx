import { PageHeader } from "@/components/page-header";
import { NuevoPartidoForm } from "@/components/videoanalisis/nuevo-partido-form";
import { NOMBRES_CLUBES_URUGUAYOS } from "@/lib/uruguay-clubs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevoPartidoVAPage() {
  const supabase = await createClient();
  const { data: logos } = await supabase.from("va_competencia_logos").select("nombre, logo_url").order("nombre");

  const logosCompetencia = (logos ?? []).map((l) => ({ nombre: l.nombre, logoUrl: l.logo_url }));

  return (
    <div>
      <PageHeader title="Nuevo partido" description="Cargá el video de YouTube y el XML exportado de Nacsport o Angles." />
      <NuevoPartidoForm clubes={[...NOMBRES_CLUBES_URUGUAYOS]} logosCompetencia={logosCompetencia} />
    </div>
  );
}
