# 🚀 QUICK START - SQLite + CSV (v2.0)

## ✅ Requisitos Previos

- Node.js v18+
- npm v9+
- `data/MockDataV0.csv` (archivo con datos - ya incluido)

---

## Opción Rápida (90 segundos)

```bash
npm run db:setup      # Setup completo: crea BD + migra datos + verifica
npm run dev           # Inicia servidor
# Abre: http://localhost:3000/qa-dashboard
```

✅ **Listo. Dashboard con datos reales.**

---

## Paso a Paso (5-10 minutos)

### Paso 1: Inicializar Base de Datos

```bash
npm run db:setup
```

**Qué hace:**
1. Crea esquema SQLite en `public/data/qa-dashboard.db`
2. Migra datos desde `data/MockDataV0.csv`
3. Verifica integridad de datos

**Resultado esperado:**
```
🚀 SETUP COMPLETO
✅ Base de datos creada: public/data/qa-dashboard.db
✅ Schema creado exitosamente
✅ 12 sprints cargados
✅ 238 bugs cargados
✅ CONFIGURACIÓN LISTA
```

### Paso 2: Iniciar Servidor

```bash
npm run dev
```

**Resultado esperado:**
```
▲ Next.js 14.2.33
- Local: http://localhost:3000
- API Routes: /api/* endpoints available
```

### Paso 3: Acceder al Dashboard

### Test 1: Datos QA
```bash
curl http://localhost:3000/api/qa-data | jq '.summary'
```

**Respuesta esperada:**
```json
{
  "totalBugs": 238,
  "bugsClosed": 112,
  "bugsPending": 126
}
```

### Test 2: Verificación de Integridad
```bash
curl http://localhost:3000/api/verify-data | jq '.sources'
```

**Respuesta esperada:**
```json
{
  "sqlite": {
    "totalBugs": 238,
    "totalSprints": 12,
    "criticalBugs": 119
  },
  "json": {
    "totalBugs": 238,
    "sprints": 12
  }
}
```

---

## Paso 5: Acceder al Dashboard

Abre en navegador:
```
http://localhost:3000/qa-dashboard
```

Abre en navegador:
```
http://localhost:3000/qa-dashboard
```

✅ **Debe mostrar:**
- **238 bugs totales**
- **119 críticos** (Más alta + Alta)
- **126 pendientes**
- **12 sprints** en filtros
- Todos los módulos, desarrolladores

---

## 📊 Comandos Disponibles

```bash
# ✅ RECOMENDADO: Setup + Desarrollo
npm run db:setup    # Crea BD + migra datos + verifica
npm run dev         # Inicia servidor (localhost:3000)

# Otros comandos
npm run db:verify   # Verifica integridad de datos
npm run build       # Build para producción
npm run start       # Inicia servidor producción
```

---

## 🔧 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Base de datos no encontrada | `npm run db:setup` |
| Módulo no encontrado | `npm install && npm run db:setup` |
| Cache antiguo | `curl http://localhost:3000/api/qa-data?force=1` |
| Datos no sincronizados | `npm run db:verify` → `npm run db:setup` |
| Limpiar y empezar de cero | `rm public/data/qa-dashboard.db && npm run db:setup` |
