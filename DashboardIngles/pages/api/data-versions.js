/**
 * API Endpoint: GET /api/data-versions
 * 
 * Devuelve lista de versiones disponibles (actual y anterior)
 */

import fs from 'fs';
import path from 'path';
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');
    const versions = [];

    // Try to get current metadata from SQLite via DAL
    try {
      const stats = await DAL.getDataSourceInfo();
      const summary = await DAL.getStatistics();
      const sprints = await DAL.getAllSprints();

      versions.push({
        id: 'current',
        label: 'Current (SQLite)',
        timestamp: stats?.loadedAt || new Date().toISOString(),
        totalBugs: summary?.total_bugs || 0,
        sprints: Array.isArray(sprints) ? sprints.length : (summary?.total_sprints || 0),
        developers: null,
        active: true
      });
    } catch (e) {
      // Fall back to JSON metadata if DB is not available
      const DATA_DIR = path.join(process.cwd(), 'data');
      const currentJsonPath = path.join(DATA_DIR, 'qa-data.json');
      if (fs.existsSync(currentJsonPath)) {
        const stats = fs.statSync(currentJsonPath);
        const data = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
        versions.push({
          id: 'current',
          label: 'Current (JSON)',
          timestamp: stats.mtime.toISOString(),
          totalBugs: data.summary?.totalBugs || 0,
          sprints: data.sprintData?.length || 0,
          developers: data.developerData?.length || 0,
          active: true
        });
      }
    }

    // Keep previous JSON backups information (if present)
    if (fs.existsSync(VERSIONS_DIR)) {
      const backups = fs.readdirSync(VERSIONS_DIR)
        .filter(f => f.startsWith('data-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (backups.length > 0) {
        const backupPath = path.join(VERSIONS_DIR, backups[0]);
        const stats = fs.statSync(backupPath);
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        versions.push({
          id: backups[0],
          label: 'Previous Version (JSON)',
          timestamp: stats.mtime.toISOString(),
          totalBugs: data.summary?.totalBugs || 0,
          sprints: data.sprintData?.length || 0,
          developers: data.developerData?.length || 0,
          active: false
        });
      }
    }

    return res.status(200).json({ versions, count: versions.length });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return res.status(500).json({
      error: 'Error al obtener versiones',
      details: error.message
    });
  }
}
