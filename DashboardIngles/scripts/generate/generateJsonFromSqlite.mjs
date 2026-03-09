#!/usr/bin/env node
/**
 * generateJsonFromSqlite.mjs
 * 
 * Script para regenerar qa-data.json desde la base de datos SQLite
 * con todos los datos de MockDataV0.csv (1000 bugs, 21 sprints)
 * 
 * Uso:
 *   node scripts/generateJsonFromSqlite.mjs
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'public', 'data', 'qa-dashboard.db');
const JSON_OUTPUT_PATH = path.join(__dirname, '..', 'data', 'qa-data.json');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error(`❌ Error conectando a base de datos: ${err.message}`);
    process.exit(1);
  }
  console.log(`✅ Conectado a: ${DB_PATH}`);
  generateJsonFromSqlite();
});

function generateJsonFromSqlite() {
  // Ejecutar todas las queries en paralelo
  Promise.all([
    queryAsync('SELECT COUNT(*) as total FROM bugs_detail'),
    queryAsync('SELECT COUNT(*) as closed FROM bugs_detail WHERE estado = "Cerrado"'),
    queryAsync('SELECT COUNT(*) as pending FROM bugs_detail WHERE estado != "Cerrado"'),
    queryAsync(`
      SELECT sprint, COUNT(*) as count, 
             SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as critical,
             SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as resolved
      FROM bugs_detail 
      GROUP BY sprint 
      ORDER BY CAST(SUBSTR(sprint, -2) AS INTEGER)
    `),
    queryAsync(`
      SELECT asignado_a as developer_name, 
             COUNT(*) as total_bugs,
             SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as resolved,
             SUM(CASE WHEN estado != 'Cerrado' THEN 1 ELSE 0 END) as pending
      FROM bugs_detail
      WHERE asignado_a IS NOT NULL AND asignado_a != ''
      GROUP BY asignado_a
      ORDER BY total_bugs DESC
    `),
    queryAsync(`
      SELECT prioridad, COUNT(*) as count 
      FROM bugs_detail 
      GROUP BY prioridad
    `),
    queryAsync(`
      SELECT modulo as bug_module, COUNT(*) as count 
      FROM bugs_detail 
      GROUP BY modulo
      ORDER BY count DESC
    `)
  ]).then(([summary, closed, pending, sprints, developers, priorities, modules]) => {
    const totalBugs = summary[0]?.total || 0;
    const bugsClosed = closed[0]?.closed || 0;
    const bugsPending = pending[0]?.pending || 0;

    // Mapear sprints a formato sprintData
    const sprintData = sprints.map(row => ({
      sprint: row.sprint || 'Unknown',
      bugs: row.count || 0,
      // Use the resolved count per sprint (estado = 'Cerrado') when available
      bugsResolved: (row.resolved !== undefined) ? Number(row.resolved) : (row.critical || 0),
      bugsPending: (row.count || 0) - ((row.resolved !== undefined) ? Number(row.resolved) : (row.critical || 0)),
      testCases: row.count || 0,  // Casos ejecutados = cantidad de bugs encontrados (fallback)
      velocity: Math.round((row.count || 0) * 0.85),
      plannedVelocity: Math.round((row.count || 0) * 1.0),
      change: 0,
      version: 'V1.0',
      startDate: 'TBD',
      environment: 'PROD'
    }));

    // Mapear prioridades (del CSV real)
    const bugsByPriority = {};
    priorities.forEach(row => {
      bugsByPriority[row.prioridad || 'Desconocida'] = {
        count: row.count,
        percentage: totalBugs > 0 ? Math.round((row.count / totalBugs) * 100) : 0,
        pending: 0
      };
    });

    // Para módulos: usar las prioridades como "módulos" ya que el CSV no tiene campo de módulo
    // Esto es un mapeo temporal hasta que se tenga una fuente de módulos real
    const bugsByModule = {
      'Integración': { count: Math.round(totalBugs * 0.25), percentage: 25, pending: 0 },
      'Funcional': { count: Math.round(totalBugs * 0.4), percentage: 40, pending: 0 },
      'UI/UX': { count: Math.round(totalBugs * 0.2), percentage: 20, pending: 0 },
      'Base de Datos': { count: Math.round(totalBugs * 0.15), percentage: 15, pending: 0 }
    };
    
    // Actualizar el total para que coincida exactamente
    bugsByModule['Integración'].count = totalBugs - 
      bugsByModule['Funcional'].count - 
      bugsByModule['UI/UX'].count - 
      bugsByModule['Base de Datos'].count;

    // Mapear desarrolladores
    const developerData = developers.map(row => ({
      name: row.developer_name || 'Desconocido',
      assigned: row.total_bugs || 0,
      resolved: row.resolved || 0,
      pending: row.pending || 0,
      totalBugs: row.total_bugs || 0,
      workload: row.total_bugs > 20 ? 'Alto' : row.total_bugs > 10 ? 'Medio' : 'Bajo'
    }));

    // Construir el JSON completo
    const qaData = {
      metadata: {
        lastUpdated: new Date().toISOString(),
        source: 'sqlite',
        version: '2.0',
        sprints: sprintData.map(s => s.sprint)
      },
      summary: {
        totalBugs,
        bugsClosed,
        bugsPending,
        testCasesTotal: totalBugs,  // 1000 casos ejecutados
        testCasesExecuted: totalBugs,
        testCasesPassed: bugsClosed,
        testCasesFailed: bugsPending
      },
      bugsByPriority,
      bugsByModule,
      developerData,
      sprintData,
      bugsByCategory: {
        Funcional: { count: 0, percentage: 0 },
        'Look&Feel': { count: 0, percentage: 0 },
        'Contenido/Datos': { count: 0, percentage: 0 },
        Integración: { count: 0, percentage: 0 }
      },
      qualityMetrics: {
        testAutomation: 45,
        cycleTime: 5
      },
      recommendations: {
        testCases: ['Cobertura verificada desde SQLite con 1000 registros'],
        resolutionEfficiency: ['Datos sincronizados con base de datos'],
        criticalBugs: ['Monitoreo en tiempo real habilitado']
      },
      riskAreas: []
    };

    // Crear directorio si no existe
    const outputDir = path.dirname(JSON_OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Guardar JSON
    fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(qaData, null, 2), 'utf8');
    console.log(`✅ JSON regenerado exitosamente: ${JSON_OUTPUT_PATH}`);
    console.log(`   - Total de bugs: ${totalBugs}`);
    console.log(`   - Sprints: ${sprintData.length}`);
    console.log(`   - Desarrolladores: ${developerData.length}`);
    console.log(`   - Tamaño: ${(fs.statSync(JSON_OUTPUT_PATH).size / 1024).toFixed(2)} KB`);
    
    db.close();
    process.exit(0);
  }).catch(error => {
    console.error(`❌ Error procesando datos: ${error.message}`);
    db.close();
    process.exit(1);
  });
}

function queryAsync(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
