#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

function runQuery(sql, description) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        console.error(`❌ Error en "${description}":`, err.message);
        reject(err);
      } else {
        console.log(`\n✅ ${description}`);
        console.table(rows);
        resolve(rows);
      }
    });
  });
}

async function main() {
  console.log('🧪 VALIDACIÓN DE MÉTRICAS DE CASOS DE PRUEBA\n');
  console.log('═'.repeat(80) + '\n');

  try {
    // Query 1: Resumen general de Test Cases
    await runQuery(
      `SELECT * FROM vw_testcases_execution_summary`,
      '📊 1. RESUMEN GENERAL DE TEST CASES'
    );

    // Query 2: Por Sprint
    await runQuery(
      `SELECT * FROM vw_testcases_by_sprint ORDER BY sprint`,
      '📋 2. TEST CASES POR SPRINT'
    );

    // Query 3: Por Prioridad
    await runQuery(
      `SELECT * FROM vw_testcases_by_priority ORDER BY prioridad`,
      '🎯 3. TEST CASES POR PRIORIDAD'
    );

    // Query 4: Por Estado (última ejecución)
    await runQuery(
      `SELECT * FROM vw_testcases_by_state`,
      '📊 4. DISTRIBUCIÓN DE ESTADOS (ÚLTIMA EJECUCIÓN)'
    );

    // Query 5: Detalle de casos (muestra primeros 10)
    await runQuery(
      `SELECT 
        test_case_id,
        resumen,
        prioridad,
        latest_execution_state,
        latest_execution_status,
        sprint,
        total_executions,
        total_closed_executions,
        total_pending_executions
      FROM vw_testcases_summary
      LIMIT 10`,
      '📝 5. DETALLE DE 10 PRIMEROS TEST CASES'
    );

    // Query 6: Estadísticas de ejecuciones
    await runQuery(
      `SELECT 
        COUNT(DISTINCT clave_incidencia) as unique_test_cases,
        COUNT(DISTINCT id_incidencia) as total_executions,
        ROUND(AVG(total_executions), 2) as avg_executions_per_case,
        MAX(total_executions) as max_executions_per_case,
        MIN(total_executions) as min_executions_per_case
      FROM vw_testcases_summary`,
      '📈 6. ESTADÍSTICAS DE EJECUCIONES'
    );

    // Query 7: Validación de últimas ejecuciones
    await runQuery(
      `SELECT 
        COUNT(*) as total_testcases,
        SUM(CASE WHEN latest_execution_state = 'Pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN latest_execution_state = 'Fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN latest_execution_state = 'Not Executed' THEN 1 ELSE 0 END) as not_executed,
        SUM(CASE WHEN latest_execution_state = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN latest_execution_state = 'Blocked' THEN 1 ELSE 0 END) as blocked
      FROM vw_testcases_summary`,
      '✔️ 7. VALIDACIÓN DE ESTADOS (ÚLTIMA EJECUCIÓN)'
    );

    // Query 8: Eficiencia por desarrollador (si hay datos)
    await runQuery(
      `SELECT 
        asignado_a as assigned_to,
        COUNT(DISTINCT clave_incidencia) as total_cases,
        SUM(CASE WHEN latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as executed,
        SUM(CASE WHEN latest_execution_state IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending,
        ROUND((SUM(CASE WHEN latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / 
               NULLIF(COUNT(DISTINCT clave_incidencia), 0)), 2) as efficiency_pct
      FROM vw_testcases_summary
      WHERE asignado_a IS NOT NULL AND asignado_a != ''
      GROUP BY asignado_a
      ORDER BY total_cases DESC`,
      '👤 8. EFICIENCIA POR DESARROLLADOR'
    );

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ VALIDACIÓN COMPLETADA EXITOSAMENTE\n');

    db.close();
  } catch (error) {
    console.error('\n❌ Error en validación:', error.message);
    db.close();
    process.exit(1);
  }
}

main();
