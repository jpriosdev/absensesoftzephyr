// /api/filter-options.js
// Returns available filter values for each dimension
// Uses JSON in Vercel, DAL as fallback

let handler;

// Try to load from DAL first (works in development with SQLite)
try {
  const DALModule = require('../../lib/database/dal.js');
  const DAL = DALModule.default || DALModule;

  handler = async (req, res) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const {
      product   = '',
      priority  = '',
      status    = '',
      testType  = '',
      attribute = '',
      testLevel = '',
      ambiente  = '',
    } = req.query;

    try {
      const options = await DAL.getFilterOptions({
        product:   product.trim(),
        priority:  priority.trim(),
        status:    status.trim(),
        testType:  testType.trim(),
        attribute: attribute.trim(),
        testLevel: testLevel.trim(),
        ambiente:  ambiente.trim(),
      });
      return res.status(200).json(options);
    } catch (error) {
      console.error('[filter-options] DAL Error:', error.message);
      // Fallback to JSON
      return fallbackHandler(req, res);
    }
  };
} catch (err) {
  console.warn('DAL not available for filter-options, using JSON fallback:', err.message);
  handler = null;
}

// Fallback handler using JSON
async function fallbackHandler(req, res) {
  try {
    const { getFilterOptionsFromJson } = await import('../../lib/jsonDataLoader.js');
    const {
      product   = '',
      priority  = '',
      status    = '',
      testType  = '',
      attribute = '',
      testLevel = '',
      ambiente  = '',
    } = req.query;

    const options = getFilterOptionsFromJson({
      product:   product.trim(),
      priority:  priority.trim(),
      status:    status.trim(),
      testType:  testType.trim(),
      attribute: attribute.trim(),
      testLevel: testLevel.trim(),
      ambiente:  ambiente.trim(),
    });

    return res.status(200).json({
      ...options,
      _dataSource: 'json',
      _note: 'Data from JSON fallback - SQLite not available'
    });
  } catch (error) {
    console.error('[filter-options] Fallback Error:', error);
    return res.status(500).json({
      error: error.message,
      products: [],
      priorities: [],
      statuses: [],
      testTypes: [],
      attributes: [],
      testLevels: [],
      ambientes: []
    });
  }
}

// Export appropriate handler
export default handler || fallbackHandler;
