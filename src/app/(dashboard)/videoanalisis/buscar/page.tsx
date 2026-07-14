import { PageHeader } from "@/components/page-header";
import { BuscadorClips } from "@/components/videoanalisis/buscador-clips";

export default function BuscarClipsPage() {
  return (
    <div>
      <PageHeader
        title="Buscar clips"
        description='Escribí qué querés ver, por ejemplo "todas las defensas zona 2 que dure 45 segundos", y arma la cola de reproducción cruzando todos los partidos cargados.'
      />
      <BuscadorClips />
    </div>
  );
}
