# ADR-004: UX Tunnel Vision para HMI Industrial

**Status:** Aceptada  
**Fecha:** 2025-09  
**Decisor:** Jorge Luis Parra  
**Contexto:** HMI para piso de planta — operadores con guantes, ruido, distracciones  
**Última actualización:** 2026-07-04

---

## Contexto

**El problema:** Los operadores de planta trabajan en condiciones que hacen imposible usar una interfaz tradicional:
- **Guantes de seguridad** — dedos engrosados, precisión reducida
- **Ruido industrial** — no pueden escuchar alertas de audio
- **Distracciones** — máquinas sonando, supervisores hablando
- **Estrés** — producción detenida = presión inmediata

**Dato clave:** Un error de operador en HMI puede causar:
- Parada de producción ($$$)
- Producto defectuoso (reproceso)
- Lesiones al operador

## Opciones Evaluadas

| Opción | Touch Target | Velocidad | Error Rate | Complejidad |
|--------|--------------|-----------|------------|-------------|
| **UI estándar (44px)** | Mínimo | Normal | Alto | Baja |
| **Touch-first (48px)** | Aceptable | Normal | Medio | Baja |
| **Tunnel Vision (64px+)** | Amplio | Rápido | Bajo | Media |
| **Voice control** | N/A | Rápido | Medio | Alta |

## Decisión

**Tunnel Vision UX con touch targets mínimos de 64px + Gestos grandes**

### Principios de Diseño

1. **Touch targets ≥ 64px** — Mínimo para guantes industriales
2. **Zona de peligro roja** — Botones de acción destructiva en rojo + confirmación
3. **Feedback háptico** — Vibración en dispositivos móviles para confirmaciones
4. **Colores semánticos** — Verde=OK, Amarillo=Advertencia, Rojo=Peligro
5. **Sin dependencia de audio** — Todas las alertas son visuales

### Implementación

```tsx
// Componente de botón HMI
const HMIButton = ({ 
  onClick, 
  variant = 'primary', 
  danger = false,
  children 
}: HMIButtonProps) => {
  const sizeClasses = danger 
    ? 'min-h-[80px] min-w-[80px]' // Más grande para acciones peligrosas
    : 'min-h-[64px] min-w-[64px]'; // Mínimo 64px

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses}
        ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
        text-white text-xl font-bold
        rounded-lg
        active:scale-95
        transition-transform
      `}
    >
      {children}
    </button>
  );
};
```

### Layout de Pantalla

```
┌──────────────────────────────────────────────────────────────┐
│  KAVANA HMI - OPERADOR                                       │
│  ┌──────────────┐  ┌──────────────────────────────────────┐  │
│  │ Orden:       │  │                                      │  │
│  │ #12345       │  │        BOTÓN GRANDE                  │  │
│  │              │  │        INICIAR/PARAR                  │  │
│  │ Estado:      │  │        (80px x 80px)                 │  │
│  │ ▶ EnCurso    │  │                                      │  │
│  │              │  │                                      │  │
│  └──────────────┘  └──────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  [64px]    [64px]    [64px]    [64px]    [64px]          ││
│  │  Parar     Pausar    Siguiente  Reporte   Alerta        ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## Justificación

1. **64px mínimo** — Investigación muestra que 44px es insuficiente con guantes
2. **Gestos grandes** — Swipe horizontal para navegar, tap para seleccionar
3. **Confirmaciones** — Acciones destructivas requieren 2 taps (doble seguridad)
4. **Feedback visual** — Cambio de color inmediato al tocar

## Consecuencias

### Positivas
- **Menor tasa de error** — Touch targets grandes reducen errores
- **Velocidad** — Operador puede ejecutar acciones rápidamente
- **Seguridad** — Confirmaciones previenen accidentes
- **Accesibilidad** — Funciona sin audio, sin precisión fina

### Negativas
- **Menos información por pantalla** — Botones grandes = menos elementos
- **Diseño repetitivo** — Todas las pantallas siguen mismo patrón
- **Testing manual** — Necesita prueba en dispositivo real con guantes

### Riesgos Mitigados
- **Pantalla pequeña:** Responsive design, scroll vertical
- **Testing:** Usar iPads industriales en planta para validación

---

**Relación con ADR-003:** UX tunnel vision funciona offline (IndexedDB) porque no depende de conectividad.
