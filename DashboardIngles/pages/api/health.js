import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Simple query to ensure DB is accessible
    const row = await DAL.runScalar('SELECT 1 as ok');
    if (row && (row.ok === 1 || row.ok === '1')) {
      return res.status(200).json({ status: 'ok', db: true });
    }
    return res.status(503).json({ status: 'unavailable', db: false });
  } catch (err) {
    return res.status(503).json({ status: 'unavailable', error: err?.message || String(err) });
  }
}
