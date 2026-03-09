import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const statusData = await DAL.getAllStatus();
    const statuses = statusData.map(row => row.status);
    
    res.status(200).json({
      statuses,
      totalStatuses: statuses.length
    });
  } catch (error) {
    console.error('❌ Error en /api/status-list:', error);
    res.status(500).json({ error: error.message });
  }
}
