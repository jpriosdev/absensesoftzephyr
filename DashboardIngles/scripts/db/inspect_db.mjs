#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', '..', 'public', 'data', 'qa-dashboard.db');

const db = new (sqlite3.verbose().Database)(dbPath);

function run(sql) {
  return new Promise((resolve, reject) => db.all(sql, (err, rows) => err ? reject(err) : resolve(rows)));
}

(async () => {
  try {
    console.log('DB path:', dbPath);
    const tables = ['bugs_detail','sprints_versions','developers_summary','data_source_metadata'];
    for (const t of tables) {
      const count = (await run(`SELECT COUNT(*) as c FROM ${t}`))[0];
      console.log(`${t}: ${count.c}`);
    }

    console.log('\nSample bugs_detail (limit 5):');
    const sample = await run('SELECT tipo_incidencia, clave_incidencia, prioridad, estado, sprint, modulo, asignado_a FROM bugs_detail LIMIT 5');
    console.log(sample);
  } catch (e) {
    console.error('Error inspecting DB:', e.message);
    process.exit(1);
  } finally {
    db.close();
  }
})();
