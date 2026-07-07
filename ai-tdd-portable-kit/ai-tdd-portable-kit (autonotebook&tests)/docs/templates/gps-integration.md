# Template: Integración GPS / Ubicación

## Descripción
Esta plantilla documenta cómo implementar la funcionalidad de obtención de ubicación del usuario en tu proyecto.

## Requisitos Previos

### Permisos del Navegador
- Geolocation API del navegador
- Certificado HTTPS (requerido para producción)
- Configuración de permisos en el navegador

### Dependencias del Backend (Opcional)
```txt
# Solo si necesitas geocodificación inversa
geopy>=2.3.0
```

## Obtención de Ubicación en Frontend

### HTML Básico
```html
<button id="getLocation">Obtener Mi Ubicación</button>
<div id="locationInfo"></div>
```

### JavaScript - Obtener Ubicación
```javascript
document.getElementById('getLocation').addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Geolocation no soportada por tu navegador');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            document.getElementById('locationInfo').innerHTML = `
                <p>Latitud: ${latitude}</p>
                <p>Longitud: ${longitude}</p>
            `;
            // Enviar al backend
            sendLocationToBackend(latitude, longitude);
        },
        (error) => {
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    alert('Permiso de ubicación denegado');
                    break;
                case error.POSITION_UNAVAILABLE:
                    alert('Ubicación no disponible');
                    break;
                case error.TIMEOUT:
                    alert('Tiempo de espera agotado');
                    break;
                default:
                    alert('Error desconocido');
                    break;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
});

async function sendLocationToBackend(lat, lon) {
    try {
        const response = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lon })
        });
        const data = await response.json();
        console.log('Ubicación enviada:', data);
    } catch (error) {
        console.error('Error enviando ubicación:', error);
    }
}
```

## Backend - Endpoint de Ubicación

### Definición del Endpoint
```python
from pydantic import BaseModel

class LocationRequest(BaseModel):
    latitude: float
    longitude: float

@app.post("/api/location")
async def receive_location(location: LocationRequest):
    """
    Recibe la ubicación del usuario y la procesa.
    """
    # Aquí puedes:
    # 1. Guardar en base de datos
    # 2. Geocodificar inversamente (obtener dirección)
    # 3. Calcular distancias a puntos de interés
    # 4. Retornar información relevante
    
    return {
        "received": True,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "message": "Ubicación recibida correctamente"
    }
```

## Geocodificación Inversa (Opcional)

### Con Geopy
```python
from geopy.geocoders import Nominatim

geolocator = Nominatim(user_agent="mi_app")

async def reverse_geocode(lat: float, lon: float) -> str:
    location = geolocator.reverse(f"{lat}, {lon}")
    return location.address if location else "Dirección no encontrada"
```

## Seguridad y Privacidad

### Consideraciones Importantes
1. **HTTPS Obligatorio:** La Geolocation API solo funciona en contextos seguros
2. **Permiso Explícito:** Siempre pedir permiso al usuario
3. **Transparencia:** Explicar por qué necesitas la ubicación
4. **No Almacenar Sin Consentimiento:** Guardar solo si es necesario y con consentimiento
5. **Eliminar Datos:** No mantener ubicación más tiempo del necesario

### Mensaje de Permiso (Ejemplo)
```
"Esta aplicación necesita acceder a tu ubicación para [PROPÓSITO ESPECÍFICO].
¿Quieres permitir el acceso a tu ubicación?"
```

## Manejo de Errores

### Errores Comunes del Navegador
| Error | Código | Descripción | Solución |
|-------|--------|-------------|----------|
| PERMISSION_DENIED | 1 | Usuario denegó permiso | Solicitar nuevamente con explicación |
| POSITION_UNAVAILABLE | 2 | Ubicación no disponible | Usar fallback (IP, ciudad) |
| TIMEOUT | 3 | Tiempo agotado | Reintentar o usar fallback |

### Fallback para Ubicación No Disponible
```javascript
async function getLocationWithFallback() {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000
            });
        });
        return {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            source: 'gps'
        };
    } catch (error) {
        // Fallback: usar IP geolocation
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            lat: data.latitude,
            lon: data.longitude,
            source: 'ip'
        };
    }
}
```

## Uso con APIs Externas

### Enviar Ubicación a API
```javascript
async function sendLocationToAPI(lat, lon, apiKey) {
    const response = await fetch('https://api.ejemplo.com/rutas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            origin: { lat, lon },
            // otros parámetros
        })
    });
    return response.json();
}
```

## Pruebas

### Prueba de Frontend
```javascript
// Mock de geolocation
const mockGeolocation = {
    getCurrentPosition: jest.fn((success) => {
        success({
            coords: {
                latitude: 40.7128,
                longitude: -74.0060
            }
        });
    })
};
Object.defineProperty(navigator, 'geolocation', { value: mockGeolocation });
```

### Prueba de Backend
```python
def test_receive_location():
    response = client.post("/api/location", json={
        "latitude": 40.7128,
        "longitude": -74.0060
    })
    assert response.status_code == 200
    assert response.json()["received"] == True
```

## Checklist de Implementación
- [ ] HTTPS configurado (producción)
- [ ] Frontend con botón de ubicación
- [ ] Manejo de permisos del navegador
- [ ] Endpoint backend creado
- [ ] Geocodificación inversa (si aplica)
- [ ] Fallback para ubicación no disponible
- [ ] Manejo de errores completo
- [ ] Política de privacidad actualizada
- [ ] Pruebas unitarias
- [ ] Pruebas de integración
