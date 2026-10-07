import { useState } from 'react';

export function LandingPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white">
      {/* Hero */}
      <header className="border-b border-gray-800/60">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h1 className="text-5xl font-black tracking-tight md:text-7xl">
            Kavana<span className="text-orange-500"> Manufacturing</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Rediseñar el proceso de planta para que el trabajo fluya.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="https://github.com/kavanasystemsinfo-ui/kavana-systems-v3"
              target="_blank"
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
            >
              Demo
            </a>
            <a
              href="https://github.com/kavanasystemsinfo-ui/kavana-systems-v3"
              target="_blank"
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-gray-700"
            >
              Código
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* 01. El problema de negocio */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">01. El problema de negocio</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            En una planta industrial, registrar una producción puede parecer una tarea sencilla.
            En la práctica, el proceso estaba fragmentado:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>El operario registraba información en papel.</li>
            <li>Parte de esa información se trasladaba después a Excel.</li>
            <li>La información podía llegar tarde o incompleta.</li>
            <li>Los relevos no siempre compartían el mismo contexto.</li>
            <li>El supervisor necesitaba desplazarse para conocer el estado real de producción.</li>
            <li>Una caída de conexión podía interrumpir el registro.</li>
            <li>La oficina recibía datos, pero no siempre información accionable.</li>
          </ul>
          <p className="mt-6 text-lg font-semibold text-orange-400">
            El resultado era trabajo duplicado, pérdida de trazabilidad y decisiones tomadas con información incompleta.
          </p>
          <p className="mt-4 text-lg text-gray-300">
            La pregunta que guía el proyecto:
          </p>
          <blockquote className="mt-4 pl-4 border-l-4 border-orange-500 italic text-gray-200">
            ¿Cómo podemos eliminar trabajo innecesario del proceso sin añadir complejidad al operario?
          </blockquote>
        </section>

        {/* 02. Cómo lo analicé */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">02. Cómo lo analicé</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            Analicé dónde se perdía tiempo, información y trazabilidad entre planta y oficina:
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400 mb-2">Tiempo perdido</h3>
              <p className="text-sm text-gray-400">
                Cada operario perdía ~5 minutos/día en transcribir papel a Excel.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400 mb-2">Información fragmentada</h3>
              <p className="text-sm text-gray-400">
                Datos aislados en papel, Excel y sistemas sin conexión.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400 mb-2">Falta de visibilidad</h3>
              <p className="text-sm text-gray-400">
                Supervisores sin datos en tiempo real para tomar decisiones.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400 mb-2">Dependencia de conexión</h3>
              <p className="text-sm text-gray-400">
                Los registros se perdían cuando caía la red Wi-Fi de la planta.
              </p>
            </div>
          </div>
        </section>

        {/* 03. Qué cambié */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">03. Qué cambié</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            Transformé el proceso de registro manual y fragmentado en un flujo digital trazable:
          </p>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">✓</div>
              <div>
                <h3 className="font-bold text-orange-400">Registro directo en planta</h3>
                <p className="text-gray-300">
                  El operario registra producción directamente en dispositivo táctil, eliminando el papel y la doble transcripción.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">✓</div>
              <div>
                <h3 className="font-bold text-orange-400">Funcionamiento offline-first</h3>
                <p className="text-gray-300">
                  El sistema sigue funcionando sin Wi-Fi, almacenando datos localmente y sincronizando cuando vuelve la conexión.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">✓</div>
              <div>
                <h3 class="font-bold text-orange-400">Interfaz simplificada para operario</h3>
                <p className="text-gray-300">
                  Flujo táctil con botones grandes (≥64px), pasos reducidos de 5 a 2, y diseño pensado para manos con guantes.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">✓</div>
              <div>
                <h3 class="font-bold text-orange-400">Datos centralizados y trazables</h3>
                <p className="text-gray-300">
                  Toda la información se almacena en una única base de datos con trazabilidad completa por lote, operario y máquina.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">✓</div>
              <div>
                <h3 class="font-bold text-orange-400">Visibilidad en tiempo real</h3>
                <p className="text-gray-300">
                  Supervisores acceden a dashboards con OEE, costes por orden y alertas inmediatas sin desplazarse.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 04. Cómo sé que la solución es fiable */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">04. Cómo sé que la solución es fiable</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            Una mejora de proceso no sirve si introduce nuevos errores. Aquí está la validación técnica:
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">817 pruebas pasando</h3>
              <p className="text-sm text-gray-400">
                Backend + frontend, con cobertura de unitarias, integración y E2E.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">CI/CD automático</h3>
              <p className="text-sm text-gray-400">
                Cada push ejecuta lint, tests y build antes de desplegar.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Validaciones en capa de datos</h3>
              <p className="text-sm text-gray-400">
                Reglas de negocio y restricciones aplicadas en base de datos para garantizar calidad del dato.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Arquitectura observable</h3>
              <p className="text-sm text-gray-400">
                Logs, métricas y traces para detectar anomalías en producción.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Documentación de decisiones</h3>
              <p className="text-sm text-gray-400">
                12 ADRs que justifican cada elección técnica con alternativas evaluadas.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Testing realista</h3>
              <p className="text-sm text-gray-400">
                Tests que simulan desconexiones, reconexiones y carga de operarios simultáneos.
              </p>
            </div>
          </div>
        </section>

        {/* 05. La solución funcionando */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">05. La solución funcionando</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            Ve el sistema en acción:
          </p>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">📹</div>
              <div>
                <h3 className="font-bold text-orange-400">Video demostración de 90 segundos</h3>
                <p className="text-gray-300">
                  Ver cómo el operario registra producción en menos de dos clicks, incluso sin conexión.
                </p>
                <a
                  href="#"
                  className="mt-2 inline-flex items-center text-sm text-orange-400 hover:underline"
                >
                  Ver video
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">🖼️</div>
              <div>
                <h3 className="font-bold text-orange-400">Capturas de pantalla</h3>
                <p className="text-gray-300">
                  Interfaz del operario, supervisor y dashboard de planta.
                </p>
                <a
                  href="#"
                  className="mt-2 inline-flex items-center text-sm text-orange-400 hover:underline"
                >
                  Ver galer&iacute;a
                </a>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 text-orange-500">💻</div>
              <div>
                <h3 className="font-bold text-orange-400">Demo en vivo</h3>
                <p className="text-gray-300">
                  Prueba el sistema tú mismo con credenciales de demostración.
                </p>
                <a
                  href="https://kavana-systems-v3-frontend.vercel.app"
                  target="_blank"
                  className="mt-2 inline-flex items-center text-sm text-orange-400 hover:underline"
                >
                  Acceder a la demo
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 06. Ingeniería */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">06. Ingeniería (para perfiles técnicos)</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            La arquitectura y decisiones técnicas son la prueba de que puedo ejecutar la solución con rigor:
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Stack tecnológico</h3>
              <p className="text-sm text-gray-400">
                NestJS · PostgreSQL · React · Tailwind · Dexie.js · Docker · Vercel
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Módulos backend</h3>
              <p className="text-sm text-gray-400">
                19 módulos (orders, OEE, quality, costs, sync, auth, tenants...) con guards globales.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Decisiones arquitectónicas</h3>
              <p className="text-sm text-gray-400">
                12 ADRs documentadas: multi-tenant por cliente, offline-first, UX para operario con guantes, feature flags.
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/50 p-4">
              <h3 className="font-bold text-orange-400">Calidad del código</h3>
              <p className="text-sm text-gray-400">
                TDD estricto, revisión humana en cada commit, lint y formato automático.
              </p>
            </div>
          </div>
        </section>

        {/* 07. Qué queda por resolver */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">07. Qué queda por resolver</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            Este es un proyecto de portafolio que demuestra mi capacidad para detectar y optimizar procesos. Los próximos pasos para llevar esta solución a producción real serían:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>Piloto en una planta real para validar métricas de mejora de proceso.</li>
            <li>Integración con sistemas legacy (ERP, PLCs, máquinas CNC).</li>
            <li>Escalado a múltiples turnos y centros de producción.</li>
            <li>Capacitación continua del personal operativo.</li>
          </ul>
          <p className="mt-4 text-lg text-orange-400">
            Importante: actualmente no hay clientes en producción. Mantengo esa transparencia porque el valor está en la metodología, no en resultados ficticios.
          </p>
        </section>

        {/* 08. Qué aprendí */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-6">08. Qué aprendí</h2>
          <p className="mb-4 text-lg leading-relaxed text-gray-300">
            Tras 8 años en producción y la construcción de este sistema, estos son mis aprendizajes clave sobre optimización de procesos industriales:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>La mejor tecnología es aquella que el operario no nota porque simplemente <strong>funciona</strong>.</li>
            <li>Eliminar un paso manual suele generar más valor que añadir una característica sofisticada.</li>
            <li>Los datos sin contexto son ruido; la trazabilidad convierte los datos en información accionable.</li>
            <li>La resistencia al cambio se vence con involucramiento temprano y beneficios visibles para el usuario final.</li>
            <li>Un sistema offline-first no es un lujo en entornos industriales; es un requisito de continuidad.</li>
          </ol>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 py-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Jorge Adán Rodríguez — Kavana Systems</p>
        <p className="mt-1">Ingeniería de producto con criterio arquitectónico</p>
      </footer>
    </div>
  );
}