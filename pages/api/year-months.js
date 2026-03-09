import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const yearMonthsData = await DAL.getAllYearMonths();
    const yearMonths = yearMonthsData.map(row => row.yearMonth).filter(Boolean);
    
    res.status(200).json({
      yearMonths,
      totalYearMonths: yearMonths.length
    });
  } catch (error) {
    console.error('❌ Error en /api/year-months:', error);
    res.status(500).json({ error: error.message });
  }
}
