// pages/api/leak-rate-by-product.js
import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Obtener leak rate por producto desde la BD
    const leakRateData = await DAL.getLeakRateByProduct();
    
    // Transformar para el frontend
    const productsData = (leakRateData || []).map(product => ({
      product: product.product || 'Unknown',
      totalTests: product.total_tests || 0,
      failed: product.failed || 0,
      passed: product.passed || 0,
      leakRate: product.leak_rate || 0
    }));

    return res.status(200).json({
      productsData,
      totalProducts: productsData.length,
      timestamp: new Date().toISOString(),
      _dataSource: 'sqlite',
      _isRealData: true
    });
  } catch (error) {
    console.error('Error loading leak rate by product:', error);
    return res.status(500).json({
      error: 'Error loading leak rate data',
      errorMessage: error.message,
      productsData: []
    });
  }
}
