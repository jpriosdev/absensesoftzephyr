# Sistema de Gestión de Datos

## Descripción

El nuevo sistema de gestión de datos permite a los usuarios:

1. **Cargar archivos CSV** - Actualizar datos desde nuevos archivos CSV
2. **Gestionar versiones** - Cambiar entre versión actual y anterior
3. **Auto-respaldo** - Se crea automáticamente backup antes de cargar nuevos datos
4. **Límite de versiones** - Solo se mantienen 2 versiones (actual + anterior)

## Interfaz

El sistema está integrado en un nuevo botón **"Opciones"** (⚙️) en el header del dashboard:

```
┌─────────────────────────────────────┐
│  Dashboard Ejecutivo | [Opciones ⚙️]│
└─────────────────────────────────────┘
```

Al hacer click, se abre un menú con dos opciones:
- **Gestión de Datos** - Abre un modal con toda la funcionalidad
- **Actualizar** - Recarga los datos actuales

### Modal de Gestión de Datos

El modal contiene:

#### 1. Cargar Nuevo Archivo
- Input para seleccionar archivo CSV
- Validación de extensión .csv
- Barra de progreso durante procesamiento
- Mensajes de éxito/error

#### 2. Selector de Versiones
- Lista de versiones disponibles
- Información: bugs, sprints, developers
- Timestamp de cada versión
- Estado (ACTIVA) para versión en uso
- Click para cambiar de versión

## Endpoints API

### GET /api/data-versions
Retorna lista de versiones disponibles.

**Response:**
```json
{
  "versions": [
    {
      "id": "current",
      "label": "Versión Actual",
      "timestamp": "2025-12-02T10:30:00Z",
      "totalBugs": 1000,
      "sprints": 21,
      "developers": 20,
      "active": true
    },
    {
      "id": "data-backup-2025-12-02_10-00-00",
      "label": "Copia 02/12/2025 10:00",
      "timestamp": "2025-12-02T10:00:00Z",
      "totalBugs": 980,
      "sprints": 20,
      "developers": 19,
      "active": false
    }
  ],
  "count": 2
}
```

### POST /api/upload-csv
Carga un nuevo archivo CSV y procesa datos.

**Request:**
```
Content-Type: multipart/form-data
Field: file (CSV file)
Max size: 50MB
```

**Process:**
1. Valida extensión .csv
2. Crea backup de versión anterior
3. Copia archivo a `/data/MockDataV0.csv`
4. Ejecuta migración a SQLite
5. Regenera JSON desde SQLite
6. Limpia archivos temporales

**Response:**
```json
{
  "success": true,
  "message": "Datos cargados y procesados exitosamente",
  "timestamp": "2025-12-02T10:35:00Z"
}
```

### POST /api/switch-data-version
Cambia entre versiones disponibles.

**Request:**
```json
{
  "versionId": "data-backup-2025-12-02_10-00-00"
}
```

**Process:**
1. Valida que la versión exista
2. Crea backup de versión actual
3. Intercambia archivos (swaps)
4. Mantiene versiones organizadas

**Response:**
```json
{
  "success": true,
  "message": "Versión cambiada exitosamente",
  "activeVersion": "data-backup-2025-12-02_10-00-00"
}
```

## Estructura de Directorios

```
/data
├── qa-data.json                    # Versión actual (activa)
├── MockDataV0.csv                  # CSV de datos actuales
├── uploads/                        # Archivos subidos temporalmente
│   └── (se limpian automáticamente)
└── versions/
    ├── data-backup-2025-12-02_10-00-00.json  # Versión 1
    └── data-backup-2025-12-02_10-30-00.json  # Versión 2 (más nueva)
```

## Flujo de Carga de Datos

```
1. Usuario selecciona CSV
   ↓
2. Cliente envía archivo a POST /api/upload-csv
   ↓
3. Servidor valida archivo
   ↓
4. Crea backup de versión actual
   ├── Guarda qa-data.json a /versions/data-backup-*.json
   ├── Elimina backups antiguos si hay >2 versiones
   └── Mantiene max 2 versiones siempre
   ↓
5. Procesa archivo CSV
   ├── Copia a /data/MockDataV0.csv
   ├── Ejecuta migrateToSqliteCSV.mjs (→ SQLite)
   └── Ejecuta generateJsonFromSqlite.mjs (→ JSON)
   ↓
6. Regenera JSON desde SQLite
   ├── Lee datos de bd qa-dashboard.db
   ├── Genera nuevas estadísticas
   └── Guarda a /data/qa-data.json
   ↓
7. Limpia archivos temporales
   ↓
8. Retorna éxito a cliente
   ↓
9. Cliente recarga página con nuevos datos
```

## Flujo de Cambio de Versión

```
1. Usuario hace click en versión anterior
   ↓
2. Cliente envía versionId a POST /api/switch-data-version
   ↓
3. Servidor valida versión existe
   ↓
4. Crea backup de versión ACTUAL
   ├── Guarda qa-data.json a /versions/data-backup-*.json
   └── Limpia backups antiguos si >2
   ↓
5. Intercambia archivos (SWAP)
   ├── Lee backup solicitado
   ├── Sobreescribe qa-data.json
   ├── Guarda versión anterior a su backup
   └── Actualiza registro de qué es "actual"
   ↓
6. Retorna éxito
   ↓
7. Cliente recarga página con datos de versión anterior
```

## Datos Verificados

- **Total de bugs**: 1000
- **Sprints**: 21 (Sprint 0 - Sprint 20)
- **Desarrolladores**: 20
- **Prioridades**: Crítica (13%), Alta (26%), Media (36%), Baja (25%)
- **Módulos**: Funcional (40%), Integración (25%), UI/UX (20%), BD (15%)

## Características de Seguridad

✅ Validación de extensión (.csv)
✅ Límite de tamaño (50MB máximo)
✅ Auto-backup antes de cualquier cambio
✅ Límite de versiones (max 2)
✅ Manejo de errores con rollback
✅ Logs de operaciones
✅ Timestamps en todos los backups

## Próximas Mejoras

- [ ] Historial completo de versiones (> 2)
- [ ] Descarga de versiones
- [ ] Comparativa entre versiones
- [ ] Validación de estructura CSV
- [ ] Import/Export de configuraciones
- [ ] Auditoría de cambios
