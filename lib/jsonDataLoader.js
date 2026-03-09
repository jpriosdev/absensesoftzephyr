/**
 * jsonDataLoader.js
 * Load QA data from the JSON file generated during build
 * Used by API endpoints in production (Vercel) where SQLite is not available
 */

import fs from 'fs';
import path from 'path';

let cachedData = null;

function getJsonDataPath() {
  const jsonPath = path.join(process.cwd(), 'public/data/qa-data.json');
  return jsonPath;
}

function loadQADataFromJson() {
  if (cachedData) return cachedData;

  try {
    const jsonPath = getJsonDataPath();
    if (!fs.existsSync(jsonPath)) {
      console.warn(`⚠️ qa-data.json not found at ${jsonPath}, trying demo-data.json`);
      const demoPath = path.join(process.cwd(), 'public/data/demo-data.json');
      if (fs.existsSync(demoPath)) {
        const demoContent = fs.readFileSync(demoPath, 'utf-8');
        cachedData = JSON.parse(demoContent);
        cachedData._fromDemo = true;
        return cachedData;
      }
      throw new Error('Neither qa-data.json nor demo-data.json found');
    }

    const content = fs.readFileSync(jsonPath, 'utf-8');
    cachedData = JSON.parse(content);
    cachedData._fromJson = true;
    return cachedData;
  } catch (error) {
    console.error('Error loading JSON data:', error.message);
    return null;
  }
}

/**
 * Extract testers data from QA JSON
 * Derives from bugsByPriority, sprintData, and other structures
 */
export function getTesersFromJson(filters = {}) {
  const qaData = loadQADataFromJson();
  if (!qaData) return [];

  const { tag0 = '', from = '', to = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = filters;

  // Si hay filtros que requieren datos granulares, retornar array vacío
  // (Ya que JSON agregado no tiene detalles suficientes)
  if (tag0 || priority || status || testType || attribute || testLevel || ambiente) {
    console.warn('⚠️ Granular filters not fully supported with JSON data - returning empty');
    return [];
  }

  // Construir lista de testers desde developerData si existe
  const testers = (qaData.developerData || []).map((dev) => ({
    tester: dev.name || 'Unknown',
    name: dev.name || 'Unknown',
    reportado: dev.name || 'Unknown',
    products: typeof dev.products === 'string' ? dev.products.split(',').map(p => p.trim()) : (Array.isArray(dev.products) ? dev.products : []),
    total_bugs: dev.assigned || 0,
    passed: dev.resolved || 0,
    failed: (dev.assigned || 0) - (dev.resolved || 0),
    not_executed: 0,
    in_progress: 0,
    blocked: 0,
    sprints_involved: 0,
    modules_tested: 1,
    test_types: 1,
  }));

  return testers;
}

/**
 * Extract available filter options from QA JSON
 */
export function getFilterOptionsFromJson(filters = {}) {
  const qaData = loadQADataFromJson();
  if (!qaData) {
    return {
      products: [],
      priorities: [],
      statuses: [],
      testTypes: [],
      attributes: [],
      testLevels: [],
      ambientes: [],
    };
  }

  // Extraer prioridades de bugsByPriority
  const priorities = Object.keys(qaData.bugsByPriority || {});

  // Extraer módulos (products) de bugsByModule
  const products = (qaData.bugsByModule || [])
    .map(m => m.module || m.name)
    .filter(Boolean);

  // Statuses y otros valores - si no existen en JSON, retornar arrays vacíos
  const statuses = [];
  const testTypes = [];
  const attributes = [];
  const testLevels = [];
  const ambientes = [];

  return {
    products,
    priorities,
    statuses,
    testTypes,
    attributes,
    testLevels,
    ambientes,
  };
}

/**
 * Get full QA data from JSON (for API endpoints)
 */
export function getQADataFromJson() {
  return loadQADataFromJson();
}

/**
 * Clear cached data (for testing)
 */
export function clearCache() {
  cachedData = null;
}
