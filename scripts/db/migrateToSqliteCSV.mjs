#!/usr/bin/env node

/**
 * Script de migración: CSV → SQLite (ES6 Module)
 * Lee archivos CSV y carga datos en qa-dashboard.db
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const csvPath = path.resolve(__dirname, '..', '..', 'data', 'MockDataV0.csv');
const dbPath = path.resolve(__dirname, '..', '..', 'public', 'data', 'qa-dashboard.db');

let processedBugs = 0;

async function migrateData() {
  console.log('🚀 Iniciando migración: CSV → SQLite\n');

  try {
    // Verificar si el archivo CSV existe
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️ Advertencia: Archivo CSV no encontrado.');
      console.warn(`📁 Ruta esperada: ${csvPath}`);
      console.warn('\n💡 Para migrar datos desde CSV:');
      console.warn('   1. Carga un archivo CSV a través del dashboard');
      console.warn('   2. O coloca manualmente el archivo en la ruta especificada');
      console.log('\n✅ Continuando con base de datos existente...\n');
      return;
    }

    // Leer CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    console.log(`✅ CSV abierto: ${csvPath}\n`);

    // Obtener información del archivo CSV
    const csvFileStats = fs.statSync(csvPath);
    const csvFileName = path.basename(csvPath);
    const csvFileSize = csvFileStats.size;

    // Abrir BD
    const db = new (sqlite3.verbose().Database)(dbPath);

    // Promisificar operaciones de DB
    const dbRun = (sql) => new Promise((resolve, reject) => {
      db.run(sql, (err) => err ? reject(err) : resolve());
    });

    const dbPrepare = (sql) => {
      const stmt = db.prepare(sql);
      return {
        run: (params) => new Promise((resolve, reject) => {
          stmt.run(params, (err) => err ? reject(err) : resolve());
        }),
        finalize: () => new Promise((resolve, reject) => {
          stmt.finalize((err) => err ? reject(err) : resolve());
        })
      };
    };

    // Limpiar datos previos
    console.log('🧹 Limpiando datos previos...');
    await dbRun('DELETE FROM bugs_detail;');
    console.log('✅ Datos previos eliminados\n');

    // Insertar datos del CSV en bugs_detail
    const bugStmt = dbPrepare(
      `INSERT OR REPLACE INTO bugs_detail (
        tipo_incidencia, clave_incidencia, id_incidencia, resumen, parent_summary, prioridad, estado, sprint,
        tipo_prueba, atributo, nivel_prueba, tag0, tag1, tag2, etapa_prueba, ambiente, reportado_por, fecha_reporte,
        version_correccion_1, asignado_a, sprint_ultima_regresion, version_corregido, estrategia_ejecucion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const row of records) {
      // Encontrar dinámicamente el campo del sprint (por problemas de encoding)
      let sprintValue = '';
      Object.keys(row).forEach(key => {
        if (key.toLowerCase().includes('sprint') && key.toLowerCase().includes('ejecuc')) {
          sprintValue = row[key];
        }
      });
      
      await bugStmt.run([
        row['Tipo de Incidencia'] || '',
        row['Clave de incidencia'] || '',
        row['ID de la incidencia'] || '',
        row['Resumen'] || '',
        row['Parent summary'] || '',
        row['Prioridad'] || '',
        row['Estado'] || '',
        sprintValue || '',  // Usar valor dinámico del sprint
        row['Tipo de prueba'] || '',
        row['Atributo'] || '',
        row['Nivel de prueba'] || '',
        row['Tag0'] || '',
        row['Tag1'] || '',
        row['Tag2'] || '',
        row['Etapa de la prueba'] || '',
        row['Ambiente'] || '',
        row['Reportado'] || '',
        row['Fecha Reporte'] || '',
        row['Version de correccion 1'] || '',
        row['Desarrollador'] || '',
        row['Sprint última regresión'] || '',
        row['¿En qué versión fue corregido?'] || '',
        row['Estrategia de ejecución'] || ''
      ]);
      processedBugs++;
    }

    await bugStmt.finalize();
    console.log(`   ✅ ${processedBugs} bugs/incidencias cargados\n`);

    // Cerrar BD
    await new Promise((resolve, reject) => {
      db.close((err) => err ? reject(err) : resolve());
    });

    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log(`📊 Resumen: ${processedBugs} bugs cargados\n`);

    // ========================================
    // REGISTRAR METADATA DE ORIGEN
    // ========================================
    console.log('📝 Registrando metadata de origen...');
    const { default: DAL } = await import('../../lib/database/dal.js');
    try {
      await DAL.recordDataSourceMetadata(
        csvFileName,
        csvPath,
        csvFileSize,
        processedBugs,
        0,
        `Migración automática desde CSV ${csvFileName}`
      );
      console.log('✅ Metadata registrada exitosamente\n');
    } catch (metaError) {
      console.warn('⚠️ Advertencia: No se pudo registrar metadata:', metaError.message);
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    process.exit(1);
  }
}

migrateData();
