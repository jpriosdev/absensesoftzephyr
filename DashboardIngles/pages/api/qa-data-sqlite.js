// pages/api/qa-data-sqlite.js
import DAL from '../../lib/database/dal.js';

function parseListParam(val) {
  if (!val) return null;
  return String(val).split(',').map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
}

function bugMatchesFilters(bug, filters) {
  if (!bug) return false;
  // Sprint
  if (filters.sprints && filters.sprints.length) {
    const sprintVal = (bug.sprint || '').toString().toLowerCase();
    const any = filters.sprints.some(s => sprintVal.includes(s));
    if (!any) return false;
  }
  // Status
  if (filters.status && filters.status.length) {
    const estado = (bug.estado || bug.status || '').toString().toLowerCase();
    if (!filters.status.includes(estado)) return false;
  }
  // Priority
  if (filters.priority && filters.priority.length) {
    const pr = (bug.prioridad || bug.priority || '').toString().toLowerCase();
    if (!filters.priority.includes(pr)) return false;
  }
  // Tags (bug may have tags in different fields)
  if (filters.tags && filters.tags.length) {
    const tagField = (bug.tags || bug.tag || bug._tags || '').toString().toLowerCase();
    const tags = tagField.split(/[;,|]/).map(s=>s.trim()).filter(Boolean);
    const anyTag = filters.tags.some(t => tags.includes(t));
    if (!anyTag) return false;
  }
  // Environment / Strategy / FixVersion
  if (filters.environment && filters.environment.length) {
    const env = (bug.ambiente || bug.environment || '').toString().toLowerCase();
    if (!filters.environment.includes(env)) return false;
  }
  if (filters.strategy && filters.strategy.length) {
    const strat = (bug.estrategia || bug.strategy || '').toString().toLowerCase();
    if (!filters.strategy.includes(strat)) return false;
  }
  if (filters.fixVersion && filters.fixVersion.length) {
    const fv = (bug.fixVersion || bug.version || '').toString().toLowerCase();
    if (!filters.fixVersion.includes(fv)) return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Parse query params
    const q = req.query || {};
    const sprints = parseListParam(q.sprints || q.sprint || q.s);
    const status = parseListParam(q.status || q.estado);
    const priority = parseListParam(q.priority || q.prioridad);
    const tags = parseListParam(q.tags || q.tag);
    const environment = parseListParam(q.environment || q.ambiente);
    const strategy = parseListParam(q.strategy || q.estrategia);
    const fixVersion = parseListParam(q.fixVersion || q.version);

    const includeBugs = q.includeBugs === '1' || q.includeBugs === 'true';

    // Load full QA data from DAL
    const qaData = await DAL.getFullQAData();

    // Defensive fallbacks
    const allBugs = Array.isArray(qaData.bugs) ? qaData.bugs : [];
    const allSprintData = Array.isArray(qaData.sprintData) ? qaData.sprintData : [];

    const filters = { sprints, status, priority, tags, environment, strategy, fixVersion };

    // Server-side filtering in memory (small dataset expected)
    const filteredBugs = allBugs.filter(b => bugMatchesFilters(b, filters));

    // Filter sprintData: include sprints that match selected sprints OR that have bugs after filtering
    const sprintNamesWithFilteredBugs = new Set(filteredBugs.map(b => b.sprint));
    const filteredSprintData = allSprintData.filter(s => {
      const sprintName = (s.sprint || s.sprintName || '').toString();
      if (sprints && sprints.length) {
        return sprints.some(sp => sprintName.toLowerCase().includes(sp)) || sprintNamesWithFilteredBugs.has(sprintName);
      }
      return sprintNamesWithFilteredBugs.has(sprintName) || true; // keep all if no sprint filter
    });

    // Simple derived summary
    const totalBugs = filteredBugs.length;
    const bugsClosed = filteredBugs.filter(b => {
      const st = (b.estado || b.status || '').toString().toLowerCase();
      return st === 'cerrado' || st === 'closed' || st === 'done' || st === 'resuelto' || st === 'resolved';
    }).length;

    const response = {
      metadata: qaData.metadata || null,
      summary: {
        totalBugs,
        bugsClosed,
      },
      sprintData: filteredSprintData,
      ...(includeBugs ? { bugs: filteredBugs } : {}),
      _dataSource: 'sqlite-filtered',
      _filtersApplied: Object.keys(filters).reduce((acc,k)=>{ if (filters[k]) acc[k]=filters[k]; return acc; }, {}),
      _timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in /api/qa-data-sqlite:', error);
    return res.status(500).json({ error: 'Failed to load QA data from SQLite', message: error.message });
  }
}
