// /api/filter-options.js
// Returns available filter values for each dimension given the currently active filters.
// For each dimension, options are computed using ALL OTHER active filters (faceted/cascading search).
import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
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
  } catch (e) {
    console.error('[filter-options] Error:', e);
    return res.status(500).json({ error: e.message });
  }
}
