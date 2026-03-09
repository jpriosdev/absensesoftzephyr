#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'public', 'data', 'qa-dashboard.db');

async function run() {
  const db = new (sqlite3.verbose().Database)(dbPath);

  const all = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (e,r)=> e?rej(e):res(r)));
  const runStmt = (sql, params=[]) => new Promise((res, rej) => db.run(sql, params, function(e){ e?rej(e):res(this); }));

  try {
    const rows = await all('SELECT DISTINCT sprint FROM bugs_detail WHERE sprint IS NOT NULL AND trim(sprint) != ""');
    const sprints = rows.map(r => r.sprint).filter(Boolean).map(s => s.toString().trim());
    console.log('Found', sprints.length, 'unique sprint values in bugs_detail');

    let inserted = 0;
    for (const sprintName of sprints) {
      // Try to parse sprint number (digits at end)
      let sprintNum = null;
      const m = sprintName.match(/(\d+)$/);
      if (m) sprintNum = parseInt(m[1], 10);

      // Check if exists
      const exists = await all('SELECT id FROM sprints_versions WHERE sprint = ? OR version = ? LIMIT 1', [sprintNum || sprintName, sprintName]);
      if (exists && exists.length) continue;

      // Insert with best-effort mapping
      await runStmt('INSERT INTO sprints_versions (version, sprint, fecha, environment, test_plan, etiquetas) VALUES (?, ?, ?, ?, ?, ?)', [sprintName, sprintNum || 0, null, null, null, null]);
      inserted++;
    }

    console.log(`Inserted ${inserted} new sprints into sprints_versions`);
    db.close();
    process.exit(0);
  } catch (e) {
    console.error('Error populating sprints:', e.message);
    db.close();
    process.exit(1);
  }
}

run();
