-- ============================================================================
-- SCHEMA SQLite - QA Dashboard
-- Basado en estructura de datos cargados (bugs y versiones)
-- 
-- 3 TABLAS REALES + VISTAS PARA AGREGACIONES
-- ============================================================================

-- ============================================================================
-- TABLAS REALES (3)
-- ============================================================================

-- Tabla 1: SPRINTS_VERSIONES (de hoja "Versiones")
-- Contiene información de cada versión/sprint
-- Una versión puede ser prelim o intermedia de un sprint
CREATE TABLE IF NOT EXISTS sprints_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  sprint INTEGER NOT NULL,
  fecha TEXT,
  environment TEXT,
  test_plan TEXT,
  etiquetas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 2: BUGS_DETAIL (de hoja "Reporte_Gral")
-- Contiene detalles de cada bug/incidencia
-- Tabla maestra con 239 registros del Excel
CREATE TABLE IF NOT EXISTS bugs_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo_incidencia TEXT,
  clave_incidencia TEXT,
  id_incidencia TEXT,
  resumen TEXT,
  principal TEXT,
  clave_principal TEXT,
  parent_summary TEXT,
  prioridad TEXT,
  estado TEXT,
  sprint TEXT,
  modulo TEXT,
  categoria TEXT,
  asignado_a TEXT,
    tipo_prueba TEXT,
    atributo TEXT,
    nivel_prueba TEXT,
    tag0 TEXT,
    tag1 TEXT,
    tag2 TEXT,
    etapa_prueba TEXT,
    ambiente TEXT,
    reportado_por TEXT,
    fecha_reporte TEXT,
    version_correccion_1 TEXT,
    sprint_ultima_regresion TEXT,
    version_corregido TEXT,
    estrategia_ejecucion TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 3: AUDIT_LOG
-- Registro de cambios y auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT,
  table_name TEXT,
  operation TEXT,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla 4: DATA_SOURCE_METADATA
-- Metadatos sobre el origen y carga de datos
CREATE TABLE IF NOT EXISTS data_source_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_file_name TEXT NOT NULL,
  source_file_path TEXT,
  source_file_size INTEGER,
  load_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_bugs_loaded INTEGER,
  total_sprints_loaded INTEGER,
  status TEXT DEFAULT 'success',
  notes TEXT
);

-- Tabla 5: DEVELOPERS_SUMMARY
-- Resumen de desarrolladores y su carga de trabajo (desde "BUGS X DESARROLLADOR")
CREATE TABLE IF NOT EXISTS developers_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  developer_name TEXT NOT NULL UNIQUE,
  cancelado INTEGER DEFAULT 0,
  tareas_por_hacer INTEGER DEFAULT 0,
  code_review INTEGER DEFAULT 0,
  in_sit INTEGER DEFAULT 0,
  ready_for_testing INTEGER DEFAULT 0,
  ready_for_uat INTEGER DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  en_curso INTEGER DEFAULT 0,
  to_be_deployed_sit INTEGER DEFAULT 0,
  total_bugs INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZAR QUERIES
-- ============================================================================

-- Índices en bugs_detail
CREATE INDEX IF NOT EXISTS idx_bugs_sprint ON bugs_detail(sprint);
CREATE INDEX IF NOT EXISTS idx_bugs_prioridad ON bugs_detail(prioridad);
CREATE INDEX IF NOT EXISTS idx_bugs_estado ON bugs_detail(estado);
CREATE INDEX IF NOT EXISTS idx_bugs_modulo ON bugs_detail(modulo);
CREATE INDEX IF NOT EXISTS idx_bugs_asignado ON bugs_detail(asignado_a);
CREATE INDEX IF NOT EXISTS idx_bugs_categoria ON bugs_detail(categoria);
-- Índices para casos de prueba (Test Cases)
CREATE INDEX IF NOT EXISTS idx_bugs_clave_incidencia ON bugs_detail(clave_incidencia);
CREATE INDEX IF NOT EXISTS idx_bugs_id_incidencia ON bugs_detail(id_incidencia);
CREATE INDEX IF NOT EXISTS idx_bugs_tipo_incidencia ON bugs_detail(tipo_incidencia);

-- Índices en sprints_versions
CREATE INDEX IF NOT EXISTS idx_sprints_version ON sprints_versions(version);
CREATE INDEX IF NOT EXISTS idx_sprints_sprint ON sprints_versions(sprint);

-- Índices en developers_summary
CREATE INDEX IF NOT EXISTS idx_dev_name ON developers_summary(developer_name);
CREATE INDEX IF NOT EXISTS idx_dev_total ON developers_summary(total_bugs);

-- ============================================================================
-- VISTAS ÚTILES PARA QUERIES COMUNES (Agregaciones dinámicas)
-- ============================================================================

-- ============================================================================
-- VISTAS PARA CASOS DE PRUEBA (Test Cases)
-- La lógica: clave_incidencia es el caso, id_incidencia es la ejecución
-- Se usa la ÚLTIMA ejecución (por fecha en sprint) como resultado del caso
-- ============================================================================

-- Vista: Última ejecución de cada caso de prueba (válida para SQLite)
CREATE VIEW IF NOT EXISTS vw_testcase_latest_execution AS
SELECT 
  bd.clave_incidencia,
  bd.id_incidencia,
  bd.resumen,
  bd.prioridad,
  bd.estado,
  bd.sprint,
  bd.asignado_a,
  bd.atributo,
  bd.nivel_prueba,
  bd.ambiente,
  bd.fecha_reporte
FROM bugs_detail bd
WHERE bd.tipo_incidencia = 'Test Case'
  AND bd.clave_incidencia IS NOT NULL 
  AND bd.clave_incidencia != ''
  AND bd.id_incidencia = (
    SELECT bd2.id_incidencia 
    FROM bugs_detail bd2 
    WHERE bd2.clave_incidencia = bd.clave_incidencia
      AND bd2.tipo_incidencia = 'Test Case'
    ORDER BY CAST(SUBSTR(bd2.sprint, -10) AS TEXT) DESC
    LIMIT 1
  );

-- Vista: Casos de prueba única (agrupados, solo última ejecución)
CREATE VIEW IF NOT EXISTS vw_testcases_summary AS
SELECT 
  te.clave_incidencia as test_case_id,
  te.resumen,
  te.prioridad,
  te.estado as latest_execution_state,
  CASE 
    WHEN te.estado IN ('Pass', 'Fail') THEN 'Executed'
    WHEN te.estado IN ('Not Executed', 'In Progress', 'Blocked') THEN 'Pending'
    ELSE 'Unknown'
  END as latest_execution_status,
  te.sprint,
  te.asignado_a,
  te.atributo,
  te.nivel_prueba,
  te.ambiente,
  (SELECT COUNT(*) FROM bugs_detail bd WHERE bd.clave_incidencia = te.clave_incidencia AND bd.tipo_incidencia = 'Test Case') as total_executions,
  (SELECT SUM(CASE WHEN estado IN ('Pass', 'Fail') THEN 1 ELSE 0 END) FROM bugs_detail bd WHERE bd.clave_incidencia = te.clave_incidencia AND bd.tipo_incidencia = 'Test Case') as total_closed_executions,
  (SELECT SUM(CASE WHEN estado IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) FROM bugs_detail bd WHERE bd.clave_incidencia = te.clave_incidencia AND bd.tipo_incidencia = 'Test Case') as total_pending_executions
FROM vw_testcase_latest_execution te;

-- Vista: Resumen de ejecuciones de test cases por estado actual
CREATE VIEW IF NOT EXISTS vw_testcases_execution_summary AS
SELECT 
  COUNT(*) as total_test_cases,
  SUM(CASE WHEN latest_execution_status = 'Executed' THEN 1 ELSE 0 END) as executed_testcases,
  SUM(CASE WHEN latest_execution_status = 'Pending' THEN 1 ELSE 0 END) as pending_testcases,
  SUM(CASE WHEN latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as closed_by_latest_exec,
  SUM(CASE WHEN latest_execution_state IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending_by_latest_exec,
  ROUND((SUM(CASE WHEN latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / 
         NULLIF(COUNT(*), 0)), 2) as execution_efficiency_pct
FROM vw_testcases_summary;

-- Vista: Test cases por sprint (basado en última ejecución)
CREATE VIEW IF NOT EXISTS vw_testcases_by_sprint AS
SELECT 
  tc.sprint,
  COUNT(*) as total_testcases,
  SUM(CASE WHEN tc.latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as executed,
  SUM(CASE WHEN tc.latest_execution_state IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending,
  ROUND((SUM(CASE WHEN tc.latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / 
         NULLIF(COUNT(*), 0)), 2) as execution_efficiency_pct
FROM vw_testcases_summary tc
GROUP BY tc.sprint
ORDER BY tc.sprint;

-- Vista: Test cases por prioridad (basado en última ejecución)
CREATE VIEW IF NOT EXISTS vw_testcases_by_priority AS
SELECT 
  tc.prioridad,
  COUNT(*) as total_testcases,
  SUM(CASE WHEN tc.latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) as executed,
  SUM(CASE WHEN tc.latest_execution_state IN ('Not Executed', 'In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN tc.latest_execution_state = 'Pass' THEN 1 ELSE 0 END) as passed,
  SUM(CASE WHEN tc.latest_execution_state = 'Fail' THEN 1 ELSE 0 END) as failed,
  ROUND((SUM(CASE WHEN tc.latest_execution_state IN ('Pass', 'Fail') THEN 1 ELSE 0 END) * 100.0 / 
         NULLIF(COUNT(*), 0)), 2) as execution_efficiency_pct
FROM vw_testcases_summary tc
WHERE tc.prioridad IS NOT NULL
GROUP BY tc.prioridad
ORDER BY tc.prioridad;

-- Vista: Test cases por estado en última ejecución
CREATE VIEW IF NOT EXISTS vw_testcases_by_state AS
SELECT 
  tc.latest_execution_state as execution_state,
  COUNT(*) as count,
  ROUND((COUNT(*) * 100.0 / 
         (SELECT COUNT(*) FROM vw_testcases_summary)), 2) as percentage
FROM vw_testcases_summary tc
GROUP BY tc.latest_execution_state
ORDER BY count DESC;

-- ============================================================================
-- VISTAS ORIGINALES (se mantienen para bugs si es necesario)
-- ============================================================================
CREATE VIEW IF NOT EXISTS vw_bugs_summary AS
SELECT 
  COUNT(*) as total_bugs,
   SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN prioridad in ('High') THEN 1 ELSE 0 END) as critical
FROM bugs_detail
WHERE estado = 'Fail';

-- Vista: Bugs por sprint (desde datos de detalle) (SOLO Bugs = Findings con estado Fail)
CREATE VIEW IF NOT EXISTS vw_bugs_by_sprint AS
SELECT 
  1 as sprint_num,
  SUBSTR('0' || SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1, INSTR(SUBSTR(fecha_reporte, INSTR(fecha_reporte, '/') + 1), '/') - 1), -2) || '-' || SUBSTR(fecha_reporte, -4) as sprint,
  COUNT(*) as total,
  SUM(CASE WHEN prioridad in ('High') THEN 1 ELSE 0 END) as critical,
    SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled
FROM bugs_detail
WHERE estado = 'Fail'
GROUP BY sprint;

-- Vista: Bugs por estado en cada sprint (SOLO Bugs = Findings con estado Fail)
CREATE VIEW IF NOT EXISTS vw_bugs_by_sprint_status AS
SELECT 
  sprint,
  estado,
  COUNT(*) as count
FROM bugs_detail
WHERE estado = 'Fail'
GROUP BY sprint, estado;

-- Vista: Bugs por desarrollador desde detalle (SOLO Bugs = Findings con estado Fail)
CREATE VIEW IF NOT EXISTS vw_bugs_by_developer AS
SELECT 
  asignado_a as developer_name,
  COUNT(*) as total_bugs,
  SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN prioridad in ('High') THEN 1 ELSE 0 END) as critical
FROM bugs_detail
WHERE estado = 'Fail' AND asignado_a IS NOT NULL AND asignado_a != ''
GROUP BY asignado_a;


-- Vista: Bugs por prioridad
CREATE VIEW IF NOT EXISTS vw_bugs_by_priority AS
SELECT 
  prioridad,
  COUNT(*) as count,
  -- Pending: test cases that are Fail or In Progress (estos son los "bugs" pendientes)
  SUM(CASE WHEN estado IN ('Fail', 'In Progress') THEN 1 ELSE 0 END) as pending,
  -- Canceled: not applicable in test result data
  SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled,
  -- Resolved: test cases that passed (bugs that were fixed)
  SUM(CASE WHEN estado = 'Pass' THEN 1 ELSE 0 END) as resolved
FROM bugs_detail
WHERE prioridad IS NOT NULL
GROUP BY prioridad;

-- Vista: Bugs por módulo (SOLO Bugs = Findings)
CREATE VIEW IF NOT EXISTS vw_bugs_by_module AS
SELECT 
  modulo,
  COUNT(*) as count,
  SUM(CASE WHEN prioridad in ('High') THEN 1 ELSE 0 END) as critical
FROM bugs_detail
WHERE estado = 'Fail' AND modulo IS NOT NULL AND modulo != ''
GROUP BY modulo;

-- Vista: Bugs por categoría (SOLO Bugs = Findings)
CREATE VIEW IF NOT EXISTS vw_bugs_by_category AS
SELECT 
  categoria,
  COUNT(*) as count
FROM bugs_detail
WHERE estado = 'Fail' AND categoria IS NOT NULL AND categoria != ''
GROUP BY categoria;

-- Vista: Análisis de desarrolladores (desde bugs_detail)
-- NOTA: El campo asignado_a está vacío en los datos actuales
-- Esta vista está lista para cuando se carguen datos con asignaciones
CREATE VIEW IF NOT EXISTS vw_developers_analysis AS
SELECT 
  asignado_a as developer_name,
  COUNT(*) as total_bugs,
    SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END) as pending,
   SUM(CASE WHEN estado in ('In Progress - QA','In Progress', 'In Process' , 'Ready for QA') THEN 1 ELSE 0 END) as in_progress,
   SUM(CASE WHEN estado IN ('Closed', 'Ready For Release','Released') THEN 1 ELSE 0 END) as resolved,
   SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled,
  SUM(CASE WHEN prioridad in ('High') THEN 1 ELSE 0 END) as critical,
    ROUND(((COUNT(*) - SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END)) * 100.0 / NULLIF(COUNT(*), 0)), 2) as efficiency_percentage,
    CASE 
      WHEN SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END) > 15 THEN 'Alto'
      WHEN SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design' ) THEN 1 ELSE 0 END) > 8 THEN 'Medio'
    ELSE 'Bajo'
  END as workload_level
FROM bugs_detail
WHERE asignado_a IS NOT NULL AND asignado_a != ''
GROUP BY asignado_a
ORDER BY total_bugs DESC;

-- Vista: Análisis de desarrolladores (desde developers_summary)
CREATE VIEW IF NOT EXISTS vw_developers_analysis AS
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
ORDER BY total_bugs DESC;

-- Vista: Estadísticas de resolución y producción (bugs en ambiente prod)
CREATE VIEW IF NOT EXISTS vw_bug_resolution_stats AS
SELECT
  SUM(CASE WHEN tipo_incidencia = 'Bug' AND estado NOT IN ('To Do', 'In Development', 'Ready for Testing', 'Canceled') THEN 1 ELSE 0 END) as bugs_closed,
  SUM(CASE WHEN tipo_incidencia = 'Production Support Defect' THEN 1 ELSE 0 END) as production_bugs
FROM bugs_detail;

-- Vista: Estadísticas simples de casos de prueba (soporte)
CREATE VIEW IF NOT EXISTS vw_testcase_stats AS
SELECT
  -- Count rows where the summary mentions 'test' (case-insensitive) and exclude bugs
  SUM(CASE WHEN LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN ('Done','Approved for Release','Reviewed','Testing Complete') THEN 1 ELSE 0 END) as testcases_with_type,
  -- Use the same filtered count as total_records so downstream logic can divide by sprint count
  SUM(CASE WHEN LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN ('Done','Approved for Release','Reviewed','Testing Complete') THEN 1 ELSE 0 END) as total_records
FROM bugs_detail;

-- Vista: Estado de resolución de bugs (análisis histórico)
-- Analiza cuántos bugs que alguna vez fueron Fail fueron luego ejecutados con Pass
CREATE VIEW IF NOT EXISTS vw_bug_resolution_status AS
WITH bug_analysis AS (
  SELECT 
    clave_incidencia,
    prioridad,
    SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as fail_count,
    SUM(CASE WHEN estado = 'Pass' THEN 1 ELSE 0 END) as pass_count,
    SUM(CASE WHEN estado IN ('In Progress', 'Blocked') THEN 1 ELSE 0 END) as pending_count
  FROM bugs_detail
  WHERE tipo_incidencia = 'Test Case'
  GROUP BY clave_incidencia, prioridad
  HAVING fail_count > 0
)
SELECT 
  prioridad,
  COUNT(*) as total_bugs_with_fail,
  SUM(CASE WHEN pass_count > 0 THEN 1 ELSE 0 END) as fixed_and_verified,
  SUM(CASE WHEN pass_count = 0 AND pending_count = 0 THEN 1 ELSE 0 END) as still_failing,
  SUM(CASE WHEN pending_count > 0 THEN 1 ELSE 0 END) as in_progress_fix
FROM bug_analysis
GROUP BY prioridad;

-- Vista: Resumen de ejecuciones por estado
CREATE VIEW IF NOT EXISTS vw_execution_summary AS
SELECT 
  COUNT(*) as total_executions,
  SUM(CASE WHEN estado = 'Pass' THEN 1 ELSE 0 END) as passed,
  SUM(CASE WHEN estado = 'Fail' THEN 1 ELSE 0 END) as failed,
  SUM(CASE WHEN estado = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN estado = 'Blocked' THEN 1 ELSE 0 END) as blocked,
  SUM(CASE WHEN estado = 'Not Executed' THEN 1 ELSE 0 END) as not_executed
FROM bugs_detail;
