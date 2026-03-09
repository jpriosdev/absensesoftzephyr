// pages/api/testers-data.js
// Load testers/reporters data - uses JSON in Vercel, DAL as fallback

let handler;

// Try to load from DAL first (works in development with SQLite)
try {
  const DALModule = require('../../lib/database/dal.js');
  const DAL = DALModule.default || DALModule;

  handler = async (req, res) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
      const { tag0 = '', from = '', to = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = req.query;
      const hasFilter = tag0.trim() || from.trim() || to.trim() || priority.trim() || status.trim() || testType.trim() || attribute.trim() || testLevel.trim() || ambiente.trim();

      const rawSummary = hasFilter
        ? await DAL.getTestersSummaryFiltered({ tag0: tag0.trim(), fromMonth: from.trim(), toMonth: to.trim(), priority: priority.trim(), status: status.trim(), testType: testType.trim(), attribute: attribute.trim(), testLevel: testLevel.trim(), ambiente: ambiente.trim() })
        : await DAL.getTestersSummaryWithProducts();

      const testersData = (rawSummary || []).map(tester => ({
        reportado:          tester.tester,
        tester:             tester.tester,
        name:               tester.tester,
        products:           tester.products ? tester.products.split(', ').filter(p => p && p.trim()) : [],
        productsJoined:     tester.products || '',
        totalTests:         tester.total_bugs    || 0,
        totalExecutions:    tester.total_bugs    || 0,
        passed:             tester.passed        || 0,
        failed:             tester.failed        || 0,
        notExecuted:        tester.not_executed  || 0,
        inProgress:         tester.in_progress   || 0,
        blocked:            tester.blocked       || 0,
        sprintsInvolved:    tester.sprints_involved || 0,
        modulesTestedCount: tester.modules_tested   || 0,
        testTypesCount:     tester.test_types        || 0,
        modules: [], types: [], branches: []
      }));

      return res.status(200).json({
        testersData,
        totalTesters: testersData.length,
        timestamp: new Date().toISOString(),
        _dataSource: 'sqlite',
        _isRealData: true
      });
    } catch (error) {
      console.error('Error loading testers data from DAL:', error);
      // Fallback to JSON loader
      return fallbackHandler(req, res);
    }
  };
} catch (err) {
  console.warn('DAL not available, using JSON fallback:', err.message);
  handler = null;
}

// Fallback handler using JSON
async function fallbackHandler(req, res) {
  try {
    const { getTesersFromJson } = await import('../../lib/jsonDataLoader.js');
    const { tag0 = '', from = '', to = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = req.query;

    const testers = getTesersFromJson({ tag0, from, to, priority, status, testType, attribute, testLevel, ambiente });

    const testersData = (testers || []).map(t => ({
      reportado:          t.tester || t.name,
      tester:             t.tester || t.name,
      name:               t.name || 'Unknown',
      products:           Array.isArray(t.products) ? t.products : [],
      productsJoined:     Array.isArray(t.products) ? t.products.join(', ') : '',
      totalTests:         t.total_bugs || t.assigned || 0,
      totalExecutions:    t.total_bugs || t.assigned || 0,
      passed:             t.passed || t.resolved || 0,
      failed:             t.failed || 0,
      notExecuted:        t.not_executed || 0,
      inProgress:         t.in_progress || 0,
      blocked:            t.blocked || 0,
      sprintsInvolved:    t.sprints_involved || 0,
      modulesTestedCount: t.modules_tested || 0,
      testTypesCount:     t.test_types || 0,
      modules: [], types: [], branches: []
    }));

    return res.status(200).json({
      testersData,
      totalTesters: testersData.length,
      timestamp: new Date().toISOString(),
      _dataSource: 'json',
      _isRealData: false,
      _note: 'Data from JSON fallback - SQLite not available'
    });
  } catch (error) {
    console.error('Error in testers-data fallback:', error);
    return res.status(500).json({
      error: 'Error loading testers data',
      errorMessage: error.message,
      testersData: [],
      _dataSource: 'error'
    });
  }
}

// Export appropriate handler
export default handler || fallbackHandler;
