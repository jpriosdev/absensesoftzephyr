// pages/api/qa-data-filtered.js
// Unified filtered data endpoint: supports product, priority, and status filters
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { product = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = req.query;
  const tag0     = product.trim();
  const pri      = priority.trim();
  const sta      = status.trim();
  const tType    = testType.trim();
  const attr     = attribute.trim();
  const tLevel   = testLevel.trim();
  const amb      = ambiente.trim();

  const hasAnyFilter = tag0 || pri || sta || tType || attr || tLevel || amb;
  if (!hasAnyFilter) {
    return res.status(400).json({ error: 'At least one filter param is required: product, priority, status, testType, attribute, testLevel, or ambiente' });
  }

  try {
    const [bugsRaw, tcRaw, summary, resolutionTimeData, bugsByPriorityRaw] = await Promise.all([
      DAL.getBugsMonthlyFiltered({ tag0, priority: pri, status: sta, testType: tType, attribute: attr, testLevel: tLevel, ambiente: amb }),
      DAL.getTestCasesMonthlyFiltered({ tag0, priority: pri, status: sta, testType: tType, attribute: attr, testLevel: tLevel, ambiente: amb }),
      DAL.getSummaryFiltered({ tag0, priority: pri, status: sta, testType: tType, attribute: attr, testLevel: tLevel, ambiente: amb }),
      // Resolution time filtering only works with tag0 (CSV-based)
      tag0 ? DAL.getResolutionTimeAnalysisFiltered({ tag0 }) : Promise.resolve(null),
      DAL.getBugsByPriorityFiltered({ tag0, priority: pri, status: sta, testType: tType, attribute: attr, testLevel: tLevel, ambiente: amb }),
    ]);

    // Shape bugsByMonth
    const bugsByMonth = {};
    for (const row of bugsRaw) {
      if (row.month_year) bugsByMonth[row.month_year] = { count: row.count };
    }

    // Shape testCasesByMonth
    const testCasesByMonth = {};
    for (const row of tcRaw) {
      if (row.month_year) {
        testCasesByMonth[row.month_year] = {
          planned:     row.planned_tests      || 0,
          executed:    row.total_count        || 0,
          passed:      row.pass_count         || 0,
          failed:      row.fail_count         || 0,
          notExecuted: row.not_executed_count || 0,
          inProgress:  row.in_progress_count  || 0,
          blocked:     row.blocked_count      || 0,
        };
      }
    }

    const numMonths = Object.keys(testCasesByMonth).length || 1;
    const enrichedSummary = {
      ...summary,
      testCasesWithExecutions: summary.testCasesExecuted,
      avgTestCasesPerMonth: summary.testCasesTotal > 0
        ? Math.round(summary.testCasesTotal / numMonths)
        : 0,
    };

    // Shape bugsByPriority
    const bugsByPriority = {};
    for (const row of bugsByPriorityRaw) {
      if (row.prioridad) {
        bugsByPriority[row.prioridad] = {
          count:    row.count    || 0,
          pending:  row.pending  || 0,
          canceled: row.canceled || 0,
          resolved: row.resolved || 0,
        };
      }
    }

    return res.status(200).json({
      product:          tag0  || null,
      priority:         pri   || null,
      status:           sta   || null,
      testType:         tType || null,
      attribute:        attr  || null,
      testLevel:        tLevel || null,
      ambiente:         amb   || null,
      bugsByMonth,
      testCasesByMonth,
      bugsByPriority,
      summary:          enrichedSummary,
      resolutionTimeData: resolutionTimeData || null,
      _dataSource:      'sqlite',
    });
  } catch (error) {
    console.error('[qa-data-filtered] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
