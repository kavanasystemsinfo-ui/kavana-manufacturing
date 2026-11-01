import type { EstadoPlanta as Estado } from '../utils/estado-planta.js';

const ESTILO: Record<Estado['nivel'], { caja: string; punto: string }> = {
  verde: { caja: 'border-green-200 bg-green-50', punto: 'bg-green-500' },
  ambar: { caja: 'border-amber-200 bg-amber-50', punto: 'bg-amber-500' },
  rojo: { caja: 'border-red-200 bg-red-50', punto: 'bg-red-500' },
  sin_datos: { caja: 'border-slate-200 bg-slate-50', punto: 'bg-slate-400' },
};

/** Cabecera del resumen: cómo va la planta ahora, en una frase y tres cifras. */
export function EstadoPlanta({ estado }: { estado: Estado }) {
  const estilo = ESTILO[estado.nivel];
  return (
    <section
      aria-label="Estado de la planta"
      className={`rounded-lg border p-4 shadow-sm ${estilo.caja}`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-3.5 w-3.5 shrink-0 rounded-full ${estilo.punto}`} aria-hidden="true" />
        <h2 className="text-xl font-semibold text-slate-900">{estado.titulo}</h2>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
        {estado.detalle.map((linea) => (
          <li key={linea}>{linea}</li>
        ))}
      </ul>
    </section>
  );
}
