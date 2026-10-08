import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action before showing step (e.g., switch tab)
}

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function Tour({ steps, isOpen, onClose, onComplete }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Reset to first step when tour opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setTargetRect(null); // Clear previous rect
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [isOpen]);

  // Find target element and calculate position
  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    if (!step) return;

    // Execute any action (e.g., switch tab)
    if (step.action) {
      step.action();
    }

    // Small delay to allow DOM updates from action
    const timeout = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      const target = document.querySelector(step.selector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      } else if (step.position === 'center' || !step.selector) {
        // Center of viewport for steps without selector
        setTargetRect({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          bottom: window.innerHeight / 2,
          right: window.innerWidth / 2,
          width: 0,
          height: 0,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        } as DOMRect);
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentStep, isOpen, steps]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          e.preventDefault();
          skip();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps.length]);

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTargetRect(null); // Clear rect for smooth transition
    } else {
      onComplete();
      onClose();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTargetRect(null); // Clear rect for smooth transition
    }
  };

  const skip = () => {
    onComplete();
    onClose();
  };

  if (!isOpen || !steps[currentStep] || !targetRect) {
    return null;
  }

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Calculate tooltip position
  const tooltipWidth = 360;
  const gap = 12;
  let top = 0;
  let left = 0;

  if (step.position === 'center' || !step.selector) {
    top = window.innerHeight / 2 - 150;
    left = window.innerWidth / 2 - tooltipWidth / 2;
  } else {
    switch (step.position) {
      case 'bottom':
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = targetRect.top - gap - 300;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - 150;
        left = targetRect.right + gap;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - 150;
        left = targetRect.left - gap - tooltipWidth;
        break;
      default:
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    }
  }

  // Keep tooltip in viewport
  left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
  top = Math.max(16, Math.min(top, window.innerHeight - 320));

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9998,
    pointerEvents: 'none' as const,
  };

  const highlightStyle: React.CSSProperties = step.selector ? {
    position: 'fixed',
    top: targetRect.top - 4,
    left: targetRect.left - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
    borderRadius: 8,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 0 2px #f97316',
    zIndex: 9999,
    pointerEvents: 'none' as const,
    transition: 'all 0.3s ease',
  } : {};

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    top,
    left,
    width: tooltipWidth,
    maxHeight: 'calc(100vh - 32px)',
    overflow: 'auto',
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 10000,
    padding: 24,
    fontFamily: 'inherit',
    animation: 'slideIn 0.2s ease-out',
  };

  const tooltipContent = (
    <div ref={tooltipRef} style={tooltipStyle} className="tour-tooltip">
      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
          <p className="text-sm text-slate-500 mt-1">Paso {currentStep + 1} de {steps.length}</p>
        </div>
        <button
          onClick={skip}
          className="text-slate-400 hover:text-slate-600 p-1"
          aria-label="Saltar tour"
        >
          ✕
        </button>
      </div>

      <div className="prose prose-sm max-w-none text-slate-700 mb-6">
        {step.content.split('\n').map((line, i) => (
          <p key={i} className="mb-2">{line}</p>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            {!isFirst && (
              <button
                onClick={goPrev}
                className="px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-700 transition-colors"
              >
                ←
              </button>
            )}
            <span className="px-2 py-1 bg-slate-200 rounded text-xs font-medium">
              {currentStep + 1} / {steps.length}
            </span>
            {!isLast && (
              <button
                onClick={goNext}
                className="px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-700 transition-colors"
              >
                →
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {!isFirst && (
            <button
              onClick={goPrev}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ← Atrás
            </button>
          )}
          <button
            onClick={goNext}
            className="px-4 py-2 text-sm font-medium text-white bg-kavana-orange rounded-lg hover:bg-kavana-orange-dark transition-colors"
          >
            {isLast ? 'Finalizar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <>
      <div style={overlayStyle} onClick={skip} aria-hidden="true" />
      {step.selector && <div style={highlightStyle} aria-hidden="true" />}
      {tooltipContent}
    </>,
    document.body
  );
}

// Hook para usar el tour en cualquier componente
export function useTour(steps: TourStep[]) {
  const [isOpen, setIsOpen] = useState(false);
  // NO ocultamos el botón tras completar: siempre visible
  // const [completed, setCompleted] = useState(false);

  const start = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const complete = () => {
    // Marcamos como completado en localStorage pero NO ocultamos el botón
    localStorage.setItem('kavana-tour-completed', 'true');
    setIsOpen(false);
  };

  return {
    isOpen,
    completed: false, // Siempre false para que el botón nunca se oculte
    start,
    close,
    complete,
    TourComponent: ({ isOpen: propIsOpen, onClose, onComplete }: { isOpen: boolean; onClose: () => void; onComplete: () => void }) => (
      <Tour
        steps={steps}
        isOpen={propIsOpen}
        onClose={onClose}
        onComplete={onComplete}
      />
    ),
  };
}