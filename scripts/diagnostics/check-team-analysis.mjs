/**
 * Script: Verificar Análisis de Equipo
 * Consulta la información agregada de desarrolladores desde bugs_detail
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'public', 'data', 'qa-dashboard.db');

console.log('🔍 Consultando análisis de equipo...\n');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error conectando a BD:', err.message);
    process.exit(1);
  }
});

// Query 1: Estadísticas generales
db.get(`
SELECT 
  COUNT(*) as total_bugs,
  COUNT(DISTINCT asignado_a) as total_developers,
  SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as total_pending,
  SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as total_critical
FROM bugs_detail
`, (err, summary) => {
  if (err) {
    console.error('❌ Error en query de resumen:', err.message);
    db.close();
    process.exit(1);
  }

  // Query 2: Top 5 developers by assigned bugs
  db.all(`
SELECT asignado_a as developer, COUNT(*) as total
FROM bugs_detail
GROUP BY asignado_a
ORDER BY total DESC
LIMIT 5
  `, (err, topDevs) => {
    if (err) {
      console.error('❌ Error en query top developers:', err.message);
      db.close();
      process.exit(1);
    }

    // Query 3: Assigned vs unassigned
    db.get(`
SELECT 
  SUM(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' THEN 1 ELSE 0 END) as assigned_bugs,
  SUM(CASE WHEN asignado_a IS NULL OR asignado_a = '' THEN 1 ELSE 0 END) as unassigned_bugs
FROM bugs_detail
    `, (err, assignment) => {
      if (err) {
        console.error('❌ Error en query de asignaciones:', err.message);
        db.close();
        process.exit(1);
      }

      // Query 4: Distinct status values
      db.all(`SELECT DISTINCT estado as status FROM bugs_detail ORDER BY estado`, (err, statuses) => {
        if (err) {
          console.error('❌ Error en query de status:', err.message);
          db.close();
          process.exit(1);
        }

        // Query 5: Distinct issue types
        db.all(`SELECT DISTINCT tipo_incidencia as issue_type FROM bugs_detail ORDER BY tipo_incidencia`, (err, issueTypes) => {
          if (err) {
            console.error('❌ Error en query de issue types:', err.message);
            db.close();
            process.exit(1);
          }

          // Mostrar resultados simplificados
          console.log('📊 ANÁLISIS DE EQUIPO - INFORMACIÓN ACTUALIZADA');
          console.log('═════════════════════════════════════════════════\n');

          console.log('📈 RESUMEN GENERAL');
          console.log(`   Total Bugs: ${summary.total_bugs}`);
          console.log(`   Desarrolladores Únicos: ${summary.total_developers}`);
          console.log(`   Pendientes: ${summary.total_pending}`);
          console.log(`   Críticos: ${summary.total_critical}\n`);

          if (topDevs && topDevs.length > 0) {
            console.log('👥 TOP 5 DESARROLLADORES (por bugs asignados)');
            topDevs.forEach((d, i) => console.log(`  ${i+1}. ${d.developer || 'Sin asignar'} — ${d.total} bugs`));
            console.log('');
          }

          if (assignment) {
            console.log('📊 DISTRIBUCIÓN DE ASIGNACIONES');
            console.log(`   Bugs Asignados: ${assignment.assigned_bugs || 0}`);
            console.log(`   Bugs Sin Asignar: ${assignment.unassigned_bugs || 0}\n`);
          }

          console.log('🔖 STATUS (distinct values from DB)');
          console.log(statuses.map(s => ` • ${s.status}`).join('\n'));
          console.log('\n🔖 ISSUE TYPES (distinct values from DB)');
          console.log(issueTypes.map(t => ` • ${t.issue_type}`).join('\n'));

          console.log('\n✅ INFORMACIÓN DE EQUIPO ACTUALIZADA');
          console.log(`⏰ Consulta ejecutada: ${new Date().toLocaleString()}`);

          db.close();
        });
      });
    });
  });
});
