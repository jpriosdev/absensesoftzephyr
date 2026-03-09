#!/usr/bin/env node
// Show data source diagnostic moved to temp-validation
import fs from 'fs'
import path from 'path'

const dataPath = path.resolve(new URL(import.meta.url).pathname, '../../public/data/qa-data.json')
try {
  const raw = fs.readFileSync(dataPath, 'utf8')
  const data = JSON.parse(raw)
  console.log('Data source file:', dataPath)
  console.log('Summary keys:', Object.keys(data.summary || {}))
} catch (e) {
  console.error('Unable to read qa-data.json at', dataPath)
  console.error(e.message)
}
#!/usr/bin/env node

/**
 * Script para verificar metadata del origen de datos
 * Muestra información sobre de dónde se cargaron los datos
 */

import DAL from '../lib/database/dal.js';

async function showDataSourceInfo() {
  try {
    console.log('\n📊 INFORMACIÓN DE ORIGEN DE DATOS\n');
    console.log('═'.repeat(60));

    const metadata = await DAL.getDataSourceInfo();

    if (metadata) {
      console.log('\n✅ ÚLTIMO CARGUE DE DATOS\n');
      console.log(`📄 Archivo origen:      ${metadata.sourceFileName}`);
      console.log(`📁 Ruta completa:      ${metadata.sourceFilePath}`);
      console.log(`💾 Tamaño archivo:     ${metadata.fileSizeKB} KB (${metadata.sourceFileSize} bytes)`);
      console.log(`⏰ Fecha de carga:      ${metadata.loadedAt}`);
      console.log(`📈 Bugs cargados:      ${metadata.totalBugsLoaded}`);
      console.log(`📊 Sprints cargados:   ${metadata.totalSprintsLoaded}`);
      console.log(`✅ Estado:             ${metadata.status}`);
      if (metadata.notes) {
        console.log(`📝 Notas:              ${metadata.notes}`);
      }
    } else {
      console.log('\n⚠️  No hay metadata de origen de datos registrada');
      console.log('   Ejecuta: npm run db:setup\n');
    }

    console.log('\n' + '═'.repeat(60));

    // Mostrar todos los cargues históricos
    const allMetadata = await DAL.getAllDataSourceMetadata();
    if (allMetadata && allMetadata.length > 0) {
      console.log('\n📋 HISTÓRICO DE CARGUES\n');
      allMetadata.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.source_file_name} - ${item.load_timestamp}`);
        console.log(`   ${item.total_bugs_loaded} bugs, ${item.total_sprints_loaded} sprints`);
      });
    }

    console.log('\n' + '═'.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

showDataSourceInfo();
