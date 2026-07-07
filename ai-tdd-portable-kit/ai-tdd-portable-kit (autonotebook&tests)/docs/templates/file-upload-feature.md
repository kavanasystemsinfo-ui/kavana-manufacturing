# Template: Funcionalidad de Subida de Archivos

## Descripción
Esta plantilla documenta cómo implementar la funcionalidad de subida de archivos en tu proyecto.

## Tipos de Archivo Soportados
- **Texto plano:** TXT, CSV
- **Documentos:** PDF, DOCX
- **Hojas de cálculo:** XLSX, XLS
- **Imágenes:** JPG, PNG (requiere OCR)

## Requisitos Previos

### Dependencias del Backend
```txt
# requirements.txt (ejemplo para Python/FastAPI)
python-multipart>=0.0.6
aiofiles>=23.0.0
# Para PDF
PyPDF2>=3.0.0
# Para DOCX
python-docx>=0.8.11
# Para Excel
openpyxl>=3.1.0
pandas>=2.0.0
```

### Configuración del Servidor
- Límite de tamaño de archivo: configurar según necesidad (ej: 10MB)
- Directorio temporal para archivos: configurar path seguro
- Permisos de escritura: verificar que el servidor pueda escribir

## Estructura del Endpoint

### Definición Básica
```python
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    # Parámetros adicionales según necesidad
):
    """
    Procesa un archivo subido y extrae información relevante.
    """
    # 1. Validar tipo de archivo
    # 2. Leer contenido
    # 3. Procesar según extensión
    # 4. Retornar resultado
```

### Validación de Tipos de Archivo
```python
ALLOWED_EXTENSIONS = {
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

def validate_file_extension(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS
```

## Extracción de Texto por Tipo

### TXT / CSV
```python
async def extract_text_from_txt(content: bytes) -> str:
    return content.decode('utf-8', errors='ignore')
```

### PDF
```python
import PyPDF2
import io

async def extract_text_from_pdf(content: bytes) -> str:
    pdf_file = PyPDF2.PdfReader(io.BytesIO(content))
    text = "\n".join([page.extract_text() or "" for page in pdf_file.pages])
    return text
```

### DOCX
```python
import docx
import io

async def extract_text_from_docx(content: bytes) -> str:
    doc = docx.Document(io.BytesIO(content))
    text = "\n".join([p.text for p in doc.paragraphs])
    return text
```

### Excel (XLSX/XLS)
```python
import pandas as pd
import io

async def extract_text_from_excel(content: bytes) -> str:
    df = pd.read_excel(io.BytesIO(content))
    return df.to_string(index=False)
```

## Manejo de Errores

### Errores Comunes
1. **Archivo vacío:** Retornar error 400
2. **Tipo no soportado:** Retornar error 415
3. **Archivo corrupto:** Retornar error 422
4. **Tamaño excedido:** Retornar error 413

### Respuesta de Error Estándar
```json
{
    "error": true,
    "message": "Tipo de archivo no soportado",
    "detail": "Solo se permiten archivos TXT, CSV, PDF, DOCX, XLSX",
    "code": "UNSUPPORTED_FILE_TYPE"
}
```

## Seguridad

### Validaciones
1. Verificar extensión del archivo
2. Verificar MIME type (no solo extensión)
3. Limitar tamaño máximo
4. Escanear contenido si es necesario
5. Sanitizar nombre de archivo

### Almacenamiento Temporal
- Usar directorio temporal del sistema
- Eliminar archivos después de procesar
- No guardar en ubicaciones públicas

## Frontend (Ejemplo Básico)

### HTML
```html
<form id="uploadForm">
    <input type="file" id="fileInput" accept=".txt,.csv,.pdf,.docx,.xlsx">
    <button type="submit">Subir Archivo</button>
</form>
<div id="result"></div>
```

### JavaScript
```javascript
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Selecciona un archivo');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        document.getElementById('result').textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('Error:', error);
    }
});
```

## Pruebas

### Prueba Unitaria
```python
def test_extract_text_from_txt():
    content = b"Cliente1, Direccion1, 10:00\nCliente2, Direccion2, 11:00"
    result = extract_text_from_txt(content)
    assert "Cliente1" in result
    assert "Direccion1" in result
```

### Prueba de Integración
```python
def test_upload_txt_file():
    with open("test.txt", "rb") as f:
        response = client.post("/api/upload", files={"file": f})
    assert response.status_code == 200
    assert "paradas" in response.json()
```

## Checklist de Implementación
- [ ] Endpoint creado
- [ ] Validación de tipos implementada
- [ ] Extracción de texto para cada tipo
- [ ] Manejo de errores
- [ ] Seguridad (tamaño, permisos)
- [ ] Frontend con input de archivo
- [ ] Pruebas unitarias
- [ ] Pruebas de integración
- [ ] Documentación de API
