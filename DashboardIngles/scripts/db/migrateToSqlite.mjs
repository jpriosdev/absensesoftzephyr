#!/usr/bin/env node

/**
 * Script de migración: Excel → SQLite (ES6 Module)
 * Lee archivos Excel y carga datos en qa-dashboard.db
 */

import ExcelJS from 'exceljs';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const excelPath = path.resolve(__dirname, '..', '..', 'data', 'qa-data-upload.xlsx');
const dbPath = path.resolve(__dirname, '..', '..', 'public', 'data', 'qa-dashboard.db');

let processedVersions = 0;
let processedBugs = 0;

async function migrateData() {
  console.log('🚀 Iniciando migración: Excel → SQLite\n');

  try {
    // Verificar si el archivo Excel existe
    if (!fs.existsSync(excelPath)) {
      console.warn('⚠️ Advertencia: Archivo Excel no encontrado.');
      console.warn(`📁 Ruta esperada: ${excelPath}`);
      console.warn('\n💡 Para migrar datos desde Excel:');
      console.warn('   1. Carga un archivo CSV o Excel a través del dashboard');
      console.warn('   2. O coloca manualmente el archivo en la ruta especificada');
      console.log('\n✅ Continuando con base de datos existente...\n');
      return;
    }

    // Abrir Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    console.log(`✅ Excel abierto: ${excelPath}\n`);

    // Obtener información del archivo Excel
    const excelFileStats = fs.statSync(excelPath);
    const excelFileName = path.basename(excelPath);
    const excelFileSize = excelFileStats.size;

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
    await dbRun('DELETE FROM sprints_versions;');
    console.log('✅ Datos previos eliminados\n');

    // ========================================
    // 1. MIGRAR HOJA: VERSIONES
    // ========================================
    console.log('📄 Procesando hoja "Versiones"...');
    const versionSheet = workbook.getWorksheet('Versiones');
    
    if (versionSheet) {
      const versionStmt = dbPrepare(
        `INSERT INTO sprints_versions (version, sprint, fecha, environment, test_plan, etiquetas)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (let row = 2; row <= versionSheet.rowCount; row++) {
        try {
          const wsRow = versionSheet.getRow(row);
          if (!wsRow.values[1]) break; // Para en primera celda vacía

          await versionStmt.run([
            wsRow.values[1] || '',      // version
            wsRow.values[2] || '',      // sprint
            wsRow.values[3] || '',      // fecha
            wsRow.values[4] || '',      // environment
            wsRow.values[5] || '',      // test_plan
            wsRow.values[6] || ''       // etiquetas
          ]);
          processedVersions++;
        } catch (err) {
          console.warn(`⚠️ Error en fila ${row} de Versiones:`, err.message);
        }
      }

      await versionStmt.finalize();
      console.log(`   ✅ ${processedVersions} versiones/sprints cargados\n`);
    } else {
      console.warn('⚠️ Hoja "Versiones" no encontrada\n');
    }

    // ========================================
    // 2. MIGRAR HOJA: REPORTE_GRAL
    // ========================================
    console.log('📄 Procesando hoja "Reporte_Gral"...');
    const reportSheet = workbook.getWorksheet('Reporte_Gral');
    
    if (reportSheet) {
      const bugStmt = dbPrepare(
        `INSERT INTO bugs_detail 
         (tipo_incidencia, clave_incidencia, prioridad, estado, sprint, modulo, categoria, asignado_a)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (let row = 2; row <= reportSheet.rowCount; row++) {
        try {
          const wsRow = reportSheet.getRow(row);
          if (!wsRow.values[1]) break; // Para en primera celda vacía

          await bugStmt.run([
            wsRow.values[1] || '',      // tipo_incidencia
            wsRow.values[2] || '',      // clave_incidencia
            wsRow.values[3] || 'Media', // prioridad (default Media)
            wsRow.values[4] || 'Tareas por hacer', // estado
            wsRow.values[5] || '',      // sprint
            wsRow.values[6] || '',      // modulo
            wsRow.values[7] || '',      // categoria
            wsRow.values[8] || ''       // asignado_a
          ]);
          processedBugs++;
        } catch (err) {
          console.warn(`⚠️ Error en fila ${row} de Reporte_Gral:`, err.message);
        }
      }

      await bugStmt.finalize();
      console.log(`   ✅ ${processedBugs} bugs/incidencias cargados\n`);
    } else {
      console.warn('⚠️ Hoja "Reporte_Gral" no encontrada\n');
    }

    // ========================================
    // 3. MIGRAR HOJA: BUGS X DESARROLLADOR
    // ========================================
    console.log('📄 Procesando hoja "BUGS X DESARROLLADOR"...');
    const devSheet = workbook.getWorksheet('BUGS X DESARROLLADOR');
    let processedDevelopers = 0;
    
    if (devSheet) {
      // La estructura es:
      // Fila 1: Encabezado "Reporte por DESARROLLADOR"
      // Fila 2: Nombres de estado (Desarrollador, Cancelado, Tareas por hacer, etc.)
      // Fila 3+: Datos de desarrolladores
      
      const devStmt = dbPrepare(
        `INSERT OR REPLACE INTO developers_summary 
         (developer_name, cancelado, tareas_por_hacer, code_review, in_sit, ready_for_testing, ready_for_uat, blocked, en_curso, to_be_deployed_sit, total_bugs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (let row = 3; row <= devSheet.rowCount; row++) {
        try {
          const wsRow = devSheet.getRow(row);
          const developerName = wsRow.values[1];
          
          // Saltar filas vacías, encabezados duplicados, y totales
          if (!developerName || 
              developerName === 'Total general' || 
              developerName === 'Desarrollador' ||
              developerName === 'Bugs  por' ||
              developerName.includes('Bugs por') ||
              !isNaN(developerName) ||
              String(developerName).toLowerCase().includes('total') ||
              String(developerName).toLowerCase().includes('prioridad') ||
              String(developerName).toLowerCase().includes('estado')) {
            continue;
          }
          
          // Mapeo de columnas desde "BUGS X DESARROLLADOR"
          const cancelado = wsRow.values[2] || 0;
          const tareasPorHacer = wsRow.values[3] || 0;
          const codeReview = wsRow.values[4] || 0;
          const inSit = wsRow.values[5] || 0;
          const readyForTesting = wsRow.values[6] || 0;
          const readyForUat = wsRow.values[7] || 0;
          const blocked = wsRow.values[8] || 0;
          const enCurso = wsRow.values[10] || 0;
          const toBeDeployed = wsRow.values[11] || 0;
          
          // Validar que sea un número válido
          const totalBugs = cancelado + tareasPorHacer + codeReview + inSit + 
                          readyForTesting + readyForUat + blocked + enCurso + toBeDeployed;
          
          if (totalBugs === 0 || !developerName) {
            continue;
          }
          
          if (totalBugs > 0) {
            await devStmt.run([
              developerName,
              cancelado,
              tareasPorHacer,
              codeReview,
              inSit,
              readyForTesting,
              readyForUat,
              blocked,
              enCurso,
              toBeDeployed,
              totalBugs
            ]);
            processedDevelopers++;
          }
        } catch (err) {
          console.warn(`⚠️ Error en fila ${row} de Desarrolladores:`, err.message);
        }
      }

      await devStmt.finalize();
      console.log(`   ✅ ${processedDevelopers} desarrolladores cargados\n`);
    } else {
      console.warn('⚠️ Hoja "BUGS X DESARROLLADOR" no encontrada\n');
    }

    // Cerrar BD
    await new Promise((resolve, reject) => {
      db.close((err) => err ? reject(err) : resolve());
    });

    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log(`📊 Resumen: ${processedVersions} sprints + ${processedBugs} bugs + ${processedDevelopers} desarrolladores\n`);

    // ========================================
    // 4. REGISTRAR METADATA DE ORIGEN
    // ========================================
    console.log('📝 Registrando metadata de origen...');
    
    // Importar DAL para registrar metadata
    const { default: DAL } = await import('../../lib/database/dal.js');
    
    try {
      await DAL.recordDataSourceMetadata(
        excelFileName,                  // nombre del archivo
        excelPath,                      // ruta completa
        excelFileSize,                  // tamaño en bytes
        processedBugs,                  // bugs cargados
        processedVersions,              // sprints cargados
        `Migración automática desde Excel ${excelFileName}`  // notas
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

// Ejecutar
migrateData();
