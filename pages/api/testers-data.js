// pages/api/testers-data.js
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
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
    console.error('Error loading testers data:', error);
    return res.status(500).json({
      error: 'Error loading testers data',
      errorMessage: error.message,
      testersData: []
    });
  }
}
