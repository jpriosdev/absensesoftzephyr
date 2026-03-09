/**
 * API Endpoint: /api/data-source
 * Retorna información sobre el origen de los datos
 */

import DAL from '../../lib/database/dal.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    const action = req.query.action || 'latest';

    let response = {};

    if (action === 'latest') {
      // Obtener información del último cargue
      const metadata = await DAL.getDataSourceInfo();
      response = {
        status: 'success',
        type: 'latest_source_info',
        data: metadata,
        timestamp: new Date().toISOString()
      };
    } else if (action === 'all') {
      // Obtener histórico de todos los cargues
      const allMetadata = await DAL.getAllDataSourceMetadata();
      response = {
        status: 'success',
        type: 'all_source_history',
        count: allMetadata?.length || 0,
        data: allMetadata,
        timestamp: new Date().toISOString()
      };
    } else {
      response = {
        status: 'error',
        message: 'Invalid action parameter. Use: latest or all',
        timestamp: new Date().toISOString()
      };
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in data-source endpoint:', error);
    
    return res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
