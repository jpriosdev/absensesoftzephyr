#!/usr/bin/env node
// check-team-analysis moved to temp-validation
import fs from 'fs'
import path from 'path'

console.log('This is a moved diagnostic script (check-team-analysis).')
try {
  const dataPath = path.resolve(new URL(import.meta.url).pathname, '../../public/data/qa-data.json')
  const raw = fs.readFileSync(dataPath, 'utf8')
  const data = JSON.parse(raw)
  console.log('Sprints:', (data.sprintData || []).length)
} catch (e) {
  console.error('Unable to inspect data file:', e.message)
}
/**
 * Script: Verificar Análisis de Equipo
 * Consulta la información agregada de desarrolladores desde bugs_detail
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

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

  // Query 2: Vista de análisis de desarrolladores
  db.all(`
SELECT 
  developer_name,
  total_bugs,
  pending,
  in_progress,
  code_review,
  blocked,
  canceled,
  critical,
  efficiency_percentage,
  workload_level
FROM vw_developers_analysis
  `, (err, developers) => {
    if (err) {
      console.error('❌ Error en query de vista:', err.message);
      db.close();
      process.exit(1);
    }

    // Query 3: Bugs asignados vs sin asignar
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

      // Mostrar resultados
      console.log('📊 ANÁLISIS DE EQUIPO - INFORMACIÓN ACTUALIZADA');
      console.log('═════════════════════════════════════════════════\n');

      console.log('📈 RESUMEN GENERAL');
      console.log(`   Total Bugs: ${summary.total_bugs}`);
      console.log(`   Desarrolladores Únicos: ${summary.total_developers}`);
      console.log(`   Pendientes: ${summary.total_pending}`);
      console.log(`   Críticos: ${summary.total_critical}\n`);

      if (developers && developers.length > 0) {
        console.log('👥 DESARROLLADORES (Ordenado por carga)');
        console.log('─────────────────────────────────────────\n');
        
        developers.forEach((dev, idx) => {
          console.log(`${idx + 1}. ${dev.developer_name}`);
          console.log(`   ├─ Total: ${dev.total_bugs} bugs`);
          console.log(`   ├─ Pendientes: ${dev.pending} (${dev.workload_level})`);
          console.log(`   ├─ En Progreso: ${dev.in_progress}`);
          console.log(`   ├─ Code Review: ${dev.code_review}`);
          console.log(`   ├─ Bloqueados: ${dev.blocked}`);
          console.log(`   ├─ Cancelados: ${dev.canceled}`);
          console.log(`   ├─ Críticos: ${dev.critical}`);
          console.log(`   └─ Eficiencia: ${dev.efficiency_percentage}%\n`);
        });
      } else {
        console.log('⚠️  NOTA: No hay desarrolladores asignados aún');
        console.log('   El campo "asignado_a" está vacío en los datos del Excel\n');
      }

      if (assignment) {
        console.log('📊 DISTRIBUCIÓN DE ASIGNACIONES');
        console.log('─────────────────────────────────────────\n');
        console.log(`Bugs Asignados: ${assignment.assigned_bugs || 0}`);
        console.log(`Bugs Sin Asignar: ${assignment.unassigned_bugs || 0}\n`);
      }

      console.log('✅ INFORMACIÓN DE EQUIPO ACTUALIZADA');
      console.log(`⏰ Consulta ejecutada: ${new Date().toLocaleString()}`);
      
      console.log('\n📝 NOTA: Los datos de equipo se obtienen del campo "asignado_a" en bugs_detail');
      console.log('   Para un análisis más detallado, asegúrate de que este campo esté poblado.');

      db.close();
    });
  });
});
