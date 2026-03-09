/**
 * DAL - Data Access Layer
 * Reusable functions for common queries against SQLite
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.join(__dirname, '../../public/data/qa-dashboard.db');

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Pool simple de conexión
let db = null;

function getDatabase() {
  if (!db) {
    db = new (sqlite3.verbose().Database)(dbPath, (err) => {
      if (err) {
        console.error('❌ Error conectando a BD:', err);
      }
    });
  }
  return db;
}

// Promisify queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function runScalar(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ============================================================================
// QUERIES: GENERAL SUMMARY
// ============================================================================

async function getBugsSummary() {
  return runQuery('SELECT * FROM vw_bugs_summary');
}

async function getTotalBugs() {
  const result = await runScalar("SELECT COUNT(*) as total FROM bugs_detail WHERE estado = 'Fail'");
  return result?.total || 0;
}

async function getTotalSprints() {
  const result = await runScalar('SELECT COUNT(*) as total FROM sprints_versions');
  return result?.total || 0;
}

// ============================================================================
// QUERIES: BUGS BY SPRINT
// ============================================================================

async function getBugsBySprint() {
  return runQuery('SELECT * FROM vw_bugs_by_sprint ORDER BY sprint_num');
}

async function getBugsBySprintIncludingSuggestions() {
  // Devolver todos los bugs por sprint SIN excluir sugerencias
  return runQuery(`
    SELECT 
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      COUNT(*) as total,
      SUM(CASE WHEN prioridad IN ('High') THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN estado in ('Backlog', 'Refinement','Ready for Dev','Dev Solution Review', 'Solution Design') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled
    FROM bugs_detail
    GROUP BY month_year
    ORDER BY month_year
  `);
}

async function getTestCasesBySprint() {
  return runQuery(`
    SELECT
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      -- Total test cases: registros con tipo_incidencia en ('test Case', 'Epic', 'Story')
      -- Y resumen contiene 'QA' o 'Test'
      SUM(CASE WHEN 
        tipo_incidencia IN ('test Case', 'Epic', 'Story')
        AND (LOWER(COALESCE(resumen,'')) LIKE '%qa%' OR LOWER(COALESCE(resumen,'')) LIKE '%test%')
        THEN 1 ELSE 0 
      END) as total_tests,
      -- Executed test cases: con los mismos filtros + estado en ('Closed', 'Released', 'Ready For Release')
      SUM(CASE 
        WHEN tipo_incidencia IN ('test Case', 'Epic', 'Story')
        AND (LOWER(COALESCE(resumen,'')) LIKE '%qa%' OR LOWER(COALESCE(resumen,'')) LIKE '%test%')
        AND estado IN ('Closed', 'Released', 'Ready For Release')
        THEN 1 
        ELSE 0 
      END) as executed_tests
    FROM bugs_detail
    GROUP BY month_year
    ORDER BY month_year
  `);
}
async function getPlannedTestCasesBySprint() {
  return runQuery(`
    SELECT
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      -- Planned test cases: mismos filtros que total_tests
      SUM(CASE WHEN 
        tipo_incidencia IN ('test Case', 'Epic', 'Story')
        AND (LOWER(COALESCE(resumen,'')) LIKE '%qa%' OR LOWER(COALESCE(resumen,'')) LIKE '%test%')
        THEN 1 ELSE 0 
      END) as total_tests
    FROM bugs_detail
    GROUP BY month_year
    ORDER BY month_year
  `);
}

async function getBugsBySprintAndStatus() {
  return runQuery('SELECT * FROM vw_bugs_by_sprint_status ORDER BY month_year');
}

async function getBugsBySprintNumber(sprintNum) {
  return runQuery(
    'SELECT * FROM vw_bugs_by_sprint WHERE month_year = ?',
    [sprintNum]
  );
}

async function getCriticalBugsPendingBySprint() {
  return runQuery(`
    SELECT 
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      COUNT(*) as critical_pending
    FROM bugs_detail
    WHERE prioridad = 'Major'
      AND estado IN ('To Do', 'In Development')
    GROUP BY month_year
    ORDER BY month_year
  `);
}

async function getCriticalBugsBySprintAndState() {
  // Contar bugs (estado=Fail) de prioridad High según su estado de resolución
  // Estados: 'To Do' -> tareasPorHacer, 'In Development' -> enProgreso, 'Ready for Testing' y 'Reopened' -> reabierto
  return runQuery(`
    SELECT 
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      SUM(CASE WHEN prioridad IN ('High') AND estado in ('To Do', 'Ready for Dev') THEN 1 ELSE 0 END) as tareasPorHacer,
      SUM(CASE WHEN prioridad IN ('High') AND estado in ('Refinement ', 'Solution Design', 'Dev Solution Review') THEN 1 ELSE 0 END) as enProgreso,
      SUM(CASE WHEN prioridad IN ('High') AND (estado = 'Ready for Testing' OR estado = 'Reopened') THEN 1 ELSE 0 END) as reabierto,
      SUM(CASE WHEN prioridad IN ('High') AND (estado = 'Ready for Testing' OR estado in ('Ready For Release', 'Released','Closed')) THEN 1 ELSE 0 END) as Other
    FROM bugs_detail
    WHERE prioridad IN ('High')
    GROUP BY month_year
    ORDER BY month_year
  `);
}

// ============================================================================
// QUERIES: BREAKDOWN BY MODULE BY DEVELOPER
// ============================================================================

async function getDeveloperModulesSummary() {
  return runQuery(`
    SELECT 
      asignado_a as developer_name,
      COALESCE(modulo, 'Sin módulo') as modulo,
      COUNT(*) as count,
      SUM(CASE WHEN estado in ('To Do', 'Ready for Testing', 'In Development') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN estado not in ('To Do', 'Ready for Testing', 'In Development') THEN 1 ELSE 0 END) as resolved
    FROM bugs_detail
    WHERE asignado_a IS NOT NULL AND asignado_a != ''
      AND modulo IS NOT NULL AND modulo != ''
    GROUP BY asignado_a, modulo
    ORDER BY asignado_a, count DESC
  `);
}

// ============================================================================
// QUERIES: BUGS BY DEVELOPER
// ============================================================================

async function getBugsByDeveloper() {
  return runQuery('SELECT * FROM vw_bugs_by_developer ORDER BY total_bugs DESC');
}

async function getBugsByDeveloperName(devName) {
  return runQuery(
    'SELECT * FROM vw_bugs_by_developer WHERE developer_name = ?',
    [devName]
  );
}

// ============================================================================
// QUERIES: BUGS BY PRIORITY
// ============================================================================

async function getCriticalBugs() {
  return runQuery(
    `SELECT COUNT(*) as count FROM bugs_detail 
    WHERE prioridad IN ('High') AND estado = 'Fail'`
  );
}

// ============================================================================
// QUERIES: BUGS BY MODULE
// ============================================================================

async function getBugsByModule() {
  return runQuery('SELECT * FROM vw_bugs_by_module ORDER BY count DESC');
}

// ============================================================================
// QUERIES: BUGS BY CATEGORY
// ============================================================================

async function getBugsByCategory() {
  return runQuery('SELECT * FROM vw_bugs_by_category ORDER BY count DESC');
}

async function getBugsByDate() {
  return runQuery(
    `SELECT 
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      COUNT(*) as count
    FROM bugs_detail 
    WHERE estado = 'Fail' AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
    GROUP BY month_year
    ORDER BY month_year ASC`
  );
}

async function getBugsByMonthAndPriority() {
  return runQuery(
    `SELECT 
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      prioridad,
      COUNT(*) as count
    FROM bugs_detail 
    WHERE estado = 'Fail' AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
    GROUP BY month_year, prioridad
    ORDER BY month_year ASC, prioridad ASC`
  );
}

async function getTestCasesByMonth() {
  return runQuery(
    `SELECT 
      CASE UPPER(SUBSTR(sprint, 1, 3))
        WHEN 'JAN' THEN '01' WHEN 'FEB' THEN '02' WHEN 'MAR' THEN '03'
        WHEN 'APR' THEN '04' WHEN 'MAY' THEN '05' WHEN 'JUN' THEN '06'
        WHEN 'JUL' THEN '07' WHEN 'AUG' THEN '08' WHEN 'SEP' THEN '09'
        WHEN 'OCT' THEN '10' WHEN 'NOV' THEN '11' WHEN 'DEC' THEN '12'
        ELSE '00' END || '-' || SUBSTR(sprint, INSTR(sprint, ' ') - 4, 4) as month_year,
      COUNT(DISTINCT clave_incidencia) as planned_tests,
      SUM(CASE WHEN estado IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as executed_tests
    FROM vw_testcase_latest_execution
    WHERE sprint IS NOT NULL AND sprint != ''
    GROUP BY month_year
    ORDER BY month_year ASC`
  );
}

async function getExecutionRateByMonth() {
  // Calcular execution rate por mes basado en bugs
  // Numerador: bugs en estados ('Ready For QA','Ready For Release','Released','Closed')
  // Denominador: todos los bugs
  return runQuery(
    `SELECT 
      SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as month_year,
      COUNT(*) as total_bugs,
      SUM(CASE 
        WHEN estado IN ('Ready For QA','Ready For Release','Released','Closed')
        THEN 1 
        ELSE 0 
      END) as completed_bugs
    FROM bugs_detail
    WHERE estado = 'Fail' AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
    GROUP BY month_year
    ORDER BY month_year ASC`
  );
}

// ============================================================================
// QUERIES: SPECIFIC DETAILS
// ============================================================================

async function getBugDetail(clave) {
  return runScalar(
    'SELECT * FROM bugs_detail WHERE clave_incidencia = ?',
    [clave]
  );
}

async function getBugsByState(estado) {
  return runQuery(
    'SELECT * FROM bugs_detail WHERE estado = ? ORDER BY sprint',
    [estado]
  );
}

async function getBugsByPriority(prioridad) {
  if (prioridad) {
    // Si se pasa un parámetro, devolver detalles de esa prioridad CON estado='Fail'
    return runQuery(
      'SELECT * FROM bugs_detail WHERE prioridad = ? AND estado = ? ORDER BY sprint',
      [prioridad, 'Fail']
    );
  } else {
    // Si no se pasa parámetro, devolver resumen de bugs con estado='Fail' por prioridad
    return runQuery(`
      SELECT 
        prioridad,
        COUNT(*) as count,
        SUM(CASE WHEN estado IN ('To Do', 'In Development', 'Ready for Testing') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN estado = 'Resolved' THEN 1 ELSE 0 END) as canceled,
        SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as resolved
      FROM bugs_detail 
      WHERE estado = 'Fail'
      GROUP BY prioridad
      ORDER BY prioridad
    `);
  }
}

// ============================================================================
// QUERIES: SPRINT INFORMATION
// ============================================================================

async function getSprintInfo(sprintNum) {
  return runScalar(
    'SELECT * FROM sprints_versions WHERE sprint = ?',
    [sprintNum]
  );
}

async function getAllSprints() {
  return runQuery('SELECT * FROM sprints_versions ORDER BY sprint');
}

// ============================================================================
// FILTERED QUERIES (combination of criteria)
// ============================================================================

async function getBugsFiltered(filters = {}) {
  let sql = 'SELECT * FROM bugs_detail WHERE 1=1';
  const params = [];

  if (filters.sprint) {
    sql += ' AND sprint LIKE ?';
    params.push(`%${filters.sprint}%`);
  }

  if (filters.prioridad) {
    sql += ' AND prioridad = ?';
    params.push(filters.prioridad);
  }

  if (filters.estado) {
    sql += ' AND estado = ?';
    params.push(filters.estado);
  }

  if (filters.modulo) {
    sql += ' AND modulo = ?';
    params.push(filters.modulo);
  }

  if (filters.asignado_a) {
    sql += ' AND asignado_a = ?';
    params.push(filters.asignado_a);
  }

  if (filters.categoria) {
    sql += ' AND categoria = ?';
    params.push(filters.categoria);
  }

  sql += ' ORDER BY sprint';

  return runQuery(sql, params);
}

// ============================================================================
// QUERIES: STATISTICS
// ============================================================================

async function getStatistics() {
  const [totalBugs, totalSprints, critical, pending, summary, bugStats, tcStats] = await Promise.all([
    getTotalBugs(),
    getTotalSprints(),
    getCriticalBugs(),
    // pending: bugs que están pendientes de resolver (encontrados pero não cerrados)
    runScalar("SELECT COUNT(*) as count FROM bugs_detail WHERE estado IN ('To Do', 'In Development' ,'Ready for Testing')"),
    getBugsSummary(),
    // vistas nuevas
    runScalar('SELECT * FROM vw_bug_resolution_stats'),
      runScalar('SELECT * FROM vw_testcase_stats')
  ]);

  const summaryRow = (summary && summary[0]) ? summary[0] : {};

  // Normalize and return camelCase keys expected by the processor
  return {
    totalBugs: totalBugs,
    totalSprints: totalSprints,
    criticalBugs: critical[0]?.count || summaryRow.critical || 0,
    pendingBugs: pending?.count || summaryRow.pending || 0,
    // Use resolution stats when available
    bugsClosed: (bugStats && bugStats.bugs_closed !== undefined) ? bugStats.bugs_closed : (summaryRow.resolved || 0),
    productionBugs: (bugStats && bugStats.production_bugs !== undefined) ? bugStats.production_bugs : 0,
    // Test case estimations: prefer values from summary if present, fallback to testcase view values (normalized to integers)
    testCasesTotal: (typeof summaryRow.testCasesTotal === 'number' && summaryRow.testCasesTotal >= 0)
      ? summaryRow.testCasesTotal
      : (tcStats && tcStats.total_records !== undefined) ? Number(tcStats.total_records) : 0,
    testCasesExecuted: (typeof summaryRow.testCasesExecuted === 'number' && summaryRow.testCasesExecuted >= 0)
      ? summaryRow.testCasesExecuted
      : (tcStats && tcStats.testcases_with_type !== undefined) ? Number(tcStats.testcases_with_type) : 0,
    // keep raw summary data for compatibility
    summaryRaw: summaryRow
  };
}

// ============================================================================
// QUERIES: DATA SOURCE METADATA
// ============================================================================

async function recordDataSourceMetadata(sourceFileName, sourceFilePath, fileSize, totalBugs, totalSprints, notes = '') {
  try {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO data_source_metadata 
        (source_file_name, source_file_path, source_file_size, total_bugs_loaded, total_sprints_loaded, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      getDatabase().run(
        sql,
        [sourceFileName, sourceFilePath, fileSize, totalBugs, totalSprints, 'success', notes],
        (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  } catch (error) {
    console.error('Error recording metadata:', error);
    throw error;
  }
}

async function getLatestDataSourceMetadata() {
  return runScalar(`
    SELECT * FROM data_source_metadata 
    ORDER BY load_timestamp DESC 
    LIMIT 1
  `);
}

async function getAllDataSourceMetadata() {
  return runQuery(`
    SELECT * FROM data_source_metadata 
    ORDER BY load_timestamp DESC
  `);
}

async function getDataSourceInfo() {
  const latest = await getLatestDataSourceMetadata();
  if (latest) {
    return {
      sourceFileName: latest.source_file_name,
      sourceFilePath: latest.source_file_path,
      fileSizeBytes: latest.source_file_size,
      fileSizeKB: latest.source_file_size ? (latest.source_file_size / 1024).toFixed(2) : null,
      loadedAt: latest.load_timestamp,
      totalBugsLoaded: latest.total_bugs_loaded,
      totalSprintsLoaded: latest.total_sprints_loaded,
      status: latest.status,
      notes: latest.notes
    };
  }
  return null;
}

// ============================================================================
// QUERIES: TEAM ANALYSIS (from bugs_detail)
// ============================================================================

async function getDevelopersAnalysis() {
  // Prefer developers_summary (sheet "BUGS X DESARROLLADOR") as source of truth
  return runQuery(`
    SELECT 
      developer_name,
      total_bugs,
      tareas_por_hacer as pending,
      en_curso as in_progress,
      code_review,
      ready_for_testing,
      ready_for_uat,
      blocked,
      cancelado as canceled,
      ROUND(((total_bugs - tareas_por_hacer) * 100.0 / NULLIF(total_bugs, 0)), 2) as efficiency_percentage,
      CASE 
        WHEN tareas_por_hacer > 15 THEN 'Alto'
        WHEN tareas_por_hacer > 8 THEN 'Medio'
        ELSE 'Bajo'
      END as workload_level
    FROM developers_summary
    WHERE total_bugs > 0
    ORDER BY total_bugs DESC
  `);
}

async function getDeveloperByName(devName) {
  return runScalar(
    `SELECT 
      developer_name,
      total_bugs,
      tareas_por_hacer as pending,
      en_curso as in_progress,
      code_review,
      ready_for_testing,
      ready_for_uat,
      blocked,
      cancelado as canceled,
      ROUND(((total_bugs - tareas_por_hacer) * 100.0 / NULLIF(total_bugs, 0)), 2) as efficiency_percentage,
      CASE WHEN tareas_por_hacer > 15 THEN 'Alto' WHEN tareas_por_hacer > 8 THEN 'Medio' ELSE 'Bajo' END as workload_level
    FROM developers_summary WHERE developer_name = ? LIMIT 1`,
    [devName]
  );
}

async function getTeamSummary() {
  return runScalar(`
    SELECT 
      COUNT(DISTINCT asignado_a) as total_developers,
      SUM(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' THEN 1 ELSE 0 END) as total_assigned_bugs,
      SUM(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' AND estado = 'To Do' THEN 1 ELSE 0 END) as total_pending_assigned
    FROM bugs_detail
  `);
}

// ============================================================================
// QUERIES: TEST CASES METRICS (from vw_testcases_summary view)
// ============================================================================

async function getTestCasesMetrics() {
  return runScalar(`
    SELECT 
      total_test_cases as testCasesTotal,
      executed_testcases as testCasesExecuted,
      closed_by_latest_exec as testCasesClosed,
      pending_testcases as testCasesPending,
      execution_efficiency_pct as testCasesEfficiency
    FROM vw_testcases_execution_summary
  `);
}

async function getTestCasesDesigned() {
  return runScalar(`
    SELECT COUNT(DISTINCT clave_incidencia) as count
    FROM bugs_detail
    WHERE tipo_incidencia = 'Test Case'
  `);
}

async function getTestCasesBySprint2024() {
  return runQuery(`
    SELECT
      CASE UPPER(SUBSTR(sprint, 1, 3))
        WHEN 'JAN' THEN '01' WHEN 'FEB' THEN '02' WHEN 'MAR' THEN '03'
        WHEN 'APR' THEN '04' WHEN 'MAY' THEN '05' WHEN 'JUN' THEN '06'
        WHEN 'JUL' THEN '07' WHEN 'AUG' THEN '08' WHEN 'SEP' THEN '09'
        WHEN 'OCT' THEN '10' WHEN 'NOV' THEN '11' WHEN 'DEC' THEN '12'
        ELSE '00' END || '-' || SUBSTR(sprint, INSTR(sprint, ' ') - 4, 4) as month_year,
      COUNT(DISTINCT clave_incidencia) as total_cases,
      SUM(CASE WHEN estado IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as executed_cases,
      SUM(CASE WHEN estado IN ('Pass') THEN 1 ELSE 0 END) as passed_cases,
      SUM(CASE WHEN estado IN ('Fail') THEN 1 ELSE 0 END) as failed_cases,
      SUM(CASE WHEN estado NOT IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as pending_cases
    FROM vw_testcase_latest_execution
    GROUP BY month_year
    ORDER BY month_year
  `);
}

async function getTestCasesExecutionRate() {
  // Opción B: Casos diseñados vs casos cuya ÚLTIMA ejecución es diferente a 'Not Executed'
  // Esto evita contar casos que aparecen en ambas categorías (conflictivos)
  return runScalar(`
    SELECT 
      (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = 'Test Case') as total_designed,
      (SELECT COUNT(DISTINCT clave_incidencia) FROM bugs_detail WHERE tipo_incidencia = 'Test Case' AND estado = 'Not Executed') as total_never_executed
  `);
}

// Get test case reuse: cases with more than 1 execution
async function getTestCasesReuse() {
  return runScalar(`
    WITH execution_counts AS (
      SELECT 
        clave_incidencia,
        COUNT(*) as total_records,
        SUM(CASE WHEN estado != 'Not Executed' THEN 1 ELSE 0 END) as execution_count
      FROM bugs_detail 
      WHERE tipo_incidencia = 'Test Case'
      GROUP BY clave_incidencia
    )
    SELECT 
      COUNT(*) as total_cases,
      SUM(CASE WHEN execution_count >= 2 THEN 1 ELSE 0 END) as cases_reused,
      SUM(CASE WHEN execution_count = 1 THEN 1 ELSE 0 END) as cases_used,
      SUM(CASE WHEN execution_count = 0 THEN 1 ELSE 0 END) as cases_not_used
    FROM execution_counts
  `);
}

// Get bug resolution status (which bugs that failed have been fixed)
async function getBugResolutionStatus() {
  return runQuery('SELECT * FROM vw_bug_resolution_status');
}

// Get execution summary (total executions and breakdown by state)
async function getExecutionSummary() {
  return runScalar('SELECT * FROM vw_execution_summary');
}

// ============================================================================
// EXPORTS
// ============================================================================

const DAL = {
    async getFullQAData() {
      // Resumen general
      const summary = await DAL.getStatistics();
      // Bugs por prioridad - convertir array a objeto indexado
      const bugsByPriorityArray = await DAL.getBugsByPriority();
      const bugsByPriority = {};
      bugsByPriorityArray.forEach(row => {
        bugsByPriority[row.prioridad] = {
          count: row.count,
          pending: row.pending,
          canceled: row.canceled,
          resolved: row.resolved
        };
      });
      // Bugs por módulo
      const bugsByModule = await DAL.getBugsByModule();
      // Bugs por categoría
      const bugsByCategory = await DAL.getBugsByCategory();
      // Datos de desarrolladores
      const developerData = await DAL.getDevelopersAnalysis();
      
      // ========== TEST CASES METRICS (NEW) ==========
      // Obtener el valor correcto de test cases desde la vista
      const testCasesMetrics = await DAL.getTestCasesMetrics();
      const testCasesDesigned = await DAL.getTestCasesDesigned();
      const testCasesBySprintRaw = await DAL.getTestCasesBySprint2024();
      const testCasesExecutionRate = await DAL.getTestCasesExecutionRate();
      const testCasesReuseData = await DAL.getTestCasesReuse();
      
      // ========== BUG RESOLUTION STATUS (NEW) ==========
      // Obtener estado de resolución de bugs
      const bugResolutionRaw = await DAL.getBugResolutionStatus();
      const bugResolutionByPriority = {};
      if (bugResolutionRaw && bugResolutionRaw.length > 0) {
        bugResolutionRaw.forEach(row => {
          bugResolutionByPriority[row.prioridad] = {
            totalWithFail: row.total_bugs_with_fail,
            fixedAndVerified: row.fixed_and_verified,
            stillFailing: row.still_failing,
            inProgressFix: row.in_progress_fix || 0
          };
        });
      }
      
      // ========== EXECUTION SUMMARY (NEW) ==========
      // Obtener resumen de ejecuciones por estado
      const executionSummary = await DAL.getExecutionSummary();
      
      // Agregar test cases metrics al summary
      if (testCasesMetrics) {
        summary.testCasesTotal = testCasesMetrics.testCasesTotal || 0;
        summary.testCasesExecuted = testCasesMetrics.testCasesExecuted || 0;
        summary.testCasesClosed = testCasesMetrics.testCasesClosed || 0;
        summary.testCasesPending = testCasesMetrics.testCasesPending || 0;
        summary.testCasesEfficiency = testCasesMetrics.testCasesEfficiency || 0;
      } else if (testCasesDesigned) {
        // Fallback: usar COUNT(DISTINCT clave_incidencia)
        summary.testCasesTotal = testCasesDesigned.count || 0;
      }
      
      // Agregar execution rate de test cases al summary (Opción B)
      if (testCasesExecutionRate) {
        const total_designed = testCasesExecutionRate.total_designed || 0;
        const total_never_executed = testCasesExecutionRate.total_never_executed || 0;
        const total_executed = total_designed - total_never_executed;
        
        summary.testCasesExecutionRate = total_designed > 0 
          ? Math.round((total_executed / total_designed) * 100)
          : 0;
        summary.testCasesWithExecutions = total_executed;
        summary.testCasesWithoutExecutions = total_never_executed;
      }
      
      // Agregar test case reuse metrics al summary (>=2 execution = reuse, =1 = used, 0 = not used)
      if (testCasesReuseData) {
        const total_cases = testCasesReuseData.total_cases || 0;
        const reused_cases = testCasesReuseData.cases_reused || 0;
        const used_cases = testCasesReuseData.cases_used || 0;
        const not_used_cases = testCasesReuseData.cases_not_used || 0;
        
        summary.testCasesTotal = total_cases;
        summary.testCasesReused = reused_cases;      // >= 2 executions
        summary.testCasesUsed = used_cases;          // = 1 execution
        summary.testCasesNotUsed = not_used_cases;   // 0 executions
        
        const reusedRate = total_cases > 0 ? Math.round((reused_cases / total_cases) * 100) : 0;
        const usedRate = total_cases > 0 ? Math.round((used_cases / total_cases) * 100) : 0;
        const notUsedRate = total_cases > 0 ? Math.round((not_used_cases / total_cases) * 100) : 0;
        
        summary.testCasesReusedRate = reusedRate;
        summary.testCasesUsedRate = usedRate;
        summary.testCasesNotUsedRate = notUsedRate;
      }
      
      // Datos por sprint para densidad (excluye sugerencias)
      const sprintDataRaw = await DAL.getBugsBySprint();
      const sprintData = sprintDataRaw.map(sprint => ({
        ...sprint,
        bugs: sprint.total  // Para densidad de hallazgos
      }));
      
      // ========== LEGACY TEST CASES (for backward compatibility) ==========
      // Datos por sprint para test cases (legacy)
      // - executed: rows with 'test' in resumen AND estado Done/Reviewed/Testing Complete/Approved for Release
      // - planned: rows with 'test' in resumen in any state
      const executedTestCasesRaw = await DAL.getTestCasesBySprint();
      const plannedTestCasesRaw = await DAL.getPlannedTestCasesBySprint();
      const executedMap = {};
      executedTestCasesRaw.forEach(r => {
        executedMap[(r.sprint || '').toString()] = r.executed_tests || 0;
      });
      const plannedMap = {};
      plannedTestCasesRaw.forEach(r => {
        plannedMap[(r.sprint || '').toString()] = r.total_tests || 0;
      });
      // Total planned test cases across all sprints
      const totalPlannedTests = Object.values(plannedMap).reduce((a, b) => a + (Number(b) || 0), 0);
      // Expose in summary as `testCasesPlanned` so frontend can read planned totals
      try { summary.testCasesPlanned = totalPlannedTests; } catch (e) { /* noop */ }
      
      // Build testCasesPerSprint from legacy data + new data
      const testCasesPerSprint = Array.from(new Set([
        ...executedTestCasesRaw.map(r => (r.sprint || '').toString()),
        ...plannedTestCasesRaw.map(r => (r.sprint || '').toString()),
        ...testCasesBySprintRaw.map(r => (r.month_year || '').toString())
      ])).map(sprintName => {
        const legacyExecuted = executedMap[sprintName] || 0;
        const legacyPlanned = plannedMap[sprintName] || 0;
        const newData = testCasesBySprintRaw.find(r => (r.month_year || '').toString() === sprintName) || {};
        
        // Prefer new data if available, fall back to legacy
        return {
          sprint: sprintName,
          sprint_num: (plannedTestCasesRaw.find(r => (r.sprint || '').toString() === sprintName) || executedTestCasesRaw.find(r => (r.sprint || '').toString() === sprintName) || {}).sprint_num || 0,
          testCases: newData.executed_cases || legacyExecuted || 0,
          testCasesExecuted: newData.executed_cases || legacyExecuted || 0,
          testCasesPlanned: newData.total_cases || legacyPlanned || 0
        };
      });
      
      // Bugs críticos pendientes por sprint
      const criticalBugsPendingRaw = await DAL.getCriticalBugsPendingBySprint();
      const criticalBugsPendingMap = {};
      criticalBugsPendingRaw.forEach(row => {
        criticalBugsPendingMap[row.sprint] = row.critical_pending || 0;
      });
      
      // Bugs críticos por sprint desglosados por estado
      const criticalBugsByStateRaw = await DAL.getCriticalBugsBySprintAndState();
      const criticalBugsByStateMap = {};
      criticalBugsByStateRaw.forEach(row => {
        criticalBugsByStateMap[row.sprint] = {
          tareasPorHacer: row.tareasPorHacer || 0,
          enProgreso: row.enProgreso || 0,
          reabierto: row.reabierto || 0
        };
      });
      
      // Asegurarse de incluir sprints que están en testCasesPerSprint pero no en sprintData
      const sprintNames = new Set(sprintData.map(s => (s.sprint || '').toString()));
      testCasesPerSprint.forEach(tc => {
        const name = (tc.sprint || '').toString();
        if (!sprintNames.has(name)) {
          sprintData.push({
            sprint: tc.sprint,
            sprint_num: tc.sprint_num || 0,
            total: 0,
            critical: 0,
            pending: 0,
            canceled: 0,
            bugs: 0
          });
          sprintNames.add(name);
        }
      });
      // Ordenar cronológicamente: convierte "MM-YYYY" → YYYYMM (número) para sort correcto cross-year
      const parseSprintKey = (sprint) => {
        const p = (sprint || '').split('-');
        return p.length === 2 ? parseInt(p[1], 10) * 100 + parseInt(p[0], 10) : 0;
      };
      sprintData.sort((a, b) => parseSprintKey(a.sprint) - parseSprintKey(b.sprint));

      // Enriquecer sprintData con testCases, criticalBugsPending y desglose por estado
      const enrichedSprintData = sprintData.map(sprint => {
        const testData = testCasesPerSprint.find(t => t.sprint === sprint.sprint);
        const stateData = criticalBugsByStateMap[sprint.sprint] || {
          tareasPorHacer: 0,
          enProgreso: 0,
          reabierto: 0
        };
        return {
          ...sprint,
          testCases: testData?.testCases || 0,
          testCasesExecuted: testData?.testCasesExecuted || 0,
          testCasesPlanned: testData?.testCasesPlanned || 0,
          criticalBugsPending: criticalBugsPendingMap[sprint.sprint] || 0,
          criticalBugsByState: stateData
        };
      });
      
      // Test cases por mes (para análisis de series de tiempo)
      const testCasesByMonthRaw = await DAL.getTestCasesByMonth();
      const testCasesByMonth = {};
      testCasesByMonthRaw.forEach(row => {
        testCasesByMonth[row.month_year] = {
          planned: row.planned_tests || 0,
          executed: row.executed_tests || 0
        };
      });
      
      // Bugs por fecha/mes (para análisis de series de tiempo)
      const bugsByDateRaw = await DAL.getBugsByDate();
      const bugsByDate = {};
      const bugsByMonthRaw = {};
      bugsByDateRaw.forEach(row => {
        bugsByDate[row.month_year] = row.count || 0;
        bugsByMonthRaw[row.month_year] = { count: row.count || 0 };
      });
      // Ordenar cronológicamente (YYYYMM) para preservar orden en el JSON
      const parseKey = k => { const p = (k||'').split('-'); return p.length===2 ? parseInt(p[1],10)*100+parseInt(p[0],10) : 0; };
      const bugsByMonth = Object.fromEntries(
        Object.entries(bugsByMonthRaw).sort((a, b) => parseKey(a[0]) - parseKey(b[0]))
      );
      
      // Bugs por mes y prioridad (para gráficas de tendencia)
      const bugsByMonthAndPriorityRaw = await DAL.getBugsByMonthAndPriority();
      const bugsByMonthByPriority = {};
      bugsByMonthAndPriorityRaw.forEach(row => {
        const month = row.month_year;
        if (!bugsByMonthByPriority[month]) {
          bugsByMonthByPriority[month] = {
            total: 0,
            critical: 0,  // High priority findings
            medium: 0,
            lowPriority: 0 // Low priority findings
          };
        }
        
        const priority = (row.prioridad || '').toLowerCase();
        const count = row.count || 0;
        bugsByMonthByPriority[month].total += count;
        
        // Agrupar en categorías: critical=High, medium=Medium, low=Low
        if (priority === 'high') {
          bugsByMonthByPriority[month].critical += count;
        } else if (priority === 'medium') {
          bugsByMonthByPriority[month].medium += count;
        } else if (priority === 'low') {
          bugsByMonthByPriority[month].lowPriority += count;
        }
      });
      // Ordenar cronológicamente
      const bugsByMonthByPrioritySorted = Object.fromEntries(
        Object.entries(bugsByMonthByPriority).sort((a, b) => parseKey(a[0]) - parseKey(b[0]))
      );
      
      // Execution Rate por mes (basado en bugs completados / total bugs)
      const executionRateRaw = await DAL.getExecutionRateByMonth();
      const executionRateByMonth = {};
      executionRateRaw.forEach(row => {
        const totalBugs = row.total_bugs || 0;
        const completedBugs = row.completed_bugs || 0;
        const rate = totalBugs > 0 ? Math.round((completedBugs / totalBugs) * 100) : 0;
        executionRateByMonth[row.month_year] = {
          total: totalBugs,
          completed: completedBugs,
          rate: rate
        };
      });
      
      // Resolution Time Analysis
      const resolutionTimeData = await getResolutionTimeAnalysis();

      // Testers / Reportado data
      const testerData = await getTestersSummaryWithProducts();
      
      // Metadata
      const metadata = await DAL.getDataSourceInfo();
      return {
        summary,
        bugsByPriority,
        bugsByModule,
        bugsByCategory,
        developerData,
        testerData,
        sprintData: enrichedSprintData,
        testCasesByMonth,
        bugsByDate,
        bugsByMonth,
        bugsByMonthByPriority: bugsByMonthByPrioritySorted,
        executionRateByMonth,
        bugResolutionByPriority,
        executionSummary,
        resolutionTimeData,
        metadata
      };
    },
  getDatabase,
  runQuery,
  runScalar,
  
  // Resumen
  getBugsSummary,
  getTotalBugs,
  getTotalSprints,
  getStatistics,
  
  // Por Sprint
  getBugsBySprint,
  getBugsBySprintIncludingSuggestions,
  getTestCasesBySprint,
  getPlannedTestCasesBySprint,
  getBugsBySprintAndStatus,
  getBugsBySprintNumber,
  getCriticalBugsPendingBySprint,
  getCriticalBugsBySprintAndState,
  
  // Por Desarrollador
  getBugsByDeveloper,
  getBugsByDeveloperName,
  
  // Por Prioridad
  getBugsByPriority,
  getCriticalBugs,
  
  // Por Módulo
  getBugsByModule,
  getDeveloperModulesSummary,
  
  // Por Categoría
  getBugsByCategory,
  
  // Por Fecha/Mes
  getBugsByDate,
  getBugsByMonthAndPriority,
  getTestCasesByMonth,
  getExecutionRateByMonth,
  
  // Test Cases Metrics (NEW)
  getTestCasesMetrics,
  getTestCasesDesigned,
  getTestCasesBySprint2024,
  getTestCasesExecutionRate,
  getTestCasesReuse,
  
  // Bug Resolution Status (NEW)
  getBugResolutionStatus,
  getExecutionSummary,
  
  // Detalles
  getBugDetail,
  getBugsByState,
  
  // Sprints
  getSprintInfo,
  getAllSprints,
  
  // Filtrado
  getBugsFiltered,
  
  // Metadata de origen de datos
  recordDataSourceMetadata,
  getLatestDataSourceMetadata,
  getAllDataSourceMetadata,
  getDataSourceInfo,
  
  // Team analysis
  getDevelopersAnalysis,
  getDeveloperByName,
  getTeamSummary,
  
  // Resolution time analysis
  getResolutionTimeAnalysis,
  
  // All bugs detail (for dashboards)
  getAllBugsDetail,
  
  // Testers summary (NEW)
  getTestersSummary,
  getTestersSummaryWithProducts,
  getTesterDetail,
  getAllTesters,
  
  // Dynamic filter values (NEW)
  getAllProducts,
  getAllTestTypes,
  getAllAttributes,
  getAllTestLevels,
  getAllAmbientes,
  getAllPriorities,
  getAllStatus,
  getAllYearMonths,
  getLeakRateByProduct,

  /**
   * getFilterOptions({ product, priority, status, testType, attribute, testLevel, ambiente })
   * Faceted / cascading filter options.
   * For each dimension, available values are computed from ALL OTHER active filters
   * (not the dimension's own filter), so users can always change any individual filter.
   */
  getFilterOptions: async function({ product = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = {}) {
    // Helper: build conditions excluding one dimension
    const buildConds = (exclude) => {
      const c = [], p = [];
      if (exclude !== 'product'   && product)   { c.push('tag0 = ?');          p.push(product); }
      if (exclude !== 'priority'  && priority)  { c.push('prioridad = ?');      p.push(priority); }
      if (exclude !== 'status'    && status)    { c.push('estado = ?');         p.push(status); }
      if (exclude !== 'testType'  && testType)  { c.push('tipo_prueba = ?');    p.push(testType); }
      if (exclude !== 'attribute' && attribute) { c.push('atributo = ?');       p.push(attribute); }
      if (exclude !== 'testLevel' && testLevel) { c.push('nivel_prueba = ?');   p.push(testLevel); }
      if (exclude !== 'ambiente'  && ambiente)  { c.push('ambiente = ?');       p.push(ambiente); }
      return { c, p };
    };

    const distinct = async (exclude, col) => {
      const { c, p } = buildConds(exclude);
      c.push(`${col} IS NOT NULL`, `${col} != ''`);
      const where = `WHERE ${c.join(' AND ')}`;
      const rows = await runQuery(
        `SELECT DISTINCT ${col} AS v FROM bugs_detail ${where} ORDER BY ${col}`,
        p
      );
      return rows.map(r => r.v);
    };

    try {
      const [products, priorities, statuses, testTypes, attributes, testLevels, ambientes] = await Promise.all([
        distinct('product',   'tag0'),
        distinct('priority',  'prioridad'),
        distinct('status',    'estado'),
        distinct('testType',  'tipo_prueba'),
        distinct('attribute', 'atributo'),
        distinct('testLevel', 'nivel_prueba'),
        distinct('ambiente',  'ambiente'),
      ]);
      return { products, priorities, statuses, testTypes, attributes, testLevels, ambientes };
    } catch (e) {
      console.error('\u274C getFilterOptions:', e.message);
      return { products: [], priorities: [], statuses: [], testTypes: [], attributes: [], testLevels: [], ambientes: [] };
    }
  },

  // Tag0 / product filtered queries (NEW)
  getBugsByMonthForTag0: async function(tag0) {
    try {
      const rows = await runQuery(
        `SELECT
          SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) AS month_year,
          COUNT(*) AS count
        FROM bugs_detail
        WHERE estado = 'Fail'
          AND fecha_reporte IS NOT NULL AND fecha_reporte != ''
          AND tag0 = ?
        GROUP BY month_year
        ORDER BY month_year ASC`,
        [tag0]
      );
      return rows;
    } catch (e) {
      console.error('\u274C getBugsByMonthForTag0:', e.message);
      return [];
    }
  },

  getTestCasesByMonthForTag0: async function(tag0) {
    try {
      const rows = await runQuery(
        `SELECT
          CASE UPPER(SUBSTR(sprint, 1, 3))
            WHEN 'JAN' THEN '01' WHEN 'FEB' THEN '02' WHEN 'MAR' THEN '03'
            WHEN 'APR' THEN '04' WHEN 'MAY' THEN '05' WHEN 'JUN' THEN '06'
            WHEN 'JUL' THEN '07' WHEN 'AUG' THEN '08' WHEN 'SEP' THEN '09'
            WHEN 'OCT' THEN '10' WHEN 'NOV' THEN '11' WHEN 'DEC' THEN '12'
            ELSE '00' END || '-' || SUBSTR(sprint, INSTR(sprint, ' ') - 4, 4) AS month_year,
          COUNT(DISTINCT clave_incidencia) AS planned_tests,
          COUNT(*) AS total_count,
          SUM(CASE WHEN estado = 'Pass'         THEN 1 ELSE 0 END) AS pass_count,
          SUM(CASE WHEN estado = 'Fail'         THEN 1 ELSE 0 END) AS fail_count,
          SUM(CASE WHEN estado = 'Not Executed' THEN 1 ELSE 0 END) AS not_executed_count,
          SUM(CASE WHEN estado = 'In Progress'  THEN 1 ELSE 0 END) AS in_progress_count,
          SUM(CASE WHEN estado = 'Blocked'      THEN 1 ELSE 0 END) AS blocked_count
        FROM bugs_detail
        WHERE tipo_incidencia = 'Test Case'
          AND sprint IS NOT NULL AND sprint != ''
          AND tag0 = ?
        GROUP BY month_year
        ORDER BY month_year ASC`,
        [tag0]
      );
      return rows;
    } catch (e) {
      console.error('\u274C getTestCasesByMonthForTag0:', e.message);
      return [];
    }
  },

  /**
   * getBugsMonthlyFiltered({ tag0, priority, status, testType, attribute, testLevel, ambiente })
   * Counts Fail bugs per month with optional filters.
   * If status is set to anything other than 'Fail', returns empty (no Fail bugs for other statuses).
   */
  getBugsMonthlyFiltered: async function({ tag0 = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = {}) {
    try {
      if (status && status !== 'Fail') return [];
      const conds = [`estado = 'Fail'`, `fecha_reporte IS NOT NULL`, `fecha_reporte != ''`];
      const params = [];
      if (tag0)      { conds.push(`tag0 = ?`);          params.push(tag0); }
      if (priority)  { conds.push(`prioridad = ?`);      params.push(priority); }
      if (testType)  { conds.push(`tipo_prueba = ?`);    params.push(testType); }
      if (attribute) { conds.push(`atributo = ?`);       params.push(attribute); }
      if (testLevel) { conds.push(`nivel_prueba = ?`);   params.push(testLevel); }
      if (ambiente)  { conds.push(`ambiente = ?`);       params.push(ambiente); }
      return await runQuery(
        `SELECT
          SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) AS month_year,
          COUNT(*) AS count
        FROM bugs_detail
        WHERE ${conds.join(' AND ')}
        GROUP BY month_year
        ORDER BY month_year ASC`,
        params
      );
    } catch (e) {
      console.error('\u274C getBugsMonthlyFiltered:', e.message);
      return [];
    }
  },

  /**
   * getTestCasesMonthlyFiltered({ tag0, priority, status, testType, attribute, testLevel, ambiente })
   * Returns test case monthly aggregates with optional filters.
   */
  getTestCasesMonthlyFiltered: async function({ tag0 = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = {}) {
    try {
      const conds = [`tipo_incidencia = 'Test Case'`, `sprint IS NOT NULL`, `sprint != ''`];
      const params = [];
      if (tag0)      { conds.push(`tag0 = ?`);          params.push(tag0); }
      if (priority)  { conds.push(`prioridad = ?`);      params.push(priority); }
      if (status)    { conds.push(`estado = ?`);         params.push(status); }
      if (testType)  { conds.push(`tipo_prueba = ?`);    params.push(testType); }
      if (attribute) { conds.push(`atributo = ?`);       params.push(attribute); }
      if (testLevel) { conds.push(`nivel_prueba = ?`);   params.push(testLevel); }
      if (ambiente)  { conds.push(`ambiente = ?`);       params.push(ambiente); }
      return await runQuery(
        `SELECT
          CASE UPPER(SUBSTR(sprint, 1, 3))
            WHEN 'JAN' THEN '01' WHEN 'FEB' THEN '02' WHEN 'MAR' THEN '03'
            WHEN 'APR' THEN '04' WHEN 'MAY' THEN '05' WHEN 'JUN' THEN '06'
            WHEN 'JUL' THEN '07' WHEN 'AUG' THEN '08' WHEN 'SEP' THEN '09'
            WHEN 'OCT' THEN '10' WHEN 'NOV' THEN '11' WHEN 'DEC' THEN '12'
            ELSE '00' END || '-' || SUBSTR(sprint, INSTR(sprint, ' ') - 4, 4) AS month_year,
          COUNT(DISTINCT clave_incidencia) AS planned_tests,
          COUNT(*) AS total_count,
          SUM(CASE WHEN estado = 'Pass'         THEN 1 ELSE 0 END) AS pass_count,
          SUM(CASE WHEN estado = 'Fail'         THEN 1 ELSE 0 END) AS fail_count,
          SUM(CASE WHEN estado = 'Not Executed' THEN 1 ELSE 0 END) AS not_executed_count,
          SUM(CASE WHEN estado = 'In Progress'  THEN 1 ELSE 0 END) AS in_progress_count,
          SUM(CASE WHEN estado = 'Blocked'      THEN 1 ELSE 0 END) AS blocked_count
        FROM bugs_detail
        WHERE ${conds.join(' AND ')}
        GROUP BY month_year
        ORDER BY month_year ASC`,
        params
      );
    } catch (e) {
      console.error('\u274C getTestCasesMonthlyFiltered:', e.message);
      return [];
    }
  },

  /**
   * getSummaryFiltered({ tag0, priority, status, testType, attribute, testLevel, ambiente })
   * Returns totalBugs, testCasesTotal, testCasesExecuted with optional filters.
   */
  getSummaryFiltered: async function({ tag0 = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = {}) {
    try {
      const extraConds = [];
      const extraParams = [];
      if (tag0)      { extraConds.push(`tag0 = ?`);          extraParams.push(tag0); }
      if (priority)  { extraConds.push(`prioridad = ?`);      extraParams.push(priority); }
      if (testType)  { extraConds.push(`tipo_prueba = ?`);    extraParams.push(testType); }
      if (attribute) { extraConds.push(`atributo = ?`);       extraParams.push(attribute); }
      if (testLevel) { extraConds.push(`nivel_prueba = ?`);   extraParams.push(testLevel); }
      if (ambiente)  { extraConds.push(`ambiente = ?`);       extraParams.push(ambiente); }
      const extraWhere = extraConds.length ? `AND ${extraConds.join(' AND ')}` : '';

      // Bug count: Fail bugs — if status filter is not Fail, result is 0
      const bugsPromise = (status && status !== 'Fail')
        ? Promise.resolve({ total: 0 })
        : runScalar(`SELECT COUNT(*) as total FROM bugs_detail WHERE estado = 'Fail' ${extraWhere}`, extraParams);

      // TC total: distinct test cases (no status restriction)
      const tcPromise = runScalar(
        `SELECT COUNT(DISTINCT clave_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case' ${extraWhere}`,
        extraParams
      );

      // TC executed
      let tcExecSQL, tcExecParams;
      if (status) {
        tcExecSQL = `SELECT COUNT(*) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case' AND estado = ? ${extraWhere}`;
        tcExecParams = [status, ...extraParams];
      } else {
        tcExecSQL = `SELECT COUNT(*) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case' AND estado IN ('Pass','Fail') ${extraWhere}`;
        tcExecParams = extraParams;
      }

      const [bugsRow, tcRow, tcExecRow] = await Promise.all([bugsPromise, tcPromise, runScalar(tcExecSQL, tcExecParams)]);
      return {
        totalBugs:          bugsRow?.total || 0,
        testCasesTotal:     tcRow?.total   || 0,
        testCasesExecuted:  tcExecRow?.total || 0,
      };
    } catch (e) {
      console.error('\u274C getSummaryFiltered:', e.message);
      return { totalBugs: 0, testCasesTotal: 0, testCasesExecuted: 0 };
    }
  },

  /**
   * getBugsByPriorityFiltered({ tag0, priority, status, testType, attribute, testLevel, ambiente })
   * Returns bugs (estado=Fail) grouped by prioridad, with optional filters.
   */
  getBugsByPriorityFiltered: async function({ tag0 = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = {}) {
    try {
      // Bugs KPI only counts Fail; if status filter is something else, return empty
      if (status && status !== 'Fail') return [];
      const conditions = [`estado = 'Fail'`];
      const params = [];
      if (tag0)      { conditions.push(`tag0 = ?`);          params.push(tag0); }
      if (priority)  { conditions.push(`prioridad = ?`);      params.push(priority); }
      if (testType)  { conditions.push(`tipo_prueba = ?`);    params.push(testType); }
      if (attribute) { conditions.push(`atributo = ?`);       params.push(attribute); }
      if (testLevel) { conditions.push(`nivel_prueba = ?`);   params.push(testLevel); }
      if (ambiente)  { conditions.push(`ambiente = ?`);       params.push(ambiente); }

      const where = `WHERE ${conditions.join(' AND ')}`;
      const rows = await runQuery(
        `SELECT
          prioridad,
          COUNT(*) AS count,
          SUM(CASE WHEN estado IN ('To Do', 'In Development', 'Ready for Testing') THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN estado = 'Resolved' THEN 1 ELSE 0 END) AS canceled,
          SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) AS resolved
        FROM bugs_detail
        ${where}
        GROUP BY prioridad
        ORDER BY prioridad`,
        params
      );
      return rows;
    } catch (e) {
      console.error('\u274C getBugsByPriorityFiltered:', e.message);
      return [];
    }
  },

  /**
   * getTestersSummaryFiltered({ tag0, fromMonth, toMonth, priority, status, testType, attribute, testLevel, ambiente })
   * Like getTestersSummaryWithProducts but filtered by all available filters.
   * fromMonth / toMonth format: 'MM-YYYY'
   */
  getTestersSummaryFiltered: async function({ tag0 = '', fromMonth = '', toMonth = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = {}) {
    try {
      const toYYYYMM = (mk) => {
        if (!mk) return null;
        const p = mk.split('-');
        return p.length === 2 ? `${p[1]}-${p[0].padStart(2, '0')}` : null;
      };
      const fromVal = toYYYYMM(fromMonth);
      const toVal   = toYYYYMM(toMonth);

      const dateExpr = `SUBSTR(fecha_reporte, -4) || '-' || SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2)`;

      const conditions = [`reportado_por IS NOT NULL`, `reportado_por != ''`];
      const params = [];

      if (tag0)      { conditions.push(`tag0 = ?`);          params.push(tag0); }
      if (fromVal)   { conditions.push(`(${dateExpr}) >= ?`); params.push(fromVal); }
      if (toVal)     { conditions.push(`(${dateExpr}) <= ?`); params.push(toVal); }
      if (priority)  { conditions.push(`prioridad = ?`);      params.push(priority); }
      if (status)    { conditions.push(`estado = ?`);         params.push(status); }
      if (testType)  { conditions.push(`tipo_prueba = ?`);    params.push(testType); }
      if (attribute) { conditions.push(`atributo = ?`);       params.push(attribute); }
      if (testLevel) { conditions.push(`nivel_prueba = ?`);   params.push(testLevel); }
      if (ambiente)  { conditions.push(`ambiente = ?`);       params.push(ambiente); }

      const where = conditions.join(' AND ');
      const sql = `
        SELECT
          reportado_por as tester,
          COUNT(*) as total_bugs,
          SUM(CASE WHEN estado = 'Pass'         THEN 1 ELSE 0 END) as passed,
          SUM(CASE WHEN estado = 'Fail'         THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN estado = 'Not Executed' THEN 1 ELSE 0 END) as not_executed,
          SUM(CASE WHEN estado = 'In Progress'  THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN estado = 'Blocked'      THEN 1 ELSE 0 END) as blocked,
          COUNT(DISTINCT sprint)     as sprints_involved,
          COUNT(DISTINCT atributo)   as modules_tested,
          COUNT(DISTINCT tipo_prueba) as test_types
        FROM bugs_detail
        WHERE ${where}
        GROUP BY reportado_por
        ORDER BY total_bugs DESC
      `;

      let results = await runQuery(sql, params);

      // Attach distinct products per tester (respecting tag0 filter)
      if (results && results.length > 0) {
        const prodConditions = [`reportado_por = ?`, `tag0 IS NOT NULL`, `tag0 != ''`];
        const prodBaseParams = [];
        if (tag0)      { prodConditions.push(`tag0 = ?`);          prodBaseParams.push(tag0); }
        if (fromVal)   { prodConditions.push(`(${dateExpr}) >= ?`); prodBaseParams.push(fromVal); }
        if (toVal)     { prodConditions.push(`(${dateExpr}) <= ?`); prodBaseParams.push(toVal); }
        if (testType)  { prodConditions.push(`tipo_prueba = ?`);    prodBaseParams.push(testType); }
        if (attribute) { prodConditions.push(`atributo = ?`);       prodBaseParams.push(attribute); }
        if (testLevel) { prodConditions.push(`nivel_prueba = ?`);   prodBaseParams.push(testLevel); }
        if (ambiente)  { prodConditions.push(`ambiente = ?`);       prodBaseParams.push(ambiente); }

        for (const tester of results) {
          const productsRes = await runQuery(
            `SELECT DISTINCT tag0 FROM bugs_detail WHERE ${prodConditions.join(' AND ')} ORDER BY tag0`,
            [tester.tester, ...prodBaseParams]
          );
          tester.products = productsRes.map(p => p.tag0).join(', ');
        }
      }

      return results;
    } catch (e) {
      console.error('\u274C getTestersSummaryFiltered:', e.message);
      return [];
    }
  },

  getSummaryForTag0: async function(tag0) {
    try {
      const [bugsRow, tcRow, tcExecRow] = await Promise.all([
        runScalar(`SELECT COUNT(*) as total FROM bugs_detail WHERE estado = 'Fail' AND tag0 = ?`, [tag0]),
        runScalar(`SELECT COUNT(DISTINCT clave_incidencia) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case' AND tag0 = ?`, [tag0]),
        runScalar(`SELECT COUNT(*) as total FROM bugs_detail WHERE tipo_incidencia = 'Test Case' AND estado IN ('Pass','Fail') AND tag0 = ?`, [tag0]),
      ]);
      return {
        totalBugs: bugsRow?.total || 0,
        testCasesTotal: tcRow?.total || 0,
        testCasesExecuted: tcExecRow?.total || 0,
      };
    } catch (e) {
      console.error('\u274C getSummaryForTag0:', e.message);
      return { totalBugs: 0, testCasesTotal: 0, testCasesExecuted: 0 };
    }
  },

  /**
   * getResolutionTimeAnalysisFiltered({ tag0, fromMonth, toMonth })
   * Like getResolutionTimeAnalysis() but supports filtering by tag0 and/or month range.
   * fromMonth / toMonth format: 'MM-YYYY' (e.g. '08-2025')
   */
  getResolutionTimeAnalysisFiltered: async function({ tag0 = '', fromMonth = '', toMonth = '' } = {}) {
    try {
      const csvPath = path.join(__dirname, '../../data/MockDataV0.csv');
      if (!fs.existsSync(csvPath)) return null;

      // Convert 'MM-YYYY' to comparable integer YYYYMM
      const toInt = (mk) => {
        if (!mk) return null;
        const p = mk.split('-');
        return p.length === 2 ? parseInt(p[1], 10) * 100 + parseInt(p[0], 10) : null;
      };
      const fromVal = toInt(fromMonth);
      const toVal   = toInt(toMonth);

      // Convert CSV date 'DD/MM/YYYY' to month key 'MM-YYYY'
      const csvDateToMonthKey = (d) => {
        if (!d) return null;
        const p = d.split('/');
        if (p.length !== 3) return null;
        return p[1].padStart(2, '0') + '-' + p[2];
      };

      const inRange = (dateStr) => {
        const mk = csvDateToMonthKey(dateStr);
        if (!mk) return false;
        const v = toInt(mk);
        if (fromVal !== null && v < fromVal) return false;
        if (toVal   !== null && v > toVal)   return false;
        return true;
      };

      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');
      const byKey = {};
      let totalFailureRecords = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('Fail') && !line.includes('Pass')) continue;
        let fullRow = line;
        while ((fullRow.match(/"/g) || []).length % 2 !== 0 && i + 1 < lines.length) {
          i++;
          fullRow += '\n' + lines[i];
        }
        const parts = parseCSVRow(fullRow);
        const clave       = parts[1]?.trim();
        const estado      = parts[6]?.trim();
        const fechaRep    = parts[17]?.trim();
        const prioridad   = parts[5]?.trim();
        const nivelPrueba = parts[10]?.trim();
        const rowTag0     = parts[11]?.trim();
        const tag1        = parts[12]?.trim();
        const tag2        = parts[13]?.trim();

        // Apply tag0 filter
        if (tag0 && rowTag0 !== tag0) continue;

        // Apply date range filter (based on fechaReporte)
        if ((fromMonth || toMonth) && !inRange(fechaRep)) continue;

        if (estado === 'Fail') totalFailureRecords++;

        if (clave && estado) {
          if (!byKey[clave]) {
            byKey[clave] = { fail: 0, pass: 0, estados: [], failDates: [], passDates: [], prioridad, nivelPrueba, tag0: rowTag0, tag1, tag2 };
          }
          if (estado === 'Fail') {
            byKey[clave].fail++;
            if (fechaRep) byKey[clave].failDates.push(fechaRep);
          } else if (estado === 'Pass') {
            byKey[clave].pass++;
            if (fechaRep) byKey[clave].passDates.push(fechaRep);
          }
          byKey[clave].estados.push(estado);
        }
      }

      if (totalFailureRecords === 0) return null;

      let resolvedCount = 0, pendingCount = 0, resolvedCasesCount = 0, pendingCasesCount = 0;
      Object.values(byKey).forEach(d => {
        if (!d.fail) return;
        if (d.pass > 0) { resolvedCount += d.fail; resolvedCasesCount++; }
        else            { pendingCount  += d.fail; pendingCasesCount++;  }
      });

      const resolutionRate = totalFailureRecords > 0
        ? Math.round((resolvedCount / totalFailureRecords) * 100) : 0;

      const parseDate = (s) => {
        if (!s) return null;
        const [d, m, y] = s.split('/').map(Number);
        return (!d || !m || !y) ? null : new Date(y, m - 1, d);
      };
      const daysDiff = (s1, s2) => {
        const a = parseDate(s1), b = parseDate(s2);
        if (!a || !b) return null;
        return Math.ceil(Math.abs(b - a) / 86400000);
      };

      const resolutionTimes = [];
      const unresolvedCasesDetail = [];

      Object.entries(byKey).forEach(([clave, d]) => {
        if (!d.fail) return;
        if (d.pass > 0 && d.failDates.length > 0 && d.passDates.length > 0) {
          const diff = daysDiff(d.failDates.sort()[0], d.passDates.sort()[d.passDates.length - 1]);
          if (diff !== null && diff >= 0) resolutionTimes.push(diff);
        } else {
          let sc = 0;
          for (let i = 1; i < d.estados.length; i++) if (d.estados[i] !== d.estados[i-1]) sc++;
          unresolvedCasesDetail.push({ clave, failCount: d.fail, stateChanges: sc, prioridad: d.prioridad||'', nivelPrueba: d.nivelPrueba||'', tag0: d.tag0||'', tag1: d.tag1||'', tag2: d.tag2||'' });
        }
      });

      let average = 0, minimum = 0, maximum = 0, median = 0;
      const distribution = { same_day:{count:0,percentage:0}, one_to_seven:{count:0,percentage:0}, eight_to_fourteen:{count:0,percentage:0}, fifteen_to_thirty:{count:0,percentage:0}, over_thirty:{count:0,percentage:0} };

      if (resolutionTimes.length > 0) {
        average = Math.round((resolutionTimes.reduce((a,b)=>a+b,0)/resolutionTimes.length)*10)/10;
        minimum = Math.min(...resolutionTimes);
        maximum = Math.max(...resolutionTimes);
        const sorted = [...resolutionTimes].sort((a,b)=>a-b);
        median = sorted.length % 2 === 0
          ? (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2
          : sorted[Math.floor(sorted.length/2)];
        median = Math.round(median*10)/10;
        resolutionTimes.forEach(days => {
          const k = days===0?'same_day':days<=7?'one_to_seven':days<=14?'eight_to_fourteen':days<=30?'fifteen_to_thirty':'over_thirty';
          distribution[k].count++;
        });
        Object.keys(distribution).forEach(k => {
          distribution[k].percentage = Math.round((distribution[k].count/resolutionTimes.length)*100);
        });
      }

      return {
        totalFailureRecords, totalUniqueTestCases: Object.keys(byKey).length,
        resolvedRecords: resolvedCount, openRecords: pendingCount,
        resolvedTestCases: resolvedCasesCount, openTestCases: pendingCasesCount,
        resolutionRate, casesWithOnlyOneExecution:0, casesWithMultipleExecutions:0,
        resolvedCount: resolvedCasesCount, pendingCount: pendingCasesCount, unresolvedSingle:0,
        count: resolutionTimes.length, average, minimum, maximum, median, distribution,
        pendingCases: unresolvedCasesDetail.sort((a,b)=>b.stateChanges-a.stateChanges||b.failCount-a.failCount).slice(0,10),
        unresolvedSingleCases: []
      };
    } catch (e) {
      console.error('\u274C getResolutionTimeAnalysisFiltered:', e.message);
      return null;
    }
  }
};
// ===== BELOW: CSV helpers (unchanged) =====

// Función auxiliar para parsear CSV respetando comillas
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Comilla escapada
        current += '"';
        i++; // Saltar siguiente comilla
      } else {
        // Toggle quotes
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Fin de campo
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Agregar último campo
  if (current || result.length > 0) {
    result.push(current.trim());
  }
  
  return result;
}

// Función para calcular resolution time desde CSV
async function getResolutionTimeAnalysis() {
  try {
    const csvPath = path.join(__dirname, '../../data/MockDataV0.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️ CSV no encontrado para análisis de resolution time');
      return null;
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Mapeo para rastrear qué registros pertenecen a qué clave
    const byKey = {};
    let totalFailureRecords = 0;
    let totalPassRecords = 0;
    let totalUniqueTestCases = 0;

    // Procesar líneas, manejando líneas multiline
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Optimización: buscar líneas que contengan Fail o Pass para acelerar
      if (line.includes('Fail') || line.includes('Pass')) {
        // Reconstruir la fila completa si es necesario (para multiline CSV)
        let fullRow = line;
        // Contar comillas para detectar si la fila está incompleta
        while ((fullRow.match(/"/g) || []).length % 2 !== 0 && i + 1 < lines.length) {
          i++;
          fullRow += '\n' + lines[i];
        }
        
        // Extraer clave, estado y fecha de la fila usando parser correcto
        const parts = parseCSVRow(fullRow);
        const clave = parts[1]?.trim();
        const estado = parts[6]?.trim(); // Columna "Estado" (Fail/Pass)
        const fechaReporte = parts[17]?.trim(); // Columna "Fecha Reporte"
        const prioridad = parts[5]?.trim(); // Columna "Prioridad"
        const nivelPrueba = parts[10]?.trim(); // Columna "Nivel de prueba"
        const tag0 = parts[11]?.trim(); // Columna "Tag0"
        const tag1 = parts[12]?.trim(); // Columna "Tag1"
        const tag2 = parts[13]?.trim(); // Columna "Tag2"
        
        if (estado === 'Fail') {
          totalFailureRecords++;
        } else if (estado === 'Pass') {
          totalPassRecords++;
        }
        
        if (clave && estado) {
          if (!byKey[clave]) {
            byKey[clave] = { fail: 0, pass: 0, estados: [], failDates: [], passDates: [], prioridad, nivelPrueba, tag0, tag1, tag2 };
            totalUniqueTestCases++;
          }
          if (estado === 'Fail') {
            byKey[clave].fail++;
            if (fechaReporte) byKey[clave].failDates.push(fechaReporte);
          }
          else if (estado === 'Pass') {
            byKey[clave].pass++;
            if (fechaReporte) byKey[clave].passDates.push(fechaReporte);
          }
          byKey[clave].estados.push(estado);
        }
      }
    }

    // Clasificar por estado (resueltos vs abiertos)
    let resolvedCount = 0;      // Registros Fail en casos resueltos
    let pendingCount = 0;       // Registros Fail en casos no resueltos
    let resolvedCasesCount = 0; // Número de CASOS ÚNICOS resueltos
    let pendingCasesCount = 0;  // Número de CASOS ÚNICOS no resueltos

    Object.entries(byKey).forEach(([clave, data]) => {
      if (data.fail === 0) return;
      
      if (data.pass > 0) {
        // Caso resuelto: tiene tanto Fail como Pass
        resolvedCount += data.fail;         // Suma registros
        resolvedCasesCount++;               // Cuenta casos únicos
      } else {
        // Caso abierto: solo tiene Fail
        pendingCount += data.fail;          // Suma registros
        pendingCasesCount++;                // Cuenta casos únicos
      }
    });

    const resolutionRate = totalFailureRecords > 0 
      ? Math.round((resolvedCount / totalFailureRecords) * 100) 
      : 0;
      
    // Ahora calcular resolution times para los casos resueltos (Fail → Pass)
    const resolutionTimes = [];
    const pendingCases = [];
    const unresolvedCasesDetail = [];

    // Función auxiliar para parsear fechas en formato DD/MM/YYYY
    function parseDate(dateStr) {
      if (!dateStr) return null;
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month || !year) return null;
      return new Date(year, month - 1, day);
    }

    // Función auxiliar para calcular diferencia en días
    function getDaysDifference(dateStr1, dateStr2) {
      const date1 = parseDate(dateStr1);
      const date2 = parseDate(dateStr2);
      if (!date1 || !date2) return null;
      const diffTime = Math.abs(date2 - date1);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    Object.entries(byKey).forEach(([clave, data]) => {
      if (data.fail === 0) return;
      
      // Si tiene Pass, calcular el tiempo
      if (data.pass > 0 && data.failDates.length > 0 && data.passDates.length > 0) {
        // Usar la primera fecha de Fail y la última fecha de Pass
        const firstFailDate = data.failDates.sort()[0];
        const lastPassDate = data.passDates.sort()[data.passDates.length - 1];
        const daysDiff = getDaysDifference(firstFailDate, lastPassDate);
        if (daysDiff !== null && daysDiff >= 0) {
          resolutionTimes.push(daysDiff);
        }
      } else {
        // Caso abierto - sin pasar a Pass
        // Calcular cambios de estado (transiciones entre Fail y Pass)
        let stateChanges = 0;
        for (let i = 1; i < data.estados.length; i++) {
          if (data.estados[i] !== data.estados[i - 1]) {
            stateChanges++;
          }
        }
        unresolvedCasesDetail.push({ 
          clave, 
          failCount: data.fail, 
          stateChanges,
          prioridad: data.prioridad || '',
          nivelPrueba: data.nivelPrueba || '',
          tag0: data.tag0 || '',
          tag1: data.tag1 || '',
          tag2: data.tag2 || ''
        });
      }
    });

    // Calcular estadísticas reales
    let average = 0, minimum = 0, maximum = 0, median = 0;
    const distribution = {
      same_day: { count: 0, percentage: 0 },
      one_to_seven: { count: 0, percentage: 0 },
      eight_to_fourteen: { count: 0, percentage: 0 },
      fifteen_to_thirty: { count: 0, percentage: 0 },
      over_thirty: { count: 0, percentage: 0 },
    };

    if (resolutionTimes.length > 0) {
      // Calcular average
      average = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
      average = Math.round(average * 10) / 10;

      // Calcular minimum y maximum
      minimum = Math.min(...resolutionTimes);
      maximum = Math.max(...resolutionTimes);

      // Calcular median
      const sorted = [...resolutionTimes].sort((a, b) => a - b);
      if (sorted.length % 2 === 0) {
        median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      } else {
        median = sorted[Math.floor(sorted.length / 2)];
      }
      median = Math.round(median * 10) / 10;

      // Clasificar en rangos
      resolutionTimes.forEach(days => {
        if (days === 0) {
          distribution.same_day.count++;
        } else if (days >= 1 && days <= 7) {
          distribution.one_to_seven.count++;
        } else if (days >= 8 && days <= 14) {
          distribution.eight_to_fourteen.count++;
        } else if (days >= 15 && days <= 30) {
          distribution.fifteen_to_thirty.count++;
        } else if (days > 30) {
          distribution.over_thirty.count++;
        }
      });

      // Calcular porcentajes
      Object.keys(distribution).forEach(key => {
        distribution[key].percentage = Math.round((distribution[key].count / resolutionTimes.length) * 100);
      });
    }

    if (totalFailureRecords === 0) {
      return null;
    }

    return {
      // 📊 DATA DE 296 REGISTROS FAIL
      totalFailureRecords: totalFailureRecords,      // 296 registros con estado=Fail
      totalUniqueTestCases: totalUniqueTestCases,     // 216 casos únicos con Fail
      resolvedRecords: resolvedCount,                 // 238 (80%) - tienen Fail→Pass
      openRecords: pendingCount,                      // 58 (20%) - solo Fail, sin Pass
      resolvedTestCases: resolvedCasesCount,         // CASOS ÚNICOS resueltos
      openTestCases: pendingCasesCount,              // CASOS ÚNICOS abiertos
      resolutionRate: resolutionRate,                 // Porcentaje resuelto
      
      // Legacy/Compatibility
      casesWithOnlyOneExecution: 0,
      casesWithMultipleExecutions: 0,
      resolvedCount: resolvedCasesCount,             // Usar casos únicos, no aproximación
      pendingCount: pendingCasesCount,                // Usar casos únicos abiertos
      unresolvedSingle: 0,
      
      // Estadísticas de tiempo CALCULADAS REALMENTE
      count: resolutionTimes.length,                  // Casos con tiempos calculables
      average: average,
      minimum: minimum,
      maximum: maximum,
      median: median,
      distribution: distribution,                     // Distribución real calculada
      
      pendingCases: unresolvedCasesDetail
        .sort((a, b) => {
          // Primero por cambios de estado (descendente)
          if (b.stateChanges !== a.stateChanges) {
            return b.stateChanges - a.stateChanges;
          }
          // Luego por número de fallos (descendente)
          return b.failCount - a.failCount;
        })
        .slice(0, 10),
      unresolvedSingleCases: []
    };
  } catch (error) {
    console.error('❌ Error en getResolutionTimeAnalysis:', error.message);
    return null;
  }
}

// ============================================================================
// GET ALL BUGS DETAIL - Para uso en dashboards requiere todos los registros
// ============================================================================

async function getAllBugsDetail() {
  try {
    return await runQuery('SELECT * FROM bugs_detail LIMIT 10000');
  } catch (error) {
    console.error('❌ Error en getAllBugsDetail:', error.message);
    return [];
  }
}

// ============================================================================
// QUERIES: TESTERS / REPORTADO_POR
// ============================================================================

async function getTestersSummary() {
  try {
    const sql = `
      SELECT 
        reportado_por as tester,
        COUNT(*) as total_bugs,
        SUM(CASE WHEN estado = 'Pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN estado = 'Not Executed' THEN 1 ELSE 0 END) as not_executed,
        SUM(CASE WHEN estado = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN estado = 'Blocked' THEN 1 ELSE 0 END) as blocked,
        COUNT(DISTINCT sprint) as sprints_involved,
        COUNT(DISTINCT atributo) as modules_tested,
        COUNT(DISTINCT tipo_prueba) as test_types
      FROM bugs_detail
      WHERE reportado_por IS NOT NULL AND reportado_por != ''
      GROUP BY reportado_por
      ORDER BY total_bugs DESC
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getTestersSummary:', error.message);
    return [];
  }
}

async function getTestersSummaryWithProducts() {
  try {
    const sql = `
      SELECT 
        reportado_por as tester,
        COUNT(*) as total_bugs,
        SUM(CASE WHEN estado = 'Pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN estado = 'Not Executed' THEN 1 ELSE 0 END) as not_executed,
        SUM(CASE WHEN estado = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN estado = 'Blocked' THEN 1 ELSE 0 END) as blocked,
        COUNT(DISTINCT sprint) as sprints_involved,
        COUNT(DISTINCT atributo) as modules_tested,
        COUNT(DISTINCT tipo_prueba) as test_types
      FROM bugs_detail
      WHERE reportado_por IS NOT NULL AND reportado_por != ''
      GROUP BY reportado_por
      ORDER BY total_bugs DESC
    `;
    
    let results = await runQuery(sql);
    
    if (results && results.length > 0) {
      for (let tester of results) {
        const productsRes = await runQuery(`
          SELECT DISTINCT tag0 FROM bugs_detail 
          WHERE reportado_por = ? AND tag0 IS NOT NULL AND tag0 != ''
          ORDER BY tag0
        `, [tester.tester]);
        tester.products = productsRes.map(p => p.tag0).join(', ');
      }
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error en getTestersSummaryWithProducts:', error.message);
    return [];
  }
}

async function getTesterDetail(testerName) {
  try {
    const sql = `
      SELECT *
      FROM bugs_detail
      WHERE reportado_por = ? AND reportado_por IS NOT NULL
      ORDER BY fecha_reporte DESC
    `;
    return await runQuery(sql, [testerName]);
  } catch (error) {
    console.error('❌ Error en getTesterDetail:', error.message);
    return [];
  }
}

async function getAllTesters() {
  try {
    const sql = `
      SELECT DISTINCT reportado_por as tester
      FROM bugs_detail
      WHERE reportado_por IS NOT NULL AND reportado_por != ''
      ORDER BY reportado_por
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllTesters:', error.message);
    return [];
  }
}

async function getLeakRateByProduct() {
  try {
    const sql = `
      SELECT 
        tag0 as product,
        COUNT(*) as total_tests,
        SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN estado = 'Pass' THEN 1 ELSE 0 END) as passed,
        ROUND(SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as leak_rate
      FROM bugs_detail
      WHERE tag0 IS NOT NULL AND tag0 != ''
      GROUP BY tag0
      ORDER BY failed DESC
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getLeakRateByProduct:', error.message);
    return [];
  }
}

async function getAllProducts() {
  try {
    const sql = `
      SELECT DISTINCT tag0 as product
      FROM bugs_detail
      WHERE tag0 IS NOT NULL AND tag0 != ''
      ORDER BY tag0
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllProducts:', error.message);
    return [];
  }
}

async function getAllTestTypes() {
  try {
    const sql = `
      SELECT DISTINCT tipo_prueba as test_type
      FROM bugs_detail
      WHERE tipo_prueba IS NOT NULL AND tipo_prueba != ''
      ORDER BY tipo_prueba
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllTestTypes:', error.message);
    return [];
  }
}

async function getAllAttributes() {
  try {
    const sql = `
      SELECT DISTINCT atributo as attribute
      FROM bugs_detail
      WHERE atributo IS NOT NULL AND atributo != ''
      ORDER BY atributo
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllAttributes:', error.message);
    return [];
  }
}

async function getAllTestLevels() {
  try {
    const sql = `
      SELECT DISTINCT nivel_prueba as test_level
      FROM bugs_detail
      WHERE nivel_prueba IS NOT NULL AND nivel_prueba != ''
      ORDER BY nivel_prueba
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllTestLevels:', error.message);
    return [];
  }
}

async function getAllAmbientes() {
  try {
    const sql = `
      SELECT DISTINCT ambiente
      FROM bugs_detail
      WHERE ambiente IS NOT NULL AND ambiente != ''
      ORDER BY ambiente
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllAmbientes:', error.message);
    return [];
  }
}

async function getAllPriorities() {
  try {
    const sql = `
      SELECT DISTINCT prioridad as priority
      FROM bugs_detail
      WHERE prioridad IS NOT NULL AND prioridad != ''
      ORDER BY prioridad
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllPriorities:', error.message);
    return [];
  }
}

async function getAllStatus() {
  try {
    const sql = `
      SELECT DISTINCT estado as status
      FROM bugs_detail
      WHERE estado IS NOT NULL AND estado != ''
      ORDER BY estado
    `;
    return await runQuery(sql);
  } catch (error) {
    console.error('❌ Error en getAllStatus:', error.message);
    return [];
  }
}

async function getAllYearMonths() {
  try {
    // Fetch all records and parse in JavaScript for flexibility with multiple date formats
    const sql = `
      SELECT DISTINCT fecha_reporte
      FROM bugs_detail
      WHERE fecha_reporte IS NOT NULL AND fecha_reporte != ''
      ORDER BY fecha_reporte DESC
    `;
    const rows = await runQuery(sql);
    const yearMonths = new Set();
    
    rows.forEach(row => {
      const fecha = row.fecha_reporte?.trim();
      if (!fecha) return;
      
      let yearMonth = null;
      
      // Try DD/MM/YYYY format (17/03/2025)
      const match1 = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match1) {
        const [, day, month, year] = match1;
        if (month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
          yearMonth = `${year}-${month.padStart(2, '0')}`;
        }
      }
      
      // Try YYYY-MM-DD format (2025-03-17)
      if (!yearMonth) {
        const match2 = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (match2) {
          const [, year, month, day] = match2;
          if (month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
            yearMonth = `${year}-${month.padStart(2, '0')}`;
          }
        }
      }
      
      // Try MM/DD/YYYY format (03/17/2025)
      if (!yearMonth) {
        const match3 = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match3) {
          const [, month, day, year] = match3;
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
            // Only treat as MM/DD/YYYY if month is > 12 would make it invalid as DD/MM
            if (day > 12) {
              yearMonth = `${year}-${month.padStart(2, '0')}`;
            }
          }
        }
      }
      
      if (yearMonth) {
        yearMonths.add(yearMonth);
      }
    });
    
    // Convert Set to array of objects and sort DESC
    return Array.from(yearMonths)
      .sort()
      .reverse()
      .map(ym => ({ yearMonth: ym }));
  } catch (error) {
    console.error('❌ Error en getAllYearMonths:', error.message);
    return [];
  }
}

export default DAL;

