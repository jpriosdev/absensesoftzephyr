// pages/api/health-check.js
// Diagnóstico de estado del dashboard en Vercel
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const dataDir = path.join(process.cwd(), 'public', 'data');
  const qaDataPath = path.join(dataDir, 'qa-data.json');
  const demoDataPath = path.join(dataDir, 'demo-data.json');
  const dbPath = path.join(dataDir, 'qa-dashboard.db');

  const health = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    workingDirectory: process.cwd(),
    dataDirectory: dataDir,
    files: {
      qaDataJson: {
        path: qaDataPath,
        exists: fs.existsSync(qaDataPath),
        size: null,
        metadata: null,
      },
      demoDataJson: {
        path: demoDataPath,
        exists: fs.existsSync(demoDataPath),
        size: null,
        metadata: null,
      },
      database: {
        path: dbPath,
        exists: fs.existsSync(dbPath),
        size: null,
      },
    },
  };

  // Revisar qa-data.json
  if (health.files.qaDataJson.exists) {
    try {
      const stats = fs.statSync(qaDataPath);
      health.files.qaDataJson.size = `${(stats.size / 1024).toFixed(2)} KB`;
      
      const content = fs.readFileSync(qaDataPath, 'utf-8');
      const data = JSON.parse(content);
      health.files.qaDataJson.metadata = {
        source: data.metadata?.source || 'unknown',
        generatedAt: data.metadata?.generatedAt || 'unknown',
        sprintsCount: data.sprintData?.length || 0,
        hasBugsByPriority: !!data.bugsByPriority,
        hasTestersData: !!data.testerData,
      };
    } catch (err) {
      health.files.qaDataJson.error = err.message;
    }
  }

  // Revisar demo-data.json
  if (health.files.demoDataJson.exists) {
    try {
      const stats = fs.statSync(demoDataPath);
      health.files.demoDataJson.size = `${(stats.size / 1024).toFixed(2)} KB`;
      
      const content = fs.readFileSync(demoDataPath, 'utf-8');
      const data = JSON.parse(content);
      health.files.demoDataJson.metadata = {
        source: data.metadata?.source || 'demo',
        sprintsCount: data.sprintData?.length || 0,
        hasBugsByPriority: !!data.bugsByPriority,
        hasTestersData: !!data.testerData,
      };
    } catch (err) {
      health.files.demoDataJson.error = err.message;
    }
  }

  // Revisar database
  if (health.files.database.exists) {
    try {
      const stats = fs.statSync(dbPath);
      health.files.database.size = `${(stats.size / 1024).toFixed(2)} KB`;
    } catch (err) {
      health.files.database.error = err.message;
    }
  }

  // Status general
  health.status = {
    isHealthy: health.files.qaDataJson.exists && health.files.qaDataJson.metadata,
    dataSourceUsed: health.files.qaDataJson.metadata?.source || 'none',
    issues: [],
  };

  if (!health.files.qaDataJson.exists) {
    health.status.issues.push('qa-data.json no existe');
  }
  if (!health.files.demoDataJson.exists) {
    health.status.issues.push('demo-data.json no existe');
  }
  if (!health.files.database.exists) {
    health.status.issues.push('SQLite database no existe (normal en Vercel)');
  }

  return res.status(200).json(health);
}
