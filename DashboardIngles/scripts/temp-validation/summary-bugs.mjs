#!/usr/bin/env node
// Summary bugs diagnostic moved to temp-validation
import fs from 'fs'
import path from 'path'

const dataPath = path.resolve(new URL(import.meta.url).pathname, '../../public/data/qa-data.json')
try {
  const raw = fs.readFileSync(dataPath, 'utf8')
  const data = JSON.parse(raw)
  console.log('Summary from', dataPath)
  console.log('Total bugs:', data.summary?.totalBugs)
  console.log('Bugs by priority:', Object.keys(data.bugsByPriority || {}))
} catch (e) {
  console.error('Unable to read qa-data.json at', dataPath)
  console.error(e.message)
}
#!/usr/bin/env node
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../public/data/qa-dashboard.db');

const db = new (sqlite3.verbose().Database)(dbPath);

function printSummary() {
  db.serialize(() => {
    db.get('SELECT COUNT(*) as total FROM bugs_detail', (err, row) => {
      if (err) {
        console.error('Error al contar bugs:', err.message);
        process.exit(1);
      }
      console.log(`Total de bugs/incidencias migrados: ${row.total}`);
    });
    db.all('PRAGMA table_info(bugs_detail)', (err, columns) => {
      if (err) {
        console.error('Error al obtener columnas:', err.message);
        process.exit(1);
      }
      console.log('\nEstructura actual de la tabla bugs_detail:');
      columns.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      db.close();
    });
  });
}

printSummary();
