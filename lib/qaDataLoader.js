import fs from 'fs';
import path from 'path';
import { JSON_PATH, PUBLIC_JSON_PATH } from './config.js';

const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache results for 5 minutes
const cache = { timestamp: 0, payload: null };

function getJsonPath() {
  // Intentar primero la ruta pública (generada en build)
  if (fs.existsSync(PUBLIC_JSON_PATH)) {
    return PUBLIC_JSON_PATH;
  }
  // Fallback a la ruta data/
  return JSON_PATH;
}

function getExcelPath() {
  // Ya no se usa Excel como fuente principal
  return null;
}

function createFallbackData() {
  // Intentar cargar demo-data.json como fallback
  try {
    const demoPath = path.join(process.cwd(), 'public/data/demo-data.json');
    if (fs.existsSync(demoPath)) {
      const demoPayload = fs.readFileSync(demoPath, 'utf-8');
      const demoData = JSON.parse(demoPayload);
      return {
        ...demoData,
        _fromDemo: true,
        _warning: 'Using demo data - database not available. This is normal in Vercel preview/production environments.',
      };
    }
  } catch (err) {
    console.warn('Could not load demo-data.json:', err.message);
  }

  // Fallback mínimo y seguro si demo-data tampoco existe
  return {
    metadata: {
      version: 'fallback-minimal',
      source: 'none',
      lastUpdated: new Date().toISOString(),
    },
    summary: {
      totalBugs: 0,
      bugsClosed: 0,
      bugsPending: 0,
      testCasesTotal: 0,
      testCasesExecuted: 0,
      testCasesPassed: 0,
      testCasesFailed: 0,
    },
    bugsByPriority: {},
    bugsByModule: {},
    developerData: [],
    sprintData: [],
    bugsByCategory: {},
    qualityMetrics: {},
    _warning: 'Database not available; returning minimal safe payload.'
  };
}

function loadJsonFile(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  const payload = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(payload);
}

async function loadExcelFile(excelPath) {
  // Ya no se usa Excel como fuente principal
  throw new Error('Excel file loading is deprecated. Use SQLite as the data source.');
}

export async function getQAData({ forceReload = false } = {}) {
  const now = Date.now();
  if (!forceReload && cache.payload && now - cache.timestamp < CACHE_DURATION_MS) {
    return { ...cache.payload, _cached: true };
  }

  try {
    // Ruta actualizada para Vercel - intentar cargar JSON generado o existente
    const dataDir = path.resolve(process.cwd(), 'public/data');
    const jsonPath = path.join(dataDir, 'qa-data.json');

    // Cargar datos desde JSON si existe
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        // Validar que tiene datos válidos
        if (jsonData && jsonData.sprintData && Array.isArray(jsonData.sprintData)) {
          cache.payload = {
            ...jsonData,
            _dataSource: 'json-real',
            _isRealData: true,
            _timestamp: now,
          };
          cache.timestamp = now;
          return cache.payload;
        }
      } catch (parseErr) {
        console.warn('⚠️ qa-data.json exists but is invalid JSON:', parseErr.message);
      }
    }

    // En Vercel o cuando qa-data.json no existe, usar demo-data como fallback
    console.warn('⚠️ qa-data.json not found or invalid. Using demo-data as fallback.');
    cache.payload = {
      ...createFallbackData(),
      _dataSource: 'demo',
      _isRealData: false,
      _timestamp: now,
    };
    cache.timestamp = now;
    return cache.payload;
  } catch (error) {
    console.warn('⚠️ Error loading data:', error.message);
    const fallbackData = createFallbackData();
    cache.payload = {
      ...fallbackData,
      _dataSource: fallbackData._fromDemo ? 'demo' : 'fallback',
      _isRealData: false,
      _timestamp: now,
      _error: error.message,
    };
    cache.timestamp = now;
    return cache.payload;
  }
}

export function clearQADataCache() {
  cache.payload = null;
  cache.timestamp = 0;
}
