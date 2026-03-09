// pages/api/qa-data.js
import { getQAData } from '../../lib/qaDataLoader.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const force = req.query?.force === '1' || req.query?.force === 'true';
    const qaData = await getQAData({ forceReload: force });
    
    // Server-side debug log: print sprintData summary so it's visible in server console
    try {
      const sprintSample = Array.isArray(qaData.sprintData) ? qaData.sprintData.slice(0, 8) : qaData.sprintData;
      console.log('\n[qa-data] source=%s real=%s sprints=%d', qaData._dataSource || 'unknown', !!qaData._isRealData, qaData.sprintData?.length || 0);
      console.log('[qa-data] sprintData sample:', JSON.stringify(sprintSample, null, 2));
      console.log('[qa-data] bugsByMonthByPriority keys:', Object.keys(qaData.bugsByMonthByPriority || {}).length);
    } catch (e) {
      console.warn('Unable to stringify sprintData for debug logging', e && e.message);
    }

    // Agregar info de debugging en la respuesta
    const response = {
      ...qaData,
      _debug: {
        timestamp: new Date().toISOString(),
        dataSource: qaData._dataSource,
        isRealData: qaData._isRealData,
        sprintCount: qaData.sprintData?.length || 0,
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error loading QA data:', error);
    return res.status(500).json({
      error: 'No QA data is available right now. Try again later.',
      errorMessage: error.message,
    });
  }
}
