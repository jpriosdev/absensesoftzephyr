/**
 * API Endpoint: /api/verify-data
 * Verifies data integrity between Excel, JSON and SQLite
 */

import DAL from '../../lib/database/dal.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQAData } from '../../lib/qaDataLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Datos desde SQLite
    const sqliteStats = await DAL.getStatistics();
    const sqliteSprints = await DAL.getAllSprints();
    const sqliteBugs = await DAL.getBugsBySprint();

    // Datos desde JSON (anterior)
    const jsonData = await getQAData({ forceReload: false });

    const dbPath = path.resolve(process.cwd(), 'public/data/qa-dashboard.db');
    const dbExists = fs.existsSync(dbPath);
    const dbSize = dbExists ? fs.statSync(dbPath).size : 0;

    const verification = {
      status: 'success',
      timestamp: new Date().toISOString(),
      sources: {
        sqlite: {
          totalBugs: sqliteStats.total_bugs || 0,
          totalSprints: sqliteStats.total_sprints || 0,
          criticalBugs: sqliteStats.critical_bugs || 0,
          pendingBugs: sqliteStats.pending_bugs || 0,
          sprints: sqliteSprints?.length || 0
        },
        json: {
          totalBugs: jsonData?.summary?.totalBugs || 0,
          bugsResolved: jsonData?.summary?.bugsClosed || 0,
          bugsPending: jsonData?.summary?.bugsPending || 0,
          sprints: jsonData?.sprintData?.length || 0
        }
      },
      differences: {
        totalBugsMatch: (sqliteStats.total_bugs || 0) === (jsonData?.summary?.totalBugs || 0),
        sprintsMatch: (sqliteSprints?.length || 0) === (jsonData?.sprintData?.length || 0),
        matchPercentage: 100
      },
      database: {
        path: dbPath,
        exists: dbExists,
        size: dbSize,
        sizeKB: (dbSize / 1024).toFixed(2)
      },
      bugsBySprintComparison: {},
      recommendations: []
    };

    // Comparar bugs por sprint si ambos datos existen
    if (jsonData?.sprintData && sqliteBugs?.length > 0) {
      jsonData.sprintData.forEach((jsonSprint, idx) => {
        const sprintNum = idx + 16;
        const sqliteSprint = sqliteBugs.find(s => s.sprint_num === sprintNum);
        
        if (sqliteSprint && jsonSprint) {
          verification.bugsBySprintComparison[`Sprint ${sprintNum}`] = {
            sqlite: {
              total: sqliteSprint.total_bugs || 0,
              critical: sqliteSprint.critical_bugs || 0,
              pending: sqliteSprint.pending_bugs || 0
            },
            json: {
              total: jsonSprint.bugs || 0,
              critical: jsonSprint.criticalBugsTotal || 0,
              pending: jsonSprint.bugsPending || 0
            },
            match: {
              total: (sqliteSprint.total_bugs || 0) === (jsonSprint.bugs || 0),
              critical: (sqliteSprint.critical_bugs || 0) === (jsonSprint.criticalBugsTotal || 0),
              pending: (sqliteSprint.pending_bugs || 0) === (jsonSprint.bugsPending || 0)
            }
          };
        }
      });
    }

    // Calcular porcentaje de match
    const comparisons = Object.values(verification.bugsBySprintComparison);
    if (comparisons.length > 0) {
      const matches = comparisons.filter(
        s => s.match.total && s.match.critical && s.match.pending
      ).length;
      verification.differences.matchPercentage = Math.round((matches / comparisons.length) * 100);
    }

    // Generate recommendations
    if (!verification.database.exists) {
      verification.recommendations.push('❌ SQLite database not found. Run: npm run db:setup');
    } else {
      verification.recommendations.push('✅ SQLite database found and functional');
    }

    if (!verification.differences.totalBugsMatch) {
      verification.recommendations.push(`⚠️ Total bugs different: SQLite=${verification.sources.sqlite.totalBugs}, JSON=${verification.sources.json.totalBugs}`);
    } else {
      verification.recommendations.push('✅ Total bugs matches');
    }

    if (!verification.differences.sprintsMatch) {
      verification.recommendations.push(`⚠️ Number of sprints different: SQLite=${verification.sources.sqlite.sprints}, JSON=${verification.sources.json.sprints}`);
    } else {
      verification.recommendations.push('✅ Number of sprints matches');
    }

    if (verification.differences.matchPercentage === 100) {
      verification.recommendations.push('✅ All sprints match 100%');
    } else if (verification.differences.matchPercentage >= 0) {
      verification.recommendations.push(`⚠️ Only ${verification.differences.matchPercentage}% of sprints match completely`);
    }

    verification.status = verification.database.exists && verification.differences.matchPercentage > 80 ? 'success' : 'warning';

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(verification);

  } catch (error) {
    console.error('❌ Error in verify-data endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}
