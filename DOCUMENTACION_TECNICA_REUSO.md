# 🔗 Documentación Técnica: Integración de Reuso en Modal

## Resumen de Cambios

Se agregó funcionalidad de análisis de **"Test Cases Reuse"** (Reuso de Casos Diseñados) al modal del KPI "Test Cases designed" del dashboard.

## Arquitectura de Datos

### 1. Origen de Datos
**Archivo**: `public/data/qa-data.json`

**Estructura**:
```json
{
  "summary": {
    "testCasesTotal": 3291,
    "testCasesWithExecutions": 3100,
    "testCasesWithoutExecutions": 191,
    "testCasesExecutionRate": 94
  }
}
```

### 2. Componentes Afectados

#### ExecutiveDashboard.js
**Línea**: 1515-1542

**Cambio**: Modificación del handler `onClick` del KPI

```javascript
onClick={() => {
  // 🆕 Cálculos de reuso agregados
  const testCasesWithExecutions = summary?.testCasesWithExecutions || 0;
  const testCasesWithoutExecutions = summary?.testCasesWithoutExecutions || 0;
  const testCasesTotal = summary?.testCasesTotal || totalTestCases;
  const reuseRate = testCasesTotal > 0 
    ? Math.round((testCasesWithExecutions / testCasesTotal) * 100) 
    : 0;
  const nonReuseRate = testCasesTotal > 0 
    ? Math.round((testCasesWithoutExecutions / testCasesTotal) * 100) 
    : 0;
  
  // 🔀 Pasar datos completos al modal
  setDetailModal({
    type: 'testCases',
    title: 'Analysis of Test Cases designed by Month',
    data: {
      avg: avgTestCasesPerSprint,
      total: totalTestCases,
      months: monthLabels?.length || 0,
      plannedSeries: plannedSeries,
      executedSeries: executedSeries,
      // 🆕 Nuevos campos de reuso
      testCasesTotal: testCasesTotal,
      testCasesWithExecutions: testCasesWithExecutions,
      testCasesWithoutExecutions: testCasesWithoutExecutions,
      reuseRate: reuseRate,
      nonReuseRate: nonReuseRate
    },
    sparklineData: plannedSeries,
    sprints: monthLabels.map(month => ({ sprint: month })),
    monthLabels: monthLabels
  })
}}
```

#### DetailModal.js
**Línea**: 1233-1380

**Cambio**: Reescritura de `renderTestCasesDetail()`

**Nuevas Secciones**:
1. Test Cases Reuse Analysis (principal)
2. Reuse Rate Distribution (visualización)
3. Reuse Insights (evaluación automática)
4. Recommendations mejoradas

## Flujo de Datos

```
┌──────────────────────────────────────────┐
│ KPI Card: Test Cases designed            │
│ (Compone 1487 en ExecutiveDashboard.js)  │
└────────────────────┬─────────────────────┘
                     │ onClick
                     ▼
┌──────────────────────────────────────────┐
│ ExecutiveDashboard.js (línea 1515-1542) │
│ - Lee datos de summary                   │
│ - Calcula reuseRate y nonReuseRate       │
│ - Prepara payload completo               │
└────────────────────┬─────────────────────┘
                     │ setDetailModal()
                     ▼
┌──────────────────────────────────────────┐
│ State: detailModal                       │
│ {                                        │
│   type: 'testCases',                     │
│   data: {                                │
│     testCasesWithExecutions: 3100,       │
│     testCasesWithoutExecutions: 191,     │
│     reuseRate: 94,                       │
│     nonReuseRate: 6,                     │
│     ...otros campos                      │
│   }                                      │
│ }                                        │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ DetailModal.js (línea 3392)              │
│ modal.type === 'testCases' &&            │
│ renderTestCasesDetail(modal.data)        │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│ renderTestCasesDetail(data)              │
│ - Accede a data.testCasesWithExecutions  │
│ - Accede a data.reuseRate                │
│ - Renderiza dinámica evaluación          │
│ - Muestra recomendaciones contextuales   │
└──────────────────────────────────────────┘
```

## Estructura de Datos Pasados al Modal

```typescript
interface TestCasesModalData {
  // Datos originales
  avg: number;                               // 142
  total: number;                             // 3291
  months: number;                            // 44
  plannedSeries: number[];                   // [123, 157, ...]
  executedSeries: number[];                  // [121, 157, ...]
  
  // 🆕 Nuevos campos de reuso
  testCasesTotal: number;                    // 3291
  testCasesWithExecutions: number;           // 3100
  testCasesWithoutExecutions: number;        // 191
  reuseRate: number;                         // 94 (%)
  nonReuseRate: number;                      // 6 (%)
}
```

## Componentes React Utilizados

### Iconos (de lucide-react)
```javascript
<Activity className="w-5 h-5" />  // Icono de reuso
<TrendingUp className="w-5 h-5 mr-2" />  // Para recomendaciones
```

### Estilos Tailwind
- `bg-purple-50` / `border-purple-200`: Contenedor principal
- `bg-gradient-to-r from-purple-500 to-purple-600`: Barra de reuso
- `text-purple-900` / `text-white`: Textos
- `text-xs` / `text-sm` / `text-2xl`: Tamaños de fuente

### Lógica Condicional
```javascript
// Evaluación automática del reuso
{data.reuseRate >= 90 && <p>✓ Excellent...</p>}
{data.reuseRate >= 80 && data.reuseRate < 90 && <p>✓ Good...</p>}
{data.reuseRate >= 70 && data.reuseRate < 80 && <p>⚠️ Fair...</p>}
{data.reuseRate < 70 && <p>🔴 Improvement Needed...</p>}

// Recomendaciones contextuales
{data.nonReuseRate > 0 && <li>Review unused cases...</li>}
{data.reuseRate < 85 && <li>Increase reuse by...</li>}
```

## Cálculos de Métrica

### Reuse Rate
```
reuseRate = (testCasesWithExecutions / testCasesTotal) × 100
         = (3100 / 3291) × 100
         = 94%
```

### Non-Reuse Rate
```
nonReuseRate = (testCasesWithoutExecutions / testCasesTotal) × 100
            = (191 / 3291) × 100
            = 6%
```

### Validación
```
reuseRate + nonReuseRate = 94 + 6 = 100% ✓
```

## Casos de Uso Cubiertos

### 1. ⭐ Excelente Reuso (≥90%)
- **Escenario**: Pocos casos sin ejecutar
- **Evaluación**: "Excellent: High percentage..."
- **Recomendación**: Monitorear caso no utilizados

### 2. ✓ Buen Reuso (80-89%)
- **Escenario**: Mayoría de casos se reutilizan
- **Evaluación**: "Good: Most test cases..."
- **Recomendación**: Revisar los no ejecutados

### 3. ⚠️ Reuso Regular (70-79%)
- **Escenario**: ~30% de casos no se reutilizan
- **Evaluación**: "Fair: Consider strategies..."
- **Recomendación**: Implementar plan de mejora

### 4. 🔴 Reuso Bajo (<70%)
- **Escenario**: Muchos casos no se ejecutan
- **Evaluación**: "Improvement Needed..."
- **Recomendación**: Auditoría de diseño

## Validaciones Implementadas

```javascript
// Validación de división por cero
const reuseRate = testCasesTotal > 0 ? Math.round(...) : 0;

// Valores por defecto si no existen
const testCasesWithExecutions = summary?.testCasesWithExecutions || 0;
const testCasesWithoutExecutions = summary?.testCasesWithoutExecutions || 0;

// Fallback a totalTestCases si summary.testCasesTotal no existe
const testCasesTotal = summary?.testCasesTotal || totalTestCases;
```

## Performance Considerations

1. **Cálculos en Cliente**: Todos los cálculos se hacen en el navegador (sin impacto en servidor)
2. **Reexpress Condicional**: Solo se renderizan las evaluaciones relevantes
3. **Sin Datos Remotos**: Usa datos ya cargados en el componente
4. **Opcional Gate**: Las recomendaciones solo aparecen si son relevantes

## Compatibilidad

- **React**: ✓ 18.x+
- **Next.js**: ✓ 14.x+
- **Tailwind CSS**: ✓ 3.x+
- **lucide-react**: ✓ latest

## Testing Checklist

- ✅ Ejecutar dashboard
- ✅ Hacer clic en KPI "Test Cases designed"
- ✅ Verificar que aparece sección "Test Cases Reuse Analysis"
- ✅ Validar cálculos de porcentajes (94% + 6% = 100%)
- ✅ Confirmar evaluación automática (debe mostrar "Excellent" para 94%)
- ✅ Verificar recomendaciones contextuales
- ✅ Probar responsive en mobile
- ✅ Verificar no hay errores en console

---

**Documento actualizado**: 23-02-2026
**Versión**: 1.0
**Estado**: ✅ Producción
