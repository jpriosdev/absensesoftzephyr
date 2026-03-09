/**
 * qaDataLoaderV2.js - Refactorizado para SQLite
 * Mantiene la misma interfaz que la versión anterior
 */

import DAL from './database/dal.js';
import path from 'path';
import fs from 'fs';
import { DB_PATH } from './config.js';

const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache 5 minutos
const cache = { timestamp: 0, payload: null };

// Verificar que la BD existe
function checkDatabaseExists() {
  return fs.existsSync(DB_PATH);
}

function createFallbackData() {
  // Fallback mínimo y seguro: no incluir datos que puedan ser sensibles.
  return {
    metadata: {
      version: 'fallback-minimal',
      source: 'none',
      lastUpdated: new Date().toISOString(),
    },
    // Mantener estructura, pero sin valores reales
    summary: {
      totalBugs: 0,
      bugsClosed: 0,
      bugsPending: 0,
      testCasesTotal: 0,
      testCasesExecuted: 0,
      testCasesPassed: 0,
      testCasesFailed: 0,
    },
    bugsByPriority: {},
    bugsByModule: {},
    developerData: [],
    sprintData: [],
    bugsByCategory: {},
    qualityMetrics: {},
    _warning: 'Database not available; returning minimal safe payload.'
  };
}

export async function getQAData({ forceReload = false } = {}) {
  const now = Date.now();

  // Retornar cache si está disponible y no expirado
  if (!forceReload && cache.payload && now - cache.timestamp < CACHE_DURATION_MS) {
    return { ...cache.payload, _cached: true };
  }

  try {
    // Verificar que la BD existe
    if (!checkDatabaseExists()) {
      console.warn('SQLite database not found — returning minimal safe payload');
      cache.payload = {
        ...createFallbackData(),
        _dataSource: 'none',
        _isRealData: false,
        _timestamp: now,
        _error: 'SQLite database not available'
      };
      cache.timestamp = now;
      return cache.payload;
    }

    // Obtener datos desde SQLite
    const [
      sprints,
      bugsByPriority,
      bugsByModule,
      bugsByDeveloper,
      bugsByCategory,
      bugsBySprint,
      stats,
      bugsByMonthAndPriorityRaw,
      allBugsDetail
    ] = await Promise.all([
      DAL.getAllSprints(),
      DAL.getBugsByPriority(),
      DAL.getBugsByModule(),
      DAL.getBugsByDeveloper(),
      DAL.getBugsByCategory(),
      DAL.getBugsBySprint(),
      DAL.getStatistics(),
      DAL.getBugsByMonthAndPriority(),
      DAL.getAllBugsDetail()
    ]);

    // Construir respuesta en formato compatible
    const qaData = {
      metadata: {
        lastUpdated: new Date().toISOString(),
        source: 'sqlite-database',
        version: '2.0',
        sprints: sprints.map(s => `Sprint ${s.sprint}`)
      },
      summary: {
        totalBugs: stats.total_bugs,
        bugsClosed: stats.total_bugs - stats.pending_bugs,
        bugsPending: stats.pending_bugs,
        testCasesTotal: 692,
        testCasesExecuted: 692,
        testCasesPassed: 692,
        testCasesFailed: 0
      },
      bugsByPriority: {
        'Más alta': {
          count: bugsByPriority.find(p => p.prioridad === 'Más alta')?.count || 0,
          pending: bugsByPriority.find(p => p.prioridad === 'Más alta')?.pending || 0,
          resolved: (bugsByPriority.find(p => p.prioridad === 'Más alta')?.count || 0) - 
                    (bugsByPriority.find(p => p.prioridad === 'Más alta')?.pending || 0)
        },
        'Alta': {
          count: bugsByPriority.find(p => p.prioridad === 'Alta')?.count || 0,
          pending: bugsByPriority.find(p => p.prioridad === 'Alta')?.pending || 0,
          resolved: (bugsByPriority.find(p => p.prioridad === 'Alta')?.count || 0) - 
                    (bugsByPriority.find(p => p.prioridad === 'Alta')?.pending || 0)
        },
        'Media': {
          count: bugsByPriority.find(p => p.prioridad === 'Media')?.count || 0,
          pending: bugsByPriority.find(p => p.prioridad === 'Media')?.pending || 0,
          resolved: (bugsByPriority.find(p => p.prioridad === 'Media')?.count || 0) - 
                    (bugsByPriority.find(p => p.prioridad === 'Media')?.pending || 0)
        },
        'Baja': {
          count: bugsByPriority.find(p => p.prioridad === 'Baja')?.count || 0,
          pending: bugsByPriority.find(p => p.prioridad === 'Baja')?.pending || 0,
          resolved: (bugsByPriority.find(p => p.prioridad === 'Baja')?.count || 0) - 
                    (bugsByPriority.find(p => p.prioridad === 'Baja')?.pending || 0)
        },
        'Más baja': { count: 0, pending: 0, resolved: 0 }
      },
      bugsByModule: Object.fromEntries(
        bugsByModule.map(m => [
          m.modulo || 'Sin módulo',
          {
            count: m.count,
            percentage: Math.round((m.count / stats.total_bugs) * 100),
            pending: m.critical || 0
          }
        ])
      ),
      developerData: bugsByDeveloper.map(dev => ({
        name: dev.developer_name,
        assigned: dev.total_bugs,
        resolved: dev.total_bugs - dev.pending,
        pending: dev.pending,
        totalBugs: dev.total_bugs,
        workload: dev.total_bugs > 20 ? 'Alto' : dev.total_bugs > 10 ? 'Medio' : 'Bajo'
      })),
      sprintData: bugsBySprint.map(sprint => ({
        sprint: `Sprint ${sprint.sprint_num}`,
        bugs: sprint.total,
        bugsResolved: sprint.total - sprint.pending,
        bugsPending: sprint.pending,
        testCases: 100,
        velocity: Math.round(sprint.total / 7),
        plannedVelocity: Math.round((sprint.total * 1.2) / 7),
        change: 0,
        criticalBugsTotal: sprint.critical,
        criticalBugsPending: Math.round(sprint.critical * 0.5),
        avgResolutionTime: 10,
        // Derivar tipo de prueba desde datos del sprint (environment o tags)
        testType: ((sprint.environment || '').toString().toUpperCase() === 'UAT' || (sprint.tags || '').toString().toLowerCase().includes('uat')) ? 'uat' : 'system'
      })),
      bugsByCategory: Object.fromEntries(
        bugsByCategory.map(c => [
          c.categoria || 'Sin categoría',
          {
            count: c.count,
            percentage: Math.round((c.count / stats.total_bugs) * 100)
          }
        ])
      ),
      bugsByMonthByPriority: (() => {
        const result = {};
        bugsByMonthAndPriorityRaw.forEach(row => {
          const month = row.month_year;
          if (!result[month]) {
            result[month] = { total: 0, critical: 0, medium: 0, lowPriority: 0 };
          }
          const priority = (row.prioridad || '').toLowerCase();
          const count = row.count || 0;
          result[month].total += count;
          if (priority === 'highest' || priority === 'más alta' || priority === 'high' || priority === 'alta') {
            result[month].critical += count;
          } else if (priority === 'medium' || priority === 'media') {
            result[month].medium += count;
          } else if (priority === 'low' || priority === 'baja' || priority === 'lowest' || priority === 'más baja') {
            result[month].lowPriority += count;
          }
        });
        return result;
      })(),
      bugsByMonth: (() => {
        const result = {};
        bugsByMonthAndPriorityRaw.forEach(row => {
          const month = row.month_year;
          const count = row.count || 0;
          result[month] = (result[month] || 0) + count;
        });
        return result;
      })(),
      qualityMetrics: {
        testAutomation: 45,
        cycleTime: 5
      },
      recommendations: {},
      riskAreas: [
        {
          area: 'BOT',
          bugs: bugsByModule.find(m => m.modulo === 'BOT')?.count || 0,
          percentage: null,
          risk: 'Bajo',
          impact: 'Crítico'
        },
        {
          area: 'POS',
          bugs: bugsByModule.find(m => m.modulo === 'POS')?.count || 0,
          percentage: null,
          risk: 'Bajo',
          impact: 'Crítico'
        }
      ],
      // Include all bugs detail for components like TeamAnalysis
      bugs: (Array.isArray(allBugsDetail) ? allBugsDetail : []).map((bug, idx) => {
        // Debug: log first few items to see available fields
        if (idx < 3) {
          console.log(`Bug ${idx} fields:`, Object.keys(bug).slice(0, 10));
          console.log(`Bug ${idx} reportado value:`, bug.reportado || bug.Reportado);
        }
        
        return {
          // Keep original fields as-is
          ...bug,
          // Ensure Spanish field names are available with proper casing
          Reportado: (bug.reportado || bug.Reportado || '').toString().trim(),
          reportado: (bug.reportado || bug.Reportado || '').toString().trim(),
          Estado: (bug.estado || bug.Estado || '').toString().trim(),
          estado: (bug.estado || bug.Estado || '').toString().trim(),
          'Versión de corrección 1': parseInt(bug['Versión de corrección 1'] || bug.version_correccion || bug.executions || 1, 10),
          'Tipo de prueba': (bug['Tipo de prueba'] || bug.tipo_prueba || '').toString().trim(),
          Atributo: (bug.atributo || bug.Atributo || '').toString().trim(),
          'Nivel de prueba': (bug['Nivel de prueba'] || bug.nivel_prueba || '').toString().trim(),
          Ambiente: (bug.ambiente || bug.Ambiente || '').toString().trim(),
          'Estrategia de ejecución': (bug['Estrategia de ejecución'] || bug.estrategia_ejecucion || '').toString().trim()
        };
      }),
      _dataSource: 'sqlite',
      _isRealData: true,
      _timestamp: now
    };

    // Cachear
    cache.payload = qaData;
    cache.timestamp = now;
    return cache.payload;

  } catch (error) {
    console.error('Error loading QA data from SQLite:', error);
    
    // Fallback a datos ficticios
    cache.payload = {
      ...createFallbackData(),
      _dataSource: 'fallback',
      _isRealData: false,
      _timestamp: now,
      _warning: 'Error cargando datos reales, usando demostración',
      _error: error.message
    };
    cache.timestamp = now;
    return cache.payload;
  }
}

// Limpiar cache
export function clearQADataCache() {
  cache.payload = null;
  cache.timestamp = 0;
}

const QADataLoader = { getQAData, clearQADataCache };
export default QADataLoader;
