import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
  id: string;
  /** Valor del atributo data-tour-step del elemento que se resalta. Sin él, el paso sale centrado. */
  anchor?: string;
  title: string;
  content: string;
  /** Se ejecuta al llegar al paso (por ejemplo, abrir la pestaña que se explica). */
  action?: () => void;
}

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const ANCHO_TOOLTIP = 360;
const ALTO_TOOLTIP = 300;
const HUECO = 12;
/** Cuánto se espera a que aparezca el elemento tras abrir una pestaña (carga de datos incluida). */
const ESPERA_MAXIMA_MS = 2500;

function buscarAncla(anchor: string | undefined): HTMLElement | null {
  if (!anchor) return null;
  const candidatos = document.querySelectorAll<HTMLElement>(`[data-tour-step="${anchor}"]`);
  for (const el of Array.from(candidatos)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export function Tour({ steps, isOpen, onClose, onComplete }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // El panel puede repintarse en cualquier momento (refrescos de datos): los
  // pasos se leen siempre de aquí para no reiniciar nada al cambiar de identidad.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const objetivoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  // Al llegar a un paso: ejecutar su acción, esperar al elemento, llevarlo a la
  // vista y medirlo. Si no aparece, el paso se enseña centrado y sin recuadro.
  useEffect(() => {
    if (!isOpen) return;
    const paso = stepsRef.current[currentStep];
    if (!paso) return;

    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRect(null);
    objetivoRef.current = null;
    paso.action?.();

    const inicio = Date.now();
    const sondear = () => {
      if (cancelado) return;
      const el = buscarAncla(paso.anchor);
      if (el) {
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        objetivoRef.current = el;
        requestAnimationFrame(() => {
          if (!cancelado) setRect(el.getBoundingClientRect());
        });
        return;
      }
      if (!paso.anchor || Date.now() - inicio > ESPERA_MAXIMA_MS) return;
      timer = setTimeout(sondear, 80);
    };
    timer = setTimeout(sondear, 80);
    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
  }, [currentStep, isOpen]);

  // El recuadro sigue al elemento si se hace scroll o cambia el tamaño de la ventana.
  useEffect(() => {
    if (!isOpen) return;
    const reajustar = () => {
      const el = objetivoRef.current;
      if (el && el.isConnected) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', reajustar);
    window.addEventListener('scroll', reajustar, true);
    return () => {
      window.removeEventListener('resize', reajustar);
      window.removeEventListener('scroll', reajustar, true);
    };
  }, [isOpen]);

  const total = steps.length;
  const salir = () => {
    onComplete();
    onClose();
  };
  const siguiente = () => {
    if (currentStep < total - 1) setCurrentStep(currentStep + 1);
    else salir();
  };
  const anterior = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  useEffect(() => {
    if (!isOpen) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        siguiente();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        anterior();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        salir();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  });

  const paso = steps[currentStep];
  if (!isOpen || !paso) return null;

  const esUltimo = currentStep === total - 1;
  const esPrimero = currentStep === 0;

  // Posición del texto: debajo del elemento si cabe, si no encima; sin elemento, centrado.
  let top: number;
  let left: number;
  if (rect) {
    left = rect.left + rect.width / 2 - ANCHO_TOOLTIP / 2;
    const cabeAbajo = rect.bottom + HUECO + ALTO_TOOLTIP <= window.innerHeight;
    const cabeArriba = rect.top - HUECO - ALTO_TOOLTIP >= 0;
    if (cabeAbajo) top = rect.bottom + HUECO;
    else if (cabeArriba) top = rect.top - HUECO - ALTO_TOOLTIP;
    else top = window.innerHeight - ALTO_TOOLTIP - 16;
  } else {
    left = window.innerWidth / 2 - ANCHO_TOOLTIP / 2;
    top = window.innerHeight / 2 - ALTO_TOOLTIP / 2;
  }
  left = Math.max(16, Math.min(left, window.innerWidth - ANCHO_TOOLTIP - 16));
  top = Math.max(16, Math.min(top, window.innerHeight - 16 - 120));

  const recuadro: React.CSSProperties | null = rect
    ? {
        position: 'fixed',
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 2px #f97316',
        zIndex: 9999,
        pointerEvents: 'none',
        transition: 'all 0.25s ease',
      }
    : null;

  return createPortal(
    <>
      {/* Con elemento, el propio recuadro oscurece el resto; sin él, un velo simple. */}
      {!recuadro && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 9998 }}
          onClick={salir}
          aria-hidden="true"
        />
      )}
      {recuadro && <div style={recuadro} aria-hidden="true" />}
      <div
        role="dialog"
        aria-label={paso.title}
        className="tour-tooltip"
        style={{
          position: 'fixed',
          top,
          left,
          width: ANCHO_TOOLTIP,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          padding: 20,
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{paso.title}</h3>
            <p className="mt-0.5 text-xs text-slate-500">Paso {currentStep + 1} de {total}</p>
          </div>
          <button onClick={salir} className="p-1 text-slate-400 hover:text-slate-600" aria-label="Saltar tour">
            ✕
          </button>
        </div>
        <div className="mb-5 text-sm text-slate-700">
          {paso.content.split('\n').map((linea, i) => (
            <p key={i} className="mb-2">{linea}</p>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          {!esPrimero && (
            <button
              onClick={anterior}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              ← Atrás
            </button>
          )}
          <button
            onClick={siguiente}
            className="rounded-lg bg-kavana-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kavana-orange-dark"
          >
            {esUltimo ? 'Finalizar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}

/**
 * Hook del tour. El componente que devuelve tiene identidad estable: si cambiara
 * en cada repintado del panel, React lo desmontaría y el tour volvería al paso 1.
 */
export function useTour(steps: TourStep[]) {
  const [isOpen, setIsOpen] = useState(false);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const start = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const complete = () => {
    try {
      localStorage.setItem('kavana-tour-completed', 'true');
    } catch {
      /* sin almacenamiento: da igual */
    }
    setIsOpen(false);
  };

  const TourComponent = useMemo(
    () =>
      function TourDelPanel(props: { isOpen: boolean; onClose: () => void; onComplete: () => void }) {
        return <Tour steps={stepsRef.current} {...props} />;
      },
    [],
  );

  return { isOpen, completed: false, start, close, complete, TourComponent };
}
