/**
 * Script: Eliminar desarrollador inválido
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'public', 'data', 'qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

db.run(
  `DELETE FROM developers_summary WHERE developer_name LIKE 'Bugs por%'`,
  (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }
    
    console.log('✅ Desarrolladores limpios y actualizados:\n');
    
    db.all('SELECT developer_name, total_bugs, tareas_por_hacer FROM developers_summary ORDER BY total_bugs DESC', 
      (err, rows) => {
        if (err) console.error(err);
        else {
          console.log(`Total desarrolladores: ${rows.length}\n`);
          rows.forEach((r, idx) => {
            console.log(`${idx + 1}. ${r.developer_name}`);
            console.log(`   Total: ${r.total_bugs} | Pendientes: ${r.tareas_por_hacer}\n`);
          });
        }
        db.close();
      }
    );
  }
);
