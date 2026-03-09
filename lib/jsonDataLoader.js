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
 * Derives from testerData if available, otherwise developerData
 */
export function getTesersFromJson(filters = {}) {
  const qaData = loadQADataFromJson();
  if (!qaData) return [];

  const { tag0 = '', from = '', to = '', priority = '', status = '', testType = '', attribute = '', testLevel = '', ambiente = '' } = filters;

  // Preferir testerData si existe, sino devs
  let nativeTesters = (qaData.testerData || []);
  
  if (nativeTesters.length === 0) {
    // Fallback a developerData si no hay testerData
    nativeTesters = (qaData.developerData || []);
    if (nativeTesters.length === 0) {
      console.warn('⚠️ No testerData or developerData in JSON');
      return [];
    }

    // Mapear developerData del JSON a formato esperado por API
    // El JSON tiene: developer_name/name, total_bugs, pending, in_progress, etc.
    // Convertir a: tester, name, total_bugs, passed, failed, etc.
    return nativeTesters.map((dev) => ({
      tester: dev.developer_name || dev.name || 'Unknown',
      name: dev.developer_name || dev.name || 'Unknown',
      reportado: dev.developer_name || dev.name || 'Unknown',
      products: [],
      total_bugs: dev.total_bugs || 0,
      passed: Math.max(0, (dev.total_bugs || 0) - (dev.pending || 0) - (dev.in_progress || 0)),
      failed: 0,
      not_executed: 0,
      in_progress: dev.in_progress || 0,
      blocked: dev.blocked || 0,
      sprints_involved: 0,
      modules_tested: 1,
      test_types: 1,
    }));
  }

  // testerData ya está en el formato correcto, solo normalize fields
  let result = nativeTesters.map((t) => ({
    tester: t.tester || t.reportado || 'Unknown',
    name: t.name || t.tester || 'Unknown',
    reportado: t.reportado || t.tester || 'Unknown',
    products: Array.isArray(t.products) ? t.products : [],
    total_bugs: t.total_bugs || 0,
    passed: t.passed || 0,
    failed: t.failed || 0,
    not_executed: t.not_executed || 0,
    in_progress: t.in_progress || 0,
    blocked: t.blocked || 0,
    sprints_involved: t.sprints_involved || 0,
    modules_tested: 1,
    test_types: 1,
  }));

  // Apply tag0 (product) filter if provided
  if (tag0 && tag0.trim()) {
    result = result.filter(t => 
      Array.isArray(t.products) && 
      t.products.some(p => p === tag0.trim())
    );
  }

  return result;
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

  // Extraer productos también desde testerData
  const productsFromTesters = (qaData.testerData || [])
    .flatMap(t => Array.isArray(t.products) ? t.products : [])
    .filter(Boolean);

  // Extraer productos también desde developerData
  const productsFromDevs = (qaData.developerData || [])
    .flatMap(d => typeof d.products === 'string' ? d.products.split(',').map(p => p.trim()) : (Array.isArray(d.products) ? d.products : []))
    .filter(Boolean);

  const allProducts = [...new Set([...products, ...productsFromTesters, ...productsFromDevs])].sort();

  // Extraer statuses desde bugsByMonthByPriority si está disponible
  // o construir desde summary
  const statuses = ['Completed', 'Pending', 'In Progress', 'On Hold'];
  
  // Test types - si no están en JSON, retornar opciones comunes
  const testTypes = ['Unit', 'Integration', 'System', 'E2E', 'Performance', 'Security'];
  
  // Attributes - si no están en JSON, retornar opciones comunes
  const attributes = ['Functional', 'Performance', 'Security', 'Usability', 'Compatibility'];
  
  // Test Levels - si no están en JSON, retornar opciones comunes
  const testLevels = ['Component', 'Integration', 'System', 'Acceptance'];
  
  // Ambientes
  const ambientes = ['Development', 'QA', 'Staging', 'Production'];

  return {
    products: allProducts,
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
