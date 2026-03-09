#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

async function main() {
  console.log('🔄 Recreando vistas con SQL corregido...\n');
  
  // Drop todas las vistas
  const viewsDropSQL = `
    DROP VIEW IF EXISTS vw_bugs_by_priority;
    DROP VIEW IF EXISTS vw_bugs_summary;
    DROP VIEW IF EXISTS vw_bugs_by_sprint;
    DROP VIEW IF EXISTS vw_bugs_by_sprint_status;
    DROP VIEW IF EXISTS vw_bugs_by_developer;
    DROP VIEW IF EXISTS vw_bugs_by_module;
    DROP VIEW IF EXISTS vw_bugs_by_category;
    DROP VIEW IF EXISTS vw_developers_analysis;
    DROP VIEW IF EXISTS vw_bug_resolution_stats;
    DROP VIEW IF EXISTS vw_testcase_stats;
  `;
  
  const createViewsSQL = `
    -- Vista: Bugs por prioridad (CORREGIDA CON CANCELED Y PENDING)
    CREATE VIEW IF NOT EXISTS vw_bugs_by_priority AS
    SELECT 
      prioridad,
      COUNT(*) as count,
      SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled,
      SUM(CASE WHEN estado IN ('Closed', 'Ready For Release','Released') THEN 1 ELSE 0 END) as resolved
    FROM bugs_detail
    WHERE prioridad IS NOT NULL AND tipo_incidencia = 'Bug'
    GROUP BY prioridad;

    -- Vista: Resumen general de bugs (SOLO Bugs = Findings)
    CREATE VIEW IF NOT EXISTS vw_bugs_summary AS
    SELECT 
      COUNT(*) as total_bugs,
      SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN prioridad in ('Highest', 'High') THEN 1 ELSE 0 END) as critical
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug';

    -- Vista: Bugs por sprint (desde datos de detalle) (SOLO Bugs = Findings)
    CREATE VIEW IF NOT EXISTS vw_bugs_by_sprint AS
    SELECT 
      CAST(SUBSTR(sprint, -2) AS INTEGER) as sprint_num,
      sprint,
      COUNT(*) as total,
      SUM(CASE WHEN prioridad in ('Highest', 'High') THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug'
    GROUP BY sprint;

    -- Vista: Bugs por estado en cada sprint (SOLO Bugs = Findings)
    CREATE VIEW IF NOT EXISTS vw_bugs_by_sprint_status AS
    SELECT 
      sprint,
      estado,
      COUNT(*) as count
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug'
    GROUP BY sprint, estado;

    -- Vista: Bugs por desarrollador desde detalle (SOLO Bugs = Findings)
    CREATE VIEW IF NOT EXISTS vw_bugs_by_developer AS
    SELECT 
      asignado_a as developer_name,
      COUNT(*) as total_bugs,
      SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design') THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN prioridad in ('Highest', 'High') THEN 1 ELSE 0 END) as critical
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug' AND asignado_a IS NOT NULL AND asignado_a != ''
    GROUP BY asignado_a;

    -- Vista: Bugs por módulo (SOLO Bugs = Findings)
    CREATE VIEW IF NOT EXISTS vw_bugs_by_module AS
    SELECT 
      modulo,
      COUNT(*) as count,
      SUM(CASE WHEN prioridad in ('Highest', 'High') THEN 1 ELSE 0 END) as critical
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug' AND modulo IS NOT NULL AND modulo != ''
    GROUP BY modulo;

    -- Vista: Bugs por categoría (SOLO Bugs = Findings)
    CREATE VIEW IF NOT EXISTS vw_bugs_by_category AS
    SELECT 
      categoria,
      COUNT(*) as count
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug' AND categoria IS NOT NULL AND categoria != ''
    GROUP BY categoria;

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
      SUM(CASE WHEN estado NOT IN ('To Do', 'In Development', 'Ready for Testing', 'Canceled') THEN 1 ELSE 0 END) as bugs_closed,
      SUM(CASE WHEN UPPER(ambiente) LIKE '%PROD%' OR UPPER(ambiente) LIKE '%PRODUCTION%' THEN 1 ELSE 0 END) as production_bugs
    FROM bugs_detail
    WHERE tipo_incidencia = 'Bug';

    -- Vista: Estadísticas simples de casos de prueba (soporte)
    CREATE VIEW IF NOT EXISTS vw_testcase_stats AS
    SELECT
      SUM(CASE WHEN LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN ('Done','Approved for Release','Reviewed','Testing Complete') THEN 1 ELSE 0 END) as testcases_with_type,
      SUM(CASE WHEN LOWER(COALESCE(resumen,'')) LIKE '%test%' AND tipo_incidencia != 'Bug' AND estado IN ('Done','Approved for Release','Reviewed','Testing Complete') THEN 1 ELSE 0 END) as total_records
    FROM bugs_detail;
  `;
  
  // Execute drops
  db.exec(viewsDropSQL, (err) => {
    if (err) {
      console.error('❌ Error dropping views:', err);
      db.close();
      return;
    }
    
    console.log('✅ Vistas antiguas eliminadas\n');
    
    // Execute creates
    db.exec(createViewsSQL, (err) => {
      if (err) {
        console.error('❌ Error creating views:', err);
        db.close();
        return;
      }
      
      console.log('✅ Vistas recr eadas exitosamente\n');
      
      // Test the view
      db.all(`SELECT * FROM vw_bugs_by_priority ORDER BY count DESC`, (err, rows) => {
        if (err) {
          console.error('❌ Error querying view:', err);
          db.close();
          return;
        }
        
        console.log('📊 Resultado vw_bugs_by_priority:');
        console.table(rows);
        
        db.close();
      });
    });
  });
}

main();
