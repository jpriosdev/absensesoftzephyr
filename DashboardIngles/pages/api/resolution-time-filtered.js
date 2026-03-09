// pages/api/resolution-time-filtered.js
// Returns resolutionTimeData filtered by tag0, from (MM-YYYY) and/or to (MM-YYYY)
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { tag0 = '', from = '', to = '' } = req.query;

  try {
    const resolutionTimeData = await DAL.getResolutionTimeAnalysisFiltered({
      tag0: tag0.trim() || '',
      fromMonth: from.trim() || '',
      toMonth: to.trim() || '',
    });

    return res.status(200).json({
      resolutionTimeData: resolutionTimeData || null,
    });
  } catch (error) {
    console.error('[resolution-time-filtered] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
