#!/usr/bin/env node

/**
 * SQLite initialization script
 * Crea la base de datos y todas las tablas/vistas
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../public/data/qa-dashboard.db');
const schemaPath = path.join(__dirname, './schema.sql');

console.log('🚀 Inicializando base de datos SQLite...\n');

// Leer el schema SQL
const schema = fs.readFileSync(schemaPath, 'utf8');

// Crear/abrir la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al crear la BD:', err);
    process.exit(1);
  }
  console.log(`✅ Base de datos creada en: ${dbPath}`);
  // Eliminar tabla bugs_detail si existe
  db.run('DROP TABLE IF EXISTS bugs_detail;', (dropErr) => {
    if (dropErr) {
      console.error('❌ Error al eliminar tabla bugs_detail:', dropErr);
      process.exit(1);
    }
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
              console.log('\n✅ Inicialización completada\n');
              db.close((err) => {
                if (err) {
                  console.error('❌ Error al cerrar BD:', err);
                  process.exit(1);
                }
                process.exit(0);
              });
            }
          );
        }
      );
    });
  });
});
