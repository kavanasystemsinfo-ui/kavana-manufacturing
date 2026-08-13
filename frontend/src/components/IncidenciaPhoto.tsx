import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  isClassic?: boolean;
}

/**
 * Foto de evidencia de una incidencia: se muestra COMPLETA (object-contain,
 * nunca recortada) y al hacer clic se abre un lightbox a tamaño grande.
 */
export function IncidenciaPhoto({ src, alt, isClassic }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in text-left" title="Clic para ampliar">
        <p className={`mb-1 text-[10px] font-bold uppercase tracking-wider ${isClassic ? 'text-slate-500' : 'text-slate-500'}`}>
          📷 Evidencia fotográfica · clic para ampliar
        </p>
        <img
          src={src}
          alt={alt}
          className={`max-h-64 w-full rounded-lg border object-contain ${isClassic ? 'border-slate-200' : 'border-kavana-steel/20'}`}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/30"
          >
            ✕ Cerrar
          </button>
        </div>
      )}
    </>
  );
}
