#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

async function main() {
  console.log('✅ Ejecutando: SELECT * FROM vw_bugs_by_priority\n');
  
  db.all(`SELECT * FROM vw_bugs_by_priority ORDER BY count DESC`, (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
      db.close();
      return;
    }
    
    console.log('📊 Resultado de vista vw_bugs_by_priority:');
    console.table(rows);
    
    // Verificar suma
    const totalBugs = rows.reduce((sum, row) => sum + row.count, 0);
    const totalPending = rows.reduce((sum, row) => sum + row.pending, 0);
    const totalResolved = rows.reduce((sum, row) => sum + row.resolved, 0);
    const totalCanceled = rows.reduce((sum, row) => sum + (row.canceled || 0), 0);
    
    console.log('\n📈 Totales:');
    console.log(`   Total Bugs: ${totalBugs}`);
    console.log(`   Total Pending: ${totalPending}`);
    console.log(`   Total Resolved: ${totalResolved}`);
    console.log(`   Total Canceled: ${totalCanceled}`);
    console.log(`   Total Account: ${totalPending + totalResolved + totalCanceled}`);
    
    // Query manual para verificar
    console.log('\n🔍 Verificación manual:\n');
    
    db.all(`
      SELECT 
        prioridad,
        COUNT(*) as total,
        SUM(CASE WHEN estado in ('Backlog','Dev Solution Review','Ready for Dev','Refinement','Solution Design') THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN estado IN ('Closed', 'Ready For Release','Released') THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN estado = 'Canceled' THEN 1 ELSE 0 END) as canceled_count
      FROM bugs_detail
      WHERE tipo_incidencia = 'Bug' AND prioridad IS NOT NULL
      GROUP BY prioridad
    `, (err, rows2) => {
      if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
      }
      
      console.log('✅ Query manual (sin vista):');
      console.table(rows2);
      
      db.close();
    });
  });
}

main();
