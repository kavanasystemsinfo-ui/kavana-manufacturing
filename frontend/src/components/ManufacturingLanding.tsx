import { useState } from 'react';

export function ManufacturingLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Hero */}
      <header className="border-b border-gray-800/60">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            KAVANA<span className="text-orange-500"> MANUFACTURING</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Optimización digital de procesos industriales
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <a
              href="#proceso"
              className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-500 transition"
            >
              Ver cómo optimicé el proceso
            </a>
            <a
              href="https://www.kavanasystems.com/manufacturing/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-gray-800 px-5 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700 transition"
            >
              Probar la solución
            </a>
          </div>
        </div>
      </header>

      {/* Sección 01: El problema de negocio */}
      <section id="problema" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">El problema no era tecnológico</h2>
        <p className="text-lg leading-relaxed text-gray-400 mb-6">
          En una planta industrial, registrar una producción puede parecer una tarea sencilla. En la práctica, el proceso estaba fragmentado:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>El operario registraba información en papel.</li>
          <li>Parte de esa información se trasladaba después a Excel.</li>
          <li>La información podía llegar tarde o incompleta.</li>
          <li>Los relevos no siempre compartían el mismo contexto.</li>
          <li>El supervisor necesitaba desplazarse para conocer el estado real de producción.</li>
          <li>Una caída de conexión podía interrumpir el registro.</li>
          <li>La oficina recibía datos, pero no siempre información accionable.</li>
        </ul>
        <p className="text-lg leading-relaxed text-gray-400 mt-6">
          El resultado era trabajo duplicado, pérdida de trazabilidad y decisiones tomadas con información incompleta.
        </p>
        <blockquote className="mt-8 pl-4 border-l-4 border-orange-500 italic text-gray-300">
          “Antes de construiritlo, yo era uno de los trabajadores que tenía que convivir con el problema.”<br/>
          <span className="block mt-2 text-xs text-gray-500">— Jorge Adán, 8 años en líneas de producción y reparto</span>
        </blockquote>
        <p className="mt-6 text-lg leading-relaxed text-gray-400">
          <strong>La pregunta que guía el proyecto</strong><br/>
          ¿Cómo podemos eliminar trabajo innecesario del proceso sin añadir complejidad al operario?
        </p>
      </section>

      {/* Sección 02: Cómo lo analicé */}
      <section id="analisis" className="mx-auto max-w-6xl px-6 py-16 bg-gray-800/50 rounded-2xl">
        <h2 className="text-3xl font-bold text-white mb-8">Cómo lo analicé: diagnóstico basado en evidencia</h2>
        <p className="text-lg leading-relaxed text-gray-400 mb-6">
          - <strong>Dónde se producía fricción:</strong> Registro en papel → transcripción tardía a sistemas.<br/>
          - <strong>Dónde había trabajo duplicado:</strong> Mismos datos ingresados 2-3 veces (papel, Excel, sistema).<br/>
          - <strong>Dónde se perdía información:</strong> Cambios de turno sin contexto; incidencias sin foto ni seguimiento.<br/>
          - <strong>Qué restricciones tenían los usuarios:</strong> Necesidad de trabajar sin WiFi; tiempo limitado entre tareas; interfaces complejas para operarios de planta.
        </p>
      </section>

      {/* Sección 03: Qué cambié */}
      <section id="cambios" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">Qué cambié: de la ineficiencia al flujo</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-800">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-4 py-3 text-left text-white font-bold">Problema detectado</th>
                <th className="px-4 py-3 text-left text-white font-bold">Cambio implementado</th>
                <th className="px-4 py-3 text-left text-white font-bold">Resultado buscado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="px-4 py-3 text-gray-400">Registro manual y posterior transcripción</td>
                <td className="px-4 py-3 text-gray-400">Registro directo en planta (tablet/touch)</td>
                <td className="px-4 py-3 text-gray-400">Eliminar doble trabajo</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Dependencia de conexión constante</td>
                <td className="px-4 py-3 text-gray-400">Funcionamiento offline-first (sincronización cuando hay red)</td>
                <td className="px-4 py-3 text-gray-400">No detener el proceso por caídas de red</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Demasiados pasos para registrar producción</td>
                <td className="px-4 py-3 text-gray-400">Flujo táctil simplificado (2 clics vs 5+)</td>
                <td className="px-4 py-3 text-gray-400">Menos fricción, más adopción</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Información fragmentada en papel/Excel</td>
                <td className="px-4 py-3 text-gray-400">Datos centralizados en una única fuente de verdad</td>
                <td className="px-4 py-3 text-gray-400">Decisiones basadas en datos completos y actuales</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Falta de visibilidad en tiempo real</td>
                <td className="px-4 py-3 text-gray-400">Dashboard de planta con OEE, incidencias y estados de puesto</td>
                <td className="px-4 py-3 text-gray-400">Supervisión proactiva, no reactiva</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Incidencias sin contexto ni trazabilidad</td>
                <td className="px-4 py-3 text-gray-400">Evidencia fotográfica + historial por orden</td>
                <td className="px-4 py-3 text-gray-400">Mejor calidad en investigaciones de calidad</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-gray-400">Datos inconsistentes o sin validación</td>
                <td className="px-4 py-3 text-gray-400">Reglas de negocio en tiempo real (máximos/minimos, dependencias)</td>
                <td className="px-4 py-3 text-gray-400">Mayor calidad del dato desde la fuente</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sección 04: Cómo sé que la solución es fiable */}
      <section id="fiabilidad" className="mx-auto max-w-6xl px-6 py-16 bg-gray-800/50 rounded-2xl">
        <h2 className="text-3xl font-bold text-white mb-8">Cómo sé que la solución es fiable: rigor técnico como habilitador</h2>
        <p className="text-lg leading-relaxed text-gray-400 mb-6">
          Una mejora de proceso no sirve si introduce nuevos errores o no se adopta. Para garantizar que los cambios fueran sostenibles y verificables, construí el sistema con los mismos estándares que exigen los entornos de producción crítica:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>817 pruebas automatizadas (backend + frontend) que validan flujos de extremo a extremo.</li>
          <li>Integración real contra PostgreSQL en tests (no solo mocks) – descubrí que suites podían estar verdes mientras el flujo real fallaba.</li>
          <li>CI/CD pipeline con lint, testing, build y despliegue automático en cada commit.</li>
          <li>Validaciones de negocio en tiempo real (evitar estados imposibles, datos fuera de rango).</li>
          <li>Auditoría completa de quién cambió qué y cuándo (traceabilidad total).</li>
          <li>Observabilidad estructurada (métricas, logs, trazabilidad) para detectar regresiones antes de que afecten al usuario.</li>
        </ul>
        <p className="mt-6 text-lg leading-relaxed text-gray-400">
          <strong>Nota de transparencia:</strong><br/>
          Los números anteriores son reales y medibles. No invento ROI porque no hay clientes en producción todavía – pero el sistema está diseñado para que, al implementarlo, puedas medir:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-400 mt-4">
          <li>Reducción de pasos en el registro de producción (objetivo: 5 → 2)</li>
          <li>Eliminación de trabajo duplicado (transcripción papel → digital)</li>
          <li>Tiempo de respuesta del supervisor ante incidencias (de desplazamiento a notificación instantánea)</li>
          <li>Calidad del dato (porcentaje de registros completos y válidos al ingreso)</li>
        </ul>
      </section>

      {/* Sección 05: La solución funcionando */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">La solución funcionando: ves el impacto en acción</h2>
        <p className="text-lg leading-relaxed text-gray-400 mb-6">
          Como dice el dicho en operaciones: “Si no se puede medir, no se puede mejorar.” Aquí puedes ver cómo los cambios de proceso se traducen en una experiencia de uso real:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li><strong>[RESUMEN]</strong> KPIs con datos reales de hoy: 10 órdenes en progreso, OEE planta calculado, incidencias abiertas.</li>
          <li><strong>[LÍNEA EN VIVO]</strong> Timeline de 8h con bloques de producción por puesto (arranque, producción estable, cierre).</li>
          <li><strong>[ÓRDENES]</strong> Lista con estados mixtos (pending/in_progress) y cantidades producidas reales.</li>
          <li><strong>[Vídeo demo de 60 segundos]</strong> Navega por los tabs mostrando cómo fluye la información de orden → producción → incidencias → supervisión.</li>
          <li><strong>[Acceso a demo en vivo]</strong> Usuario: <code>demo</code> / Contraseña: <code>kavana</code> (datos de hoy actualizados cada hora).</li>
        </ul>
      </section>

      {/* Sección 06: Ingeniería (al final – para perfiles técnicos) */}
      <section id="ingenieria" className="mx-auto max-w-6xl px-6 py-16 bg-gray-800/50 rounded-2xl">
        <h2 className="text-3xl font-bold text-white mb-8">Ingeniería: cómo hice que estas mejoras fueran fiables</h2>
        <p className="text-lg leading-relaxed text-gray-400 mb-6">
          Si tu interés es la profundidad técnica detrás de la solución de proceso, aquí están las decisiones clave que hicieron posible los cambios anteriores:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>Arquitectura multi-tenant con RLS (Row Level Security) para aislar datos de empresas distintas en la misma instancia.</li>
          <li>Offline-first con Dexie.js + outbox pattern para que el operario nunca se detenga por falta de conexión.</li>
          <li>Event-driven con BullMQ y Redis para sincronización confiable y manejo de picos de carga.</li>
          <li>Monitoreo con OpenTelemetry + Prometheus + Grafana para trazabilidad de ejecuciones y detección de anomalías.</li>
          <li>Decisiones arquitectónicas documentadas (ADRs) que explican trade-offs como consistencia vs disponibilidad.</li>
          <li>Testing de contrato y E2E con Playwright para validar flujos de usuario reales.</li>
          <li>Stack: PostgreSQL, NestJS, React, TailwindCSS, Docker, Kubernetes (en Render/Neon/Vercel).</li>
        </ul>
        <p className="mt-6 text-lg leading-relaxed text-gray-400">
          <strong>Nota:</strong> Esta sección existe para completar la imagen – pero recuerda: la tecnología fue el medio. El objetivo fue mejorar el proceso.
        </p>
      </section>

      {/* Sección 07: Qué queda por resolver */}
      <section id="futuro" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-bold text-white mb-8">Qué queda por resolver: hoja de ruta honesta</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>No hay clientes en producción todavía (el proyecto es un laboratorio de aprendizaje y validación).</li>
          <li>Integración con PLCs/máquinas vía OPC UA pendiente (para capturar datos automáticos de sensores).</li>
          <li>Piloto en planta real necesario para validar métricas de mejora (tiempo, calidad, desperdicio).</li>
          <li>Expansión del catálogo de incidencias y tipos de paradas basado en feedback de operarios reales.</li>
          <li>Métricas de adopción y NPS interno para medir el cambio cultural además del técnico.</li>
        </ul>
      </section>

      {/* Sección 08: Qué aprendí */}
      <section id="aprendizaje" className="mx-auto max-w-6xl px-6 py-16 bg-gray-800/50 rounded-2xl">
        <h2 className="text-3xl font-bold text-white mb-8">Qué aprendí: lecciones de producto y proceso</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-400">
          <li>El proceso real nunca es como el idealizado – Cambiar el modelo de eventos de <code>start → pause → stop</code> a <em>bloques de trabajo retrospectivos</em> fue necesario porque los operarios no trabajan en tramos limpios y predecibles.</li>
          <li>La fricción se esconde en los detalles – Reducir el registro de 5 pasos a 2 no fue solo cuestión de UI; hubo que replantear qué información era <em>estrictamente necesaria</em> en el momento vs qué podía recogerse después.</li>
          <li>Los usuarios adoptan lo que les quita carga, no lo que es “más avanzado” – El operario prefiere un botón grande que hace una cosa bien a un menú con 10 opciones que “podrían ser útiles”.</li>
          <li>La mejora continua requiere mecanismos, no solo buenas intenciones – Añadir tests que fallen intencionalmente cuando se reintroduce un patrón antiguo (ej: transcripción papel) hizo que la solución fuera autolimpiable.</li>
          <li>Hablar el lenguaje del negocio es tan importante como escribir buen código – Decidir qué métricas mostrar al supervisor (OEE, paradas, calidad) tuvo más impacto en la adopción que cualquier característica técnica brillante.</li>
        </ol>
      </section>

      {/* Pie de página */}
      <footer className="mx-auto max-w-6xl px-6 py-12 border-t border-gray-800/60 text-center text-sm text-gray-500">
        <p>
          <a href="https://github.com/kavanasystemsinfo-ui/kavana-manufacturing" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">GitHub</a> |
          <a href="https://www.kavanasystems.com/manufacturing/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Demo</a> |
          <a href="https://www.linkedin.com/in/jorgeadan" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">LinkedIn</a>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Jorge Adán Rodríguez — Kavana Systems</p>
      </footer>
    </div>
  );
}// Version: 1791366804
