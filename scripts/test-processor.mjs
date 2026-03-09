import { QADataProcessor } from '../utils/dataProcessor.js';
import fs from 'fs';

const jsonPath = 'public/data/qa-data.json';
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log('=== Test de QADataProcessor ===\n');
console.log('rawData.summary:', rawData.summary);
console.log('rawData.productionBugs:', rawData.productionBugs);

// Test direct calculation
const productionBugs = rawData.productionBugs || 0;
const totalBugs = rawData.summary?.totalBugs || 1;
const leakRate = Math.round((productionBugs / totalBugs) * 100);

console.log('\n=== Cálculo directo ===');
console.log('productionBugs:', productionBugs);
console.log('totalBugs:', totalBugs);
console.log('leakRate:', leakRate);

// Test QADataProcessor
const processed = QADataProcessor.processQAData(rawData, {});
console.log('\n=== Datos procesados ===');
console.log('KPIs:', processed.kpis);
console.log('bugLeakageRate:', processed.kpis?.bugLeakageRate);
