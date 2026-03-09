/**
 * API Endpoint: POST /api/upload-csv
 * 
 * Allows user to upload a new CSV file and update dashboard data.
 * Automatically:
 * 1. Backs up previous version of data
 * 2. Loads new data into SQLite
 * 3. Regenerates JSON
 * 4. Updates the dashboard
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import formidable from 'formidable';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Directory configuration
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
const VERSIONS_DIR = path.join(process.cwd(), 'data', 'versions');
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(process.cwd(), 'public', 'data', 'qa-dashboard.db');

// Create directories if they don't exist
[UPLOADS_DIR, VERSIONS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const config = {
  api: {
    bodyParser: false, // Disable bodyParser for formidable
  },
};

async function backupCurrentVersion() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `data-backup-${timestamp}.json`;
    const backupPath = path.join(VERSIONS_DIR, backupName);

    // Read current JSON
    const currentJsonPath = path.join(DATA_DIR, 'qa-data.json');
    if (fs.existsSync(currentJsonPath)) {
      const content = fs.readFileSync(currentJsonPath, 'utf8');
      fs.writeFileSync(backupPath, content);
      
      // Keep only 2 versions: current and previous
      const backups = fs.readdirSync(VERSIONS_DIR)
        .filter(f => f.startsWith('data-backup-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      // If there are more than 2, delete the old ones
      if (backups.length > 2) {
        backups.slice(2).forEach(oldBackup => {
          fs.unlinkSync(path.join(VERSIONS_DIR, oldBackup));
        });
      }
      
      console.log(`✅ Backup created: ${backupName}`);
      return backupPath;
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

async function processCsvFile(filePath) {
  try {
    console.log(`\n📁 Processing CSV: ${filePath}`);
    
    // 1. Backup previous version
    console.log('📝 Creating backup of previous version...');
    await backupCurrentVersion();
    
    // 2. Copy new CSV to data folder
    const newCsvPath = path.join(DATA_DIR, 'MockDataV0.csv');
    fs.copyFileSync(filePath, newCsvPath);
    console.log('✅ CSV file updated');
    
    // 3. Run SQLite migration
    console.log('🗄️ Migrating data to SQLite...');
    const migrationScript = path.join(process.cwd(), 'scripts', 'migrateToSqliteCSV.mjs');
    const { stdout, stderr } = await execAsync(`node ${migrationScript}`, {
      cwd: process.cwd(),
      timeout: 60000
    });
    
    if (stderr && stderr.includes('Error')) {
      throw new Error(`Migration error: ${stderr}`);
    }
    console.log('✅ Data migrated to SQLite');
    
    // 4. Regenerate JSON
    console.log('📊 Regenerating JSON...');
    const jsonScript = path.join(process.cwd(), 'scripts', 'generateJsonFromSqlite.mjs');
    const { stdout: jsonOut, stderr: jsonErr } = await execAsync(`node ${jsonScript}`, {
      cwd: process.cwd(),
      timeout: 60000
    });
    
    if (jsonErr && jsonErr.includes('Error')) {
      throw new Error(`JSON generation error: ${jsonErr}`);
    }
    console.log('✅ JSON regenerated');
    
    // 5. Clean up temporary file
    fs.unlinkSync(filePath);
    
    return {
      success: true,
      message: 'Data loaded and processed successfully',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing CSV:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parsear formulario
    const form = formidable({ 
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024 // 50MB máximo
    });

    const [fields, files] = await form.parse(req);
    const uploadedFile = files.file?.[0];

    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate that it's a CSV
    if (!uploadedFile.originalFilename?.toLowerCase().endsWith('.csv')) {
      fs.unlinkSync(uploadedFile.filepath);
      return res.status(400).json({ error: 'Only CSV files are accepted' });
    }

    // Procesar el archivo
    const result = await processCsvFile(uploadedFile.filepath);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Error al procesar el archivo',
      details: error.message
    });
  }
}
