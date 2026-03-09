import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
  try {
    const rows = await DAL.getAllAmbientes();
    res.status(200).json({
      environments: rows.map(r => r.ambiente),
      total: rows.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching environments:', error);
    res.status(500).json({ error: error.message, success: false });
  }
}
