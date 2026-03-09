#!/usr/bin/env node
/**
 * generateQAJson.mjs
 * 
 * Script para generar JSON de QA a partir de SQLite.
 * Se ejecuta automáticamente en el build de Vercel.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import DAL después de definir __dirname
async function main() {
  try {
    const dalModule = await import('../../lib/database/dal.js');
    const DAL = dalModule.default || dalModule;
    
    const JSON_OUTPUT_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'qa-data.json');
    const DATA_DIR = path.dirname(JSON_OUTPUT_PATH);
    const DB_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'qa-dashboard.db');

    console.log(`📁 Workspace: ${process.cwd()}`);
    console.log(`📁 Output: ${JSON_OUTPUT_PATH}`);
    console.log(`📁 Database: ${DB_PATH}`);

    // Verificar que la DB existe
    if (!fs.existsSync(DB_PATH)) {
      console.error(`❌ Base de datos no encontrada: ${DB_PATH}`);
      process.exit(1);
    }
    console.log(`✅ Base de datos encontrada`);

    // Verificar que el directorio de salida existe
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`📁 Creando directorio: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    console.log(`📊 Generando JSON desde SQLite...`);

    // Obtener datos desde DAL
    const qaData = await DAL.getFullQAData();
    
    if (!qaData || !qaData.sprintData) {
      console.error(`❌ DAL retornó datos inválidos`, qaData);
      process.exit(1);
    }

    console.log(`✅ Datos obtenidos: ${qaData.sprintData.length} sprints`);

    // DEBUG: Log bugsByPriority antes de guardar
    console.log(`📊 bugsByPriority from qaData:`, JSON.stringify(qaData.bugsByPriority, null, 2).substring(0, 200));

    // Agregar metadata
    const metadata = {
      version: '1.0',
      source: 'sqlite',
      generatedAt: new Date().toISOString(),
      sprintsCount: qaData.sprintData ? qaData.sprintData.length : 0,
    };
    
    // Expandir summary fields al nivel root para compatibilidad con frontend
    const outputData = {
      metadata: metadata,
      ...qaData.summary,  // Expandir totalBugs, totalSprints, etc. al root
      bugsByPriority: qaData.bugsByPriority,
      bugsByModule: qaData.bugsByModule,
      bugsByCategory: qaData.bugsByCategory,
      developerData: qaData.developerData,
      testerData: qaData.testerData,  // IMPORTANT: Include testerData for Team Analysis
      sprintData: qaData.sprintData,
      testCasesByMonth: qaData.testCasesByMonth,
      bugsByDate: qaData.bugsByDate,
      bugsByMonth: qaData.bugsByMonth,
      bugsByMonthByPriority: qaData.bugsByMonthByPriority,
      executionRateByMonth: qaData.executionRateByMonth,
      bugResolutionByPriority: qaData.bugResolutionByPriority,
      executionSummary: qaData.executionSummary,
      resolutionTimeData: qaData.resolutionTimeData,
      summary: qaData.summary // También mantener summary para referencia
    };

    // Guardar JSON
    fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    const sizeKB = (fs.statSync(JSON_OUTPUT_PATH).size / 1024).toFixed(2);
    console.log(`✅ JSON generado exitosamente: ${path.relative(process.cwd(), JSON_OUTPUT_PATH)}`);
    console.log(`   Tamaño: ${sizeKB} KB`);
    console.log(`   Sprints: ${metadata.sprintsCount}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error generando JSON:`);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Stack:`, error.stack);
    process.exit(1);
  }
}

main();
