import type { TourStep } from '../components/Tour.js';

export type PestanaTour = 'resumen' | 'live' | 'oee' | 'workstations' | 'incidencias' | 'orders';

/** Orden en que el tour va guiando por las pestañas, y cómo se llama cada una. */
export const RUTA_TOUR: ReadonlyArray<{ clave: PestanaTour; nombre: string }> = [
  { clave: 'resumen', nombre: 'Resumen' },
  { clave: 'live', nombre: 'Línea en vivo' },
  { clave: 'oee', nombre: 'Rendimiento (OEE)' },
  { clave: 'workstations', nombre: 'Puestos' },
  { clave: 'incidencias', nombre: 'Incidencias' },
  { clave: 'orders', nombre: 'Órdenes' },
];

const ANCLA_DE_PESTANA: Record<PestanaTour, string> = {
  resumen: 'resumen-tab',
  live: 'live-tab',
  oee: 'oee-tab',
  workstations: 'workstations-tab',
  incidencias: 'incidencias-tab',
  orders: 'orders-tab',
};

/** Paso final de un tour: pregunta si quiere ver la pestaña siguiente. */
function preguntaSiguiente(actual: PestanaTour): TourStep {
  const i = RUTA_TOUR.findIndex((p) => p.clave === actual);
  const sig = RUTA_TOUR[i + 1];
  return {
    id: `${actual}-siguiente`,
    anchor: ANCLA_DE_PESTANA[sig.clave],
    title: `¿Quieres abrir ${sig.nombre}?`,
    content: `Ya conoces ${RUTA_TOUR[i].nombre}. Si quieres, te explico ahora la pestaña ${sig.nombre}.`,
    siguiente: sig.clave,
  };
}

/**
 * Un recorrido por pestaña, el mismo en el diseño Clásico y en el Moderno. Cada
 * paso señala un elemento con data-tour-step (el nombre va en `anchor`); el
 * primero de cada recorrido abre su pestaña, y el último ofrece pasar a la siguiente.
 */
export function toursSupervisor(irA: (pestana: PestanaTour) => void): Record<PestanaTour, TourStep[]> {
  const abre = (p: PestanaTour) => () => irA(p);
  return {
    resumen: [
      {
        id: 'cabecera',
        anchor: 'header-title',
        title: 'Panel de supervisión',
        content:
          'Desde aquí controlas la planta: qué se fabrica, cómo va cada puesto y qué ha fallado.\nEl recorrido dura un par de minutos y puedes omitirlo cuando quieras.',
        action: abre('resumen'),
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
          'Resumen, Línea en vivo, Rendimiento (OEE), Puestos, Incidencias y Órdenes. Te guiaré sobre ellas más adelante.',
      },
      {
        id: 'resumen-estado',
        anchor: 'resumen-estado',
        title: 'Cómo va la planta',
        content:
          'Una frase y tres cifras: el rendimiento (OEE) frente al objetivo del 85 %, el cumplimiento del objetivo de producción y las incidencias bloqueantes.\nVerde, ámbar o rojo según lo lejos que estés.',
      },
      {
        id: 'resumen-tarjetas',
        anchor: 'resumen-kpis',
        title: 'Órdenes e incidencias de un vistazo',
        content:
          'Cuántas órdenes hay en total, en marcha, completadas y canceladas, y cuántas incidencias siguen abiertas. Las de órdenes ajustan el filtro de la pestaña Órdenes.',
      },
      {
        id: 'resumen-produccion',
        anchor: 'resumen-produccion',
        title: 'Producción diaria',
        content:
          'Lo producido cada uno de los últimos 30 días frente al objetivo, con los defectos y la media semanal.',
      },
      {
        id: 'resumen-paradas',
        anchor: 'resumen-paradas',
        title: 'Por qué se para la planta',
        content:
          'Las causas de parada ordenadas de más a menos tiempo perdido, con el porcentaje acumulado. Sirve para atacar primero lo que más tiempo se lleva.',
      },
      {
        id: 'resumen-rendimiento',
        anchor: 'resumen-rendimiento-dia',
        title: 'Rendimiento del día',
        content:
          'El objetivo del día frente a lo producido, con la barra de cumplimiento y cuántas órdenes hay en cada estado.\nEl día cuenta desde las 22:00 de la tarde anterior, cuando empieza la jornada de planta.',
      },
      {
        id: 'resumen-tendencia',
        anchor: 'resumen-tendencia',
        title: 'Eficiencia de la última semana',
        content: 'El OEE de los últimos 7 días, con una línea en el 85 % de objetivo para ver si se llega.',
      },
      {
        id: 'repetir',
        anchor: 'header-tour',
        title: 'Para volver a verlo',
        content: 'Este botón abre el tour de la pestaña en la que estés. Cada pestaña tiene el suyo.',
      },
      preguntaSiguiente('resumen'),
    ],
    live: [
      {
        id: 'live-estado',
        anchor: 'live-estado',
        title: 'Estado de la planta',
        content:
          'Dice si hay un turno en marcha, si ha terminado o si la planta está cerrada, y hasta qué hora hay datos.',
        action: abre('live'),
      },
      {
        id: 'live-turnos',
        anchor: 'live-turnos',
        title: 'Elegir turno',
        content:
          'Noche (22:00 a 06:00), Mañana (06:00 a 14:00) o Tarde (14:00 a 22:00). Los sábados que se trabaja solo hay turno de mañana.',
      },
      {
        id: 'live-tabla',
        anchor: 'live-tabla',
        title: 'Qué ha hecho cada puesto',
        content:
          'Cada fila es un puesto y cada barra, lo que ha hecho durante el turno según los partes registrados. La línea roja marca el momento actual.\nA la derecha, la orden con su avance y el OEE. El punto junto al nombre es el estado a la hora del último dato, y solo aparece con el turno en marcha.',
      },
      {
        id: 'live-leyenda',
        anchor: 'live-leyenda',
        title: 'Leyenda de colores',
        content: 'Verde: produciendo. Rojo: parada. Naranja: cambio de formato. Gris: sin parte registrado.',
      },
      {
        id: 'live-resumen',
        anchor: 'live-resumen',
        title: 'Resumen del turno',
        content: 'Cuántos puestos han tenido actividad, lo producido en el turno, el tiempo total de paradas y el OEE medio.',
      },
      preguntaSiguiente('live'),
    ],
    oee: [
      {
        id: 'oee-periodo',
        anchor: 'oee-periodo',
        title: 'Elegir el periodo',
        content: 'Día, Semana o Mes. A la derecha, el OEE de ese periodo y si sube o baja respecto al anterior.',
        action: abre('oee'),
      },
      {
        id: 'oee-medidores',
        anchor: ['oee-disponibilidad', 'oee-rendimiento', 'oee-calidad'],
        title: 'Los tres factores del OEE',
        content:
          'Disponibilidad: cuánto tiempo ha estado produciendo la planta. Rendimiento: a qué velocidad lo ha hecho. Calidad: cuántas piezas han salido buenas.\nMultiplicados dan el OEE.',
      },
      {
        id: 'oee-tendencia',
        anchor: 'oee-tendencia',
        title: 'Tendencia',
        content: 'Cómo ha evolucionado el OEE y sus tres factores: por horas si miras el día, por días en la semana y el mes.',
      },
      {
        id: 'oee-ranking',
        anchor: 'oee-ranking',
        title: 'Ranking de puestos',
        content: 'Los puestos ordenados del peor al mejor rendimiento de hoy. Los que no tienen partes salen sin dato.',
      },
      {
        id: 'oee-detalle',
        anchor: 'oee-detalle',
        title: 'Detalle por puesto',
        content: 'La tabla con las cifras de cada puesto, para comparar uno con otro.',
      },
      preguntaSiguiente('oee'),
    ],
    workstations: [
      {
        id: 'puestos-tablero',
        anchor: 'puestos-tablero',
        title: 'Los puestos de la planta',
        content: 'Una tarjeta por cada puesto activo, con su estado actual.',
        action: abre('workstations'),
      },
      {
        id: 'puestos-tarjeta',
        anchor: 'puestos-tarjeta',
        title: 'Qué dice cada tarjeta',
        content: 'El nombre y el código del puesto, el semáforo de su estado, el operario asignado y la hora de su última actividad.',
      },
      preguntaSiguiente('workstations'),
    ],
    incidencias: [
      {
        id: 'incidencias-tablero',
        anchor: 'incidencias-tablero',
        title: 'Tablero de incidencias',
        content:
          'Las incidencias que registran los operarios, en cuatro columnas: Abiertas, En progreso, Resueltas y Cerradas. Cada tarjeta lleva el título, el tipo, cuándo ocurrió, el puesto y la orden, y la foto si la hay.\nArrastra una tarjeta a otra columna para cambiar su estado; también sirve para reabrirla.',
        action: abre('incidencias'),
      },
      preguntaSiguiente('incidencias'),
    ],
    orders: [
      {
        id: 'ordenes-filtros',
        anchor: 'ordenes-filtros',
        title: 'Buscar y filtrar',
        content: 'Busca por número de orden, modelo o puesto, y filtra por estado y por puesto.',
        action: abre('orders'),
      },
      {
        id: 'ordenes-vista',
        anchor: 'ordenes-vista',
        title: 'Tablero o lista',
        content: 'Tablero: columnas por estado. Lista: una fila por orden, para comparar de un vistazo.',
      },
      {
        id: 'ordenes-contenido',
        anchor: 'ordenes-contenido',
        title: 'Trabajar con las órdenes',
        content:
          'En el tablero, el botón Iniciar o Completar avanza la orden y arrastrarla la cambia de columna. En la lista, el botón Actividad despliega lo registrado en esa orden.',
      },
      {
        id: 'ordenes-nueva',
        anchor: 'header-new-order',
        title: 'Crear una orden nueva',
        content: 'Para añadir una orden, usa + Nueva Orden. Aparece en el tablero y en el panel del operario del puesto.',
      },
      {
        id: 'fin',
        anchor: 'header-tour',
        title: 'Has visto las seis pestañas',
        content: 'Cuando quieras repasar una, pulsa este botón en esa pestaña y se abre su tour.',
      },
    ],
  };
}

const CLAVE_TOUR_VISTO = 'kavana-tour-supervisor-visto';

/**
 * ¿Hay que abrir el tour al entrar al panel? Una vez por sesión del navegador
 * (no en cada recarga ni al cambiar de diseño) y nunca en navegadores
 * automatizados, para no estorbar a las pruebas E2E.
 */
export function debeAbrirTourAlEntrar(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
    if (sessionStorage.getItem(CLAVE_TOUR_VISTO)) return false;
    sessionStorage.setItem(CLAVE_TOUR_VISTO, '1');
    return true;
  } catch {
    return false;
  }
}
