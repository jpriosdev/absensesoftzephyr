import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
  try {
    const levels = await DAL.getAllTestLevels();
    res.status(200).json({
      testLevels: levels.map(l => l.test_level),
      total: levels.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching test levels:', error);
    res.status(500).json({ error: error.message, success: false });
  }
}
