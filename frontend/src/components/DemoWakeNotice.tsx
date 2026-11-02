interface Props {
  isClassic: boolean;
}

/**
 * Aviso del login: el servidor de la demo está en un plan gratuito que se duerme
 * sin uso, y el primer acceso tarda en responder. Se avisa para que nadie piense
 * que la demo está rota.
 */
export function DemoWakeNotice({ isClassic }: Props) {
  return (
    <p
      role="note"
      className={`rounded-sm px-4 py-3 text-sm ${
        isClassic
          ? 'border border-amber-200 bg-amber-50 text-amber-800'
          : 'border border-amber-500/40 bg-amber-900/30 text-amber-200'
      }`}
    >
      Esto es un proyecto de demostración. Si lleva un rato sin usarse, el servidor se duerme y el primer acceso
      puede tardar hasta 1 minuto en responder. Espera un momento y vuelve a intentarlo si no entra.
    </p>
  );
}
