// pages/api/resolution-time-filtered.js
// Returns resolutionTimeData filtered by tag0, from (MM-YYYY) and/or to (MM-YYYY)
import DAL from '../../lib/database/dal.js';
import { getQADataFromJson } from '../../lib/jsonDataLoader.js';

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
    console.error('[resolution-time-filtered] Database error:', error.message);
    // Fallback to JSON data when database unavailable
    try {
      const fallbackData = getQADataFromJson();
      if (fallbackData) {
        return res.status(200).json({
          resolutionTimeData: fallbackData.resolutionTimeData || null,
          _dataSource: 'json-fallback',
          _note: 'Filtered data not available; returning data from JSON fallback',
        });
      }
    } catch (fallbackErr) {
      console.error('[resolution-time-filtered] Fallback error:', fallbackErr.message);
    }

    return res.status(500).json({ error: 'No data available' });
  }
}
