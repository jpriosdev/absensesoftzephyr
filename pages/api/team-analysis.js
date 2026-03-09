import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'public', 'data', 'qa-dashboard.db');

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getSingle(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export default async function handler(req, res) {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('DB open error', err && err.message);
    }
  });

  try {
    // Summary
    const summary = await getSingle(db, `
      SELECT 
        COUNT(*) as total_bugs,
        COUNT(DISTINCT asignado_a) as total_developers,
        SUM(CASE WHEN estado = 'Tareas por hacer' THEN 1 ELSE 0 END) as total_pending,
        SUM(CASE WHEN prioridad IN ('Más alta', 'Alta') THEN 1 ELSE 0 END) as total_critical
      FROM bugs_detail
      WHERE LOWER(tipo_incidencia) = 'bug'
    `);

    // Top 5 developers
    const topDevs = await runQuery(db, `
      SELECT asignado_a as developer, COUNT(*) as total
      FROM bugs_detail
      WHERE LOWER(tipo_incidencia) = 'bug'
      GROUP BY asignado_a
      ORDER BY total DESC
      LIMIT 5
    `);

    // Developer summaries (total / resolved / pending)
    const developerSummaries = await runQuery(db, `
      SELECT 
        asignado_a as developer,
        COUNT(*) as total,
        SUM(CASE WHEN estado IN ('Done','Resolved','Closed') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN estado NOT IN ('Done','Resolved','Closed') THEN 1 ELSE 0 END) as pending
      FROM bugs_detail
      WHERE LOWER(tipo_incidencia) = 'bug'
      GROUP BY asignado_a
      ORDER BY total DESC
    `);

    // Assigned vs unassigned
    const assignment = await getSingle(db, `
      SELECT 
        SUM(CASE WHEN asignado_a IS NOT NULL AND asignado_a != '' THEN 1 ELSE 0 END) as assigned_bugs,
        SUM(CASE WHEN asignado_a IS NULL OR asignado_a = '' THEN 1 ELSE 0 END) as unassigned_bugs
      FROM bugs_detail
      WHERE LOWER(tipo_incidencia) = 'bug'
    `);

    // Distinct statuses
    const statuses = await runQuery(db, `SELECT DISTINCT estado as status FROM bugs_detail ORDER BY estado`);

    // Distinct issue types
    const issueTypes = await runQuery(db, `SELECT DISTINCT tipo_incidencia as issue_type FROM bugs_detail ORDER BY tipo_incidencia`);

    res.status(200).json({ summary, topDevs, developerSummaries, assignment, statuses: statuses.map(s => s.status), issueTypes: issueTypes.map(t => t.issue_type) });
  } catch (err) {
    console.error('team-analysis API error', err && err.message);
    res.status(500).json({ error: err && err.message });
  } finally {
    db.close();
  }
}
