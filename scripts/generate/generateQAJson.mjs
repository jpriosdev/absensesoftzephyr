#!/usr/bin/env node
/**
 * generateQAJson.mjs
 * 
 * Script para generar JSON de QA a partir de SQLite (desarrollo) o demo-data (Vercel).
 * Se ejecuta automáticamente en el build de Vercel.
 * 
 * IMPORTANTE: Este script NUNCA debe fallar - SIEMPRE genera qa-data.json
 * Si SQLite no disponible, copia demo-data.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import DAL después de definir __dirname
async function main() {
  try {
    const JSON_OUTPUT_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'qa-data.json');
    const DATA_DIR = path.dirname(JSON_OUTPUT_PATH);
    const DB_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'qa-dashboard.db');
    const DEMO_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'demo-data.json');

    console.log(`📁 Workspace: ${process.cwd()}`);
    console.log(`📁 Output: ${JSON_OUTPUT_PATH}`);
    console.log(`📁 Database: ${DB_PATH}`);
    console.log(`📁 Demo Fallback: ${DEMO_PATH}`);

    // Verificar que el directorio de salida existe
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`📁 Creando directorio: ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let qaData = null;
    let dataSource = 'unknown';

    // ESTRATEGIA 1: Intentar cargar desde SQLite (desarrollo)
    if (fs.existsSync(DB_PATH)) {
      console.log(`✅ Base de datos encontrada: ${DB_PATH}`);
      console.log(`📊 Generando JSON desde SQLite...`);
      
      try {
        const dalModule = await import('../../lib/database/dal.js');
        const DAL = dalModule.default || dalModule;
        
        qaData = await DAL.getFullQAData();
        
        if (qaData && qaData.sprintData && qaData.sprintData.length > 0) {
          dataSource = 'sqlite';
          console.log(`✅ Datos obtenidos desde SQLite: ${qaData.sprintData.length} sprints`);
        } else {
          console.warn(`⚠️  SQLite retornó datos inválidos, usando demo-data como fallback`);
          qaData = null;
        }
      } catch (dalErr) {
        console.warn(`⚠️  Error al acceder a SQLite: ${dalErr.message}`);
        console.warn(`⚠️  Usando demo-data.json como fallback`);
        qaData = null;
      }
    } else {
      console.log(`⚠️  Base de datos NO encontrada (normal en Vercel): ${DB_PATH}`);
    }

    // ESTRATEGIA 2: Si SQLite no disponible o falló, usar demo-data.json
    if (!qaData) {
      console.log(`📋 Intentando cargar demo-data.json...`);
      if (!fs.existsSync(DEMO_PATH)) {
        console.error(`❌ Ni SQLite ni demo-data.json disponibles`);
        console.error(`❌ No puedo generar qa-data.json`);
        process.exit(1);
      }

      try {
        const demoContent = fs.readFileSync(DEMO_PATH, 'utf-8');
        qaData = JSON.parse(demoContent);
        dataSource = 'demo-data';
        console.log(`✅ demo-data.json cargado exitosamente`);
      } catch (demoErr) {
        console.error(`❌ Error al parsear demo-data.json: ${demoErr.message}`);
        process.exit(1);
      }
    }
    
    if (!qaData || !qaData.sprintData) {
      console.error(`❌ Datos retornados son inválidos:`, qaData);
      process.exit(1);
    }

    console.log(`✅ Datos obtenidos: ${qaData.sprintData.length} sprints desde ${dataSource}`);

    // DEBUG: Log bugsByPriority antes de guardar
    console.log(`📊 bugsByPriority from qaData:`, JSON.stringify(qaData.bugsByPriority, null, 2).substring(0, 200));

    // Agregar metadata (incluir fuente actual)
    const metadata = {
      version: '1.0',
      source: dataSource,  // 'sqlite' o 'demo-data'
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
    console.log(`   Fuente: ${dataSource.toUpperCase()}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error generando JSON:`);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Stack:`, error.stack);
    process.exit(1);
  }
}

main();
