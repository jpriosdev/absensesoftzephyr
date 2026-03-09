// pages/api/debug-qa.js
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Prefer SQLite/DAL as the authoritative source
    try {
      const qaData = await DAL.getFullQAData();
      return res.status(200).json({
        status: 'success',
        source: 'sqlite',
        dataAvailable: true,
        summary: qaData.summary || null,
        developerCount: qaData.developerData?.length || 0,
        sprintCount: qaData.sprintData?.length || 0,
        fullData: qaData
      });
    } catch (dbErr) {
      console.warn('DAL not available for debug API:', dbErr.message);
      return res.status(500).json({ status: 'error', message: 'SQLite DAL unavailable', details: dbErr.message });
    }
  } catch (error) {
    console.error('Debug API Error:', error);
    res.status(500).json({ status: 'error', message: error.message, stack: error.stack });
  }
}
