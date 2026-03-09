#!/usr/bin/env node

/**
 * Script de inicialización de SQLite
 * Crea la base de datos y todas las tablas/vistas
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.resolve(__dirname, '../../public/data/qa-dashboard.db');
const schemaPath = path.resolve(__dirname, './schema.sql');

console.log('🚀 Inicializando base de datos SQLite...\n');

// Leer el schema SQL
const schema = fs.readFileSync(schemaPath, 'utf8');

// Crear/abrir la base de datos
const db = new (sqlite3.verbose().Database)(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al crear la BD:', err);
    process.exit(1);
  }
  console.log(`✅ Base de datos creada en: ${dbPath}`);
});

// Ejecutar el schema
db.exec(schema, (err) => {
  if (err) {
    console.error('❌ Error al ejecutar schema:', err);
    process.exit(1);
  }
  console.log('✅ Schema creado exitosamente');
  
  // Verificar tablas creadas
  db.all(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    (err, tables) => {
      if (err) {
        console.error('❌ Error al listar tablas:', err);
        process.exit(1);
      }
      
      console.log('\n📊 Tablas creadas:');
      tables.forEach(t => {
        console.log(`   • ${t.name}`);
      });
      
      // Verificar vistas creadas
      db.all(
        "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name",
        (err, views) => {
          if (err) {
            console.error('❌ Error al listar vistas:', err);
            process.exit(1);
          }
          
          console.log('\n📈 Vistas creadas:');
          views.forEach(v => {
            console.log(`   • ${v.name}`);
          });

          // Cerrar BD
          db.close((err) => {
            if (err) {
              console.error('❌ Error al cerrar BD:', err);
              process.exit(1);
            }
            console.log('\n✅ Inicialización completada\n');
            process.exit(0);
          });
        }
      );
    }
  );
});
