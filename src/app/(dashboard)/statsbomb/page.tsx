import { PageHeader } from "@/components/page-header";
import { GenerarInformeForm } from "@/components/statsbomb/generar-informe-form";

export const dynamic = "force-dynamic";

export default function StatsBombPage() {
  return (
    <div>
      <PageHeader
        title="Informe de Próximo Rival"
        description="Escribí el nombre del rival y se genera un informe con datos reales de StatsBomb: comparación de indicadores contra los últimos 6 partidos de cada equipo, jugadores clave e historial reciente."
      />
      <GenerarInformeForm />
    </div>
  );
}
