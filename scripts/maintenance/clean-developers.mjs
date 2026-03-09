/**
 * Script: Limpiar desarrolladores con datos inválidos
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'public', 'data', 'qa-dashboard.db');

const db = new sqlite3.Database(dbPath);

console.log('🧹 Limpiando desarrolladores inválidos...\n');

// Palabras clave que indican encabezados
const invalidNames = [
  'Bugs por',
  'Bugs  por',
  'Desarrollador',
  'Prioridad',
  'Estado',
  'Cancelado',
  'Tareas por hacer',
  'Code Review',
  'Total general'
];

// Crear string para el WHERE clause
const whereConditions = invalidNames.map(name => `developer_name = '${name}'`).join(' OR ');

db.run(
  `DELETE FROM developers_summary WHERE ${whereConditions}`,
  (err) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('✅ Desarrolladores inválidos eliminados\n');
      
      // Mostrar desarrolladores restantes
      db.all('SELECT developer_name, total_bugs FROM developers_summary ORDER BY total_bugs DESC', 
        (err, rows) => {
          if (err) console.error(err);
          else {
            console.log(`✅ Desarrolladores válidos: ${rows.length}\n`);
            rows.forEach((r, idx) => {
              console.log(`${idx + 1}. ${r.developer_name}: ${r.total_bugs} bugs`);
            });
          }
          db.close();
        }
      );
    }
  }
);
