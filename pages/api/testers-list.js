import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
  try {
    const testers = await DAL.getAllTesters();
    res.status(200).json({
      testers,
      total: testers.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching testers:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
