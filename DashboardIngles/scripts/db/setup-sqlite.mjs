#!/usr/bin/env node

/**
 * Setup Script - Orquestador de inicialización
 * Ejecuta: init → migrate
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupDatabase() {
  console.log('\n🚀 INICIANDO SETUP COMPLETO: SQLite\n');
  console.log('═'.repeat(60));

  try {
    // Paso 1: Inicializar BD
    console.log('\n📍 Paso 1: Inicializando base de datos...\n');
    
    execSync('node lib/database/init.js', {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'inherit'
    });

    // Paso 2: Migrar datos
    console.log('\n📍 Paso 2: Migrando datos desde Excel...\n');
    
    execSync('node scripts/migrateToSqlite.mjs', {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'inherit'
    });

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ SETUP COMPLETADO EXITOSAMENTE\n');
    console.log('📌 Próximos pasos:');
    console.log('   1. npm run dev          → Iniciar servidor');
    console.log('   2. http://localhost:3000 → Abrir dashboard\n');

  } catch (error) {
    console.error('\n❌ Error durante setup:', error.message);
    process.exit(1);
  }
}

setupDatabase();
