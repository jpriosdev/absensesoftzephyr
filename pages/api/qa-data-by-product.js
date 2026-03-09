// pages/api/qa-data-by-product.js
// Returns bugsByMonth + testCasesByMonth + summary filtered by a specific tag0/product
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { product } = req.query;
  if (!product || !product.trim()) {
    return res.status(400).json({ error: 'Missing required query param: product' });
  }

  try {
    const [bugsRaw, tcRaw, summary, resolutionTimeData] = await Promise.all([
      DAL.getBugsByMonthForTag0(product),
      DAL.getTestCasesByMonthForTag0(product),
      DAL.getSummaryForTag0(product),
      DAL.getResolutionTimeAnalysisFiltered({ tag0: product }),
    ]);

    // Shape bugsByMonth as { 'MM-YYYY': { count } }
    const bugsByMonth = {};
    for (const row of bugsRaw) {
      if (row.month_year) bugsByMonth[row.month_year] = { count: row.count };
    }

    // Shape testCasesByMonth as { 'MM-YYYY': { planned, executed, passed, failed, notExecuted, inProgress, blocked } }
    const testCasesByMonth = {};
    for (const row of tcRaw) {
      if (row.month_year) {
        testCasesByMonth[row.month_year] = {
          planned:     row.planned_tests       || 0,
          executed:    row.total_count         || 0,
          passed:      row.pass_count          || 0,
          failed:      row.fail_count          || 0,
          notExecuted: row.not_executed_count  || 0,
          inProgress:  row.in_progress_count   || 0,
          blocked:     row.blocked_count       || 0,
        };
      }
    }

    // Recompute avg test cases per month
    const numMonths = Object.keys(testCasesByMonth).length || 1;
    const enrichedSummary = {
      ...summary,
      testCasesWithExecutions: summary.testCasesExecuted,
      avgTestCasesPerMonth: summary.testCasesTotal > 0
        ? Math.round(summary.testCasesTotal / numMonths)
        : 0,
    };

    return res.status(200).json({
      product,
      bugsByMonth,
      testCasesByMonth,
      summary: enrichedSummary,
      resolutionTimeData: resolutionTimeData || null,
      _dataSource: 'sqlite',
    });
  } catch (error) {
    console.error('[qa-data-by-product] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
