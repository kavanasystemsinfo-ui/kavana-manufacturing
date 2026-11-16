import type { TourStep } from '../components/Tour.js';

export type PestanaTour = 'resumen' | 'live' | 'oee' | 'workstations' | 'incidencias' | 'orders';

/**
 * Recorrido del panel de supervisor, el mismo en el diseño Clásico y en el
 * Moderno. Cada paso señala un elemento con data-tour-step (el nombre va en
 * `anchor`) y, si explica una pestaña, la abre antes de buscarlo.
 */
export function pasosTourSupervisor(irA: (pestana: PestanaTour) => void): TourStep[] {
  const abre = (p: PestanaTour) => () => irA(p);
  return [
    {
      id: 'cabecera',
      anchor: 'header-title',
      title: 'Panel de supervisión',
      content:
        'Desde aquí controlas la planta: qué se fabrica, cómo va cada puesto y qué ha fallado.\nEl recorrido dura un minuto y puedes salir cuando quieras.',
    },
    {
      id: 'nueva-orden',
      anchor: 'header-new-order',
      title: 'Crear una orden',
      content:
        'Abre el formulario de una orden de fabricación: modelo, puesto, cantidad y notas. La orden le aparece al operario de ese puesto.',
    },
    {
      id: 'ayuda',
      anchor: 'header-help',
      title: 'Ayuda',
      content: 'Una guía corta de cada pantalla, escrita en lenguaje de planta.',
    },
    {
      id: 'diseno',
      anchor: 'header-theme',
      title: 'Cambiar el diseño',
      content:
        'Clásico es claro y sobrio; Moderno es oscuro, grande y táctil. Los datos y las acciones son los mismos.',
    },
    {
      id: 'pestanas',
      anchor: 'tabs',
      title: 'Seis pestañas',
      content:
        'Resumen, Línea en vivo, Rendimiento (OEE), Puestos, Incidencias y Órdenes. Vamos a abrirlas.',
    },
    {
      id: 'resumen-estado',
      anchor: 'resumen-estado',
      title: 'Cómo va la planta',
      content:
        'Una frase y tres cifras: el rendimiento (OEE) frente al objetivo del 85 %, el cumplimiento del objetivo de producción y las incidencias bloqueantes.\nVerde, ámbar o rojo según lo lejos que estés.',
      action: abre('resumen'),
    },
    {
      id: 'resumen-tarjetas',
      anchor: 'resumen-kpis',
      title: 'Órdenes e incidencias de un vistazo',
      content:
        'Cuántas órdenes hay en total, en marcha, completadas y canceladas, y cuántas incidencias siguen abiertas. Las de órdenes ajustan el filtro de la pestaña Órdenes.',
      action: abre('resumen'),
    },
    {
      id: 'linea-en-vivo',
      anchor: 'linea-en-vivo',
      title: 'Línea en vivo',
      content:
        'Qué ha hecho cada puesto durante el turno, según los partes registrados: verde produciendo, rojo parado, naranja cambio de formato.\nCon la planta cerrada enseña el último turno y avisa de cuándo reabre.',
      action: abre('live'),
    },
    {
      id: 'oee',
      anchor: 'oee-tab',
      title: 'Rendimiento (OEE)',
      content: 'El rendimiento de la planta y de cada puesto, con su tendencia por día, semana o mes.',
      action: abre('oee'),
    },
    {
      id: 'puestos',
      anchor: 'workstations-tab',
      title: 'Puestos',
      content: 'Todos los puestos con su estado, el operario asignado y su última actividad.',
      action: abre('workstations'),
    },
    {
      id: 'incidencias',
      anchor: 'incidencias-tab',
      title: 'Incidencias',
      content:
        'Los avisos de calidad, mantenimiento o seguridad que levantan los operarios, ordenados por estado en un tablero.',
      action: abre('incidencias'),
    },
    {
      id: 'ordenes',
      anchor: 'orders-tab',
      title: 'Órdenes',
      content: 'Todas las órdenes de producción, con filtros, en lista o en tablero, y el detalle de su actividad.',
      action: abre('orders'),
    },
    {
      id: 'repetir',
      anchor: 'header-tour',
      title: 'Para volver a verlo',
      content: 'Este botón repite el recorrido cuando quieras.',
      action: abre('resumen'),
    },
  ];
}
