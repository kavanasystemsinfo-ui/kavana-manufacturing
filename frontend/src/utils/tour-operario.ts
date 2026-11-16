import type { TourStep } from '../components/Tour.js';

/** Las tres pantallas del operario: elegir orden, trabajar en una orden y cerrar el turno. */
export type PantallaOperario = 'cola' | 'orden' | 'turno';

interface OpcionesTourOperario {
  /** El diseño Moderno enseña la tarjeta «Mi turno hoy»; el Clásico no. */
  moderno: boolean;
  /** Hay alguna orden en la cola: sin ellas no se ofrece ver cómo se trabaja una. */
  hayOrdenes: boolean;
  irACola: () => void;
  abrirOrden: () => void;
  abrirCierre: () => void;
}

/**
 * Un recorrido por pantalla del panel de operario, el mismo en Clásico y en
 * Moderno. Cada paso señala un elemento con data-tour-step; el primero de cada
 * recorrido lleva a su pantalla y el último ofrece pasar a la siguiente.
 */
export function toursOperario(o: OpcionesTourOperario): Record<PantallaOperario, TourStep[]> {
  const cola: TourStep[] = [
    {
      id: 'cola-titulo',
      anchor: 'header-title',
      title: 'Panel de operario',
      content:
        'Desde aquí registras lo que fabricas en tu puesto, sin papel.\nEl recorrido dura un par de minutos y puedes omitirlo cuando quieras.',
      action: o.irACola,
    },
    {
      id: 'cola-buscar',
      anchor: 'cola-buscar',
      title: 'Buscar una orden',
      content: 'Escribe parte del modelo, del puesto o del código y la lista se reduce.',
    },
    {
      id: 'cola-lista',
      anchor: 'cola-lista',
      title: 'Tus órdenes',
      content:
        'Arriba, la orden «En curso»; debajo, las «Siguientes», y el resto plegado en «Ver el resto». Toca una para trabajar en ella.',
    },
    {
      id: 'cola-cerrar-turno',
      anchor: 'cola-cerrar-turno',
      title: 'Cerrar el turno',
      content: 'Al terminar tu jornada, aquí sacas el resumen de lo que has hecho para pasárselo al compañero del relevo.',
    },
    {
      id: 'cola-diseno',
      anchor: 'header-theme',
      title: 'Cambiar el diseño',
      content: 'Clásico es claro y sobrio; Moderno es oscuro, grande y táctil. Los datos y las acciones son los mismos.',
    },
    {
      id: 'cola-repetir',
      anchor: 'header-tour',
      title: 'Para volver a verlo',
      content: 'Este botón abre el tour de la pantalla en la que estés.',
    },
  ];
  if (o.hayOrdenes) {
    cola.push({
      id: 'cola-siguiente',
      anchor: 'cola-lista',
      title: '¿Quieres ver cómo se trabaja una orden?',
      content: 'Te abro la primera orden de la lista y te explico qué hace cada parte de la pantalla.',
      siguiente: 'orden',
    });
  }

  const orden: TourStep[] = [
    {
      id: 'orden-resumen',
      anchor: 'orden-resumen',
      title: 'La orden en la que trabajas',
      content:
        'Su código, el producto, tu puesto y cómo va: la barra de avance y las piezas hechas frente a las previstas.',
      action: o.abrirOrden,
    },
    {
      id: 'orden-cifras',
      anchor: 'orden-cifras',
      title: 'Cuánto falta y qué ha fallado',
      content: 'Las piezas que faltan, los defectos, cuántas paradas ha habido y cuánto tiempo has estado parado.',
    },
    {
      id: 'orden-pausa',
      anchor: 'orden-pausa',
      title: 'Pausar la producción',
      content:
        'Si la máquina se para, pulsa Pausar y toca el motivo de la parada. Al volver a producir, pulsa Reanudar. El tiempo parado se cuenta solo.',
    },
    {
      id: 'orden-ultimos',
      anchor: 'orden-ultimos',
      title: 'Últimos bloques',
      content: 'Lo que ya has registrado en esta orden, para comprobar de un vistazo que está todo.',
    },
    ...(o.moderno
      ? [
          {
            id: 'orden-mi-turno',
            anchor: 'orden-mi-turno',
            title: 'Mi turno hoy',
            content: 'Tus horas netas, las piezas buenas, los defectos y las paradas de hoy, y tu eficiencia personal.',
          },
        ]
      : []),
    {
      id: 'orden-formulario',
      anchor: 'orden-formulario',
      title: 'Registrar un bloque de producción',
      content:
        'Un bloque es un tramo de trabajo seguido. Lo apuntas al terminarlo, en pocos toques.\nSi quieres repetir lo anterior, usa «Repetir último bloque».',
    },
    {
      id: 'orden-horas',
      anchor: 'orden-horas',
      title: 'Las horas',
      content:
        'Desde viene rellenada con el fin del bloque anterior. Si dejas Hasta vacío, cuenta como ahora. «Poner la hora (redondeada)» sube al siguiente múltiplo de 5 minutos.',
    },
    {
      id: 'orden-calculadoras',
      anchor: 'orden-calculadoras',
      title: 'Contar por palets, filas o paquetes',
      content:
        'Elige la calculadora de tu puesto y pulsa +1 palet, +1 fila o +1 paquete: suma sus piezas a la producción buena. «Nueva calculadora» crea una para tu puesto.',
    },
    {
      id: 'orden-cantidades',
      anchor: ['orden-produccion', 'orden-defectos'],
      title: 'Producción buena y defectos',
      content: 'Mueve las cantidades con + y −, con los botones rápidos o escribiéndolas.',
    },
    {
      id: 'orden-registrar',
      anchor: 'orden-registrar',
      title: 'Registrar la producción',
      content: 'Guarda el bloque. Si no hay conexión, se guarda en el dispositivo y se envía cuando vuelva.',
    },
    {
      id: 'orden-conexion',
      anchor: 'orden-conexion',
      title: 'Conexión y envíos',
      content:
        'Online u Offline, cuántos registros están «Por enviar» y cuántos han dado error. Con error, tócalo para verlos.',
    },
    {
      id: 'orden-incidencia',
      anchor: 'orden-incidencia',
      title: 'Avisar de una incidencia',
      content: 'Si hay un problema de calidad, mantenimiento o seguridad, pulsa aquí. Le llega al supervisor, con foto si la haces.',
    },
    {
      id: 'orden-ayuda',
      anchor: 'header-help',
      title: 'Ayuda',
      content: 'Una guía corta de esta pantalla, escrita en lenguaje de planta.',
    },
    {
      id: 'orden-volver',
      anchor: 'orden-volver',
      title: 'Volver a la cola',
      content: 'Para elegir otra orden. Lo que llevas registrado se queda guardado.',
    },
    {
      id: 'orden-siguiente',
      title: '¿Quieres ver el cierre de turno?',
      content: 'Te abro la pantalla con el resumen del día y te explico qué hay en ella.',
      siguiente: 'turno',
    },
  ];

  const turno: TourStep[] = [
    {
      id: 'turno-cierre',
      anchor: 'turno-cierre',
      title: 'Cierre de turno',
      content:
        'El resumen de lo que has registrado hoy, para entregar el relevo sin papel. Hasta que registres algún bloque, aquí solo verás un aviso.',
      action: o.abrirCierre,
    },
    {
      id: 'turno-cifras',
      anchor: 'turno-cifras',
      title: 'Las cifras del turno',
      content: 'Piezas buenas, defectos, paradas y tiempo parado de todo tu turno.',
    },
    {
      id: 'turno-por-orden',
      anchor: 'turno-por-orden',
      title: 'Desglose por orden',
      content: 'Lo mismo, orden por orden, y debajo las paradas por motivo.',
    },
    {
      id: 'turno-copiar',
      anchor: 'turno-copiar',
      title: 'Copiar el resumen',
      content: 'Deja el texto listo para pegarlo en un mensaje al compañero que te releva.',
    },
    {
      id: 'turno-volver',
      anchor: 'turno-volver',
      title: 'Volver al panel',
      content: 'Has visto las tres pantallas: elegir orden, trabajar en ella y cerrar el turno. Pulsa Volver y a trabajar.',
    },
  ];

  return { cola, orden, turno };
}
