# Mapeo de Datos Reales - SQLite + CSV (v2.0)

## ✅ Datos REALES (Fuente: MockDataV0.csv → SQLite)

El archivo `data/MockDataV0.csv` contiene 1000+ registros normalizados y cargados en SQLite (`public/data/qa-dashboard.db`).

**Flujo de datos:**
```
MockDataV0.csv (1000+ registros)
    ↓
scripts/migrateToSqliteCSV.mjs
    ↓
SQLite Database (qa-dashboard.db)
    ↓
lib/database/dal.js (queries)
    ↓
API: /api/qa-data
    ↓
Frontend Components
```

### Sprint Data (Normalizado desde CSV → SQLite)
- `sprint` - Identificador del sprint ✅ **DATO REAL**
- `bugs` - Total de bugs encontrados ✅ **DATO REAL**
- `bugsResolved` - Bugs resueltos ✅ **DATO REAL**
- `bugsPending` - Bugs pendientes ✅ **DATO REAL**
- `testCases` - Casos de prueba ejecutados ✅ **DATO REAL**
- `testPlanned` - Casos planeados ✅ **DATO REAL**

### Developer Data (Normalizado desde CSV → SQLite)
- `name` - Nombre del desarrollador ✅ **DATO REAL**
- `assigned` - Bugs asignados ✅ **DATO REAL**
- `resolved` - Bugs resueltos ✅ **DATO REAL**
- `pending` - Bugs pendientes ✅ **DATO REAL**
- `workload` - Nivel de carga (Low, Medium, High) ✅
- `efficiency` - % de bugs resueltos / asignados ✅ **CALCULADO**
- `avgResolutionTime` - Días promedio de resolución ✅ **CALCULADO**

### Módulos (Normalizado desde CSV → SQLite)
- `name` - Nombre del módulo ✅ **DATO REAL**
- `bugs` - Total de bugs en módulo ✅ **DATO REAL**
- `efficiency` - Eficiencia de resolución ✅ **CALCULADO**
- `developers` - Desarrolladores asignados ✅ **DATO REAL**

### Estado/Categorización (Campos CSV normalizados en SQLite)
- `prioridad` - Más alta, Alta, Media, Baja (4 niveles) ✅
- `estado` - Tareas por hacer, En curso, Completado, Bloqueado ✅
- `tipo_prueba` - Funcional, Regresión, Humo, E2E ✅
- `ambiente` - DEV, SIT, UAT, PROD ✅
- `tipo_incidencia` - Bug, Defecto, Mejora, Tarea ✅

### Vistas SQL (Agregaciones en SQLite)
- `vw_bugs_summary` - Resumen total de bugs
- `vw_bugs_by_sprint` - Bugs agregados por sprint
- `vw_bugs_by_sprint_status` - Bugs por sprint y estado
- `vw_developer_stats` - Estadísticas por desarrollador
- Y más vistas para agregaciones específicas

---

## ✅ Métricas CALCULADAS (Derivadas de Datos Reales SQLite)

### Todas las Métricas son REALES (no ficticias)
- **Defect Density** = `bugs / testCases` (Hallazgos por caso de prueba) ✅
- **Resolution Efficiency** = `bugsResolved / bugs` (% de bugs resueltos) ✅
- **Test Execution Rate** = `testCases / testPlanned` (% ejecución) ✅
- **Critical Bugs Ratio** = `críticos / total` (% de críticos) ✅
- **Avg Test Cases per Sprint** = Promedio casos/sprint ✅
- **Cycle Time** = Diferencia entre fecha reporte y fecha cierre ✅
- **Bug Leak Rate** = Bugs en producción vs total ✅

**Fuente de todos los cálculos:** `utils/dataProcessor.js`

### Componentes "En Construcción"
Si una métrica no está disponible aún, se marca con:
- `<UnderConstructionCard>` - Componente placeholder
- Color: Azul (bg-blue-50, border-blue-200)
- Icono: Construction
- Badge: "Próximamente"

---

## 🔄 Workflow: De CSV a Dashboard

### 1. Actualizar Datos en CSV
```bash
# Editar: data/MockDataV0.csv
# Agregar/modificar filas con nuevos registros
# Asegurar columnas correctas
```

### 2. Migrar a SQLite
```bash
# Opción 1: Setup completo (RECOMENDADO)
npm run db:setup

# Opción 2: Solo migración
node scripts/migrateToSqliteCSV.mjs
```

### 3. Verificar Integridad
```bash
npm run db:verify
```

### 4. Iniciar Dashboard
```bash
npm run dev
# http://localhost:3000/qa-dashboard
```

### 5. Si Necesitas Nueva Métrica

**En `lib/database/dal.js`:**
```javascript
async function getNewMetric() {
  return runQuery('SELECT ... FROM ...');
}
```

**Exponer en `getFullQAData()`:**
```javascript
qualityMetrics: {
  newMetric: await getNewMetric()
}
```

**Usar en componentes:**
```javascript
const newMetric = data.qualityMetrics.newMetric;
```

---

## 📊 Estructura de Datos (SQLite + CSV)

```javascript
{
  metadata: {
    version: '2.0',
    source: 'sqlite',          // 'sqlite' = datos reales desde DB
    lastUpdated: '2025-12-02T10:30:00Z',
    dataSource: 'MockDataV0.csv'
  },
  _dataSource: 'sqlite',       // 'sqlite' = real, 'json' = backup, 'fallback' = emergencia
  _isRealData: true,          // true = datos reales desde CSV
  _timestamp: 1733138400,
  _cached: false,
  
  // Datos agregados desde SQLite:
  summary: { 
    totalBugs: 238,
    bugsClosed: 112,
    bugsPending: 126,
    testCasesExecuted: 599,
    testCasesTotal: 1200
  },
  bugsByPriority: {
    'Más alta': { count: 48, pending: 35, resolved: 13 },
    'Alta': { count: 41, pending: 23, resolved: 18 },
    'Media': { count: 82, pending: 38, resolved: 44 },
    'Baja': { count: 8, pending: 7, resolved: 1 }
  },
  bugsByModule: { 'BOT': {...}, 'POS': {...} },
  developerData: [ {...}, {...} ],
  sprintData: [ {...}, {...} ],
  qualityMetrics: { defectDensity: 0.40, testAutomation: 45, ... },
  kpis: { avgTestCasesPerSprint: 142, resolutionEfficiency: 73, ... }
}
```

---

## ✅ Checklist para Validar Datos

- [x] MockDataV0.csv con 1000+ registros cargados
- [x] SQLite activo en `public/data/qa-dashboard.db`
- [x] `_dataSource` es 'sqlite' (no fallback)
- [x] `_isRealData` es `true`
- [x] `npm run db:verify` valida integridad
- [x] API `/api/qa-data` retorna 200 OK
- [x] Todos los componentes usan datos reales
- [x] Cache funciona correctamente (5 min)

