import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
  try {
    const testTypes = await DAL.getAllTestTypes();
    res.status(200).json({
      testTypes: testTypes.map(t => t.test_type),
      total: testTypes.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching test types:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
