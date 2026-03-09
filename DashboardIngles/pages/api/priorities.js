import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const prioritiesData = await DAL.getAllPriorities();
    const priorities = prioritiesData.map(row => row.priority);
    
    res.status(200).json({
      priorities,
      totalPriorities: priorities.length
    });
  } catch (error) {
    console.error('❌ Error en /api/priorities:', error);
    res.status(500).json({ error: error.message });
  }
}
