/**
 * Script: Verificar desarrolladores cargados
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../public/data/qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

console.log('👥 VERIFICANDO DESARROLLADORES CARGADOS\n');

db.all('SELECT * FROM developers_summary ORDER BY total_bugs DESC', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log(`Total desarrolladores: ${rows.length}\n`);
    
    if (rows.length === 0) {
      console.log('⚠️  No hay desarrolladores cargados');
      console.log('Verifica que npm run db:migrate incluya la migración de "BUGS X DESARROLLADOR"');
    } else {
      rows.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.developer_name}`);
        console.log(`   Total: ${r.total_bugs} | Pendientes: ${r.tareas_por_hacer} | En Curso: ${r.en_curso}\n`);
      });
    }
  }
  
  db.close();
});
/**
 * Script: Verificar desarrolladores cargados
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'public', 'data', 'qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

console.log('👥 VERIFICANDO DESARROLLADORES CARGADOS\n');

db.all('SELECT * FROM developers_summary ORDER BY total_bugs DESC', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log(`Total desarrolladores: ${rows.length}\n`);
    
    if (rows.length === 0) {
      console.log('⚠️  No hay desarrolladores cargados');
      console.log('Verifica que npm run db:migrate incluya la migración de "BUGS X DESARROLLADOR"');
    } else {
      rows.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.developer_name}`);
        console.log(`   Total: ${r.total_bugs} | Pendientes: ${r.tareas_por_hacer} | En Curso: ${r.en_curso}\n`);
      });
    }
  }
  
  db.close();
});
