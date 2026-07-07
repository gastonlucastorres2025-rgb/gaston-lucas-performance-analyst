import { PageHeader } from "@/components/page-header";
import { ScoutingDashboard } from "@/components/scouting-dashboard";
import { fetchScoutingSheet } from "@/lib/scouting-sheet";

export const dynamic = "force-dynamic";

export default async function ScoutingPage() {
  const targets = await fetchScoutingSheet();
  const sorted = targets.slice().sort((a, b) => a.apellido.localeCompare(b.apellido));

  return (
    <div>
      <PageHeader
        title="Scouting"
        description="Jugadores en seguimiento, actualizado en vivo desde Google Sheets."
      />
      <ScoutingDashboard targets={sorted} />
    </div>
  );
}
