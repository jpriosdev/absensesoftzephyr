import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'public', 'data', 'qa-dashboard.db');

(async () => {
  try {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const rows = await db.all(`SELECT tipo_incidencia, COUNT(*) as cnt FROM bugs_detail GROUP BY tipo_incidencia ORDER BY cnt DESC`);
    console.log('Distinct tipo_incidencia counts:');
    rows.forEach(r => console.log(`${r.tipo_incidencia || 'NULL'}: ${r.cnt}`));
    await db.close();
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
})();
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'public', 'data', 'qa-dashboard.db');

(async () => {
  try {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    const rows = await db.all(`SELECT tipo_incidencia, COUNT(*) as cnt FROM bugs_detail GROUP BY tipo_incidencia ORDER BY cnt DESC`);
    console.log('Distinct tipo_incidencia counts:');
    rows.forEach(r => console.log(`${r.tipo_incidencia || 'NULL'}: ${r.cnt}`));
    await db.close();
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
})();
