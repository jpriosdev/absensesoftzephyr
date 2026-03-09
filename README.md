# Dashboard Ejecutivo QA

Dashboard de control de calidad y trazabilidad del proceso de pruebas para directores de tecnología.

**Versión Actual**: 2.1 (ES6 Modules + SQLite + Migración CSV)

**Archivo Base**: `data/MockDataV0.csv` (1,000 registros  SQLite  API  Dashboard)

##  Características

- **Control Metodológico**: Métricas de proceso y calidad
- **Trazabilidad Completa**: Seguimiento desde detección hasta resolución
- **Análisis por Equipos**: Productividad y distribución de carga
- **Recomendaciones Ejecutivas**: Acciones específicas para la dirección
- **ROI Cuantificado**: Impacto financiero del proceso QA
- **Arquitectura SQLite**: Base de datos persistente y escalable
- **ES6 Modules**: Compatibilidad total con Next.js 14
- **Performance +300%**: Queries SQL vs JSON en memoria

##  Quick Start (90 segundos)

```bash
cd DashboardDemo
npm install                  # Si es la primera vez
npm run db:setup            # Crea BD y carga datos desde MockDataV0.csv
npm run dev                 # Inicia servidor
```

Luego abre tu navegador en: **http://localhost:3000/qa-dashboard**

##  Documentación

### Para Empezar
-  **[QUICK_START.md](./QUICK_START.md)** - 90 segundos a dashboard ejecutando

### Referencia Técnica
-  **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura SQLite/CSV completa
-  **[DATA_MAPPING.md](./DATA_MAPPING.md)** - Flujo de datos y normalizaciones
-  **[RANGOS_VALIDACION.md](./RANGOS_VALIDACION.md)** - Rangos de validación de métricas
-  **[DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md)** - Gestión de datos en profundidad

##  Funcionalidades

### Gestión de Datos (Menú Opciones ⚙️)

El dashboard incluye un sistema completo de gestión de datos accesible desde el botón "Opciones" en el header:

**Cargar Nuevo Archivo**
- Sube archivos CSV con el mismo formato que `MockDataV0.csv`
- El sistema automáticamente normaliza y carga los datos a SQLite
- Crea automáticamente un backup de la versión anterior
- Válida la integridad de los datos antes de guardar

**Cambiar Versión de Datos**
- Ve entre versiones de datos cargadas
- Cada versión guarda metadatos (fecha, cantidad de registros)
- Los cambios se reflejan inmediatamente en el dashboard

**Ver Historial de Versiones**
- Muestra todas las versiones cargadas
- Información de cada versión (fecha, cantidad de bugs, sprints)
- Opción para revertir a cualquier versión anterior

### Resumen Ejecutivo
- KPIs críticos de calidad
- Tendencias por sprint
- Matriz de riesgo por prioridad
- Análisis por módulos

### Métricas de Calidad
- Densidad de defectos
- Eficiencia de pruebas
- Cobertura de automatización
- Tiempo de ciclo

### Análisis de Equipos
- Distribución de carga por desarrollador
- Eficiencia de resolución
- Recomendaciones de balanceo

### Tendencias
- Evolución de bugs por sprint
- Tasa de resolución
- Distribución por categorías

### Recomendaciones
- Plan de acción ejecutivo
- Métricas de seguimiento
- ROI del proceso QA

##  Arquitectura de Datos (v2.0)

```
 MockDataV0.csv (1,000 registros - ARCHIVO BASE)
    
 scripts/migrateToSqliteCSV.mjs (Normalización)
    
 qa-dashboard.db (SQLite - Fuente Única)
     lib/database/dal.js (25+ queries optimizadas)
    
 /api/qa-data endpoints (Next.js)
    
  React Components (ExecutiveDashboard, KPICard, etc.)
    
 Tailwind CSS (Responsive UI)
```

### Flujo de Datos Actual

1. **CSV  SQLite**: `MockDataV0.csv` se normaliza e importa en `qa-dashboard.db`
2. **Queries Optimizadas**: `lib/database/dal.js` con 25+ métodos estáticos
3. **API Endpoints**: Next.js routes que exponen datos vía REST
4. **Caché**: 5 minutos en memoria para performance
5. **Fallback**: SQLite  JSON  datos mínimos seguros

### Componentes Clave

| Componente | Tipo | Ubicación | Estado |
|-----------|------|-----------|--------|
| Archivo Base | CSV | `data/MockDataV0.csv` |  1,000 registros |
| Frontend | React | `pages/`, `components/` |  12 componentes |
| API | Next.js | `pages/api/` |  11 endpoints |
| DAL | ES6 Module | `lib/database/dal.js` |  25+ queries |
| DB | SQLite | `qa-dashboard.db` |  238 bugs + 12 sprints |

### Base de Datos

- **Tablas**: 3 tablas reales (bugs_detail, sprints_versions, audit_log)
- **Vistas**: 7 vistas SQL para agregaciones
- **Índices**: 6 índices para performance
- **Registros**: 238 bugs + 12 sprints + 7 desarrolladores

##  Comandos Disponibles

```bash
# Setup inicial
npm install                   # Instalar dependencias
npm run db:setup             # Crear BD e importar datos desde MockDataV0.csv
npm run db:verify            # Verificar integridad de datos

# Desarrollo
npm run dev                  # Inicia servidor en http://localhost:3000
npm run build                # Compilar para producción
npm run start                # Iniciar servidor (producción)

# Testing
npm run test                 # Ejecutar tests unitarios (si existen)
```

##  Endpoints API Disponibles

```bash
# Datos principales
curl http://localhost:3000/api/qa-data              # Datos QA completos
curl http://localhost:3000/api/qa-data?force=1     # Sin cache
curl http://localhost:3000/api/qa-data-v2          # Versión alternativa

# Diagnóstico
curl http://localhost:3000/api/verify-data         # Verificar integridad
curl http://localhost:3000/api/health              # Estado del servidor
curl http://localhost:3000/api/config              # Configuración activa

# Funcionalidades
curl http://localhost:3000/api/recommendations     # Recomendaciones
curl http://localhost:3000/api/generate-status     # Generar estado
```

##  Troubleshooting

### Error: "Base de datos no encontrada"
```bash
npm run db:setup
```

### Error: "Cannot find module"
```bash
rm -rf node_modules
npm install
npm run db:setup
```

### Error: Datos anticuados o cache viejo
```bash
# Limpiar cache - hacer query sin cache
curl http://localhost:3000/api/qa-data?force=1

# O reinicializar BD completamente
npm run db:setup
```

### Revisar integridad de datos
```bash
npm run db:verify
```

##  Stack Tecnológico

- **Framework**: Next.js 14, React 18
- **Estilos**: Tailwind CSS, Framer Motion
- **Backend**: Node.js, ES6 Modules
- **Base de Datos**: SQLite3 (persistente)
- **Gráficos**: Chart.js, React-Chartjs-2
- **Utilidades**: date-fns, Lucide React, Axios

##  Cambios Recientes (v2.1  v2.2)

✅ Corrección de datos en "Hallazgos Críticos Detectados" (399 bugs críticos)  
✅ Exclusión de "Sugerencias" en la métrica "Densidad de Hallazgos por Sprint"  
✅ Eliminación de referencias a archivos específicos (nombres genéricos)  
✅ Manejo elegante de archivos faltantes (sin errores ruidosos)  
 Migración de Excel a MockDataV0.csv  
 Refactorización completa a ES6 Modules  
 Conversión a SQLite (fuente única)  
 25+ queries optimizadas en DAL  
 Cache inteligente (5 minutos)  
 Motor de recomendaciones dinámico  
 Fallback seguro (SQLite  JSON  mínimo)  
 12 componentes React sin código muerto  

##  Soporte

**¿Algo no funciona?**
1. Revisa: [QUICK_START.md](./QUICK_START.md)
2. Ejecuta: `npm run db:verify`
3. Verifica: [MOCKDATAV0_BASE.md](./MOCKDATAV0_BASE.md)  sección de troubleshooting

##  Licencia

Privado - Uso interno únicamente

---

**Última actualización**: 2025-12-02  
**Versión**: 2.1 (ES6 + SQLite + CSV)  
**Estado**:  Producción
