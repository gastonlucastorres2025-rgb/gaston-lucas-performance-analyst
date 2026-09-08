/** El proveedor de GPS entrega los nombres en MAYÚSCULA SOSTENIDA ("TIZIANO CORREA"). Es el
 * mismo dato real, solo formateado para mostrar — nunca se usa esta versión para comparar o
 * buscar (eso sigue usando `nombre` tal cual viene, para no romper el cruce con `gps_alias`). */
export function formatearNombreJugador(nombreCrudo: string): string {
  return nombreCrudo
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ");
}
