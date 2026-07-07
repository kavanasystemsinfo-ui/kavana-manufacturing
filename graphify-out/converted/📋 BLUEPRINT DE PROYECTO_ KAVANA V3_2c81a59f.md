<!-- converted from 📋 BLUEPRINT DE PROYECTO_ KAVANA V3.docx -->

# 📋 BLUEPRINT DE PROYECTO: KAVANA V3
Enfoque: Sistema de Ejecución de Producción (MES) Multi-Tenant, Multi-Sector, Ultra-UX y Modular.
Línea de espacio
## PARTE 1: BRIEFING DE PRODUCTO (VISIÓN DE NEGOCIO Y UX)
### 1.1 Filosofía del Producto: "Eficiencia del Cero Desperdicio de Tiempo"
Kavana V3 no es un ERP gris ni un software de gestión masivo. Es una herramienta ágil con estética de aplicación móvil moderna enfocada en la eliminación drástica de la fricción digital.
Regla de Oro de UX: Minimizar la carga cognitiva. Cualquier acción crítica para el operario o supervisor debe completarse en 1 o 2 clics. Evitaremos menús anidados, tablas infinitas de datos y flujos de 3 o 4 pasos.
Abstracción de Sector (Cross-Sector): El núcleo del software no hablará de "acero", "bobinas" o "inyección". Hablará de "Órdenes de Trabajo", "Cantidades", "Tiempos" y "Puestos". Esto permite que encaje tanto en un taller metalúrgico como en una fábrica de calzado o una carpintería.
Línea de espacio
### 1.2 Arquitectura de Interfaces y Roles
1. Panel de Operario (HMI Planta)
Objetivo: Registro rápido a pie de máquina.
UX: Botones sobredimensionados (mínimo 64px), optimizado para pantallas táctiles industriales o tablets, modo de alto contraste.
Flujo: Pantalla de entrada ultra-limpia. Al seleccionar u obtener una orden asignada, se muestra una interfaz de foco único (visión de túnel) con las acciones mínimas: Iniciar, Pausar/Parada, Reportar Cantidad y Finalizar.
2. Panel de Supervisor (Gestión de Taller)
Objetivo: Planificación y control visual instantáneo.
UX: Creación de órdenes mediante plantillas rápidas en pocos clics. Tablero visual del estado de planta (Pendiente, En Marcha, Pausado, Terminado).
Filtros Avanzados: Buscador dinámico con filtrado cruzado en tiempo real por: Puesto de trabajo, Trabajador/Operario, Rangos de Fecha y Código de Orden.
3. Panel de Administración del Cliente (Tenant Admin)
Objetivo: Autonomía de configuración para la empresa contratante.
Funciones: Gestión de roles y usuarios locales, alta de puestos de trabajo, personalización de campos de las órdenes (Custom Fields), y la Matriz de Módulos (activar o desactivar funcionalidades contratadas).
4. Panel de Super Admin (SaaS Control - Tu Consola Ejecutiva)
Objetivo: Control absoluto del negocio, completamente aislado del código de los clientes.
Funciones: Gestión de inquilinos (Tenants), creación de cuentas de clientes, aprovisionamiento de credenciales maestras, control de planes/membresías, activación manual de módulos premium extras y suspensiones/bajas automáticas de servicio.
Línea de espacio
## PARTE 2: ARQUITECTURA TÉCNICA LIMPIA (LOS CIMIENTOS)
Para evitar la deuda técnica del pasado, la IA debe inicializar el proyecto bajo estos cuatro pilares de diseño de software:
Base de Código Única (Single Codebase): Un solo repositorio para todos los clientes. La segregación de datos se gestiona a nivel de Base de Datos mediante un identificador tenant_id obligatorio en todas las consultas (Multi-tenant aislado).
Arquitectura Desacoplada Basada en Características (Feature Flags): La base de datos guardará en la tabla de cada cliente un campo de tipo JSONB con la configuración de sus módulos activos (modulo_oee, modulo_costes, modulo_calidad). El frontend y el backend consultarán esta matriz para renderizar u ocultar los componentes lógicos. Si el flag está en false, el código no se ejecuta ni se muestra en pantalla.
Evolución Modular Estilo Odoo: Los módulos avanzados se estructurarán en carpetas independientes y aisladas. El núcleo del programa debe funcionar perfectamente aunque borres todas las carpetas de módulos premium.
Núcleo Offline-First Nativo: El flujo del operario no puede depender de la estabilidad del Wi-Fi de la planta. Toda mutación del estado de producción se intercepta localmente, se guarda en una cola FIFO persistente y se sincroniza en segundo plano mediante un mecanismo con timeout blindado (AbortController fijado en 4000ms).
Línea de espacio
## PARTE 3: ROADMAP TÉCNICO DE IMPLEMENTACIÓN (PASO A PASO)
### 🚀 FASE 1: El Motor SaaS e Infraestructura (La Base)
Base de Datos: Configuración del esquema relacional multi-tenant. Creación de tablas de inquilinos, usuarios, roles y la estructura JSONB de configuraciones con la columna líder indexada.
Super Admin Panel: Desarrollo de la interfaz maestra externa para dar de alta nuevas empresas, asignar esquemas y activar/desactivar planes mediante interruptores.
Autenticación: Implementación de Login robusto que identifique el tenant_id del usuario al loguearse para enrutarlo a su entorno correspondiente.
### 📦 FASE 2: El Core Mínimo Absoluto (Flujo Operativo Simple)
Modelo de Datos Core: Tablas esenciales de Puestos de Trabajo (workstations) y Órdenes de Fabricación (production_orders) con campos mínimos (Código, target_quantity, produced_quantity, status).
UX Supervisor (Core): Formulario rápido para rellenar una orden y vista de lista interactiva con filtros dinámicos sincronizados.
UX Operario (Core): Interfaz limpia de visión de túnel. Botón de "Iniciar Orden", teclado numérico táctil gigante de un clic e inmunidad al doble clic.
Capa Offline Local: Sincronización básica con almacenamiento en IndexedDB mediante Dexie.js para garantizar resiliencia ante cortes de red.
### ⚙️ FASE 3: Panel de Administración del Cliente y Modularidad
Configurador del Tenant: Panel para configurar turnos, empleados y puestos de trabajo.
Inyección de Feature Flags: Programar los interceptores en el Frontend para leer la matriz JSONB. Si una funcionalidad premium no está activa, desaparece por completo.
Campos Personalizados (Custom Fields): Permitir la creación de campos específicos por sector (ej. "Grosor", "Color") acoplados al JSONB de la orden sin alterar el esquema relacional rígido.
### 💎 FASE 4: Módulos Premium Independientes (Escalabilidad de Negocio)
Módulo OEE Avanzado: Lógica matemática para calcular Disponibilidad, Rendimiento y Calidad basándose en tiempos muertos y piezas.
Módulo de Control de Calidad: Flujos para declarar mermas detalladas, motivos de rechazo y pautas de inspección.
Módulo de Control de Costes: Integración de costes de operario y máquina para calcular el coste real de fabricación de cada lote en tiempo real.
Línea de espacio
## PROMPT DE ARRANQUE PARA LA IA (Copiar y pegar en tu herramienta de código)
Actúa como un Arquitecto de Software Senior y Líder de Producto con experiencia en sistemas MES industriales y arquitecturas SaaS Multi-Tenant. 

Quiero inicializar un nuevo proyecto desde cero llamado Kavana V3 utilizando un stack moderno (React con Tailwind para Frontend, Node.js/NestJS o similar para Backend, y PostgreSQL para Base de Datos). 

El objetivo es crear un software de gestión de producción industrial modular, con estética de app de consumo moderna y un enfoque radical en eficiencia táctil (flujos de 1 o 2 clics).

Por favor, analizando el Blueprint del proyecto proporcionado anteriormente, genera en tu primera respuesta exclusivamente:
1. La estructura limpia de carpetas del repositorio, demostrando el aislamiento del "Core" frente a las carpetas de los futuros "Módulos" (OEE, Calidad, Costes) que se activarán mediante Feature Flags JSON.
2. El diseño del esquema de base de datos relacional inicial centrado en el Multi-Tenancy (segregación por tenant_id) y la estructura exacta de la tabla de inquilinos con el campo JSON de configuración de módulos.
3. La propuesta técnica para la arquitectura del estado local de la interfaz del operario para soportar Offline-First nativo.

No escribas código de componentes visuales todavía, aseguremos primero unos cimientos arquitectónicos perfectos.