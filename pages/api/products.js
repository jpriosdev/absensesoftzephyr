import DAL from '../../lib/database/dal';

export default async function handler(req, res) {
  try {
    const products = await DAL.getAllProducts();
    res.status(200).json({
      products: products.map(p => p.product),
      total: products.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
}
