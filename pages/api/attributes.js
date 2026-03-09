import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
  try {
    const attributes = await DAL.getAllAttributes();
    res.status(200).json({
      attributes: attributes.map(a => a.attribute),
      total: attributes.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching attributes:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
