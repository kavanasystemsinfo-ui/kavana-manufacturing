¡Excelente, Jorge! Con el Blueprint cargado directamente y cruzando sus directrices funcionales con el esquema físico y transaccional que diseñamos en el archivo 05, tenemos toda la materia prima de ingeniería para estructurar el motor de resiliencia del frontend.

Aquí tienes la especificación técnica completa y el diseño de código para el archivo 06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md. Crealó en tu carpeta local refactorizacion kavana sistems v3 y pega este contenido definitivo:
Markdown

# ESPECIFICACIÓN TÉCNICA: MOTOR OFFLINE-FIRST Y ARQUITECTURA DE INTERFAZ TÁCTIL (HMI PLANTA)

Esta especificación técnica define la arquitectura del lado del cliente para el Panel de Operario (HMI Planta) de Kavana Manufacturing. El sistema garantiza una latencia de respuesta inmediata (<100ms) y resiliencia absoluta ante caídas críticas de la red Wi-Fi industrial mediante un almacén local persistente estructurado como una cola FIFO (*First-In, First-Out*).

---

## 1. REQUISITOS DE UX INDUSTRIAL Y DISEÑO ERGONÓMICO (HMI)

Para cumplir con la **Regla de Oro de UX** (minimizar la carga cognitiva y asegurar flujos de máximo 1 o 2 clics), la interfaz del operario se blinda bajo principios ergonómicos severos para entornos de manufactura:

* **Visión de Túnel (Foco Único):** Una vez que el operario se identifica y selecciona su puesto de trabajo, la interfaz oculta todo menú de navegación transversal. El software despliega una pantalla de acción única que muestra la orden activa y cuatro comandos táctiles gigantes: **Iniciar**, **Pausar**, **Reportar Cantidad** y **Finalizar**.
* **Target Táctil Sobredimensionado:** Todos los botones interactivos de control de planta poseen dimensiones mínimas de **64px por 64px**. Esto evita errores de pulsación (*fat-finger errors*) causados por el uso de guantes industriales o pantallas con salpicaduras.
* **Teclado Numérico Gigante Integrado:** Para el reporte de piezas producidas o mermas, se prohíbe invocar el teclado nativo del sistema operativo (iOS/Android/Windows). Se inyecta un teclado numérico táctil embebido de pantalla completa con botones de confirmación de un solo clic.
* **Inmunidad al Doble Clic:** Los botones de mutación de estado se bloquean automáticamente mediante un estado de *loading* optimista a nivel de UI inmediatamente después del primer impacto táctil, previniendo disparos duplicados en la cola de eventos.

---

## 2. ARQUITECTURA DE ESTADO LOCAL Y PERSISTENCIA (ZUSTAND + INDEXEDDB)

El estado operativo del HMI no se acopla a las respuestas asíncronas de la API de backend. La interfaz reacciona instantáneamente modificando un *Store* local en memoria (gestionado con **Zustand**) y escribe en caliente los eventos en una base de datos local embebida en el navegador (**IndexedDB** a través de `Dexie.js`), asegurando persistencia incluso si la pestaña del navegador es cerrada o el dispositivo se reinicia bruscamente.

```javascript
┌────────────────────────────────────────────────────────┐
│               HMI TÁCTIL DEL OPERARIO                  │
│       (Acciones de Foco Único: Iniciar, Pausar...)     │
└───────────────────────────┬────────────────────────────┘
                            │ (Pulsación Táctil <100ms)
                            ▼
┌────────────────────────────────────────────────────────┐
│           ZUSTAND STORE (Estado de la UI)              │
│       Cambio de Estado Optimista Inmediato             │
└───────────────────────────┬────────────────────────────┘
                            │ (Persistencia Local Obligatoria)
                            ▼
┌────────────────────────────────────────────────────────┐
│          INDEXEDDB (Cola FIFO Local Segura)            │
│       Guarda el Evento con ID de Cliente y Flag        │
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      [ CONEXIÓN ONLINE ]         [ CONEXIÓN OFFLINE ]
      Sincronización Activa       Espera en Cola FIFO 
      Hacia el Backend            Reintentos con Backoff

Definición del Esquema de Persistencia Local (Dexie.js)
TypeScript

import Dexie, { Table } from 'dexie';

export interface OfflineEventLog {
  id: string;              // UUID generado en el cliente (Evita colisiones en el backend)
  tenant_id: string;       // Contexto extraído del JWT almacenado localmente
  order_id: string;
  workstation_id: string;
  operator_id: string;
  event_type: 'start' | 'pause' | 'resume' | 'stop';
  downtime_reason: string | null;
  registered_at: string;   // Timestamp ISO exacto del momento del clic en planta
  is_offline_event: boolean;
  client_device_id: string;
}

class KavanaHmiDatabase extends Dexie {
  // Tabla estructurada para comportarse como una cola FIFO persistente
  offlineLogs!: Table<OfflineEventLog>;

  constructor() {
    super('KavanaHmiDatabase');
    this.version(1).stores({
      // Indexamos por ID y ordenamos de forma natural por el timestamp de registro
      offlineLogs: 'id, registered_at, tenant_id'
    });
  }
}

export const localDb = new KavanaHmiDatabase();

3. DISEÑO DE LA COLA FIFO DE RESILIENCIA OFFLINE

Cuando el operario ejecuta un fichaje (ej. "Pausar Orden por Avería de Máquina"), el sistema intercepta la acción localmente. Construye el payload completo (respetando exactamente las columnas definidas en el DDL de production_time_logs del backend) y lo encola al final del almacén IndexedDB.
Implementación del Store Táctil y Encolamiento (Zustand)
TypeScript

import { create } from 'zustand';
import { localDb, OfflineEventLog } from './database/local-db';
import { v4 as uuidv4 } from 'uuid';

interface HmiState {
  currentStatus: 'pendiente' | 'en_marcha' | 'pausado' | 'terminado';
  isOnline: boolean;
  isMutating: boolean;
  setOnlineStatus: (status: boolean) => void;
  registerPlantaEvent: (
    tenantId: string,
    orderId: string,
    workstationId: string,
    operatorId: string,
    type: 'start' | 'pause' | 'resume' | 'stop',
    reason?: string
  ) => Promise<void>;
}

export const useHmiStore = create<HmiState>((set, get) => ({
  currentStatus: 'pendiente',
  isOnline: navigator.onLine,
  isMutating: false,

  setOnlineStatus: (status) => set({ isOnline: status }),

  registerPlantaEvent: async (tenantId, orderId, workstationId, operatorId, type, reason) => {
    set({ isMutating: true });

    // 1. Mapeo del cambio de estado optimista en el Frontend para respuesta en <100ms
    const statusMap: Record<string, HmiState['currentStatus']> = {
      start: 'en_marcha',
      resume: 'en_marcha',
      pause: 'pausado',
      stop: 'terminado'
    };

    const newLocalEvent: OfflineEventLog = {
      id: uuidv4(),
      tenant_id: tenantId,
      order_id: orderId,
      workstation_id: workstationId,
      operator_id: operatorId,
      event_type: type,
      downtime_reason: reason || null,
      registered_at: new Date().toISOString(), // Preserva la verdad temporal del taller
      is_offline_event: !get().isOnline,
      client_device_id: window.navigator.userAgent
    };

    try {
      // 2. Persistencia en caliente en la cola FIFO local antes de tocar red
      await localDb.offlineLogs.add(newLocalEvent);

      // 3. Mutación del estado visual inmediato (Aislamiento de latencia)
      set({ currentStatus: statusMap[type], destructionPending: false });

      // 4. Disparar el trigger del motor de sincronización de fondo de forma asíncrona
      triggerSyncEngine();
    } catch (err) {
      console.error('Critical Local Storage Failure:', err);
    } finally {
      set({ isMutating: false });
    }
  }
}));

4. MOTOR DE RECONEXIÓN, SINCRONIZACIÓN Y RESOLUCIÓN DE CONFLICTOS

El motor de sincronización opera en segundo plano monitorizando los cambios de red mediante eventos globales del navegador (online/offline) y reintentos automáticos programados mediante un bucle de Exponential Backoff blindado frente a microcortes de conectividad.
Lógica Core del Sincronizador (Sync Engine)
TypeScript

import { localDb } from './database/local-db';
import axios from 'axios';

let isSyncing = false;

export async function triggerSyncEngine() {
  // Evitar ejecuciones concurrentes que rompan la linealidad de la cola FIFO
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;

  try {
    // 1. Recuperar el evento más antiguo que se encuentre en la cola (Garantía FIFO estricta)
    let oldestEvent = await localDb.offlineLogs.orderBy('registered_at').first();

    while (oldestEvent) {
      console.log(`Synchronizing local event [${oldestEvent.event_type}] for order [${oldestEvent.order_id}]...`);

      // 2. Transmitir el log transaccional al endpoint seguro del Backend
      // El backend recibe el ID de cliente para evitar doble inserción si la llamada se repite
      await axios.post(
        '/api/v3/production/sync-log', 
        oldestEvent,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('kavana_jwt')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 3. Si el servidor procesa y confirma el almacenamiento, se elimina de la cola local
      await localDb.offlineLogs.delete(oldestEvent.id);

      // 4. Avanzar al siguiente elemento de la cola
      oldestEvent = await localDb.offlineLogs.orderBy('registered_at').first();
    }
  } catch (error) {
    console.warn('Sync engine paused due to network or server constraints:', error.message);
    // Nota: Si el backend devuelve un error 400 (Violación de máquina de estados por conflicto temporal),
    // el log se deriva a una tabla local de excepciones para auditoría del supervisor, evitando bloquear la cola.
    await handleSyncConflict(error);
  } finally {
    isSyncing = false;
  }
}

async function handleSyncConflict(error: any) {
  if (error.response && error.response.status === 400) {
    // Conflicto de datos: El servidor rechazó el orden de los eventos por corrupción de estados antiguos
    const oldestEvent = await localDb.offlineLogs.orderBy('registered_at').first();
    if (oldestEvent) {
      console.error('Critical State Conflict. Moving log to dead-letter storage:', oldestEvent.id);
      // Traslado a un almacén de fallos para que no detenga el flujo de la fábrica
      await localDb.table('failedLogs').add(oldestEvent);
      await localDb.offlineLogs.delete(oldestEvent.id);
      // Reintentar de inmediato con el resto de la cola libre
      setTimeout(triggerSyncEngine, 500);
    }
  }
}

// Listeners Perimetrales de Conectividad de Red del Sistema Operativo
window.addEventListener('online', () => {
  console.log('Network restablished. Initializing Sync Engine flush...');
  triggerSyncEngine();
});

5. RESOLUCIÓN DE CONFLICTOS TRANSACCIONALES EN EL SERVIDOR

Cuando los logs de la cola local llegan desfasados al backend después de un largo periodo offline, se aplica la regla de "La verdad del Timestamp del Cliente":

    Fecha de Registro Inalterable: El campo registered_at inyectado por el dispositivo a pie de máquina es el valor sagrado que se inserta en la base de datos central. Esto asegura que los cálculos posteriores de OEE y tiempos muertos reflejen exactamente lo que pasó en el mundo físico, sin importar que los datos se suban tres horas tarde.

    Idempotencia Criptográfica por ID: El backend valida el campo id (UUID del evento) antes de proceder con el comando INSERT. Si un reintento de red reenvía un log que ya fue guardado en el servidor, el backend responde con un código exitoso 201 pero omite la duplicación física, neutralizando el problema del doble impacto en el cálculo de métricas industriales.