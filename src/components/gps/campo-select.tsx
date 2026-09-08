import type { SelectHTMLAttributes } from "react";

/** Select con flecha propia en vez del control nativo del navegador (que en la mayoría de los
 * sistemas se ve como un desplegable de formulario genérico, no como una herramienta profesional).
 * `appearance-none` saca el estilo nativo; el resto imita ese mismo estilo pero con la identidad
 * visual del módulo. */
export function CampoSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`peer w-full cursor-pointer appearance-none rounded-lg border border-border bg-white py-2.5 pl-3.5 pr-10 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${className ?? ""}`}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/35 transition-colors peer-focus:text-primary"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Misma identidad visual que CampoSelect, para los `<input type="date">` de los filtros. */
export const CAMPO_FECHA_CLASE =
  "rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
