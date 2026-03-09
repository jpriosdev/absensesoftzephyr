/**
 * API Endpoint: POST /api/switch-data-version
 * 
 * Allows switching between current and previous versions of data
 */

import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { versionId } = req.body;

    if (!versionId || (versionId !== 'current' && !versionId.startsWith('data-backup-'))) {
      return res.status(400).json({ error: 'Invalid version ID' });
    }

    const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');
    const DATA_DIR = path.join(process.cwd(), 'data');
    const currentJsonPath = path.join(DATA_DIR, 'qa-data.json');

    let sourceFile;

    if (versionId === 'current') {
      return res.status(200).json({
        success: true,
        message: 'You are already using the current version',
        version: 'current'
      });
    } else {
      // Load previous version (backup)
      sourceFile = path.join(VERSIONS_DIR, versionId);
      
      if (!fs.existsSync(sourceFile)) {
        return res.status(404).json({ error: 'Version not found' });
      }

      // Backup current version
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `data-backup-${timestamp}.json`;
      const backupPath = path.join(VERSIONS_DIR, backupName);
      
      if (fs.existsSync(currentJsonPath)) {
        fs.copyFileSync(currentJsonPath, backupPath);
      }

      // Copy previous version to current
      const versionData = fs.readFileSync(sourceFile, 'utf8');
      fs.writeFileSync(currentJsonPath, versionData);

      console.log(`✅ Switched to version: ${versionId}`);

      return res.status(200).json({
        success: true,
        message: 'Version changed successfully',
        version: versionId,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error switching version:', error);
    return res.status(500).json({
      error: 'Error changing version',
      details: error.message
    });
  }
}
